# Round 1: server.py 모듈화 — 완성 코드 포함

> 작성: 2026-03-29 | 상태: ✅ **완료 (2026-03-29)**
>
> 소넷 받아쓰기 전용 계획서. 각 파일의 완성 코드를 그대로 Write하면 됨.

---

## 실행 순서

```
Step 0  백업
Step 1  routes/__init__.py 생성
Step 2  routes/auth.py 생성
Step 3  routes/static.py 생성
Step 4  routes/cards.py 생성
Step 5  routes/upload.py 생성
Step 6  routes/user.py 생성
Step 7  routes/admin.py 생성
Step 8  server.py 교체
Step 9  검증
```

---

## Step 0: 백업

```bash
mkdir -p backups/before_server_split
cp server.py backups/before_server_split/server.py
```

---

## Step 1: `routes/__init__.py`

```python
# routes 패키지 마커
```

---

## Step 2: `routes/auth.py`

```python
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
```

---

## Step 3: `routes/static.py`

```python
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
```

---

## Step 4: `routes/cards.py`

```python
from flask import Blueprint, request, jsonify, current_app
from routes.auth import requires_auth
import os
import json
import unicodedata
import threading
import g2p

cards_bp = Blueprint('cards', __name__)


# ── GET /api/cards ──

@cards_bp.route('/api/cards', methods=['GET'])
def list_cards():
    try:
        dm = current_app.config['data_manager']
        fm = current_app.config['file_manager']
        um = current_app.config['user_manager']
        base = current_app.config['BASE_DIR']

        user_id = request.args.get('user', 'guest')
        user_dir = um.get_user_dir(user_id)
        data = fm.load_data()
        query = request.args.get('q', '').strip()
        search_norm = dm.normalize_for_search(query) if query else None

        clean_data = []
        for item in data:
            folder = str(item.get('folder', ''))
            image = str(item.get('image', ''))
            if not folder or not image:
                continue
            clean_data.append(item)

        if search_norm:
            response_data = []
            for item in clean_data:
                name = str(item.get('name', ''))
                keywords = str(item.get('search_keywords', ''))
                if search_norm in dm.normalize_for_search(name) or \
                   search_norm in dm.normalize_for_search(keywords):
                    response_data.append(item)
            return jsonify(response_data)

        return jsonify(clean_data)
    except Exception as e:
        print(f"List cards error: {e}")
        return jsonify({'error': str(e)}), 500


# ── POST /api/analyze ──

@cards_bp.route('/api/analyze', methods=['POST'])
def analyze_name():
    dm = current_app.config['data_manager']
    req = request.json
    name = req.get('name', '')
    manual_pronunciation = req.get('pronunciation', '')

    if not name:
        return jsonify([])

    name = unicodedata.normalize('NFC', name).strip()

    # 1. 발음 결정
    if manual_pronunciation:
        pronunciation = manual_pronunciation
    else:
        pronunciation = dm.korean_g2p(name)

    # 2. 발음 분석
    decomposed = g2p.decompose_hangul(pronunciation)
    suggestions = []
    total_chars = len([d for d in decomposed if d is not None])

    # 의미 있는 자음 존재 여부 확인
    has_meaningful_consonants = False
    for item in decomposed:
        if item is None:
            continue
        if item['cho'] != 'ㅇ':
            has_meaningful_consonants = True
        if item['jong'] != '':
            has_meaningful_consonants = True

    for idx, item in enumerate(decomposed):
        if item is None:
            continue

        # 초성
        cho = item['cho']
        if cho == 'ㅇ':
            if not has_meaningful_consonants:
                pos = "어두초성" if idx == 0 else "어중초성"
                suggestions.append({
                    'main': 'ㅇ(모음)',
                    'sub': pos,
                    'desc': f"{item['char']}의 첫소리 (모음)"
                })
        else:
            pos = "어두초성" if idx == 0 else "어중초성"
            suggestions.append({
                'main': cho,
                'sub': pos,
                'desc': f"{item['char']}의 초성"
            })

        # 종성
        jong = item['jong']
        if jong != '':
            phoneme = "ㅇ(받침)" if jong == "ㅇ" else jong
            pos = "어말종성" if idx == total_chars - 1 else "어중종성"
            suggestions.append({
                'main': phoneme,
                'sub': pos,
                'desc': f"{item['char']}의 받침"
            })

    if not suggestions:
        suggestions.append({
            'main': 'ㅇ(모음)',
            'sub': '',
            'desc': '자음 없음 (모음)'
        })

    # 3. 사전 참조
    ref_dict = dm.load_reference_dict()
    reference_info = None

    print(f"[DEBUG] Analyzing: '{name}' (Len: {len(name)}, Hex: {[hex(ord(c)) for c in name]})")
    print(f"[DEBUG] RefDict Size: {len(ref_dict)}")
    if ref_dict:
        sample_key = list(ref_dict.keys())[0]
        print(f"[DEBUG] Sample Key: '{sample_key}' (Hex: {[hex(ord(c)) for c in sample_key]})")

    if name in ref_dict:
        print(f"[DEBUG] Success! Found '{name}' in dict.")
        reference_info = ref_dict[name]
    else:
        print(f"[DEBUG] Failed to find '{name}'. Trying stripped...")
        n_clean = name.replace(" ", "")
        if n_clean in ref_dict:
            print(f"[DEBUG] Success! Found stripped '{n_clean}'.")
            reference_info = ref_dict[n_clean]
        else:
            print(f"[DEBUG] Totally failed to find '{name}'.")

    return jsonify({
        'suggestions': suggestions,
        'pronunciation': pronunciation,
        'reference': reference_info
    })


# ── DELETE /api/cards ──

@cards_bp.route('/api/cards', methods=['DELETE'])
@requires_auth
def delete_card():
    try:
        fm = current_app.config['file_manager']
        um = current_app.config['user_manager']
        base = current_app.config['BASE_DIR']

        req_data = request.json
        if not req_data:
            return jsonify({'error': 'Invalid request'}), 400
        if isinstance(req_data, list):
            targets = req_data
        else:
            targets = [req_data]

        target_filenames = set(t.get('image') for t in targets)
        current_data = fm.load_data()
        new_data = []
        deleted_count = 0

        # 개인 그림 삭제
        user_id = request.args.get('user', 'guest')
        user_dir = um.get_user_dir(user_id)
        for t in targets:
            fname = t.get('image', '')
            user_path = os.path.join(user_dir, fname)
            if os.path.exists(user_path):
                try:
                    os.remove(user_path)
                except:
                    pass

        # 시스템 카드 삭제
        for item in current_data:
            img_name = str(item.get('image', ''))
            folder = str(item.get('folder', ''))

            if img_name in target_filenames:
                deleted_count += 1

                # NFC & NFD 모두 시도
                paths_to_check = [
                    os.path.join(base, folder, img_name),
                    os.path.join(base,
                                 unicodedata.normalize('NFC', folder),
                                 unicodedata.normalize('NFC', img_name)),
                ]
                f_nfd = unicodedata.normalize('NFD', folder)
                n_nfd = unicodedata.normalize('NFD', img_name)
                if f_nfd and n_nfd:
                    paths_to_check.append(os.path.join(base, f_nfd, n_nfd))

                for p in paths_to_check:
                    if os.path.exists(p):
                        try:
                            os.remove(p)
                            print(f"[삭제 성공] {p}")
                            break
                        except:
                            pass
                else:
                    print(f"[알림] 파일이 디스크에 없어서 장부에서만 지웁니다: {img_name}")

                # 범주 폴더에서도 삭제
                lang_cat = item.get('language_category')
                if lang_cat:
                    cat_path = os.path.join(base, '범주', lang_cat, img_name)
                    if os.path.exists(cat_path):
                        try:
                            os.remove(cat_path)
                        except:
                            pass
                    cat_nfc = os.path.join(base, '범주',
                                           unicodedata.normalize('NFC', lang_cat),
                                           unicodedata.normalize('NFC', img_name))
                    if os.path.exists(cat_nfc):
                        try:
                            os.remove(cat_nfc)
                        except:
                            pass

                continue  # 장부에서 제외

            new_data.append(item)

        if deleted_count > 0:
            fm.save_data(new_data)
            return jsonify({'success': True, 'deleted_count': deleted_count})
        return jsonify({'success': True, 'msg': 'No changes'})

    except Exception as e:
        print(f"Delete error: {e}")
        return jsonify({'error': str(e)}), 500


# ── PUT /api/cards ──
# (기존 버그 수정: save_data 이중 호출 제거, update_version 제거)

@cards_bp.route('/api/cards', methods=['PUT'])
@requires_auth
def update_card():
    fm = current_app.config['file_manager']
    sm = current_app.config['sync_manager']

    req_data = request.json
    target_image = req_data.get('original_image')
    target_folder = req_data.get('original_folder')

    if not target_image:
        return jsonify({'error': 'Original Image ID required'}), 400

    new_pos = req_data.get('part_of_speech', '')
    new_cat = req_data.get('language_category', '')

    current_data = fm.load_data()
    updated_count = 0
    new_data = []

    for item in current_data:
        if item.get('image') == target_image:
            if target_folder and item.get('folder') != target_folder:
                new_data.append(item)
                continue

            item['part_of_speech'] = new_pos
            item['language_category'] = new_cat

            if 'search_keywords' in req_data:
                item['search_keywords'] = req_data['search_keywords']

            updated_count += 1

        new_data.append(item)

    if updated_count > 0:
        if fm.save_data(new_data):
            # Background Sync 준비
            unique_updates = {}
            raw_kw = req_data.get('search_keywords', '')
            kw_parts = [k.strip() for k in raw_kw.split(',')] if raw_kw else []
            t1 = kw_parts[0] if len(kw_parts) > 0 else ""
            t2 = kw_parts[1] if len(kw_parts) > 1 else ""
            t3 = kw_parts[2] if len(kw_parts) > 2 else ""
            tags = [t1, t2, t3]

            for item in new_data:
                if item.get('image') == target_image:
                    w = item.get('name', '').strip()
                    unique_updates[w] = (w, new_pos, new_cat, "", tags)

            # Background GSheet 동기화
            def run_edit_sync():
                print(f"[Background] Syncing {len(unique_updates)} edits to GSheet...")
                for (w, m, s, p, t) in unique_updates.values():
                    if w:
                        sm.update_word(w, m, s, p, t)

            threading.Thread(target=run_edit_sync).start()

            return jsonify({'success': True, 'count': updated_count,
                            'message': f'{updated_count} items updated.'})

    return jsonify({'success': False, 'message': 'No changes made.'})
```

---

## Step 5: `routes/upload.py`

```python
from flask import Blueprint, request, jsonify, current_app
from routes.auth import requires_auth
import os
import json
import shutil
import unicodedata
import threading

upload_bp = Blueprint('upload', __name__)


@upload_bp.route('/api/upload', methods=['POST'])
@requires_auth
def upload_card():
    fm = current_app.config['file_manager']
    um = current_app.config['user_manager']
    dm = current_app.config['data_manager']
    sm = current_app.config['sync_manager']
    base = current_app.config['BASE_DIR']

    user_id = request.args.get('user')
    if not user_id:
        user_id = request.form.get('user_id')

    registrations_json = request.form.get('registrations')
    try:
        registrations = json.loads(registrations_json)
    except:
        return jsonify({'error': 'Invalid JSON'}), 400

    if user_id:
        folder_path = um.get_user_dir(user_id)
        rel_path = os.path.relpath(folder_path, base)
        web_path_prefix = rel_path.replace(os.sep, '/')
    else:
        first_phoneme = registrations[0].get('main', "기타")
        target_folder_name = fm.get_folder_path(first_phoneme)
        folder_path = os.path.join(base, target_folder_name)
        web_path_prefix = target_folder_name
        if not os.path.exists(folder_path):
            os.makedirs(folder_path, exist_ok=True)

    file = request.files['file']
    raw_name = request.form.get('name')
    name = raw_name.replace(' ', '') if raw_name else raw_name

    if file:
        nfc_filename = unicodedata.normalize('NFC', file.filename)
        original_filename = fm.safe_filename(nfc_filename)
        name_base, _ = os.path.splitext(original_filename)
        filename = f"{name_base}.webp"

        save_path = os.path.join(folder_path, filename)
        is_confirmed = request.form.get('confirmed') == 'true'

        if os.path.exists(save_path):
            is_orphan = True
            conflicting_card_name = "알 수 없음"
            try:
                current_data_check = fm.load_data()
                for card in current_data_check:
                    if card.get('folder') == web_path_prefix and card.get('image') == filename:
                        is_orphan = False
                        conflicting_card_name = card.get('name', '이름 없음')
                        break
            except:
                is_orphan = False

            if not is_orphan:
                if not is_confirmed:
                    msg = f"중복 발견! \n경로: {web_path_prefix}/{filename}\n\n[사용 중인 카드명]: {conflicting_card_name}\n\n서버에 이미 등록된 카드입니다."
                    return jsonify({
                        'duplicate': True,
                        'filename': filename,
                        'message': msg,
                        'existing_url': f"/{web_path_prefix}/{filename}"
                    })

                base_name, ext = os.path.splitext(filename)
                counter = 1
                while os.path.exists(os.path.join(folder_path, filename)):
                    filename = f"{base_name}_{counter}{ext}"
                    counter += 1
                save_path = os.path.join(folder_path, filename)

        # 이미지 처리
        success, saved_name, error = fm.process_image_upload(file, folder_path, filename)
        if not success:
            print(f"Image processing failed: {error}")
            return jsonify({'error': '이미지 변환 저장 실패'}), 500

        filename = saved_name

        current_data = fm.load_data()

        # 기존 항목 중복 제거
        current_data = [item for item in current_data
                        if not (item.get('image') == filename and
                                (item.get('folder') == web_path_prefix or
                                 item.get('folder') == os.path.basename(folder_path)))]

        # Background Sync 준비
        updates_to_sync = []

        for reg in registrations:
            s_word = reg.get('name', name).strip()

            if '[' in s_word and s_word.endswith(']'):
                s_word = s_word.split('[')[0].strip()

            s_main = reg.get('part_of_speech', '').strip()
            s_sub = reg.get('language_category', '').strip()
            s_pron = reg.get('pronunciation', '').strip()
            s_keywords = reg.get('search_keywords', '').strip()

            # Smart Skip: 캐시와 비교
            need_sync = True
            try:
                ref_cache = dm.reference_cache
                if ref_cache and s_word in ref_cache:
                    ref = ref_cache[s_word]
                    r_main = ref.get('main', '').strip()
                    r_sub = ref.get('sub', '').strip()
                    r_pron = ref.get('pronunciation', '').strip()
                    r_tag1 = ref.get('tag1', '').strip()

                    if s_main == r_main and s_sub == r_sub:
                        if (not s_pron or s_pron == r_pron) and (not s_keywords or s_keywords == r_tag1):
                            need_sync = False
                            print(f"[Smart Skip] No changes for '{s_word}', skipping Sheet sync.")
            except Exception as e_skip:
                print(f"[Smart Skip Error] Proceeding with sync safely: {e_skip}")
                need_sync = True

            if need_sync:
                kw_parts = [k.strip() for k in s_keywords.split(',')] if s_keywords else []
                t1 = kw_parts[0] if len(kw_parts) > 0 else ""
                t2 = kw_parts[1] if len(kw_parts) > 1 else ""
                t3 = kw_parts[2] if len(kw_parts) > 2 else ""
                tags = [t1, t2, t3]
                updates_to_sync.append((s_word, s_main, s_sub, s_pron, tags))

            new_item = {
                'folder': web_path_prefix,
                'image': filename,
                'filename': filename,
                'name': reg.get('name', name),
                'main': reg.get('main', ''),
                'sub': reg.get('sub', ''),
                'part_of_speech': reg.get('part_of_speech', ''),
                'language_category': reg.get('language_category', ''),
                'search_keywords': s_keywords
            }
            current_data.append(new_item)

            try:
                lang_cat = reg.get('language_category', '기타')
                if lang_cat:
                    cat_dir = os.path.join(base, '범주', lang_cat)
                    os.makedirs(cat_dir, exist_ok=True)
                    shutil.copy2(save_path, os.path.join(cat_dir, filename))
            except:
                pass

        if fm.save_data(current_data):
            # Background GSheet 동기화
            def run_sync():
                print(f"[Background] Syncing {len(updates_to_sync)} words to GSheet...")
                for (w, m, s, p, tags) in updates_to_sync:
                    if w:
                        sm.update_word(w, m, s, p, tags)

            threading.Thread(target=run_sync).start()

            return jsonify({'success': True, 'msg': 'Upload successful', 'filename': filename})
        else:
            return jsonify({'error': 'Failed to save data info'}), 500

    return jsonify({'error': 'Unknown error'}), 500
```

---

## Step 6: `routes/user.py`

```python
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
    user_dir = um.get_user_dir(user_id)

    if request.method == 'GET':
        cards = []
        if os.path.exists(user_dir):
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
        req_data = request.json
        filename = req_data.get('filename')
        if not filename:
            return jsonify({'error': 'Filename required'}), 400

        file_path = os.path.join(user_dir, filename)
        if os.path.exists(file_path):
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
```

---

## Step 7: `routes/admin.py`

```python
from flask import Blueprint, request, jsonify, send_file, current_app
from routes.auth import requires_auth
import os
import io
import zipfile
import shutil
import unicodedata
import traceback
import pandas as pd
from datetime import datetime

admin_bp = Blueprint('admin', __name__)


# ── POST /api/update_reference ──

@admin_bp.route('/api/update_reference', methods=['POST'])
@requires_auth
def update_reference():
    dm = current_app.config['data_manager']
    base = current_app.config['BASE_DIR']

    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    save_path = os.path.join(base, dm.reference_file)
    try:
        file.save(save_path)
        dm.reference_cache = None
        dm.load_reference_dict()
        return jsonify({'success': True, 'msg': '사전 파일이 업데이트 되었습니다.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── GET /api/debug/status ──

@admin_bp.route('/api/debug/status', methods=['GET'])
def debug_status():
    dm = current_app.config['data_manager']
    base = current_app.config['BASE_DIR']

    path = os.path.join(base, 'reference_words.xlsx')
    exists = os.path.exists(path)
    size = os.path.getsize(path) if exists else 0
    cache_len = len(dm.reference_cache) if dm.reference_cache else 0

    return jsonify({
        'worker_id': os.getpid(),
        'reference_file': 'reference_words.xlsx',
        'full_path': path,
        'file_exists': exists,
        'file_size_bytes': size,
        'cache_loaded_count': cache_len,
        'last_error': dm.last_reference_error,
        'pandas_version': pd.__version__
    })


# ── POST /api/sync/pull_tags ──

@admin_bp.route('/api/sync/pull_tags', methods=['POST'])
def manual_tag_pull():
    try:
        dm = current_app.config['data_manager']
        fm = current_app.config['file_manager']
        sm = current_app.config['sync_manager']
        base = current_app.config['BASE_DIR']
        EXCEL_FILE = 'word.xlsx'
        REFERENCE_FILE = dm.reference_file

        print("[Manual Sync] Pulling tags from Google Sheet...")

        # 1. Google Sheet에서 가져오기
        sheet_data = sm.fetch_data()
        if not sheet_data:
            return jsonify({'success': False, 'message': 'Failed to fetch data from Google Sheet.'}), 500

        # 2. 로컬 데이터 로드
        excel_path = os.path.join(base, EXCEL_FILE)
        if os.path.exists(excel_path):
            df = pd.read_excel(excel_path).fillna('')
            current_data = df.to_dict('records')
        else:
            return jsonify({'success': False, 'message': 'Local data file not found.'}), 404

        updated_count = 0

        # 3. 로컬 데이터에 Sheet 데이터 반영
        for item in current_data:
            name = str(item.get('name', '')).strip()
            target_ref = sheet_data.get(name)

            if not target_ref:
                clean_name = name.split('[')[0].strip()
                target_ref = sheet_data.get(clean_name)

            if target_ref:
                tags = [
                    target_ref.get('tag1', '').strip(),
                    target_ref.get('tag2', '').strip(),
                    target_ref.get('tag3', '').strip()
                ]
                new_keywords = ",".join([t for t in tags if t])
                old_keywords = str(item.get('search_keywords', '')).strip()

                if new_keywords != old_keywords:
                    item['search_keywords'] = new_keywords
                    updated_count += 1

        # 4. 변경사항 저장
        if updated_count > 0:
            if not fm.save_data(current_data):
                return jsonify({'success': False, 'message': 'Failed to save local file.'}), 500

        # 5. 참조 사전 업데이트
        try:
            ref_rows = []
            for w_key, w_val in sheet_data.items():
                row = {
                    'Word': w_key,
                    'Main Category': w_val.get('main', ''),
                    'Sub Category': w_val.get('sub', ''),
                    'Pronunciation': w_val.get('pronunciation', ''),
                    'Tag 1': w_val.get('tag1', ''),
                    'Tag 2': w_val.get('tag2', ''),
                    'Tag 3': w_val.get('tag3', '')
                }
                ref_rows.append(row)

            if ref_rows:
                ref_df = pd.DataFrame(ref_rows)
                ref_path = os.path.join(base, REFERENCE_FILE)
                ref_df.to_excel(ref_path, index=False)
                print(f"[Manual Sync] Updated {REFERENCE_FILE} with {len(ref_df)} words.")

                dm.reference_cache = sheet_data
                print("[Manual Sync] Updated reference_cache.")

        except Exception as e_ref:
            print(f"[Manual Sync Warning] Failed to update reference dictionary: {e_ref}")

        if updated_count > 0:
            return jsonify({'success': True, 'count': updated_count,
                            'message': f'Updated {updated_count} cards (and Reference Dict).'})
        else:
            return jsonify({'success': True, 'count': 0,
                            'message': 'Inventory up to date (Reference Dict updated).'})

    except Exception as e:
        print(f"[Manual Sync Error] {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# ── GET /api/backup_code ──

@admin_bp.route('/api/backup_code', methods=['GET'])
@requires_auth
def backup_code():
    try:
        base = current_app.config['BASE_DIR']
        memory_file = io.BytesIO()

        INCLUDE_EXTENSIONS = {
            '.py', '.js', '.css', '.html',
            '.bat', '.sh', '.cmd',
            '.json', '.xml', '.yaml', '.yml', '.txt',
            '.md',
            '.xlsx', '.csv',
            '.db',
            '.code-workspace'
        }

        SKIP_DIRS = {
            'backup', '__pycache__', '.git', '.history', '.vscode', '.idea',
            'venv', 'env', '.gemini', 'user_images', '범주'
        }

        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(base):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    if ext in INCLUDE_EXTENSIONS:
                        abs_path = os.path.join(root, file)
                        rel_path = os.path.relpath(abs_path, base)
                        zipf.write(abs_path, rel_path)

        memory_file.seek(0)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"code_backup_{timestamp}.zip"

        return send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        print(f"Backup error: {e}")
        return jsonify({'error': str(e)}), 500


# ── GET /api/fix_paths ──

@admin_bp.route('/api/fix_paths', methods=['GET'])
@requires_auth
def fix_beta_paths():
    """경로 수정: beta_ 경로 보정 + ㅇ(받침) 폴더 병합"""
    try:
        fm = current_app.config['file_manager']
        base = current_app.config['BASE_DIR']
        USER_IMAGES_DIR = 'user_images'

        data = fm.load_data()
        new_data = []
        fixed_count = 0
        seen_keys = set()

        # 폴더 병합: ㅇ(받침) → 19_받침(ㅇ)
        wrong_folder = os.path.join(base, 'ㅇ(받침)')
        correct_folder = os.path.join(base, '19_받침(ㅇ)')

        if os.path.exists(wrong_folder):
            if not os.path.exists(correct_folder):
                os.makedirs(correct_folder, exist_ok=True)

            for filename in os.listdir(wrong_folder):
                src = os.path.join(wrong_folder, filename)
                dst = os.path.join(correct_folder, filename)
                if os.path.isfile(src):
                    shutil.move(src, dst)

            try:
                os.rmdir(wrong_folder)
            except:
                pass

        for item in data:
            folder = unicodedata.normalize('NFC', str(item.get('folder', '')))
            image = unicodedata.normalize('NFC', str(item.get('image', '')))

            item['folder'] = folder
            item['image'] = image

            if folder == 'ㅇ(받침)':
                folder = '19_받침(ㅇ)'
                item['folder'] = folder
                fixed_count += 1

            if folder.startswith('beta_') and not folder.startswith(USER_IMAGES_DIR):
                new_folder = os.path.join(USER_IMAGES_DIR, folder).replace('\\', '/')
                item['folder'] = new_folder
                folder = new_folder
                fixed_count += 1

            key = f"{folder}|{image}"
            if key not in seen_keys:
                seen_keys.add(key)
                new_data.append(item)

        if fixed_count > 0 or len(data) != len(new_data):
            fm.save_data(new_data)
            return jsonify({
                'success': True,
                'msg': f'Fixed {fixed_count} paths & Merged folders. Total: {len(data)} -> {len(new_data)}'
            })
        else:
            return jsonify({'success': True, 'msg': 'All correct. No changes.'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── POST /api/refresh_dict ──

@admin_bp.route('/api/refresh_dict', methods=['POST'])
@requires_auth
def refresh_dictionary():
    return jsonify({'error': 'Not implemented'}), 501
```

---

## Step 8: `server.py` 교체

기존 `server.py` 전체를 아래로 교체:

```python
from flask import Flask
import os

# ── 설정 ──
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEPLOYMENT_VERSION = "VER_2026_03_29_MODULAR"

# ── 매니저 초기화 ──
from data_manager import DataManager
from file_manager import FileManager
from user_manager import UserManager
from sync_manager import SyncManager

ADMIN_PASS = '1emdgksrmfn'  # TODO: 추후 .env로 이동
CREDENTIALS_PATH = os.path.join(BASE_DIR, 'credentials.json')
SHEET_URL = 'https://docs.google.com/spreadsheets/d/114C5f1aowSR6TVG4OtY-RwmvCgbu3k-Gz81GndxPKV8/edit'

data_manager = DataManager(BASE_DIR)
file_manager = FileManager(BASE_DIR, data_manager)
user_manager = UserManager(BASE_DIR, ADMIN_PASS)
sync_manager = SyncManager(CREDENTIALS_PATH, SHEET_URL)

# ── Flask 앱 ──
app = Flask(__name__, static_folder=None)
app.secret_key = 'random_secret_key_hangru_vending'
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# 매니저를 app.config에 등록 (Blueprint에서 current_app.config로 접근)
app.config['data_manager'] = data_manager
app.config['file_manager'] = file_manager
app.config['user_manager'] = user_manager
app.config['sync_manager'] = sync_manager
app.config['BASE_DIR'] = BASE_DIR

# ── Blueprint 등록 ──
from routes.auth import auth_bp
from routes.static import static_bp
from routes.cards import cards_bp
from routes.upload import upload_bp
from routes.user import user_bp
from routes.admin import admin_bp

app.register_blueprint(auth_bp)
app.register_blueprint(static_bp)
app.register_blueprint(cards_bp)
app.register_blueprint(upload_bp)
app.register_blueprint(user_bp)
app.register_blueprint(admin_bp)

print(f"\n{'='*40}\n STARTING SERVER: {DEPLOYMENT_VERSION}\n BASE_DIR: {BASE_DIR}\n{'='*40}\n")

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

---

## Step 9: 검증

```bash
python server.py
```

에러 없이 시작되면 아래 항목 수동 확인:

- [ ] `python server.py` → 서버 시작 OK
- [ ] `/` 메인 페이지 로드
- [ ] `/admin` 로그인 페이지 → 비번 입력 → 어드민 진입
- [ ] `/api/cards` JSON 반환
- [ ] `/api/analyze` POST 테스트 (음소 분석)
- [ ] `/api/upload` 카드 업로드
- [ ] `/api/user_cards` 유저 카드 조회
- [ ] `/api/backup_code` ZIP 다운로드

---

## 수정된 버그 목록

| # | 내용 | 수정 위치 |
|---|------|-----------|
| B1 | `check_auth()` 미정의 → `user_manager.check_auth()` | routes/auth.py |
| B2 | `get_user_dir()` 미정의 → `user_manager.get_user_dir()` | routes/user.py |
| B3 | `traceback` 미import | routes/admin.py |
| B4 | 988~1001줄 죽은 코드 | 삭제됨 (server.py 교체) |
| B5 | `normalize_for_search()` 불필요 래퍼 | 삭제, 직접 호출 |
| B6 | `safe_filename()`, `korean_g2p()` 래퍼 | 삭제, 직접 호출 |
| B7 | `update_version()` 빈 함수 + 호출 | 전부 삭제 |
| B8 | `/api/version` deprecated | 삭제 |
| B9 | `from sync_manager` 중복 import | 삭제 |
| B10 | `update_card()` save_data 이중 호출 | routes/cards.py에서 1번만 호출 |
| B11 | `reference_cache` 전역변수 → `dm.reference_cache` | routes/upload.py, admin.py |
| B12 | `pd.Timestamp` → `datetime` (pandas 불필요 의존) | routes/admin.py backup_code |

---

## 최종 파일별 줄 수 예상

| 파일 | 줄 수 |
|------|--------|
| `server.py` | ~55줄 |
| `routes/auth.py` | ~70줄 |
| `routes/static.py` | ~115줄 |
| `routes/cards.py` | ~265줄 |
| `routes/upload.py` | ~165줄 |
| `routes/user.py` | ~175줄 |
| `routes/admin.py` | ~220줄 |
| **합계** | **~1,065줄** |

모든 파일이 300줄 이하. 1,000줄 한계 내.
