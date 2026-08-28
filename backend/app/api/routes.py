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
    try:
        while True:
            await websocket.send_json((await websocket.app.state.store.get()).model_dump(mode="json"))
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        return
