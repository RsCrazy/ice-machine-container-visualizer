"""
Data models for the ice-machine container loading system.
All linear dimensions are in millimetres, weight in kilograms.
"""
from __future__ import annotations
from dataclasses import dataclass, field

# ── 20GP inner dimensions (defaults) ─────────────────────────────────────────
CONTAINER_L: float = 5898.0   # X axis (length)
CONTAINER_W: float = 2352.0   # Z axis (width)
CONTAINER_H: float = 2393.0   # Y axis (height)

MIN_SUPPORT: float = 0.80     # minimum support ratio required for stacking
EPS:         float = 1.0      # mm tolerance for floating-point comparisons


@dataclass
class ContainerSpec:
    """Specification for a container type used in packing."""
    name:     str
    L:        float
    W:        float
    H:        float
    cost_usd: float = 0.0


DEFAULT_20GP = ContainerSpec(
    name="20GP", L=CONTAINER_L, W=CONTAINER_W, H=CONTAINER_H, cost_usd=0.0
)


@dataclass
class Item:
    """One ice-machine unit to be packed."""
    name:                str
    model:               str
    length:              float   # mm  — placed along container X
    width:               float   # mm  — placed along container Z
    height:              float   # mm  — placed along container Y
    weight:              float   # kg
    allow_free_rotation: bool = False  # allow all 6 axis orientations when True

    @property
    def volume(self) -> float:
        return self.length * self.width * self.height

    @property
    def footprint(self) -> float:
        """Minimum floor area; considers all faces when free rotation is enabled."""
        if self.allow_free_rotation:
            return min(
                self.length * self.width,
                self.length * self.height,
                self.width  * self.height,
            )
        return self.length * self.width


@dataclass
class PlacedItem:
    """
    An Item assigned a position inside a container.

    Rotation codes 0–5 (see packing_engine._get_orientations):
      0  L×W floor, H height  (default upright)
      1  W×L floor, H height  (horizontal 90°)
      2  L×H floor, W height  (W becomes vertical)
      3  H×L floor, W height
      4  W×H floor, L height  (L becomes vertical)
      5  H×W floor, L height

    eff_l, eff_w, eff_h are the actual placed X/Z/Y extents after rotation.
    """
    item:          Item
    x:             float   # mm, left-front-bottom corner, X
    y:             float   # mm, left-front-bottom corner, Y (height from floor)
    z:             float   # mm, left-front-bottom corner, Z
    rotation:      int     # 0–5
    support_ratio: float   # fraction of bottom face supported (0.0–1.0)
    eff_l:         float = 0.0   # effective length (X) after rotation
    eff_w:         float = 0.0   # effective width  (Z) after rotation
    eff_h:         float = 0.0   # effective height (Y) after rotation

    def __post_init__(self) -> None:
        # Derive eff dims from rotation 0/1 when not explicitly provided (backward compat)
        if self.eff_l == 0.0 and self.eff_w == 0.0 and self.eff_h == 0.0:
            L, W, H = self.item.length, self.item.width, self.item.height
            if self.rotation == 1:
                self.eff_l, self.eff_w, self.eff_h = W, L, H
            else:
                self.eff_l, self.eff_w, self.eff_h = L, W, H

    @property
    def x2(self) -> float: return self.x + self.eff_l
    @property
    def y2(self) -> float: return self.y + self.eff_h
    @property
    def z2(self) -> float: return self.z + self.eff_w


@dataclass
class Bin:
    """One container instance with its current loading state."""
    L:         float = CONTAINER_L
    W:         float = CONTAINER_W
    H:         float = CONTAINER_H
    spec_name: str   = "20GP"

    placed: list[PlacedItem] = field(default_factory=list)
    eps:    list[tuple[float, float, float]] = field(
        default_factory=lambda: [(0.0, 0.0, 0.0)]
    )

    @property
    def used_volume(self) -> float:
        return sum(p.eff_l * p.eff_w * p.eff_h for p in self.placed)

    @property
    def container_volume(self) -> float:
        return self.L * self.W * self.H

    @property
    def remaining_volume(self) -> float:
        return self.container_volume - self.used_volume

    @property
    def fill_ratio(self) -> float:
        return self.used_volume / self.container_volume

    @property
    def total_weight(self) -> float:
        return sum(p.item.weight for p in self.placed)


@dataclass
class PackResult:
    bins:        list[Bin]
    unplaced:    list[Item]
    lower_bound: int
    stats:       dict
