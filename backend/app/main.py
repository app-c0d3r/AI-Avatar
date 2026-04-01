from fastapi import FastAPI

app = FastAPI(title="MAPA Backend", version="0.1.0")


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker container verification."""
    return {"status": "healthy", "service": "mapa-backend"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "MAPA Backend API", "version": "0.1.0"}
