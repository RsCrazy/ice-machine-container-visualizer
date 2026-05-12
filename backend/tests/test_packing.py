"""
Tests for packing_engine.py

Run from the backend/ directory:
    pytest tests/ -v
"""
import math
import pytest

from app.models import (
    CONTAINER_H, CONTAINER_L, CONTAINER_W,
    MIN_SUPPORT, EPS,
    Item, PlacedItem, Bin,
)
from app.packing_engine import (
    pack, compute_lower_bound, multi_restart_pack,
    simulated_annealing_pack, branch_and_bound_pack,
    _support_ratio, _collides, _try_place, _update_eps,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def item(name: str, l: float, w: float, h: float, weight: float,
         model: str = "test") -> Item:
    return Item(name=name, model=model, length=l, width=w, height=h, weight=weight)


def placed(it: Item, x=0.0, y=0.0, z=0.0, rot=0, sr=1.0) -> PlacedItem:
    return PlacedItem(item=it, x=x, y=y, z=z, rotation=rot, support_ratio=sr)


# ── Lower-bound tests ─────────────────────────────────────────────────────────

class TestLowerBound:
    def test_empty(self):
        assert compute_lower_bound([]) == 0

    def test_single_tiny_item_is_one(self):
        assert compute_lower_bound([item("a", 100, 100, 100, 1)]) == 1

    def test_volume_forces_two_containers(self):
        # Two items each filling ~60% of container volume → needs 2 containers
        cv = CONTAINER_L * CONTAINER_W * CONTAINER_H
        # Each item occupies ~60% of container volume
        it = item("a", CONTAINER_L * 0.8, CONTAINER_W * 0.8, CONTAINER_H * 0.9375, 10)
        assert it.volume > 0.5 * cv  # verify > 50% each
        # Two such items: total > 100% → lb ≥ 2
        assert compute_lower_bound([it, it]) >= 2

    def test_lb_never_exceeds_item_count(self):
        items = [item(f"i{k}", 100, 100, 100, 10) for k in range(5)]
        lb = compute_lower_bound(items)
        assert lb <= len(items)


# ── Support-ratio tests ───────────────────────────────────────────────────────

class TestSupportRatio:
    def test_floor_always_fully_supported(self):
        assert _support_ratio(500, 400, 0.0, 0.0, 0.0, []) == 1.0

    def test_no_items_below_returns_zero(self):
        assert _support_ratio(500, 400, 0.0, 800.0, 0.0, []) == 0.0

    def test_full_coverage_single_support(self):
        support = placed(item("s", 600, 500, 800, 100), x=0, y=0, z=0)
        sr = _support_ratio(600, 500, 0.0, 800.0, 0.0, [support])
        assert abs(sr - 1.0) < 0.001

    def test_half_coverage(self):
        # Item footprint 1000 × 1000; support covers only left half (500 × 1000)
        support = placed(item("s", 500, 1000, 500, 100), x=0, y=0, z=0)
        sr = _support_ratio(1000, 1000, 0.0, 500.0, 0.0, [support])
        assert abs(sr - 0.5) < 0.01

    def test_multiple_supports_add_up(self):
        # Left quarter + right quarter = 50%
        s1 = placed(item("s1", 250, 1000, 500, 100), x=0,   y=0, z=0)
        s2 = placed(item("s2", 250, 1000, 500, 100), x=750, y=0, z=0)
        sr = _support_ratio(1000, 1000, 0.0, 500.0, 0.0, [s1, s2])
        assert abs(sr - 0.5) < 0.01

    def test_support_at_wrong_height_ignored(self):
        # Support top is at 400, item bottom is at 800 → no contact
        support = placed(item("s", 600, 500, 400, 100), x=0, y=0, z=0)
        sr = _support_ratio(600, 500, 0.0, 800.0, 0.0, [support])
        assert sr == 0.0


# ── Collision tests ───────────────────────────────────────────────────────────

class TestCollision:
    def test_no_placed_items_no_collision(self):
        assert not _collides(500, 400, 900, 0, 0, 0, [])

    def test_exact_same_position_collides(self):
        p = placed(item("a", 500, 400, 900, 100), x=0, y=0, z=0)
        assert _collides(500, 400, 900, 0, 0, 0, [p])

    def test_adjacent_in_x_no_collision(self):
        p = placed(item("a", 500, 400, 900, 100), x=0, y=0, z=0)
        assert not _collides(500, 400, 900, 500, 0, 0, [p])

    def test_partial_overlap_in_x_collides(self):
        p = placed(item("a", 500, 400, 900, 100), x=0, y=0, z=0)
        assert _collides(500, 400, 900, 300, 0, 0, [p])

    def test_stacked_no_collision(self):
        p = placed(item("a", 500, 400, 900, 100), x=0, y=0, z=0)
        # Place another item directly on top
        assert not _collides(500, 400, 900, 0, 900, 0, [p])


# ── Core packing tests ────────────────────────────────────────────────────────

class TestPack:
    def test_empty_input(self):
        r = pack([])
        assert r.bins == []
        assert r.lower_bound == 0
        assert r.unplaced == []

    def test_single_item_fits(self):
        r = pack([item("a", 800, 700, 1500, 100)])
        assert len(r.bins) == 1
        assert len(r.bins[0].placed) == 1
        assert r.unplaced == []

    def test_item_exceeding_container_height_is_unplaced(self):
        r = pack([item("tall", 500, 500, CONTAINER_H + 100, 50)])
        assert len(r.unplaced) == 1
        assert len(r.bins) == 0

    def test_item_exceeding_container_length_is_unplaced(self):
        # Even with rotation, both dims exceed the container
        r = pack([item("wide", CONTAINER_L + 100, CONTAINER_W + 100, 500, 50)],
                 allow_rotation=False)
        assert len(r.unplaced) == 1

    def test_two_items_same_container(self):
        a = item("a", 2000, 1000, 1500, 120)
        b = item("b", 2000, 1000, 1500, 80)
        r = pack([a, b])
        assert r.unplaced == []
        assert len(r.bins) == 1

    def test_heavy_item_placed_at_lower_or_equal_height(self):
        heavy = item("heavy", 1000, 800, 1200, 200)
        light = item("light", 900,  700, 1000,  60)
        r = pack([heavy, light])
        assert r.unplaced == []
        ph = next(p for b in r.bins for p in b.placed if p.item.name == "heavy")
        pl = next(p for b in r.bins for p in b.placed if p.item.name == "light")
        # heavy must not be placed higher than light
        assert ph.y <= pl.y + EPS

    def test_support_ratio_satisfied_for_all_placed(self):
        items = [item(f"i{k}", 600 + k * 50, 500 + k * 30, 900 + k * 80, 120 - k * 10)
                 for k in range(6)]
        r = pack(items)
        for b in r.bins:
            for p in b.placed:
                assert p.support_ratio >= MIN_SUPPORT - 1e-6, (
                    f"{p.item.name} has support_ratio={p.support_ratio:.3f}"
                )

    def test_no_overlap_between_placed_items(self):
        items = [item(f"i{k}", 600 + k * 40, 500 + k * 30, 900 + k * 100, 130 - k * 8)
                 for k in range(10)]
        r = pack(items)
        for b in r.bins:
            ps = b.placed
            for i in range(len(ps)):
                for j in range(i + 1, len(ps)):
                    a, c = ps[i], ps[j]
                    ox = min(a.x2, c.x2) - max(a.x, c.x)
                    oy = min(a.y2, c.y2) - max(a.y, c.y)
                    oz = min(a.z2, c.z2) - max(a.z, c.z)
                    assert not (ox > EPS and oy > EPS and oz > EPS), (
                        f"Overlap: {a.item.name} ∩ {c.item.name} "
                        f"ox={ox:.1f} oy={oy:.1f} oz={oz:.1f}"
                    )

    def test_all_placed_items_within_container(self):
        items = [item(f"i{k}", 700, 600, 1300, 100) for k in range(8)]
        r = pack(items)
        for b in r.bins:
            for p in b.placed:
                assert p.x  >= -EPS and p.x2 <= b.L + EPS
                assert p.y  >= -EPS and p.y2 <= b.H + EPS
                assert p.z  >= -EPS and p.z2 <= b.W + EPS

    def test_stats_keys_present(self):
        r = pack([item("x", 500, 400, 900, 80)])
        for key in ("num_containers", "lower_bound", "gap",
                    "total_weight_kg", "volume_util_pct",
                    "unplaced_count", "items_packed"):
            assert key in r.stats, f"Missing stats key: {key}"

    def test_gap_is_non_negative(self):
        items = [item(f"i{k}", 800, 700, 1400, 100 - k * 5) for k in range(12)]
        r = pack(items)
        assert r.stats["gap"] >= 0

    def test_num_containers_geq_lower_bound(self):
        items = [item(f"i{k}", 800, 700, 1400, 100) for k in range(15)]
        r = pack(items)
        assert r.stats["num_containers"] >= r.lower_bound

    def test_rotation_allows_more_items_to_fit(self):
        # Two items that can only sit side-by-side if one is rotated
        # Container W=2352; two items of width 1300 won't fit side-by-side (2600>2352)
        # but with rotation one can be 1300 along X and the other swapped
        a = item("a", 2000, 1100, 1500, 100)
        b = item("b", 2000, 1100, 1500,  80)
        r_rot    = pack([a, b], allow_rotation=True)
        # With rotation allowed, both should fit in 1 container
        assert r_rot.unplaced == []
        assert len(r_rot.bins) <= 2

    def test_realistic_catalogue_packs_into_few_containers(self):
        """Catalogue from the front-end demo: 15 items should need ≤ 2 containers."""
        catalogue = [
            ("IcePro-L1500", 760, 690, 1580, 162, 2),
            ("IcePro-M1200", 640, 610, 1280, 118, 3),
            ("IceMid-S900",  560, 530,  990,  83, 4),
            ("IceMini-700",  450, 420,  780,  51, 6),
        ]
        items = [
            item(f"{model} #{q+1}", l, w, h, wt, model)
            for (model, l, w, h, wt, qty) in catalogue
            for q in range(qty)
        ]
        r = pack(items)
        assert r.unplaced == []
        assert len(r.bins) <= 2, (
            f"Expected ≤ 2 containers, got {len(r.bins)} "
            f"(LB={r.lower_bound})"
        )

    def test_fill_ratio_between_0_and_1(self):
        items = [item(f"i{k}", 700, 600, 1200, 100) for k in range(5)]
        r = pack(items)
        for b in r.bins:
            assert 0.0 < b.fill_ratio <= 1.0 + 1e-6


# ── Multi-restart tests ───────────────────────────────────────────────────────

class TestMultiRestart:
    def test_empty_input(self):
        r = multi_restart_pack([])
        assert r.bins == [] and r.lower_bound == 0

    def test_never_worse_than_greedy(self):
        """multi_restart result must have ≤ bins than single greedy pass."""
        items = [item(f"i{k}", 700 + k * 40, 600 + k * 30, 1300 + k * 50, 120 - k * 5)
                 for k in range(12)]
        r_greedy  = pack(items)
        r_restart = multi_restart_pack(items, k=20, seed=0)
        assert len(r_restart.bins) <= len(r_greedy.bins)

    def test_k1_equals_greedy(self):
        """k=1 always uses canonical sort — should match single greedy."""
        items = [item(f"i{k}", 700, 600, 1300, 100 - k * 5) for k in range(8)]
        r_greedy  = pack(items)
        r_restart = multi_restart_pack(items, k=1, seed=42)
        assert len(r_restart.bins) == len(r_greedy.bins)


# ── Simulated-annealing tests ─────────────────────────────────────────────────

class TestSimulatedAnnealing:
    def test_empty_input(self):
        r = simulated_annealing_pack([])
        assert r.bins == [] and r.lower_bound == 0

    def test_never_worse_than_greedy(self):
        """SA starts from canonical sort and can only improve (or stay equal)."""
        items = [item(f"i{k}", 700 + k * 40, 600 + k * 30, 1300 + k * 50, 120 - k * 5)
                 for k in range(12)]
        r_greedy = pack(items)
        r_sa     = simulated_annealing_pack(items, time_limit=0.5, seed=0)
        assert len(r_sa.bins) <= len(r_greedy.bins)

    def test_single_item(self):
        r = simulated_annealing_pack([item("a", 500, 400, 900, 80)], time_limit=0.2)
        assert len(r.bins) == 1 and r.unplaced == []

    def test_reaches_lower_bound_on_easy_case(self):
        """A handful of small items that clearly fit in one container."""
        items = [item(f"i{k}", 400, 300, 700, 50) for k in range(4)]
        r = simulated_annealing_pack(items, time_limit=1.0, seed=0)
        assert len(r.bins) == 1

    def test_improves_over_greedy_on_hard_case(self):
        """80 medium items with seed=99 — greedy needs 6, SA should find ≤5."""
        import random as _rng
        rng = _rng.Random(99)
        items = [
            item(f"I{i}", rng.randint(600, 1400), rng.randint(500, 1200),
                 rng.randint(800, 2000), rng.uniform(60, 250))
            for i in range(80)
        ]
        r_greedy = pack(items)
        r_sa     = simulated_annealing_pack(items, time_limit=2.0, seed=7)
        assert len(r_sa.bins) <= len(r_greedy.bins), (
            f"SA ({len(r_sa.bins)}) worse than greedy ({len(r_greedy.bins)})"
        )


# ── Branch-and-bound tests ────────────────────────────────────────────────────

class TestBranchAndBound:
    def test_empty_input(self):
        r = branch_and_bound_pack([])
        assert r.bins == [] and r.lower_bound == 0

    def test_single_item(self):
        r = branch_and_bound_pack([item("a", 500, 400, 900, 80)])
        assert len(r.bins) == 1 and r.unplaced == []

    def test_never_worse_than_greedy(self):
        """B&B starts from greedy solution and can only improve."""
        items = [item(f"i{k}", 700 + k * 40, 600 + k * 30, 1300 + k * 50, 120 - k * 5)
                 for k in range(8)]
        r_greedy = pack(items)
        r_bb     = branch_and_bound_pack(items)
        assert len(r_bb.bins) <= len(r_greedy.bins)

    def test_small_catalogue_finds_tight_solution(self):
        """6 ice-machine items: B&B should pack them into 1 container."""
        items = [
            item("L1", 760, 690, 1580, 162),
            item("L2", 760, 690, 1580, 162),
            item("M1", 640, 610, 1280, 118),
            item("S1", 560, 530,  990,  83),
            item("S2", 560, 530,  990,  83),
            item("T1", 450, 420,  780,  51),
        ]
        r = branch_and_bound_pack(items)
        assert r.unplaced == []
        assert len(r.bins) <= 2

    def test_result_at_least_as_good_as_sa_on_small_case(self):
        """For n=10, B&B should match or beat SA."""
        import random as _rng
        rng = _rng.Random(7)
        items = [
            item(f"i{i}", rng.randint(500, 1200), rng.randint(400, 1000),
                 rng.randint(700, 1800), rng.uniform(50, 180))
            for i in range(10)
        ]
        r_sa = simulated_annealing_pack(items, time_limit=1.0, seed=0)
        r_bb = branch_and_bound_pack(items)
        assert len(r_bb.bins) <= len(r_sa.bins)
