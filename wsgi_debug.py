
# This file contains the configuration for the WSGI application
# PythonAnywhere uses this file to load your application.

import sys
import os

# 1. Add your project directory to the sys.path
# This must match the directory where server.py is located
path = '/home/hangruclass/vending_machine'
if path not in sys.path:
    sys.path.append(path)

# 2. Set environment variables (if any)
# This is often needed for Flask to find the application root
os.environ['FLASK_APP'] = 'server.py'

# 3. Import the flask application as 'application'
# The WSGI server looks for a variable named 'application' in this file.
# If your app instance is named 'app', we alias it here.

print("DEBUG: Starting WSGI application import...")

try:
    from server import app as application
    print("DEBUG: Successfully imported 'app' as 'application'")
except Exception as e:
    print(f"CRITICAL ERROR: Failed to import application: {e}")
    # If import fails, define a fallback application to show the error in the browser
    # This prevents the generic "500 Internal Server Error" page
    def application(environ, start_response):
        status = '500 Internal Server Error'
        output = f"""
        <h1>Critical Deployment Error</h1>
        <p>The application failed to start because of an import error.</p>
        <pre>{e}</pre>
        <p>Please check your server.py file for syntax errors or missing dependencies.</p>
        """.encode('utf-8')
        response_headers = [('Content-type', 'text/html'),
                            ('Content-Length', str(len(output)))]
        start_response(status, response_headers)
        return [output]
