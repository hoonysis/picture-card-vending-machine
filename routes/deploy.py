"""routes/deploy.py — GitHub Webhook 자동 배포 (iwinv systemd)

vocab-tracker/api/deploy.py 패턴 포팅. BASE_DIR 은 app.config 에서 조회.
"""

import hashlib
import hmac
import os
import subprocess
import threading
import time

from flask import Blueprint, jsonify, request, current_app

deploy_bp = Blueprint('deploy', __name__)


@deploy_bp.route('/api/deploy', methods=['POST'])
def github_webhook():
    """GitHub push webhook → git pull + systemd 서비스 재시작."""
    try:
        secret = os.environ.get('DEPLOY_SECRET', '')
        if secret:
            signature = request.headers.get('X-Hub-Signature-256', '')
            expected = 'sha256=' + hmac.new(
                secret.encode(), request.data, hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(signature, expected):
                return jsonify({'error': 'Invalid signature'}), 403

        base_dir = current_app.config['BASE_DIR']
        result = subprocess.run(
            ['git', 'pull'], cwd=base_dir,
            capture_output=True, text=True, timeout=30
        )
        pull_output = result.stdout or result.stderr

        reload_status = None
        systemd_service = os.environ.get('SYSTEMD_SERVICE', '')
        if systemd_service:
            def _systemd_restart():
                time.sleep(2)
                try:
                    subprocess.run(
                        ['systemctl', 'restart', systemd_service],
                        capture_output=True, timeout=30
                    )
                except Exception:
                    pass
            threading.Thread(target=_systemd_restart, daemon=True).start()
            reload_status = f'systemd:{systemd_service}'

        return jsonify({
            'success': True,
            'pull': pull_output,
            'reload': reload_status
        })
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'git pull timed out'}), 504
    except Exception as e:
        return jsonify({'error': str(e)}), 500
