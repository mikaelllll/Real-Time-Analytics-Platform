import asyncio

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.get("/health")
async def health(request: Request) -> dict:
    redis_ok = await request.app.state.store.ping()
    return {"status": "healthy" if redis_ok else "degraded", "redis": redis_ok}


@router.get("/snapshot")
async def snapshot(request: Request):
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
