"""In-app product documentation routes.

Getting-started and API-reference content the SPA's docs screens render.
The architecture names no dedicated service for this content -- it is
served by api_gateway itself, since it is static content rather than
business logic. Kept as a stub, consistent with every other generated route,
until the sprint fills in the real markdown/html.
"""

from fastapi import APIRouter

from app.schemas import StubResponse

router = APIRouter(prefix="/api/docs", tags=["docs"])


@router.get("/getting-started", response_model=StubResponse)
async def getting_started() -> StubResponse:
    return StubResponse(endpoint="GET /api/docs/getting-started")


@router.get("/api-reference", response_model=StubResponse)
async def api_reference() -> StubResponse:
    return StubResponse(endpoint="GET /api/docs/api-reference")
