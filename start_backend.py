#!/usr/bin/env python3
"""
Backend Startup Script for AI Room Visualizer

This script properly starts the FastAPI backend server without YOLO CLI conflicts.
"""

import os
import sys
import uvicorn
from pathlib import Path

# Add backend to Python path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

def main():
    """Start the FastAPI backend server"""
    print("Starting AI Room Visualizer Backend...")

    # Set environment variables
    os.environ.setdefault("PYTHONPATH", str(backend_path))

    # Start uvicorn server
    uvicorn.run(
        "backend.app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info",
        access_log=True
    )

if __name__ == "__main__":
    main()