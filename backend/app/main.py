import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db import engine, initialise_database
from app.services.opensky import OpenSkyCollector
from app.services.processor import AircraftEventProcessor
from app.services.store import SnapshotStore

settings = get_settings()
configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await initialise_database()
    store = SnapshotStore()
    collector = OpenSkyCollector(settings, store)
    processor = AircraftEventProcessor(settings, store)
    app.state.store = store
    processor_task = asyncio.create_task(processor.start(), name="aircraft-processor")
    collector_task = asyncio.create_task(collector.start(), name="opensky-collector")
    yield
    await collector.stop()
    await processor.stop()
    for task in (collector_task, processor_task):
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task
    await store.close()
    await engine.dispose()


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.include_router(router, prefix=settings.api_prefix)


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": settings.app_name, "docs": "/docs", "health": f"{settings.api_prefix}/health"}
