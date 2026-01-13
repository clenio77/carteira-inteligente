import sys
import os

# Add apps/api to sys.path so we can import the app
# Vercel places this file in /var/task/api/index.py usually.
# We need to point to apps/api which is at ../apps/api relative to this file.
current_dir = os.path.dirname(os.path.abspath(__file__))
api_root = os.path.join(current_dir, '..', 'apps', 'api')
sys.path.append(api_root)

# Import the FastAPI app instance from apps/api/index.py
# The local index.py handles the middleware and Vercel specific configs.
try:
    from index import app
except ImportError:
    # Fallback if the path structure is slightly different (e.g. local vs lambda)
    # This tries to find where 'apps' is.
    sys.path.append(os.path.join(current_dir, '..'))
    try:
        from apps.api.index import app
    except ImportError as e:
        raise ImportError(f"Could not import app. Syspath: {sys.path}. Error: {e}")
