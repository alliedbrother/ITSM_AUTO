"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes.health import router as health_router
from .api.routes.chat import router as chat_router
from .api.routes.auth import router as auth_router
from .api.routes.issues import router as issues_router
from .api.routes.ws import router as ws_router
from .config.settings import get_settings
from .config.database import init_db, close_db
from .services.websocket_client import start_paperclip_listener, stop_paperclip_listener


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    # Startup
    await init_db()
    await start_paperclip_listener()
    yield
    # Shutdown
    await stop_paperclip_listener()
    await close_db()


app = FastAPI(
    title="ITSM Chat API",
    description="Conversational interface for creating ITSM issues",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://chat.mlinterviewnotes.com",
        "https://itsm.mlinterviewnotes.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router, prefix="/api", tags=["health"])
app.include_router(auth_router, prefix="/api", tags=["auth"])
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(issues_router, prefix="/api", tags=["issues"])
app.include_router(ws_router, prefix="/api", tags=["websocket"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "ITSM Chat API",
        "version": "2.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(app, host="0.0.0.0", port=settings.api_port)
