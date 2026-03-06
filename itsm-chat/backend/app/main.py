"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes.health import router as health_router
from .api.routes.chat import router as chat_router
from .config.settings import get_settings

app = FastAPI(
    title="ITSM Chat API",
    description="Conversational interface for creating ITSM issues",
    version="1.0.0"
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
app.include_router(chat_router, prefix="/api", tags=["chat"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "ITSM Chat API",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(app, host="0.0.0.0", port=settings.api_port)
