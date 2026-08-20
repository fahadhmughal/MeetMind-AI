"""MeetMind AI Backend FastAPI Server Entrypoint."""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings
from config.constants import DEFAULT_CORS_ORIGINS
from utils.logger import get_logger
from api.routes import meetings, chat

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI application lifecycle context manager."""
    logger.info("============================================================")
    logger.info(" MeetMind AI Backend Server is Running Successfully!")
    logger.info(f" Server URL:           http://localhost:{settings.port}")
    logger.info(f" Interactive API Docs: http://localhost:{settings.port}/docs")
    logger.info(f" Health Check:         http://localhost:{settings.port}/api/v1/health")
    logger.info("============================================================")
    yield
    logger.info("Shutting down MeetMind AI Backend.")


app = FastAPI(
    title="MeetMind AI API",
    version="1.0.0",
    description="Backend API for MeetMind AI Meeting Assistant",
    lifespan=lifespan
)

# Configure CORS for React Frontend and Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=DEFAULT_CORS_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(meetings.router)
app.include_router(chat.router)


@app.get("/", response_class=HTMLResponse)
async def root():
    """Root landing page displaying server status and quick links."""
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>MeetMind AI Backend</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: #020617;
                color: #f8fafc;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
            }}
            .card {{
                background: #0f172a;
                border: 1px solid #1e293b;
                border-radius: 16px;
                padding: 32px;
                max-width: 480px;
                width: 100%;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                text-align: center;
            }}
            h1 {{ font-size: 24px; margin-bottom: 8px; color: #818cf8; }}
            p {{ color: #94a3b8; font-size: 14px; margin-bottom: 24px; }}
            .links {{ display: flex; flex-direction: column; gap: 12px; }}
            a {{
                display: block;
                padding: 12px;
                background: #1e1b4b;
                color: #a5b4fc;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.2s ease;
                border: 1px solid #3730a3;
            }}
            a:hover {{
                background: #312e81;
                color: #ffffff;
            }}
            .badge {{
                display: inline-block;
                padding: 4px 12px;
                background: #059669;
                color: #ffffff;
                font-size: 12px;
                font-weight: bold;
                border-radius: 9999px;
                margin-bottom: 16px;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <span class="badge">● SERVER ACTIVE</span>
            <h1>MeetMind AI Backend</h1>
            <p>FastAPI Server running cleanly on port {settings.port}</p>
            <div class="links">
                <a href="/docs" target="_blank">📚 Open Interactive API Docs (/docs)</a>
                <a href="/api/v1/health" target="_blank">🩺 Health Check Endpoint (/api/v1/health)</a>
            </div>
        </div>
    </body>
    </html>
    """


@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint for React frontend and Chrome extension pre-flight checks."""
    return {
        "status": "ok",
        "service": "MeetMind AI Backend",
        "version": "1.0.0",
        "environment": settings.environment,
        "server_url": f"http://localhost:{settings.port}"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
