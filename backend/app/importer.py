"""
importer.py
===========
Parse cargo manifests from Excel (.xlsx / .xls) or JSON files.

Expected Excel columns (order-independent, case-insensitive, stripped):
    name | model | length | width | height | weight | allow_free_rotation (optional)

  allow_free_rotation accepts: 1 / 0, TRUE / FALSE, YES / NO (case-insensitive).
  Omitting the column is equivalent to all-False.

Expected JSON format:
    [{"name": "A-001", "model": "IM-100", "length": 800, "width": 600,
      "height": 1200, "weight": 120, "allow_free_rotation": false}, ...]

  "allow_free_rotation" key is optional; defaults to false when absent.
"""
from __future__ import annotations

import json
from io import BytesIO
from typing import Union

import openpyxl

from .models import Item


# Required column names (normalised)
_REQUIRED_COLS = {"name", "model", "length", "width", "height", "weight"}

# Optional columns and their defaults
_OPTIONAL_DEFAULTS: dict[str, object] = {"allow_free_rotation": False}

_NUMERIC_COLS = {"length", "width", "height", "weight"}

_TRUTHY = {"1", "true", "yes"}
_FALSY  = {"0", "false", "no", ""}


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
    # optional columns — only present when the sheet contains them
    opt_idx = {name: header.index(name) for name in _OPTIONAL_DEFAULTS if name in header}

    items: list[Item] = []
    for row_num, row in enumerate(rows[1:], start=2):
        try:
            raw = {k: row[idx] for k, idx in col_idx.items()}
            for name, default in _OPTIONAL_DEFAULTS.items():
                raw[name] = row[opt_idx[name]] if name in opt_idx else default
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
        # fill optional fields with defaults when absent
        for name, default in _OPTIONAL_DEFAULTS.items():
            normalised.setdefault(name, default)
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

    allow_free_rotation = _parse_bool(raw.get("allow_free_rotation", False), row_ref)

    return Item(
        name=name,
        model=model,
        length=floats["length"],
        width=floats["width"],
        height=floats["height"],
        weight=floats["weight"],
        allow_free_rotation=allow_free_rotation,
    )


def _parse_bool(value: object, row_ref: int) -> bool:
    """Coerce Excel/JSON cell values to bool for allow_free_rotation."""
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    s = str(value).strip().lower()
    if s in _TRUTHY:
        return True
    if s in _FALSY:
        return False
    raise ImportError(
        f"Row/item {row_ref}: 'allow_free_rotation' must be true/false/1/0, got {value!r}."
    )
