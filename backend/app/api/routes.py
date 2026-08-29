import asyncio

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect, status
from fastapi.responses import JSONResponse

from app.models import DashboardSnapshot

router = APIRouter()


@router.get("/health")
async def health(request: Request) -> JSONResponse:
    try:
        redis_ok = await request.app.state.store.ping()
    except Exception:
        redis_ok = False
    tasks = request.app.state.background_tasks
    task_health = {name: not task.done() for name, task in tasks.items()}
    healthy = redis_ok and all(task_health.values())
    return JSONResponse(
        status_code=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "healthy" if healthy else "degraded", "redis": redis_ok, **task_health},
    )


@router.get("/snapshot", response_model=DashboardSnapshot)
async def snapshot(request: Request) -> DashboardSnapshot:
    return await request.app.state.store.get()


@router.websocket("/ws")
async def dashboard_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    last_signature: tuple[str, object, str] | None = None
    try:
        while True:
            current = await websocket.app.state.store.get()
            signature = (current.status, current.last_updated, current.message)
            if signature != last_signature:
                await websocket.send_text(current.model_dump_json())
                last_signature = signature
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return
