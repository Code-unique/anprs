from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import datetime
import os
import traceback
import logging

from app.database import create_db_and_tables, init_db
from app.api.endpoints import router as api_router
from app.services.anpr_service import anpr_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# -------------------------
# GLOBAL EXCEPTION HANDLER
# -------------------------
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc),
            "path": request.url.path
        }
    )

# -------------------------
# LIFESPAN CONTEXT
# -------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 50)
    print("🚀 Starting ANPR System...")
    print("=" * 50)
    
    try:
        # Create database and tables
        create_db_and_tables()
        init_db()
        
        # Create necessary directories
        directories = ["uploads", "processed_images", "static", "ml_model", "ml_model/ocr_models"]
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
            print(f"📁 Created directory: {directory}")
        
        # Test ANPR service
        print("🔧 Testing ANPR service...")
        try:
            # Simple test to see if service loads
            if hasattr(anpr_service, 'model'):
                print("✅ ANPR service loaded successfully")
            else:
                print("⚠️ ANPR service may have loading issues")
        except Exception as e:
            print(f"⚠️ ANPR service test failed: {e}")
        
        print("\n" + "=" * 50)
        print("✅ ANPR System started successfully!")
        print("=" * 50)
        print("\n📋 Available endpoints:")
        print("   • API Documentation: http://localhost:8000/docs")
        print("   • Health Check: http://localhost:8000/health")
        print("   • API Base: http://localhost:8000/api")
        print("\n🔑 Default credentials:")
        print("   • Username: admin | Password: admin123")
        print("   • Username: test  | Password: test123")
        print("\n")
        
    except Exception as e:
        print(f"❌ Startup failed: {e}")
        print(traceback.format_exc())
        raise
    
    yield
    
    print("\n" + "=" * 50)
    print("🛑 Shutting down ANPR System...")
    print("=" * 50)

# -------------------------
# FASTAPI APP
# -------------------------
app = FastAPI(
    title="ANPR System API",
    description="Automatic Number Plate Recognition System",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# -------------------------
# CORS - FIXED CONFIGURATION
# -------------------------
origins = [
    "http://localhost:5173",  # Vite default port
    "http://localhost:3000",  # Create React App default
    "http://localhost:8080",  # Alternative port
    "http://127.0.0.1:5173",  # Localhost IP
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Add global exception handler
app.add_exception_handler(Exception, global_exception_handler)

# -------------------------
# STATIC FILES
# -------------------------
static_dir = Path("static")
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Also mount uploads directory
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# -------------------------
# ROUTERS
# -------------------------
app.include_router(api_router, prefix="/api")

# -------------------------
# ROOT & HEALTH
# -------------------------
@app.get("/")
def read_root():
    return {
        "message": "ANPR System Backend API",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json"
        },
        "endpoints": {
            "authentication": {
                "register": "POST /api/auth/register",
                "login": "POST /api/auth/login",
                "get_current_user": "GET /api/auth/me"
            },
            "anpr_operations": {
                "scan_plate": "POST /api/scan",
                "get_scans": "GET /api/scans",
                "get_scan": "GET /api/scans/{id}",
                "update_scan": "PUT /api/scans/{id}",
                "delete_scan": "DELETE /api/scans/{id}",
                "get_stats": "GET /api/stats",
                "validate_plate": "POST /api/validate",
                "batch_scan": "POST /api/batch-scan",
                "export_csv": "GET /api/export/csv"
            },
            "management": {
                "add_to_blacklist": "POST /api/blacklist",
                "get_blacklist": "GET /api/blacklist",
                "remove_from_blacklist": "DELETE /api/blacklist/{id}"
            },
            "utilities": {
                "health_check": "/health",
                "test_scan": "POST /api/test-scan"
            }
        }
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        from app.database import engine
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        
        # Check ANPR service
        ml_status = "loaded" if hasattr(anpr_service, 'model') and anpr_service.model else "not_loaded"
        
        # Check directories
        directories = ["uploads", "processed_images", "static"]
        dir_status = {}
        for directory in directories:
            dir_status[directory] = "exists" if os.path.exists(directory) else "missing"
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": "connected",
                "ml_models": ml_status,
                "directories": dir_status
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "services": {
                "database": "disconnected",
                "ml_models": "unknown"
            }
        }

@app.get("/info")
def system_info():
    """System information endpoint"""
    import sys
    import platform
    
    return {
        "system": {
            "python_version": sys.version,
            "platform": platform.platform(),
            "processor": platform.processor()
        },
        "application": {
            "name": "ANPR System",
            "version": "2.0.0",
            "environment": os.getenv("ENVIRONMENT", "development")
        },
        "paths": {
            "current_directory": os.getcwd(),
            "uploads": str(Path("uploads").absolute()),
            "static": str(Path("static").absolute())
        }
    }

# -------------------------
# CATCH-ALL ROUTE FOR SPA
# -------------------------
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    """Catch-all route for SPA routing"""
    return {
        "error": "Route not found",
        "path": full_path,
        "message": "This is a backend API. Frontend should be served separately."
    }

# -------------------------
# MAIN
# -------------------------
if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "=" * 50)
    print("🔧 Development Server Starting...")
    print("=" * 50)
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",  # Changed from localhost to 0.0.0.0
        port=8000,
        reload=True,
        log_level="info",
        access_log=True
    )