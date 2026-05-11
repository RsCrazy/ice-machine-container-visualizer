"""
Pydantic request / response schemas for the FastAPI layer.
All dimensions are millimetres, weight in kilograms.
"""
from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field, field_validator

from .models import CONTAINER_H, CONTAINER_L, CONTAINER_W


# ── Container type ────────────────────────────────────────────────────────────

class ContainerTypeIn(BaseModel):
    name:     str   = Field(..., examples=["20GP"])
    length:   float = Field(..., gt=0, description="inner length mm")
    width:    float = Field(..., gt=0, description="inner width mm")
    height:   float = Field(..., gt=0, description="inner height mm")
    cost_usd: float = Field(0.0, ge=0, description="price per unit USD")


_DEFAULT_20GP = ContainerTypeIn(
    name="20GP",
    length=CONTAINER_L,
    width=CONTAINER_W,
    height=CONTAINER_H,
    cost_usd=0.0,
)


# ── Request ───────────────────────────────────────────────────────────────────

class ItemIn(BaseModel):
    name:                str   = Field(..., examples=["A-001"])
    model:               str   = Field(..., examples=["IM-100"])
    length:              float = Field(..., gt=0, description="mm")
    width:               float = Field(..., gt=0, description="mm")
    height:              float = Field(..., gt=0, description="mm")
    weight:              float = Field(..., gt=0, description="kg")
    allow_free_rotation: bool  = False


class PackRequest(BaseModel):
    items:           list[ItemIn]          = Field(..., min_length=1)
    allow_rotation:  bool                  = True
    container_types: list[ContainerTypeIn] = Field(
        default_factory=lambda: [_DEFAULT_20GP]
    )

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
    eff_l:         float
    eff_w:         float
    height:        float   # effective placed height (eff_h)
    rotation:      int     # 0–5
    support_ratio: float
    weight:        float


class CostComparisonItem(BaseModel):
    type_name:  str
    num_bins:   int
    total_cost: float


class BinOut(BaseModel):
    index:           int
    container_type:  str
    container_l:     float
    container_w:     float
    container_h:     float
    placed:          list[PlacedItemOut]
    fill_ratio:      float
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
    bins:            list[BinOut]
    unplaced:        list[UnplacedItemOut]
    lower_bound:     int
    stats:           dict[str, Any]
    cost_comparison: list[CostComparisonItem] = Field(default_factory=list)


# ── Import preview (before packing) ──────────────────────────────────────────

class ImportPreview(BaseModel):
    """Parsed items returned alongside the pack result when importing a file."""
    parsed_items: list[ItemIn]
    pack_result:  PackResponse
