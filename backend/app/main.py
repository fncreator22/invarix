from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app import errors
from app.api import account, api_keys, chat, data, ingest, integrations, memory, mcp, prediction, risk_alerts, system
from app.config import get_settings
from app.graph.client import close_db
from app.ids import new_id

structlog.configure(processors=[structlog.processors.TimeStamper(fmt="iso"), structlog.processors.JSONRenderer()])


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    s = get_settings()
    if not s.internal_tick_secret:
        structlog.get_logger().warning(
            "security.unconfigured_tick_secret",
            detail="INTERNAL_TICK_SECRET is unset; system tick endpoint will fail-closed.",
        )
    await system.bootstrap()
    yield
    await close_db()


app = FastAPI(title="INVARIX API", version="0.1.0", lifespan=lifespan)
errors.install(app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().web_origin.split(",")],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "If-Match", "Idempotency-Key", "X-Request-ID", "X-API-Key"],
    expose_headers=["X-Request-ID", "Retry-After"],
)


@app.middleware("http")
async def request_id(request: Request, call_next) -> Response:  # type: ignore[no-untyped-def]
    rid = request.headers.get("x-request-id") or new_id("req")
    request.state.request_id = rid[:64]
    structlog.contextvars.bind_contextvars(request_id=request.state.request_id)
    response: Response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response


app.include_router(system.router)
app.include_router(account.router, prefix="/api/v1")
app.include_router(api_keys.router, prefix="/api/v1")
app.include_router(risk_alerts.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(memory.router, prefix="/api/v1")
app.include_router(ingest.router, prefix="/api/v1")
app.include_router(prediction.router, prefix="/api/v1")
app.include_router(mcp.router, prefix="/api/v1")
app.include_router(data.router, prefix="/api/v1")
app.include_router(integrations.router, prefix="/api/v1")
