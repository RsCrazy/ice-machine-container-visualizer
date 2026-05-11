"""
FastAPI entry point for the Ice-Machine Container Loading Visualizer backend.

Start locally:
    uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import import_, pack

app = FastAPI(
    title="Ice-Machine Container Loading API",
    description="3D bin-packing optimiser for 20GP containers.",
    version="1.1.1",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pack.router,    prefix="/api/pack",   tags=["pack"])
app.include_router(import_.router, prefix="/api/import", tags=["import"])


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok"}
