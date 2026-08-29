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
    store = SnapshotStore()
    collector = OpenSkyCollector(settings, store)
    processor = AircraftEventProcessor(settings, store)
    background_tasks: dict[str, asyncio.Task] = {}
    try:
        await initialise_database()
        app.state.store = store
        processor_task = asyncio.create_task(processor.start(), name="aircraft-processor")
        background_tasks["processor"] = processor_task
        app.state.background_tasks = background_tasks

        ready_task = asyncio.create_task(processor.ready.wait(), name="processor-ready")
        done, _ = await asyncio.wait(
            {processor_task, ready_task},
            timeout=30,
            return_when=asyncio.FIRST_COMPLETED,
        )
        if processor_task in done:
            ready_task.cancel()
            await processor_task
            raise RuntimeError("Kafka consumer stopped during application startup")
        if ready_task not in done:
            ready_task.cancel()
            raise TimeoutError("Kafka consumer did not become ready within 30 seconds")
        ready_task.cancel()
        with suppress(asyncio.CancelledError):
            await ready_task

        collector_task = asyncio.create_task(collector.start(), name="opensky-collector")
        background_tasks["collector"] = collector_task
        yield
    finally:
        await collector.stop()
        for task in background_tasks.values():
            task.cancel()
        for task in background_tasks.values():
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
