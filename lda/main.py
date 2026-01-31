from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import traceback
from core.config import settings
from core.security import signature_required
from api.routes import router as api_router

app = FastAPI(title=settings.APP_NAME)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Log full traceback for debugging."""
    error_detail = f"{type(exc).__name__}: {str(exc)}"
    tb = traceback.format_exc()
    print(f"\n{'='*80}\nERROR in {request.url.path}:\n{tb}\n{'='*80}\n")
    return JSONResponse(
        status_code=500,
        content={"detail": error_detail}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}

if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
