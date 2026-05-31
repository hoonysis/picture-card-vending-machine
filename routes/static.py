from flask import Blueprint, request, send_file, send_from_directory, abort, current_app
from urllib.parse import unquote
import os
from pathlib import Path
import unicodedata
from routes.auth import requires_auth

static_bp = Blueprint('static_bp', __name__)

ALLOWED_ROOT_FILES = {
    'style.css': 'text/css',
    'data.js': 'application/javascript',
    'manifest.json': 'application/manifest+json',
    'sw.js': 'application/javascript',
}

ALLOWED_TOP_DIRS = {'images', 'css', 'js', '범주', 'user_images', 'ㅇ(받침)'}
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.svg'}
ALLOWED_INDEX_FILES = {'index.html', 'local_index.html'}


def _is_card_dir(name):
    return any(name.startswith(f"{idx:02d}_") for idx in range(1, 21))


def _is_safe_path(path):
    parts = Path(path.replace('\\', '/')).parts
    return bool(parts) and all(part not in ('', '.', '..') and not part.startswith('.') for part in parts)


def _send_allowed_file(root_name, rel_path, mimetype=None):
    base = Path(current_app.config['BASE_DIR']).resolve()
    root = (base / root_name).resolve()
    if base not in root.parents and root != base:
        abort(404)

    fm = current_app.config['file_manager']
    robust_path = fm.find_file_robustly(f"{root_name}/{rel_path}")
    if robust_path:
        resolved = Path(robust_path).resolve()
        if resolved == root or root in resolved.parents:
            return send_file(resolved, mimetype=mimetype)

    return send_from_directory(root, rel_path, mimetype=mimetype)


def _get_index_file():
    index_file = os.environ.get('APP_INDEX_FILE', 'index.html').strip() or 'index.html'
    if index_file not in ALLOWED_INDEX_FILES:
        index_file = 'index.html'
    return index_file


@static_bp.route('/')
def serve_index():
    base = current_app.config['BASE_DIR']
    referer = request.headers.get('Referer', '')
    host = request.host.split(':', 1)[0]
    is_local = host in {'localhost', '127.0.0.1', '::1'}
    if not is_local and 'hangruclass' not in referer:
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
    return send_file(os.path.join(base, _get_index_file()))


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
    if not _is_safe_path(filename):
        abort(404)
    return _send_allowed_file('css', filename, mimetype='text/css')


@static_bp.route('/js/<path:filename>')
def serve_js_folder(filename):
    if not _is_safe_path(filename):
        abort(404)
    return _send_allowed_file('js', filename, mimetype='application/javascript')


@static_bp.route('/<path:path>')
def serve_static(path):
    decoded_path = unicodedata.normalize('NFC', unquote(path).replace('\\', '/'))
    if not _is_safe_path(decoded_path):
        abort(404)

    root, _, rel_path = decoded_path.partition('/')
    if not rel_path:
        mimetype = ALLOWED_ROOT_FILES.get(root)
        if mimetype:
            base = current_app.config['BASE_DIR']
            return send_file(os.path.join(base, root), mimetype=mimetype)
        abort(404)

    if root in {'css', 'js'}:
        mimetype = 'text/css' if root == 'css' else 'application/javascript'
        return _send_allowed_file(root, rel_path, mimetype=mimetype)

    if root == 'images':
        return _send_allowed_file(root, rel_path)

    if root in {'범주', 'user_images'} or _is_card_dir(root) or root == 'ㅇ(받침)':
        if Path(rel_path).suffix.lower() in IMAGE_EXTENSIONS:
            return _send_allowed_file(root, rel_path)

    abort(404)
