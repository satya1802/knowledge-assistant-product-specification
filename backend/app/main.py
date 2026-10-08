"""Application entrypoint.

Generated from the approved architecture: one router per component that owns
endpoints, one route per endpoint the API spec declares. Every generated route
is a stub that returns a typed placeholder, so the service starts, serves its
OpenAPI document and passes its tests before a single handler is implemented.
"""

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401 -- imported so the tables register before create_all
from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.logging_filter import install_redacting_filter
from app.routers import auth, chat, conversations, docs, documents
from app.services.auth import bootstrap_admin, require_session

# Installed before anything else logs, so no log line -- from this module,
# uvicorn's own access/error logs, or any handler -- can ever contain the
# Gemini API key or the admin password configured in backend/.env.
install_redacting_filter()

_DESCRIPTION = """\
Knowledge Assistant · Product specification

Build an enterprise RAG chatbot called "Knowledge Assistant" that answers
employees' questions from a shared, company-wide knowledge base.

Sign-in (email and password, no SSO)
- Users sign in with email and password, can create an account (admins can
  turn this off), log out and change their password.
- Passwords are stored securely hashed. Sessions use a secure, HTTP-only
  cookie.
- After 5 failed sign-ins in 15 minutes, that email is locked out for 15
  minutes. A wrong email and a wrong password show the same error.
- Accounts:
  - The first account (or an admin email and password set in a .env file)
    becomes the administrator.
  - There's no email service, so admins reset forgotten passwords.
  - Disabling an account logs that user out immediately.
- Users page (admins only): list, search, add a user, make or remove admin,
  disable or enable, reset password. Admins can't disable or demote
  themselves.

AI provider
- The bot runs on a Google Gemini API key, set in a gitignored backend/.env
  and never shown or logged.
- It uses a fast Gemini Flash-Lite model for answers, Gemini embeddings for
  search, and a Gemini image model for image generation. All are
  configurable.
- It must stay fast (first words in about 2 seconds) and never time out
  while Gemini is busy:
  - send keep-alive pings during slow responses;
  - retry automatically when Gemini is overloaded or rate-limited;
  - use minimal model "thinking".
- An offline fallback mode works without any key, for local testing.

Knowledge base
- Users upload PDF, DOCX, TXT and Markdown files, which are processed and
  searchable within seconds.
- The page shows stats (total, ready, processing, failed), an upload
  dropzone, and a document table with status, search, filter, download and
  delete.
- Uploads are shared with everyone.

Answers
- Every answer is searched from the documents first, streams in live and
  cites its sources. Clicking a numbered source chip opens a side panel.
"""

app = FastAPI(
    title="Knowledge Assistant · Product specification",
    description=_DESCRIPTION,
    version="0.1.0",
)

# The SPA runs on a different origin than the API, so the browser refuses its calls
# unless that origin is allowed here. In development that is the Vite dev server; when
# deployed, the platform injects the frontend's real URL as ALLOWED_ORIGINS (comma
# separated). Point ALLOWED_ORIGINS at the real thing and nothing else has to change.
#
# Read via config_svc's `Settings` (not `os.getenv` directly): `Settings` parses
# `backend/.env` as well as the process environment, so a value set only in the
# gitignored .env file -- the normal way to configure a local or self-hosted
# deployment -- is honoured here exactly like every other setting, instead of
# silently falling back to the dev origins because it was never exported into
# the process environment itself.
_dev_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
_allowed_origins = [o.strip() for o in get_settings().allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins or _dev_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# The scaffold ships no migrations, so the tables are created from the models on
# startup. Replace this with Alembic before anything holds data worth keeping.
Base.metadata.create_all(bind=engine)

# AC-003: if ADMIN_EMAIL/ADMIN_PASSWORD are set in backend/.env, that admin
# account is created once at startup (idempotent across restarts).
_bootstrap_db = SessionLocal()
try:
    bootstrap_admin(_bootstrap_db, get_settings())
finally:
    _bootstrap_db.close()

app.include_router(auth.router)
# AC-009: every endpoint other than register, login, /auth/me and the public
# docs requires a valid session; wired here rather than inside each router so
# documents_svc/chat_svc/conv_svc's own handlers stay untouched.
app.include_router(documents.router, dependencies=[Depends(require_session)])
app.include_router(chat.router, dependencies=[Depends(require_session)])
app.include_router(conversations.router, dependencies=[Depends(require_session)])
app.include_router(docs.router)


@app.middleware("http")
async def no_store_for_api(request: Request, call_next):
    """AC-008: authenticated responses carry no-store cache headers so a
    back-button replay after logout cannot reveal previously-rendered data."""
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
    return response


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe, and the only route here that is not a stub."""
    return {"status": "ok"}
