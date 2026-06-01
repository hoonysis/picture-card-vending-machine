
import os

# Change working directory to script location to ensure relative paths work
os.chdir(os.path.dirname(os.path.abspath(__file__)))

import server
from flask import send_file


def serve_local_index():
    print("[Local Debug] Serving local_index.html (Stable legacy UI)")
    return send_file(os.path.join(server.BASE_DIR, 'local_index.html'))


server.app.view_functions['static_bp.serve_index'] = serve_local_index

if __name__ == '__main__':
    print("========================================")
    print("   [LOCAL TEST MODE]")
    print("   Serving: local_index.html")
    print("   Access: http://localhost:5000")
    print("========================================")
    server.app.run(host='0.0.0.0', port=5000, debug=True)
