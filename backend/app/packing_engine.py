"""
packing_engine.py
=================
Core 3D bin-packing algorithm for 20GP ice-machine container loading.

Algorithm overview
------------------
Phase 1 — Lower bound
    LB = max(ceil(ΣVolume / V_container), ceil(ΣFootprint / A_floor))
    This is the theoretical minimum number of containers needed.

Phase 2 — BFD greedy placement
    Items are sorted by weight DESC (heaviest first), volume DESC as tiebreaker.
    For each item, scan all open bins and pick the one with the least remaining
    volume that can still accommodate the item (Best-Fit Decreasing).
    Within each bin, candidate positions come from the Extreme Point set.

Phase 3 — Local search
    Try to eliminate the last bin by redistributing its items into earlier bins.
    Repeat until no further reduction is possible.

Constraints
-----------
- No flipping / tilting: item height is fixed (upright only).
- Horizontal rotation only: length ↔ width may be swapped (90° about Y axis).
- Weight order: heavier items are placed first, so they naturally occupy lower
  positions. The EP sort (lowest Y first) reinforces this.
- Support ratio: for any item placed above floor level, the fraction of its
  bottom face overlapping items directly below must be ≥ MIN_SUPPORT (0.80).
"""
from __future__ import annotations

import copy
import math
from typing import Optional

from .models import (
    Bin, EPS, CONTAINER_H, CONTAINER_L, CONTAINER_W,
    Item, MIN_SUPPORT, PackResult, PlacedItem,
)


# ── Geometry helpers ──────────────────────────────────────────────────────────

def _overlap_1d(a1: float, a2: float, b1: float, b2: float) -> float:
    """Signed overlap length of two 1-D segments."""
    return max(0.0, min(a2, b2) - max(a1, b1))


def _support_ratio(
    eff_l: float, eff_w: float,
    x: float, y: float, z: float,
    placed: list[PlacedItem],
) -> float:
    """
    Compute the fraction of an item's bottom face (eff_l × eff_w at height y)
    that is physically supported by already-placed items whose top face is at y.

    Items sitting on the floor (y ≈ 0) are always 100 % supported.
    """
    if y < EPS:
        return 1.0

    item_area = eff_l * eff_w
    if item_area < EPS:
        return 1.0

    covered = 0.0
    for p in placed:
        if abs(p.y2 - y) > EPS:          # only items whose top touches y
            continue
        ox = _overlap_1d(x, x + eff_l, p.x, p.x2)
        oz = _overlap_1d(z, z + eff_w, p.z, p.z2)
        covered += ox * oz

    return min(1.0, covered / item_area)


def _collides(
    eff_l: float, eff_w: float, h: float,
    x: float, y: float, z: float,
    placed: list[PlacedItem],
) -> bool:
    """Return True if the proposed bounding box overlaps any placed item."""
    x2, y2, z2 = x + eff_l, y + h, z + eff_w
    for p in placed:
        if (x  < p.x2 - EPS and x2 > p.x  + EPS and
                y  < p.y2 - EPS and y2 > p.y  + EPS and
                z  < p.z2 - EPS and z2 > p.z  + EPS):
            return True
    return False


def _fits_container(
    eff_l: float, eff_w: float, h: float,
    x: float, y: float, z: float,
    b: Bin,
) -> bool:
    return (
        x >= -EPS and x + eff_l <= b.L + EPS and
        y >= -EPS and y + h     <= b.H + EPS and
        z >= -EPS and z + eff_w <= b.W + EPS
    )


# ── Extreme-point management ──────────────────────────────────────────────────

def _update_eps(b: Bin, p: PlacedItem) -> None:
    """
    After placing p, extend the extreme-point set with three new candidates
    (one per outward face of p), then purge points that are:
      - outside the container
      - strictly inside any already-placed item
      - duplicates (rounded to 1 mm)
    """
    b.eps.extend([
        (p.x2, p.y,  p.z ),   # right face  (+X)
        (p.x,  p.y2, p.z ),   # top face    (+Y)
        (p.x,  p.y,  p.z2),   # back face   (+Z)
    ])

    seen:  set[tuple[int, int, int]] = set()
    clean: list[tuple[float, float, float]] = []

    for (ex, ey, ez) in b.eps:
        # Clamp to container boundaries
        ex = max(0.0, min(ex, b.L))
        ey = max(0.0, min(ey, b.H))
        ez = max(0.0, min(ez, b.W))

        key = (round(ex), round(ey), round(ez))
        if key in seen:
            continue

        # Drop points that fall strictly inside a placed item
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
    Search all extreme points × orientations for a valid position.

    Sorting strategy: prefer the lowest Y (floor first → heavy-bottom rule),
    then smallest X, then smallest Z.

    Returns the best PlacedItem found, or None.
    """
    orientations: list[tuple[float, float, int]] = [
        (item.length, item.width, 0),
    ]
    if allow_rotation and abs(item.length - item.width) > EPS:
        orientations.append((item.width, item.length, 90))

    # Sort EPs once; the first valid hit for each orientation is already optimal
    # because we break as soon as we find a floor-level placement.
    sorted_eps = sorted(b.eps, key=lambda ep: (round(ep[1]), round(ep[0]), round(ep[2])))

    best:     Optional[PlacedItem] = None
    best_key: tuple[float, float, float] = (math.inf, math.inf, math.inf)

    for (ex, ey, ez) in sorted_eps:
        # Early exit: nothing can beat a floor-level placement
        if best is not None and ey > best_key[0] + EPS:
            break

        for (eff_l, eff_w, rot) in orientations:
            h = item.height
            if not _fits_container(eff_l, eff_w, h, ex, ey, ez, b):
                continue
            if _collides(eff_l, eff_w, h, ex, ey, ez, b.placed):
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
                )

    return best


# ── Lower bound ───────────────────────────────────────────────────────────────

def compute_lower_bound(items: list[Item]) -> int:
    """
    Return max(volume lower bound, footprint lower bound).

    Volume LB  = ceil(ΣV_item / V_container)
    Footprint LB = ceil(ΣA_item / A_floor)
        (assumes items can be packed arbitrarily in the height direction)

    The actual optimum is always ≥ this value.
    """
    if not items:
        return 0

    cv = CONTAINER_L * CONTAINER_W * CONTAINER_H
    ca = CONTAINER_L * CONTAINER_W

    lb_vol  = math.ceil(sum(i.volume    for i in items) / cv)
    lb_area = math.ceil(sum(i.footprint for i in items) / ca)

    return max(lb_vol, lb_area, 1)


# ── Local search ──────────────────────────────────────────────────────────────

def _local_search(bins: list[Bin], allow_rotation: bool) -> list[Bin]:
    """
    Iteratively try to eliminate the last bin:
    1. Deep-copy the earlier bins so failure leaves them untouched.
    2. Re-insert each item from the last bin into the copies using BFD order.
    3. If all items fit → commit (drop last bin) and repeat.
    4. Otherwise → stop.

    Items from the last bin are tried heaviest-first to improve fit chances.
    """
    while len(bins) > 1:
        last_items = sorted(
            (p.item for p in bins[-1].placed),
            key=lambda i: (-i.weight, -i.volume),
        )
        trial = copy.deepcopy(bins[:-1])

        all_placed = True
        for item in last_items:
            # BFD within the trial bins
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
            bins = trial          # commit: last bin eliminated
        else:
            break                 # no further improvement possible

    return bins


# ── Public API ────────────────────────────────────────────────────────────────

def pack(items: list[Item], allow_rotation: bool = True) -> PackResult:
    """
    Determine the minimum number of 20GP containers required to load all items.

    Parameters
    ----------
    items : list of Item
        The complete cargo manifest (one entry per physical unit).
    allow_rotation : bool
        Whether items may be rotated 90° horizontally (length ↔ width).

    Returns
    -------
    PackResult
        .bins          — list of Bin objects, each fully described
        .unplaced      — items that could not be packed (e.g. item too tall)
        .lower_bound   — theoretical minimum container count
        .stats         — summary dict for reporting
    """
    if not items:
        return PackResult(bins=[], unplaced=[], lower_bound=0, stats={})

    # Phase 1: sort — heaviest first, volume as tiebreaker
    sorted_items = sorted(items, key=lambda i: (-i.weight, -i.volume))
    lb           = compute_lower_bound(sorted_items)

    bins:     list[Bin]  = []
    unplaced: list[Item] = []

    # Phase 2: BFD greedy
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
            # Open a fresh container
            new_bin = Bin()
            pi = _try_place(item, new_bin, allow_rotation)
            if pi is not None:
                new_bin.placed.append(pi)
                _update_eps(new_bin, pi)
                bins.append(new_bin)
            else:
                unplaced.append(item)   # item is physically impossible to fit

    # Phase 3: local search
    bins = _local_search(bins, allow_rotation)

    # Stats
    cv          = CONTAINER_L * CONTAINER_W * CONTAINER_H
    total_vol   = sum(i.volume for i in items)
    total_kg    = sum(i.weight for i in items)
    n_bins      = len(bins)

    stats = {
        "num_containers":   n_bins,
        "lower_bound":      lb,
        "gap":              n_bins - lb,        # 0 → proven optimal
        "total_weight_kg":  round(total_kg, 2),
        "volume_util_pct":  round(total_vol / (n_bins * cv) * 100, 2) if n_bins else 0.0,
        "unplaced_count":   len(unplaced),
        "items_packed":     sum(len(b.placed) for b in bins),
    }

    return PackResult(bins=bins, unplaced=unplaced, lower_bound=lb, stats=stats)
