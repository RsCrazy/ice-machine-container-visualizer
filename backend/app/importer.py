"""
importer.py
===========
Parse cargo manifests from Excel (.xlsx / .xls) or JSON files.

Expected Excel columns (order-independent, case-insensitive, stripped):
    name | model | length | width | height | weight

Expected JSON format:
    [{"name": "A-001", "model": "IM-100", "length": 800, "width": 600,
      "height": 1200, "weight": 120}, ...]
"""
from __future__ import annotations

import json
from io import BytesIO
from typing import Union

import openpyxl

from .models import Item


# Required column names (normalised)
_REQUIRED_COLS = {"name", "model", "length", "width", "height", "weight"}

_NUMERIC_COLS = {"length", "width", "height", "weight"}


class ImportError(ValueError):
    """Raised when the uploaded file cannot be parsed into a valid item list."""


def _normalise(s: str) -> str:
    return s.strip().lower()


def parse_excel(data: bytes) -> list[Item]:
    try:
        wb = openpyxl.load_workbook(BytesIO(data), data_only=True)
    except Exception as exc:
        raise ImportError(f"Cannot open workbook: {exc}") from exc

    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))

    if len(rows) < 2:
        raise ImportError("Spreadsheet must have a header row and at least one data row.")

    # Detect header row
    header = [_normalise(str(c)) if c is not None else "" for c in rows[0]]
    missing = _REQUIRED_COLS - set(header)
    if missing:
        raise ImportError(f"Missing column(s): {', '.join(sorted(missing))}")

    col_idx = {name: header.index(name) for name in _REQUIRED_COLS}

    items: list[Item] = []
    for row_num, row in enumerate(rows[1:], start=2):
        try:
            raw = {k: row[idx] for k, idx in col_idx.items()}
            item = _row_to_item(raw, row_num)
            items.append(item)
        except ImportError:
            raise
        except Exception as exc:
            raise ImportError(f"Row {row_num}: {exc}") from exc

    if not items:
        raise ImportError("No data rows found after the header.")

    return items


def parse_json(data: Union[bytes, str]) -> list[Item]:
    try:
        payload = json.loads(data)
    except json.JSONDecodeError as exc:
        raise ImportError(f"Invalid JSON: {exc}") from exc

    if not isinstance(payload, list):
        raise ImportError("JSON root must be an array of item objects.")

    items: list[Item] = []
    for idx, obj in enumerate(payload):
        if not isinstance(obj, dict):
            raise ImportError(f"Item {idx}: expected an object, got {type(obj).__name__}.")
        missing = _REQUIRED_COLS - {_normalise(k) for k in obj}
        if missing:
            raise ImportError(f"Item {idx}: missing field(s): {', '.join(sorted(missing))}")
        normalised = {_normalise(k): v for k, v in obj.items()}
        items.append(_row_to_item(normalised, idx))

    if not items:
        raise ImportError("JSON array is empty.")

    return items


def _row_to_item(raw: dict, row_ref: int) -> Item:
    """Convert a raw dict (keys already normalised) to an Item, validating types."""
    name  = str(raw["name"]).strip()
    model = str(raw["model"]).strip()
    if not name:
        raise ImportError(f"Row/item {row_ref}: 'name' must not be empty.")
    if not model:
        raise ImportError(f"Row/item {row_ref}: 'model' must not be empty.")

    floats: dict[str, float] = {}
    for col in ("length", "width", "height", "weight"):
        val = raw[col]
        try:
            fval = float(val)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            raise ImportError(f"Row/item {row_ref}: '{col}' must be a number, got {val!r}.")
        if fval <= 0:
            raise ImportError(f"Row/item {row_ref}: '{col}' must be > 0, got {fval}.")
        floats[col] = fval

    return Item(
        name=name,
        model=model,
        length=floats["length"],
        width=floats["width"],
        height=floats["height"],
        weight=floats["weight"],
    )
