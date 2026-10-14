"""RFC 7807 problem details (03 §10.6)."""

from typing import Any

import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

log = structlog.get_logger()

TITLES = {
    "UNAUTHENTICATED": "Sign in required",
    "EMAIL_NOT_VERIFIED": "Email not verified",
    "NOT_FOUND": "Not found",
    "FORBIDDEN": "Not allowed",
    "VALIDATION_ERROR": "Invalid input",
    "VERSION_CONFLICT": "Version conflict",
    "INVARIANT_VIOLATION": "Not allowed in this state",
    "WORKSPACE_DATA_MISSING": "Workspace data missing",
    "WORKSPACE_PROVISIONING": "Workspace is provisioning",
    "QUOTA_EXCEEDED": "Quota exceeded",
    "RATE_LIMITED": "Too many requests",
    "LLM_UNAVAILABLE": "AI unavailable",
    "AI_DISABLED": "AI is turned off",
    "INTERNAL": "Something went wrong",
}
STATUS = {
    "UNAUTHENTICATED": 401,
    "EMAIL_NOT_VERIFIED": 403,
    "NOT_FOUND": 404,
    "FORBIDDEN": 403,
    "VALIDATION_ERROR": 422,
    "VERSION_CONFLICT": 409,
    "INVARIANT_VIOLATION": 409,
    "WORKSPACE_DATA_MISSING": 409,
    "WORKSPACE_PROVISIONING": 409,
    "QUOTA_EXCEEDED": 402,
    "RATE_LIMITED": 429,
    "LLM_UNAVAILABLE": 503,
    "AI_DISABLED": 409,
    "INTERNAL": 500,
}


class ApiError(Exception):
    def __init__(
        self,
        code: str,
        detail: str | None = None,
        errors: list[dict[str, Any]] | None = None,
        headers: dict[str, str] | None = None,
    ):
        self.code, self.detail, self.errors, self.headers = code, detail, errors, headers


def not_found(what: str = "resource") -> ApiError:
    return ApiError("NOT_FOUND", f"We can't find that {what}.")


def problem(
    request: Request,
    code: str,
    detail: str | None = None,
    errors: list[dict[str, Any]] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    status = STATUS[code]
    body: dict[str, Any] = {
        "type": f"https://reprieve.app/errors/{code.lower().replace('_', '-')}",
        "title": TITLES[code],
        "status": status,
        "detail": detail,
        "code": code,
        "request_id": getattr(request.state, "request_id", ""),
    }
    if errors:
        body["errors"] = errors
    return JSONResponse(body, status_code=status, headers=headers, media_type="application/problem+json")


def install(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api(request: Request, exc: ApiError) -> JSONResponse:
        return problem(request, exc.code, exc.detail, exc.errors, exc.headers)

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [{"field": ".".join(str(x) for x in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
        return problem(request, "VALIDATION_ERROR", "Some fields need attention.", errors)

    @app.exception_handler(Exception)
    async def _internal(request: Request, exc: Exception) -> JSONResponse:
        log.exception("unhandled", path=request.url.path)
        return problem(request, "INTERNAL", "We hit an unexpected error. Try again.")
