from flask import Blueprint, request, jsonify, current_app
from PIL import Image
import os
import unicodedata

user_bp = Blueprint('user', __name__)


# ── POST /api/register_user ──

@user_bp.route('/api/register_user', methods=['POST'])
def register_user():
    try:
        um = current_app.config['user_manager']
        req = request.json
        name = req.get('name', '').strip()
        if not name:
            return jsonify({'error': 'Name required'}), 400

        user_id, error = um.register_user(name)
        if error:
            return jsonify({'error': error}), 400

        print(f"Registered User: {name} -> {user_id}")
        return jsonify({'success': True, 'user_id': user_id})

    except Exception as e:
        print(f"Register error: {e}")
        return jsonify({'error': str(e)}), 500


# ── GET /api/users ──

@user_bp.route('/api/users', methods=['GET'])
def list_users():
    um = current_app.config['user_manager']
    users = um.list_users()
    return jsonify(users)


# ── POST /upload (게스트/레거시 업로드) ──

def _extract_user_id():
    """요청에서 user_id 추출 (공통 헬퍼)"""
    user_id = request.args.get('user')
    if not user_id:
        user_id = request.form.get('user_id')
    if not user_id:
        referer = request.headers.get('Referer', '')
        if referer and 'user=' in referer:
            try:
                from urllib.parse import urlparse, parse_qs
                parsed = urlparse(referer)
                query = parse_qs(parsed.query)
                if 'user' in query:
                    user_id = query['user'][0]
            except:
                pass
    if not user_id:
        user_id = 'guest'
    return user_id


@user_bp.route('/upload', methods=['POST'])
def user_upload():
    um = current_app.config['user_manager']
    fm = current_app.config['file_manager']
    base = current_app.config['BASE_DIR']

    user_id = _extract_user_id()
    folder_path = um.get_user_dir(user_id)
    if not os.path.exists(folder_path):
        os.makedirs(folder_path, exist_ok=True)

    # 저장 제한 (30파일)
    current_files = [f for f in os.listdir(folder_path)
                     if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
    if len(current_files) >= 30:
        return jsonify({'error': 'Storage full'}), 403

    uploaded_files = request.files.getlist('files') or request.files.getlist('file')
    saved_files = []

    for file in uploaded_files[:1]:
        if file and file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            nfc_filename = unicodedata.normalize('NFC', file.filename)
            filename = fm.safe_filename(nfc_filename)
            save_path = os.path.join(folder_path, filename)

            base_name, ext = os.path.splitext(filename)
            counter = 1
            while os.path.exists(save_path):
                filename = f"{base_name}_{counter}{ext}"
                save_path = os.path.join(folder_path, filename)
                counter += 1

            try:
                img = Image.open(file)
                MAX_DIM = 1000
                if img.width > MAX_DIM or img.height > MAX_DIM:
                    img.thumbnail((MAX_DIM, MAX_DIM), Image.Resampling.LANCZOS)

                ext = os.path.splitext(filename)[1].lower()
                if ext in ['.jpg', '.jpeg']:
                    img.save(save_path, optimize=True, quality=80)
                elif ext == '.png':
                    img.save(save_path, optimize=True)
                elif ext == '.webp':
                    img.save(save_path, quality=80)
                else:
                    img.save(save_path)

                folder_rel = os.path.relpath(folder_path, base).replace(os.sep, '/')
                final_path = f"{folder_rel}/{filename}"

                saved_files.append({
                    'name': os.path.splitext(filename)[0],
                    'image': filename,
                    'path': final_path
                })
            except Exception as e:
                print(f"User upload error: {e}")

    if saved_files:
        return jsonify({'success': True, 'card': saved_files[0]})
    return jsonify({'error': 'No valid file'}), 400


# ── GET/DELETE /api/user_cards ──

@user_bp.route('/api/user_cards', methods=['GET', 'DELETE'])
def handle_user_cards():
    um = current_app.config['user_manager']
    base = current_app.config['BASE_DIR']

    user_id = _extract_user_id()

    if request.method == 'GET':
        user_dir = um.get_user_dir(user_id, create=False)
        cards = []
        if user_dir and os.path.exists(user_dir):
            files = os.listdir(user_dir)
            try:
                files.sort(key=lambda x: os.path.getmtime(os.path.join(user_dir, x)))
            except:
                pass

            for filename in files:
                if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                    name = os.path.splitext(filename)[0]
                    folder_rel = os.path.relpath(user_dir, base).replace(os.sep, '/')
                    final_path = f"{folder_rel}/{filename}"
                    cards.append({
                        'name': name,
                        'image': filename,
                        'path': final_path
                    })
        return jsonify(cards)

    if request.method == 'DELETE':
        user_dir = um.get_user_dir(user_id, create=False)
        req_data = request.json
        filename = req_data.get('filename')
        if not filename:
            return jsonify({'error': 'Filename required'}), 400

        file_path = os.path.join(user_dir, filename) if user_dir else None
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass
        return jsonify({'success': True})


# ── GET/POST /api/user_presets ──

@user_bp.route('/api/user_presets', methods=['GET', 'POST'])
def handle_presets():
    um = current_app.config['user_manager']
    user_id = request.args.get('user', 'guest')

    if request.method == 'GET':
        presets = um.load_presets(user_id)
        return jsonify(presets)

    if request.method == 'POST':
        try:
            new_presets = request.json
            if not isinstance(new_presets, list):
                return jsonify({'error': 'Presets must be a list'}), 400

            if um.save_presets(user_id, new_presets):
                return jsonify({'success': True})
            else:
                return jsonify({'error': 'Save failed'}), 500
        except Exception as e:
            print(f"Preset save error: {e}")
            return jsonify({'error': 'Invalid JSON'}), 400
