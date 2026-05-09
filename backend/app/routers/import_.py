"""
POST /api/import
----------------
Upload an Excel (.xlsx) or JSON (.json) file with the cargo manifest.
The file is parsed and immediately packed; returns the same shape as /api/pack
plus the list of parsed items for the frontend to display/edit.
"""
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from ..importer import ImportError as ParseError
from ..importer import parse_excel, parse_json
from ..packing_engine import pack
from ..schemas import ImportPreview, ItemIn
from .pack import _build_response

router = APIRouter()

_EXCEL_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}
_JSON_TYPES = {"application/json", "text/plain"}


@router.post(
    "",
    response_model=ImportPreview,
    summary="Import cargo from Excel or JSON and pack immediately",
)
async def import_and_pack(
    file:           UploadFile = File(..., description="Excel (.xlsx) or JSON file"),
    allow_rotation: bool       = Form(True),
) -> ImportPreview:
    content = await file.read()

    filename = (file.filename or "").lower()
    ct       = (file.content_type or "").lower()

    if filename.endswith((".xlsx", ".xls")) or ct in _EXCEL_TYPES:
        try:
            items = parse_excel(content)
        except ParseError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail=str(exc)) from exc
    elif filename.endswith(".json") or ct in _JSON_TYPES:
        try:
            items = parse_json(content)
        except ParseError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail=str(exc)) from exc
    else:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.filename!r}. Upload .xlsx or .json.",
        )

    result       = pack(items, allow_rotation=allow_rotation)
    pack_resp    = _build_response(result)
    parsed_items = [
        ItemIn(
            name=i.name,
            model=i.model,
            length=i.length,
            width=i.width,
            height=i.height,
            weight=i.weight,
        )
        for i in items
    ]

    return ImportPreview(parsed_items=parsed_items, pack_result=pack_resp)
