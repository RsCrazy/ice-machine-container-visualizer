"""
Data models for the ice-machine container loading system.
All linear dimensions are in millimetres, weight in kilograms.
"""
from __future__ import annotations
from dataclasses import dataclass, field

# ── 20GP inner dimensions ─────────────────────────────────────────────────────
CONTAINER_L: float = 5898.0   # X axis (length)
CONTAINER_W: float = 2352.0   # Z axis (width)
CONTAINER_H: float = 2393.0   # Y axis (height)

MIN_SUPPORT: float = 0.80     # minimum support ratio required for stacking
EPS:         float = 1.0      # mm tolerance for floating-point comparisons


@dataclass
class Item:
    """One ice-machine unit to be packed (upright, no flipping)."""
    name:   str
    model:  str
    length: float   # mm  — placed along container X
    width:  float   # mm  — placed along container Z
    height: float   # mm  — placed along container Y (fixed: no tilting allowed)
    weight: float   # kg

    @property
    def volume(self) -> float:
        return self.length * self.width * self.height

    @property
    def footprint(self) -> float:
        """Floor area of the item's base."""
        return self.length * self.width


@dataclass
class PlacedItem:
    """
    An Item that has been assigned a position inside a container.
    The item may be rotated 90° horizontally (length ↔ width swapped).
    """
    item:          Item
    x:             float   # mm, left-front-bottom corner, X
    y:             float   # mm, left-front-bottom corner, Y (height from floor)
    z:             float   # mm, left-front-bottom corner, Z
    rotation:      int     # 0 = original orientation, 90 = length↔width swapped
    support_ratio: float   # fraction of bottom face supported (0.0–1.0)

    # Effective footprint dimensions after applying rotation
    @property
    def eff_l(self) -> float:
        return self.item.width  if self.rotation == 90 else self.item.length

    @property
    def eff_w(self) -> float:
        return self.item.length if self.rotation == 90 else self.item.width

    # Bounding-box far corners
    @property
    def x2(self) -> float: return self.x + self.eff_l
    @property
    def y2(self) -> float: return self.y + self.item.height
    @property
    def z2(self) -> float: return self.z + self.eff_w


@dataclass
class Bin:
    """One 20GP container instance with its current loading state."""
    L: float = CONTAINER_L
    W: float = CONTAINER_W
    H: float = CONTAINER_H

    placed: list[PlacedItem] = field(default_factory=list)

    # Extreme points: candidate positions where the next item may be placed.
    # Initialised to the floor origin; updated after every placement.
    eps: list[tuple[float, float, float]] = field(
        default_factory=lambda: [(0.0, 0.0, 0.0)]
    )

    @property
    def used_volume(self) -> float:
        return sum(p.eff_l * p.eff_w * p.item.height for p in self.placed)

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
