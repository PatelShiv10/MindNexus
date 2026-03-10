import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs every incoming request (method + path + status code + duration).
    Equivalent to the global request logger in index.js.
    """

    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        print(f"{request.method} {request.url.path}  →  {response.status_code}  [{duration_ms:.1f}ms]")
        return response
