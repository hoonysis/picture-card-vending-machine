
import sys
import os

# 1. Project directory setting
path = '/home/hangruclass/vending_machine'
if path not in sys.path:
    sys.path.append(path)

# 2. Main Flask App Import with Robust Error Handling
try:
    from server import app as application
except Exception as e:
    # [FAILSAFE] Capture the error immediately to avoid scope issues
    import traceback
    error_trace = traceback.format_exc()
    
    def application(environ, start_response):
        status = '500 Internal Server Error'
        response_headers = [('Content-type', 'text/plain; charset=utf-8')]
        start_response(status, response_headers)
        
        # Display the full error traceback in the browser
        error_message = f"CRITICAL: Failed to load application.\n\n{error_trace}"
        return [error_message.encode('utf-8')]
