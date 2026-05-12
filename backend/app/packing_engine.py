"""
packing_engine.py
=================
Core 3D bin-packing algorithm for ice-machine container loading.

Rotation codes (0–5)
--------------------
When an item has allow_free_rotation=True, all 6 flat-upright orientations are
tried; otherwise only codes 0 (original) and 1 (horizontal 90°) are used.

  Code | eff_l × eff_w (floor) | eff_h (vertical)
  -----|------------------------|------------------
    0  | L × W                  | H   (default upright)
    1  | W × L                  | H   (horizontal 90°)
    2  | L × H                  | W   (original W becomes vertical)
    3  | H × L                  | W
    4  | W × H                  | L   (original L becomes vertical)
    5  | H × W                  | L

Phase 1 — Lower bound
    LB = max(ceil(ΣVolume / V_container), ceil(ΣFootprint / A_floor))

Phase 2 — BFD greedy placement
    Items sorted by weight DESC, volume DESC. For each item, scan open bins
    and pick the best-fit (least remaining volume). Within a bin, positions
    come from the Extreme Point set.

Phase 3 — Local search
    Try to eliminate the last bin by redistributing its items into earlier bins.
"""
from __future__ import annotations

import copy
import math
import random
from typing import Optional

from .models import (
    Bin, ContainerSpec, DEFAULT_20GP, EPS,
    Item, MIN_SUPPORT, PackResult, PlacedItem,
)


# ── Geometry helpers ──────────────────────────────────────────────────────────

def _overlap_1d(a1: float, a2: float, b1: float, b2: float) -> float:
    return max(0.0, min(a2, b2) - max(a1, b1))


def _support_ratio(
    eff_l: float, eff_w: float,
    x: float, y: float, z: float,
    placed: list[PlacedItem],
) -> float:
    """Fraction of the item's bottom face (eff_l × eff_w at height y) that is supported."""
    if y < EPS:
        return 1.0
    item_area = eff_l * eff_w
    if item_area < EPS:
        return 1.0
    covered = 0.0
    for p in placed:
        if abs(p.y2 - y) > EPS:
            continue
        ox = _overlap_1d(x, x + eff_l, p.x, p.x2)
        oz = _overlap_1d(z, z + eff_w, p.z, p.z2)
        covered += ox * oz
    return min(1.0, covered / item_area)


def _collides(
    eff_l: float, eff_w: float, eff_h: float,
    x: float, y: float, z: float,
    placed: list[PlacedItem],
) -> bool:
    x2, y2, z2 = x + eff_l, y + eff_h, z + eff_w
    for p in placed:
        if (x  < p.x2 - EPS and x2 > p.x  + EPS and
                y  < p.y2 - EPS and y2 > p.y  + EPS and
                z  < p.z2 - EPS and z2 > p.z  + EPS):
            return True
    return False


def _fits_container(
    eff_l: float, eff_w: float, eff_h: float,
    x: float, y: float, z: float,
    b: Bin,
) -> bool:
    return (
        x >= -EPS and x + eff_l <= b.L + EPS and
        y >= -EPS and y + eff_h <= b.H + EPS and
        z >= -EPS and z + eff_w <= b.W + EPS
    )


# ── Orientation helpers ───────────────────────────────────────────────────────

def _get_orientations(
    item: Item, allow_rotation: bool,
) -> list[tuple[float, float, float, int]]:
    """
    Return (eff_l, eff_w, eff_h, rotation_code) tuples to try for an item.

    Free-rotation items get all 6 distinct orientations (deduplicated by dims).
    Standard items get 1 or 2 horizontal orientations.
    """
    L, W, H = item.length, item.width, item.height

    if item.allow_free_rotation:
        candidates = [
            (L, W, H, 0), (W, L, H, 1),
            (L, H, W, 2), (H, L, W, 3),
            (W, H, L, 4), (H, W, L, 5),
        ]
        seen:   set[tuple[int, int, int]] = set()
        result: list[tuple[float, float, float, int]] = []
        for (el, ew, eh, rot) in candidates:
            key = (round(el), round(ew), round(eh))
            if key not in seen:
                seen.add(key)
                result.append((el, ew, eh, rot))
        return result

    if allow_rotation and abs(L - W) > EPS:
        return [(L, W, H, 0), (W, L, H, 1)]
    return [(L, W, H, 0)]


# ── Extreme-point management ──────────────────────────────────────────────────

def _update_eps(b: Bin, p: PlacedItem) -> None:
    """Extend EP set with three new candidates from p's outward faces, then prune."""
    b.eps.extend([
        (p.x2, p.y,  p.z ),
        (p.x,  p.y2, p.z ),
        (p.x,  p.y,  p.z2),
    ])

    seen:  set[tuple[int, int, int]] = set()
    clean: list[tuple[float, float, float]] = []

    for (ex, ey, ez) in b.eps:
        ex = max(0.0, min(ex, b.L))
        ey = max(0.0, min(ey, b.H))
        ez = max(0.0, min(ez, b.W))

        key = (round(ex), round(ey), round(ez))
        if key in seen:
            continue

        inside = any(
            q.x + EPS < ex < q.x2 - EPS and
            q.y + EPS < ey < q.y2 - EPS and
            q.z + EPS < ez < q.z2 - EPS
            for q in b.placed
        )
        if inside:
            continue

        seen.add(key)
        clean.append((ex, ey, ez))

    b.eps = clean


# ── Single-bin placement ──────────────────────────────────────────────────────

def _try_place(item: Item, b: Bin, allow_rotation: bool) -> Optional[PlacedItem]:
    """
    Search all extreme points × orientations for the best valid position.
    Prefer lowest Y (floor-first), then smallest X, then smallest Z.
    """
    orientations = _get_orientations(item, allow_rotation)
    sorted_eps = sorted(b.eps, key=lambda ep: (round(ep[1]), round(ep[0]), round(ep[2])))

    best:     Optional[PlacedItem]      = None
    best_key: tuple[float, float, float] = (math.inf, math.inf, math.inf)

    for (ex, ey, ez) in sorted_eps:
        if best is not None and ey > best_key[0] + EPS:
            break

        for (eff_l, eff_w, eff_h, rot) in orientations:
            if not _fits_container(eff_l, eff_w, eff_h, ex, ey, ez, b):
                continue
            if _collides(eff_l, eff_w, eff_h, ex, ey, ez, b.placed):
                continue
            sr = _support_ratio(eff_l, eff_w, ex, ey, ez, b.placed)
            if sr < MIN_SUPPORT:
                continue

            key = (ey, ex, ez)
            if key < best_key:
                best_key = key
                best = PlacedItem(
                    item=item, x=ex, y=ey, z=ez,
                    rotation=rot, support_ratio=sr,
                    eff_l=eff_l, eff_w=eff_w, eff_h=eff_h,
                )

    return best


# ── Lower bound ───────────────────────────────────────────────────────────────

def compute_lower_bound(
    items: list[Item],
    container_spec: Optional[ContainerSpec] = None,
) -> int:
    """
    Volume lower bound: ceil(total_item_volume / container_volume).

    A footprint-based lower bound would be invalid here because items can be
    stacked — multiple items share the same floor area via stacking, so
    sum(footprints) / floor_area overcounts the required containers.
    """
    if not items:
        return 0
    spec   = container_spec or DEFAULT_20GP
    cv     = spec.L * spec.W * spec.H
    lb_vol = math.ceil(sum(i.volume for i in items) / cv)
    return max(lb_vol, 1)


# ── Local search ──────────────────────────────────────────────────────────────

def _local_search(bins: list[Bin], allow_rotation: bool) -> list[Bin]:
    """Iteratively eliminate the last bin by redistributing its items."""
    while len(bins) > 1:
        last_items = sorted(
            (p.item for p in bins[-1].placed),
            key=lambda i: (-i.weight, -i.volume),
        )
        trial = copy.deepcopy(bins[:-1])

        all_placed = True
        for item in last_items:
            best_b:  Optional[Bin]        = None
            best_pi: Optional[PlacedItem] = None
            best_rv: float                = math.inf

            for tb in trial:
                pi = _try_place(item, tb, allow_rotation)
                if pi is not None and tb.remaining_volume < best_rv:
                    best_b, best_pi, best_rv = tb, pi, tb.remaining_volume

            if best_b is not None:
                best_b.placed.append(best_pi)
                _update_eps(best_b, best_pi)
            else:
                all_placed = False
                break

        if all_placed:
            bins = trial
        else:
            break

    return bins


# ── Public API ────────────────────────────────────────────────────────────────

def _pack_sorted(
    sorted_items: list[Item],
    allow_rotation: bool,
    spec: ContainerSpec,
) -> PackResult:
    """BFD + EP + local search on a pre-ordered item list (no internal re-sort)."""
    lb        = compute_lower_bound(sorted_items, spec)
    bins:     list[Bin]  = []
    unplaced: list[Item] = []

    for item in sorted_items:
        best_b:  Optional[Bin]        = None
        best_pi: Optional[PlacedItem] = None
        best_rv: float                = math.inf

        for b in bins:
            pi = _try_place(item, b, allow_rotation)
            if pi is not None and b.remaining_volume < best_rv:
                best_b, best_pi, best_rv = b, pi, b.remaining_volume

        if best_b is not None:
            best_b.placed.append(best_pi)
            _update_eps(best_b, best_pi)
        else:
            new_bin = Bin(L=spec.L, W=spec.W, H=spec.H, spec_name=spec.name)
            pi = _try_place(item, new_bin, allow_rotation)
            if pi is not None:
                new_bin.placed.append(pi)
                _update_eps(new_bin, pi)
                bins.append(new_bin)
            else:
                unplaced.append(item)

    bins = _local_search(bins, allow_rotation)

    cv        = spec.L * spec.W * spec.H
    total_vol = sum(i.volume for i in sorted_items)
    total_kg  = sum(i.weight for i in sorted_items)
    n_bins    = len(bins)

    stats = {
        "num_containers":   n_bins,
        "lower_bound":      lb,
        "gap":              n_bins - lb,
        "total_weight_kg":  round(total_kg, 2),
        "volume_util_pct":  round(total_vol / (n_bins * cv) * 100, 2) if n_bins else 0.0,
        "unplaced_count":   len(unplaced),
        "items_packed":     sum(len(b.placed) for b in bins),
    }
    return PackResult(bins=bins, unplaced=unplaced, lower_bound=lb, stats=stats)


def pack(
    items: list[Item],
    allow_rotation: bool = True,
    container_spec: Optional[ContainerSpec] = None,
) -> PackResult:
    """Single-pass BFD greedy with canonical weight-DESC ordering."""
    if not items:
        return PackResult(bins=[], unplaced=[], lower_bound=0, stats={})
    spec = container_spec or DEFAULT_20GP
    return _pack_sorted(sorted(items, key=lambda i: (-i.weight, -i.volume)), allow_rotation, spec)


def multi_restart_pack(
    items: list[Item],
    allow_rotation: bool = True,
    container_spec: Optional[ContainerSpec] = None,
    k: int = 30,
    seed: Optional[int] = None,
) -> PackResult:
    """
    Run BFD packing k times with different item orderings; return the result
    with fewest bins. Restart 0 uses canonical weight-DESC ordering so the
    result is always at least as good as a single greedy pass.
    """
    if not items:
        return PackResult(bins=[], unplaced=[], lower_bound=0, stats={})

    spec = container_spec or DEFAULT_20GP
    lb   = compute_lower_bound(items, spec)
    rng  = random.Random(seed)
    best: Optional[PackResult] = None

    for i in range(k):
        if i == 0:
            order: list[Item] = sorted(items, key=lambda x: (-x.weight, -x.volume))
        else:
            order = items[:]
            rng.shuffle(order)

        result = _pack_sorted(order, allow_rotation, spec)

        if best is None or len(result.bins) < len(best.bins):
            best = result

        if len(best.bins) <= lb:
            break

    return best  # type: ignore[return-value]


def pack_best_cost(
    items: list[Item],
    container_specs: list[ContainerSpec],
    allow_rotation: bool = True,
    solve_mode: str = "fast",
) -> tuple[PackResult, list[dict], str]:
    """
    Run packing for each container spec; return (best_result, comparison, actual_mode).

    solve_mode="optimized": uses multi_restart_pack (k=30) for n≤100, else fast.
    When costs are equal, prefer the result with fewer bins.
    When container_specs is empty, falls back to DEFAULT_20GP.
    """
    if not container_specs:
        container_specs = [DEFAULT_20GP]

    n = len(items)
    if solve_mode == "optimized" and n <= 100:
        k           = 30
        actual_mode = f"multi_restart_k{k}"
    else:
        k           = 0
        actual_mode = "fast"

    comparison:  list[dict]           = []
    best_result: Optional[PackResult] = None
    best_cost:   float                = math.inf
    best_bins:   int                  = math.inf  # type: ignore[assignment]

    for spec in container_specs:
        result = (
            multi_restart_pack(items, allow_rotation=allow_rotation, container_spec=spec, k=k)
            if k > 0
            else pack(items, allow_rotation=allow_rotation, container_spec=spec)
        )
        total_cost = len(result.bins) * spec.cost_usd
        comparison.append({
            "type_name":  spec.name,
            "num_bins":   len(result.bins),
            "total_cost": round(total_cost, 2),
        })
        nb = len(result.bins)
        if best_result is None or (total_cost, nb) < (best_cost, best_bins):
            best_cost   = total_cost
            best_bins   = nb
            best_result = result

    return best_result, comparison, actual_mode  # type: ignore[return-value]
