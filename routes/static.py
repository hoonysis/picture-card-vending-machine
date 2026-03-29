from flask import Blueprint, request, send_file, abort, current_app, session, redirect, url_for
from urllib.parse import unquote
import os
import unicodedata
from routes.auth import requires_auth

static_bp = Blueprint('static_bp', __name__)


@static_bp.route('/')
def serve_index():
    base = current_app.config['BASE_DIR']
    referer = request.headers.get('Referer', '')
    if 'hangruclass' not in referer and 'localhost' not in referer:
        msg = """
        <div style='text-align:center; padding:50px; font-family:"Malgun Gothic", sans-serif;'>
            <h1>ℹ️ 여기는 자판기 서버페이지 입니다.</h1>
            <p style="font-size:1.2rem;">아래의 링크 주소로 자판기에 입장해주세요.</p>
            <p style="font-size:1.5rem;">👇 링크 클릭</p>
            <h2 style="margin:20px 0;">
                <a href='https://hangruclass.com/vending-machine/' style="text-decoration:none; color:#2196F3;">
                    https://hangruclass.com/vending-machine/
                </a>
            </h2>
            <p style='color:#666; margin-top:30px; font-size:0.95rem; line-height:1.6;'>
                즐겨찾기에 그림카드 자판기를 추가하시고 싶으면<br>
                위의 주소를 즐겨찾기에 넣어주세요.
            </p>
        </div>
        """
        return msg, 403
    return send_file(os.path.join(base, 'index.html'))


@static_bp.route('/admin')
@requires_auth
def serve_admin():
    base = current_app.config['BASE_DIR']
    return send_file(os.path.join(base, 'admin.html'))


@static_bp.route('/admin_test')
@requires_auth
def serve_admin_test():
    base = current_app.config['BASE_DIR']
    return send_file(os.path.join(base, 'admin_test.html'))


@static_bp.route('/style.css')
def serve_css():
    base = current_app.config['BASE_DIR']
    return send_file(os.path.join(base, 'style.css'), mimetype='text/css')


@static_bp.route('/data.js')
def serve_data_js():
    base = current_app.config['BASE_DIR']
    return send_file(os.path.join(base, 'data.js'), mimetype='application/javascript')


@static_bp.route('/css/<path:filename>')
def serve_css_folder(filename):
    base = current_app.config['BASE_DIR']
    return send_file(os.path.join(base, 'css', filename), mimetype='text/css')


@static_bp.route('/js/<path:filename>')
def serve_js_folder(filename):
    base = current_app.config['BASE_DIR']
    return send_file(os.path.join(base, 'js', filename), mimetype='application/javascript')


@static_bp.route('/<path:path>')
def serve_static(path):
    base = current_app.config['BASE_DIR']
    fm = current_app.config['file_manager']
    um = current_app.config['user_manager']
    USER_IMAGES_DIR = 'user_images'

    decoded_path = unquote(path)
    full_path = os.path.join(base, decoded_path)

    # 1. 직접 확인
    if os.path.exists(full_path) and os.path.isfile(full_path):
        return send_file(full_path)

    # 2. NFC/NFD 정규화
    for norm in ['NFC', 'NFD']:
        norm_p = unicodedata.normalize(norm, decoded_path)
        fp = os.path.join(base, norm_p)
        if os.path.exists(fp) and os.path.isfile(fp):
            return send_file(fp)

    # 3. 강건한 반복 탐색
    robust_path = fm.find_file_robustly(decoded_path)
    if robust_path:
        return send_file(robust_path)

    # 4. user_images 폴백 (레거시 beta_ 경로)
    if 'beta_' in path and not path.startswith(USER_IMAGES_DIR):
        fixed_path = os.path.join(USER_IMAGES_DIR, path)
        retry = fm.find_file_robustly(fixed_path)
        if retry:
            return send_file(retry)

    # 5. 유저 디렉토리에서 파일명으로 최종 탐색
    user_id = request.args.get('user', 'guest')
    user_dir = um.get_user_dir(user_id)
    if os.path.exists(user_dir):
        target_file = os.path.basename(decoded_path)
        rel_path = os.path.relpath(os.path.join(user_dir, target_file), base)
        robust_user = fm.find_file_robustly(rel_path)
        if robust_user:
            return send_file(robust_user)

    abort(404)
