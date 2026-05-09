"""
Pydantic request / response schemas for the FastAPI layer.
All dimensions are millimetres, weight in kilograms.
"""
from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field, field_validator


# ── Request ───────────────────────────────────────────────────────────────────

class ItemIn(BaseModel):
    name:   str   = Field(..., examples=["A-001"])
    model:  str   = Field(..., examples=["IM-100"])
    length: float = Field(..., gt=0, description="mm")
    width:  float = Field(..., gt=0, description="mm")
    height: float = Field(..., gt=0, description="mm")
    weight: float = Field(..., gt=0, description="kg")


class PackRequest(BaseModel):
    items:          list[ItemIn] = Field(..., min_length=1)
    allow_rotation: bool         = True

    @field_validator("items")
    @classmethod
    def no_duplicate_names(cls, v: list[ItemIn]) -> list[ItemIn]:
        names = [i.name for i in v]
        if len(names) != len(set(names)):
            raise ValueError("item names must be unique")
        return v


# ── Response ──────────────────────────────────────────────────────────────────

class PlacedItemOut(BaseModel):
    name:          str
    model:         str
    x:             float
    y:             float
    z:             float
    eff_l:         float   # effective length after rotation
    eff_w:         float   # effective width  after rotation
    height:        float
    rotation:      int     # 0 or 90
    support_ratio: float
    weight:        float


class BinOut(BaseModel):
    index:          int    # 1-based
    placed:         list[PlacedItemOut]
    fill_ratio:     float
    total_weight_kg: float
    used_volume_mm3: float


class UnplacedItemOut(BaseModel):
    name:   str
    model:  str
    length: float
    width:  float
    height: float
    weight: float


class PackResponse(BaseModel):
    bins:        list[BinOut]
    unplaced:    list[UnplacedItemOut]
    lower_bound: int
    stats:       dict[str, Any]


# ── Import preview (before packing) ──────────────────────────────────────────

class ImportPreview(BaseModel):
    """Parsed items returned alongside the pack result when importing a file."""
    parsed_items: list[ItemIn]
    pack_result:  PackResponse
