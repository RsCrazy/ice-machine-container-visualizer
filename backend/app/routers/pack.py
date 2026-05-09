"""
POST /api/pack
--------------
Accepts a JSON cargo manifest, runs the packing algorithm, returns full result.
"""
from fastapi import APIRouter

from ..models import Item
from ..packing_engine import pack
from ..schemas import BinOut, PackRequest, PackResponse, PlacedItemOut, UnplacedItemOut

router = APIRouter()


def _build_response(result) -> PackResponse:
    bins_out = []
    for idx, b in enumerate(result.bins, start=1):
        placed_out = [
            PlacedItemOut(
                name=p.item.name,
                model=p.item.model,
                x=round(p.x, 2),
                y=round(p.y, 2),
                z=round(p.z, 2),
                eff_l=round(p.eff_l, 2),
                eff_w=round(p.eff_w, 2),
                height=round(p.item.height, 2),
                rotation=p.rotation,
                support_ratio=round(p.support_ratio, 4),
                weight=round(p.item.weight, 2),
            )
            for p in b.placed
        ]
        bins_out.append(
            BinOut(
                index=idx,
                placed=placed_out,
                fill_ratio=round(b.fill_ratio, 4),
                total_weight_kg=round(b.total_weight, 2),
                used_volume_mm3=round(b.used_volume, 0),
            )
        )

    unplaced_out = [
        UnplacedItemOut(
            name=u.name,
            model=u.model,
            length=u.length,
            width=u.width,
            height=u.height,
            weight=u.weight,
        )
        for u in result.unplaced
    ]

    return PackResponse(
        bins=bins_out,
        unplaced=unplaced_out,
        lower_bound=result.lower_bound,
        stats=result.stats,
    )


@router.post("", response_model=PackResponse, summary="Pack cargo into containers")
def pack_items(req: PackRequest) -> PackResponse:
    items = [
        Item(
            name=i.name,
            model=i.model,
            length=i.length,
            width=i.width,
            height=i.height,
            weight=i.weight,
        )
        for i in req.items
    ]
    result = pack(items, allow_rotation=req.allow_rotation)
    return _build_response(result)
