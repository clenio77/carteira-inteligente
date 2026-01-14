"""
Vercel Serverless Function Entry Point
This file wraps the FastAPI app from apps/api for Vercel deployment
"""
import sys
import os

# Get the directory containing this file
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.join(current_dir, '..')

# Add paths to sys.path for module resolution
# Priority: apps/api first, then project root
api_path = os.path.join(project_root, 'apps', 'api')
sys.path.insert(0, api_path)
sys.path.insert(0, project_root)

# Set environment variable to help with imports
os.environ.setdefault('PYTHONPATH', api_path)

# Import the FastAPI app
try:
    # Try importing from apps/api/index.py (file is now in sys.path as api_path)
    from index import app
except ImportError as e1:
    try:
        # Fallback: try full path import
        from apps.api.index import app
    except ImportError as e2:
        # Create a minimal debug app to show the error
        from fastapi import FastAPI
        app = FastAPI()
        
        @app.get("/")
        def debug():
            return {
                "error": "Failed to import main app",
                "error1": str(e1),
                "error2": str(e2),
                "sys_path": sys.path,
                "current_dir": current_dir,
                "api_path": api_path,
            }

# Vercel requires the app to be named 'app' or 'handler'
handler = app

