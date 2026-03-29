from flask import Blueprint, request, session, redirect, url_for, render_template_string, jsonify, current_app
from functools import wraps

auth_bp = Blueprint('auth', __name__)


# ── 인증 데코레이터 (다른 Blueprint에서도 import해서 사용) ──

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('is_admin'):
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Unauthorized'}), 401
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated


# ── 로그인 템플릿 ──

LOGIN_TEMPLATE = """
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>관리자 로그인</title>
    <style>
        body { font-family: 'Malgun Gothic', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f2f5; margin: 0; }
        .login-box { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; width: 300px; }
        h2 { margin-top: 0; color: #333; }
        input { width: 100%; padding: 12px; margin: 15px 0; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; font-size: 1rem; }
        button { width: 100%; padding: 12px; background: #2196F3; color: white; border: none; border-radius: 5px; font-size: 1rem; cursor: pointer; font-weight: bold; }
        button:hover { background: #1e88e5; }
        .error { color: red; margin-bottom: 15px; font-size: 0.9rem; }
    </style>
</head>
<body>
    <div class="login-box">
        <h2>🔒 관리자 접속</h2>
        {% if error %}
            <div class="error">{{ error }}</div>
        {% endif %}
        <form method="POST" action="/login">
            <input type="password" name="password" placeholder="비밀번호를 입력하세요" required autofocus>
            <button type="submit">접속하기</button>
        </form>
    </div>
</body>
</html>
"""


# ── 라우트 ──

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        um = current_app.config['user_manager']
        if um.check_auth(request.form['password']):
            session['is_admin'] = True
            return redirect(url_for('static_bp.serve_admin'))
        else:
            error = '비밀번호가 올바르지 않습니다.'
    return render_template_string(LOGIN_TEMPLATE, error=error)


@auth_bp.route('/logout')
def logout():
    session.pop('is_admin', None)
    return redirect(url_for('auth.login'))
