
import os
import sys

# Change working directory to script location to ensure relative paths work
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Monkey-patch: We need to override the index route BEFORE running the app if possible,
# or modify the app instance after import.
# Since server.py has `if __name__ == '__main__':` block, importing it is safe.

import server
from flask import send_file

# Define the new index function
def serve_local_index():
    print("[Local Debug] Serving local_index.html (Security Bypassed)")
    return send_file(os.path.join(server.BASE_DIR, 'local_index.html'))

# Override the View Function for the root route
# Flask stores view functions in app.view_functions with the key being the function name.
# The original function is 'serve_index'.
# We interpret the endpoint name for '/' route might be 'serve_index'.
server.app.view_functions['static_bp.serve_index'] = serve_local_index

if __name__ == '__main__':
    print("========================================")
    print("   [LOCAL TEST MODE] Security Disabled")
    print("   Serving: local_index.html")
    print("   Access: http://localhost:5000")
    print("========================================")
    server.app.run(host='0.0.0.0', port=5000, debug=True)
