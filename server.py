from flask import Flask, request, jsonify, send_file, abort, Response, session, redirect, url_for, render_template_string
import pandas as pd
import os
import shutil
import json
import unicodedata
from urllib.parse import unquote
import io
import zipfile
from werkzeug.utils import secure_filename
from pathlib import Path
from PIL import Image
import hashlib
import threading
import time

# [Version Control] Global Data Version (Persisted) - REMOVED (Moved to File-Specific)
# VERSION_FILE = 'version.txt'

# def load_version(): ... (Removed)
# def save_version_file(ver): ... (Removed)
# DATA_VERSION = load_version() (Removed)

# App initialized later

# Configuration
EXCEL_FILE = 'word.xlsx'
DATA_FILE = 'data.js'
USER_IMAGES_DIR = 'user_images'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# [Global Cache] Initialize to avoid NameError
reference_cache = {}

# [Auth] Admin Credentials
ADMIN_USER = 'admin'
ADMIN_PASS = '1emdgksrmfn' 

def get_user_dir(user_id):
    # 1. [Legacy] Check 'user_images' (Admins, Pre-existing)
    legacy_safe_id = "".join([c for c in user_id if c.isalnum() or c in ('-', '_')])
    if not legacy_safe_id: legacy_safe_id = "guest"
    
    legacy_path = os.path.join(BASE_DIR, USER_IMAGES_DIR, legacy_safe_id)
    if os.path.exists(legacy_path):
        return legacy_path

    # 2. [Consolidation] Use 'user_images' for Beta too, but with 'beta_' prefix + Hash
    # This solves permission issues of creating new root folders.
    folder_name = f"beta_{hashlib.md5(user_id.encode('utf-8')).hexdigest()}"
    beta_path = os.path.join(BASE_DIR, USER_IMAGES_DIR, folder_name)
    
    if not os.path.exists(beta_path):
        os.makedirs(beta_path, exist_ok=True)
        # Save the Real Name to identify this hash folder later
        try:
            with open(os.path.join(beta_path, '.name'), 'w', encoding='utf-8') as f:
                f.write(user_id)
        except: pass
        
    return beta_path

# ... existing code ...



PHONEME_ORDER = [
    "ㅇ(모음)", "ㅂ", "ㅃ", "ㅍ", "ㅁ",
    "ㄷ", "ㄸ", "ㅌ", "ㄴ", "ㅅ", "ㅆ",
    "ㄹ", "ㅈ", "ㅉ", "ㅊ", "ㄱ", "ㄲ", "ㅋ", "ㅇ(받침)", "ㅎ"
]

# Sort Key Logic
CHOSEONG = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 
    'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
]
JONGSEONG = [
    '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 
    'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 
    'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
]

# Map PHONEME_ORDER items to Cho/Jong indices (Manual Mapping for accuracy)
# (Cho_Index, Jong_Index) - None if N/A
PHONEME_MAP = {
    "ㄱ": (0, 1), "ㄲ": (1, 2), "ㄴ": (2, 4), "ㄷ": (3, 7), "ㄸ": (4, None),
    "ㄹ": (5, 8), "ㅁ": (6, 16), "ㅂ": (7, 17), "ㅃ": (8, None), "ㅅ": (9, 19),
    "ㅆ": (10, 20), "ㅇ(모음)": (11, None), "ㅈ": (12, 22), "ㅉ": (13, None),
    "ㅊ": (14, 23), "ㅋ": (15, 24), "ㅌ": (16, 25), "ㅍ": (17, 26), "ㅎ": (18, 27),
    "ㅇ(받침)": (None, 21)
}

def get_position_score(name, target_phoneme):
    """
    Returns score based on User's 4-level priority:
    1: Word-Initial Initial (어두초성)
    2: Word-Medial Initial (어중초성)
    3: Word-Medial Final (어중종성)
    4: Word-Final Final (어말종성)
    5: Not Found
    """
    if target_phoneme not in PHONEME_MAP: return 5
    
    target_cho, target_jong = PHONEME_MAP[target_phoneme]
    best_score = 5
    n_len = len(name)
    
    # Analyze each char
    for i, char in enumerate(name):
        if not ('가' <= char <= '힣'): continue
        
        code = ord(char) - 0xAC00
        cho = code // 588
        # jung = (code % 588) // 28
        jong = code % 28
        
        # Check Initial (Cho)
        if target_cho is not None and cho == target_cho:
            if i == 0: 
                return 1 # Optimal (Can't get better than 1)
            else:
                best_score = min(best_score, 2) # Medial Initial
            
        # Check Final (Jong)
        if target_jong is not None and jong == target_jong:
             if i == n_len - 1:
                 best_score = min(best_score, 4) # Final Final
             else:
                 best_score = min(best_score, 3) # Medial Final
             
    return best_score

def get_sort_key(item):
    main = str(item.get('main', '')).strip()
    name = item.get('name', '')
    
    try:
        # 1. Articulation Category? (Position Prioritized -> Windows Name Sort)
        # User requested to remove Length sort.
        if main and main in PHONEME_ORDER:
            pos_score = get_position_score(str(name), main)
            return (pos_score, str(name))
            
        # 2. Language Category? (Use Windows/Unicode Sort)
        # Using a high prefix to separate chunks if mixed list
        return (1000, str(name))
        
    except Exception as e:
        print(f"[Sort Error] Item: {name}, Error: {e}")
        # Safe Fallback
        return (9999, str(name))

def sort_data(data_list):
    # Sort relies on Python's stable tuple comparison
    data_list.sort(key=get_sort_key)
    return data_list

from functools import wraps
app = Flask(__name__, static_folder=None)
app.secret_key = 'random_secret_key_hangru_vending' 

# [DEPLOYMENT TAG] - Please check the log for this line to verify the update.
DEPLOYMENT_VERSION = "VER_2026_01_22_CHECK"
print(f"\n{'='*40}\n STARTING SERVER: {DEPLOYMENT_VERSION}\n BASE_DIR: {BASE_DIR}\n{'='*40}\n")

@app.route('/api/version', methods=['GET'])
def get_version():
    # Deprecated: Client uses file-specific versioning now.
    # Returning timestamp just in case, but client should ignore.
    return jsonify({'version': int(time.time())})

def update_version():
    # Deprecated: No global version to update.
    pass


def check_auth(password):
    return password == ADMIN_PASS

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('is_admin'):
             if request.path.startswith('/api/'):
                 return jsonify({'error': 'Unauthorized'}), 401
             return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

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

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        if check_auth(request.form['password']):
            session['is_admin'] = True
            return redirect(url_for('serve_admin'))
        else:
            error = '비밀번호가 올바르지 않습니다.'
    return render_template_string(LOGIN_TEMPLATE, error=error)

@app.route('/logout')
def logout():
    session.pop('is_admin', None)
    return redirect(url_for('login'))

@app.route('/')
def serve_index():
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
    return send_file(os.path.join(BASE_DIR, 'index.html'))

@app.route('/admin')
@requires_auth
def serve_admin():
    return send_file(os.path.join(BASE_DIR, 'admin.html'))

@app.route('/style.css')
def serve_css():
    return send_file(os.path.join(BASE_DIR, 'style.css'), mimetype='text/css')

@app.route('/data.js')
def serve_data_js():
    return send_file(os.path.join(BASE_DIR, 'data.js'), mimetype='application/javascript')

@app.route('/css/<path:filename>')
def serve_css_folder(filename):
    return send_file(os.path.join(BASE_DIR, 'css', filename), mimetype='text/css')

@app.route('/js/<path:filename>')
def serve_js_folder(filename):
    return send_file(os.path.join(BASE_DIR, 'js', filename), mimetype='application/javascript')

def find_file_robustly(base_dir, path_str):
    """
    Iteratively finds a file by matching each path component (folder/file) 
    checking for NFC/NFD normalization AND case-insensitivity.
    Returns the absolute path if found, otherwise None.
    """
    try:
        current_path = base_dir
        parts = path_str.replace('\\', '/').split('/')
        parts = [p for p in parts if p and p != '.'] # Clean parts

        for part in parts:
            if not os.path.isdir(current_path):
                return None # Can't traverse anymore
            
            found_next = None
            
            # 1. Exact Match (Fast)
            exact_path = os.path.join(current_path, part)
            if os.path.exists(exact_path):
                current_path = exact_path
                continue

            # 2. Fuzzy Match (Slow but robust) - NFC, NFD, NFKC
            part_norm_set = {
                unicodedata.normalize('NFC', part).lower(),
                unicodedata.normalize('NFD', part).lower(),
                unicodedata.normalize('NFKC', part).lower()
            }
            
            for candidate in os.listdir(current_path):
                cand_nfc = unicodedata.normalize('NFC', candidate).lower()
                if cand_nfc in part_norm_set:
                    found_next = candidate
                    break
                
                cand_nfd = unicodedata.normalize('NFD', candidate).lower()
                if cand_nfd in part_norm_set:
                    found_next = candidate
                    break

                cand_nfkc = unicodedata.normalize('NFKC', candidate).lower()
                if cand_nfkc in part_norm_set:
                    found_next = candidate
                    break
            
            if found_next:
                current_path = os.path.join(current_path, found_next)
            else:
                return None # Component not found
        
        if os.path.exists(current_path) and os.path.isfile(current_path):
            return current_path
            
    except Exception as e:
        print(f"Robust search error: {e}")
    return None

@app.route('/<path:path>')
def serve_static(path):
    decoded_path = unquote(path)
    full_path = os.path.join(BASE_DIR, decoded_path)

    # 1. Direct Check
    if os.path.exists(full_path) and os.path.isfile(full_path):
        return send_file(full_path)

    # 2. Simple Normalization Checks (NFC/NFD)
    for norm in ['NFC', 'NFD']:
        norm_p = unicodedata.normalize(norm, decoded_path)
        fp = os.path.join(BASE_DIR, norm_p)
        if os.path.exists(fp) and os.path.isfile(fp):
            return send_file(fp)

    # 3. Robust Iterative Search (Handles mixed NFC/NFD + Case Sensitivity + Folder mismatches)
    robust_path = find_file_robustly(BASE_DIR, decoded_path)
    if robust_path:
        print(f"DEBUG: Robust Match! {path} -> {robust_path}")
        return send_file(robust_path)

    # 4. [Recovery] User Images Fallback
    # If path starts with 'beta_' but is missing 'user_images/'
    if 'beta_' in path and not path.startswith(USER_IMAGES_DIR):
        fixed_path = os.path.join(USER_IMAGES_DIR, path)
        retry = find_file_robustly(BASE_DIR, fixed_path)
        if retry:
            print(f"DEBUG: Redirecting legacy path to user_images: {path}")
            return send_file(retry)

    # 5. [Last Resort] Check 'user_images' flatly
    # Useful if path is just 'wang.webp' but file is in 'user_images/beta_.../wang.webp' ?? No, just 'user_images/wang.webp'
    user_id = request.args.get('user', 'guest')
    user_dir = get_user_dir(user_id)
    if os.path.exists(user_dir):
        # Check if file exists in user dir matching simply the filename
        target_file = os.path.basename(decoded_path)
        robust_user = find_file_robustly(user_dir, target_file)
        if robust_user:
             return send_file(robust_user)

    abort(404)

@app.route('/api/update_reference', methods=['POST'])
@requires_auth
def update_reference():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    # Overwrite the reference file
    save_path = os.path.join(BASE_DIR, 'reference_words.xlsx')
    try:
        file.save(save_path)
        
        # Clear cache to force reload
        global reference_cache
        reference_cache = None
        
        # Reload immediately to check validity (optional, but good practice)
        load_reference_dict()
        
        return jsonify({'success': True, 'msg': '사전 파일이 업데이트 되었습니다.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def normalize_for_search(text):
    if not text:
        return ""
    text = unicodedata.normalize('NFD', text)
    return text.replace('\u1162', '\u1166').replace('\u3150', '\u3154')

@app.route('/api/register_user', methods=['POST'])
def register_user():
    try:
        req = request.json
        name = req.get('name', '').strip()
        if not name: return jsonify({'error': 'Name required'}), 400

        # Generate Directory Name
        # Logic: beta_SHA1(name)[:8] for uniqueness/safety, 
        # or simple sanitization if we trust input.
        # Let's use simple sanitization + random suffix to avoid collision
        safe_name = safe_filename(name)
        
        # Check if existing folder has this name in .name file?
        # Just creating a new one or finding existing one.
        
        # Simple ID generation
        import hashlib
        user_hash = hashlib.md5(name.encode('utf-8')).hexdigest()[:8]
        user_id = f"beta_{user_hash}"
        
        user_dir = os.path.join(BASE_DIR, USER_IMAGES_DIR, user_id)
        
        if not os.path.exists(user_dir):
            os.makedirs(user_dir)
            
        # Write .name file (Source of Truth for Display Name)
        name_file = os.path.join(user_dir, '.name')
        with open(name_file, 'w', encoding='utf-8') as f:
            f.write(name)
            
        print(f"Registered User: {name} -> {user_id}")
        return jsonify({'success': True, 'user_id': user_id})
        
    except Exception as e:
        print(f"Register error: {e}")
        return jsonify({'error': str(e)}), 500

# [Beta-Test] Temporary Endpoint for User List Gate
@app.route('/api/users', methods=['GET'])
def list_users():
    # Only list Beta Users (folders starting with 'beta_') from user_images
    users_root = os.path.join(BASE_DIR, USER_IMAGES_DIR)
    
    if not os.path.exists(users_root):
        return jsonify([])
    
    users = []
    try:
        for entry in os.scandir(users_root):
             # Skip hidden files
            if entry.name.startswith('.'): continue
            
            if entry.is_dir():
                # Check for Beta Marker
                if entry.name.startswith('beta_'):
                    # Read real name from .name file
                    name_file = os.path.join(entry.path, '.name')
                    if os.path.exists(name_file):
                        try:
                            with open(name_file, 'r', encoding='utf-8') as f:
                                real_name = f.read().strip()
                                if real_name: users.append(real_name)
                        except: pass
    except Exception as e:
        print(f"Error listing users: {e}")
        return jsonify([])
        
    return jsonify(sorted(users))

@app.route('/api/cards', methods=['GET'])
def list_cards():
    try:
        user_id = request.args.get('user', 'guest')
        user_dir = get_user_dir(user_id)
        data = load_data()
        query = request.args.get('q', '').strip()
        search_norm = normalize_for_search(query) if query else None

        clean_data = []
        has_changes = False

        for item in data:
            folder = str(item.get('folder', ''))
            image = str(item.get('image', ''))
            if not folder or not image: continue
            file_path = os.path.join(BASE_DIR, folder, image)
            if os.path.exists(file_path):
                clean_data.append(item)
            else:
                # [SAFETY FIX] Do NOT delete missing files automatically.
                # Just keep them in DB so we can fix paths later.
                clean_data.append(item) 
                # has_changes = True
                # print(f"DEBUG: File missing, removing from DB: {folder}/{image}")

        # if has_changes:
        #     save_data(clean_data)

        # [Reverted by User Request] Auto-Registration Logic Removed
        # User prefers to manually re-upload files to clean up the mess.
        # Code block for 'Auto-Register Orphans' is removed here.

        if search_norm:
            response_data = []
            for item in clean_data:
                name = str(item.get('name', ''))
                if search_norm in normalize_for_search(name):
                    response_data.append(item)
            return jsonify(response_data)

        return jsonify(clean_data)
    except Exception as e:
        print(f"List cards error: {e}")
        return jsonify({'error': str(e)}), 500

def safe_filename(filename):
    filename = unicodedata.normalize('NFC', filename)
    filename = os.path.basename(filename)
    for char in ['\\', '/', ':', '*', '?', '"', '<', '>', '|']:
        filename = filename.replace(char, '_')
    filename = filename.replace(' ', '')
    return filename

CHO_LIST = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
JUNG_LIST = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']
JONG_LIST = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

def decompose_hangul(text):
    result = []
    for char in text:
        if '가' <= char <= '힣':
            code = ord(char) - 0xAC00
            cho = code // 588
            jung = (code % 588) // 28
            jong = code % 28
            result.append({'char': char, 'cho': CHO_LIST[cho], 'jung': JUNG_LIST[jung], 'jong': JONG_LIST[jong]})
        else:
            result.append(None)
    return result

def korean_g2p(text):
    """
    A comprehensive rule-based G2P for Korean words based on Standard Pronunciation Rules.
    Prioritizes 'Reference Dictionary' pronunciation if available.
    """
    # 0. Check Dictionary Override first
    try:
        ref_dict = load_reference_dict()
        if text in ref_dict:
            override = ref_dict[text].get('pronunciation')
            if override:
                return override
        # Remove spaces check
        text_clean = text.replace(" ", "")
        if text_clean in ref_dict:
            override = ref_dict[text_clean].get('pronunciation')
            if override:
                return override
    except Exception:
        pass # Fallback to rules

    decomposed = decompose_hangul(text)
    # Working buffer (deep copy to avoid modifying original info directly)
    res = [d.copy() if d else None for d in decomposed]

    # Constants
    CHO = CHO_LIST
    JUNG = JUNG_LIST
    JONG = JONG_LIST

    def get(i):
        if 0 <= i < len(res): return res[i]
        return None

    # ==========================================
    # 1. Palatalization (구개음화)
    # ==========================================
    # ㄷ,ㅌ + 이(cho='ㅇ', jung='ㅣ') -> 지, 치
    # 붙이다 -> [부치다], 굳이 -> [구지]
    for i in range(len(res) - 1):
        curr = get(i)
        next_item = get(i+1)
        if curr and next_item:
            if curr['jong'] in ['ㄷ', 'ㅌ']:
                # Standard rule applies when suffix starts with 'i' or 'hi'
                # Simplified check for '이'
                if next_item['cho'] == 'ㅇ' and next_item['jung'] == 'ㅣ':
                    target = 'ㅈ' if curr['jong'] == 'ㄷ' else 'ㅊ'
                    curr['jong'] = ''
                    next_item['cho'] = target
                # Check for '히' (merged into 치) - 굳히다 -> 구치다
                elif next_item['cho'] == 'ㅎ' and next_item['jung'] == 'ㅣ':
                     if curr['jong'] == 'ㄷ':
                         curr['jong'] = ''
                         next_item['cho'] = 'ㅊ'
                     elif curr['jong'] == 'ㅌ': # 뭍히다 -> 무치다
                         curr['jong'] = ''
                         next_item['cho'] = 'ㅊ'

    # ==========================================
    # 2. Aspiration (자음축약 - 거센소리되기) & H-Merger
    # ==========================================
    # ㅎ + ㄱ,ㄷ,ㅂ,ㅈ <-> ㅋ,ㅌ,ㅍ,ㅊ
    # ㅎ + ㅅ -> ㅆ (Standard Rule 12)
    ASPIRATION_MAP = {'ㄱ':'ㅋ', 'ㄷ':'ㅌ', 'ㅂ':'ㅍ', 'ㅈ':'ㅊ'}

    # Forward: Patchim + ㅎ -> Aspirated Onset
    for i in range(len(res) - 1):
        curr = get(i)
        next_item = get(i+1)
        if curr and next_item:
            # Case: Patchim + ㅎ
            cond1 = next_item['cho'] == 'ㅎ'

            # Simple codas
            if cond1 and curr['jong'] in ASPIRATION_MAP:
                target = ASPIRATION_MAP[curr['jong']]
                curr['jong'] = ''
                next_item['cho'] = target

            # Double codas: ㄵ(x), ㄶ(h), ㄺ(k), ㄼ(p/l), ㄾ(t/l), ㅀ(h), ㅄ(p)
            # ㄶ, ㅀ followed by stops
            if cond1:
                # ㄶ: Standard rule for ㄶ + vowel is 'ㄴ'. But ㄶ + ㄱ,ㄷ,ㅈ -> ㄴ + ㅋ,ㅌ,ㅊ
                pass

    # Reverse: ㅎ Patchim + Onset ㄱ,ㄷ,ㅂ,ㅈ,ㅅ
    # Or Double Patchim ending in ㅎ (ㄶ, ㅀ) + ㄱ,ㄷ,ㅂ,ㅈ,ㅅ
    for i in range(len(res) - 1):
        curr = get(i)
        next_item = get(i+1)
        if curr and next_item:
            # Check basic 'ㅎ'
            if curr['jong'] == 'ㅎ':
                if next_item['cho'] in ASPIRATION_MAP:
                    target = ASPIRATION_MAP[next_item['cho']]
                    curr['jong'] = ''
                    next_item['cho'] = target
                elif next_item['cho'] == 'ㅅ': # ㅎ + ㅅ -> ㅆ
                    curr['jong'] = ''
                    next_item['cho'] = 'ㅆ'

            # Check 'ㄶ' -> ㄴ + Aspirated/Tensed
            elif curr['jong'] == 'ㄶ':
                if next_item['cho'] in ASPIRATION_MAP:
                    target = ASPIRATION_MAP[next_item['cho']]
                    curr['jong'] = 'ㄴ'
                    next_item['cho'] = target
                elif next_item['cho'] == 'ㅅ': # ㄶ + ㅅ -> ㄴ + ㅆ
                    curr['jong'] = 'ㄴ'
                    next_item['cho'] = 'ㅆ'

            # Check 'ㅀ' -> ㄹ + Aspirated/Tensed
            elif curr['jong'] == 'ㅀ':
                if next_item['cho'] in ASPIRATION_MAP:
                    target = ASPIRATION_MAP[next_item['cho']]
                    curr['jong'] = 'ㄹ'
                    next_item['cho'] = target
                elif next_item['cho'] == 'ㅅ': # ㅀ + ㅅ -> ㄹ + ㅆ
                    curr['jong'] = 'ㄹ'
                    next_item['cho'] = 'ㅆ'

    # ==========================================
    # 3. Liaison (연음) & 'ㅎ' Deletion
    # ==========================================
    # If next is Vowel (Cho='ㅇ'), move patchim to onset.
    # 'ㅎ' in patchim (ㅎ, ㄶ, ㅀ) gets deleted before vowel.
    for i in range(len(res) - 1):
        curr = get(i)
        next_item = get(i+1)
        if curr and next_item and next_item['cho'] == 'ㅇ':
            j = curr['jong']
            if not j: continue

            # 'ㅎ' Deletion
            if j == 'ㅎ':
                curr['jong'] = ''
                continue
            elif j == 'ㄶ':
                curr['jong'] = 'ㄴ'
                continue
            elif j == 'ㅀ':
                curr['jong'] = 'ㄹ'
                continue

            # Double Codas Liaison: Left stays, Right moves
            # ㄳ, ㄵ, ㅄ, ㄺ, ㄻ, ㄼ, ㄽ, ㄾ, ㄿ
            DOUBLE_CODA_SPLIT = {
                'ㄳ': ('ㄱ', 'ㅆ'),
                'ㄵ': ('ㄴ', 'ㅈ'),
                'ㄺ': ('ㄹ', 'ㄱ'),
                'ㄻ': ('ㄹ', 'ㅁ'),
                'ㄼ': ('ㄹ', 'ㅂ'),
                'ㄽ': ('ㄹ', 'ㅆ'),
                'ㄾ': ('ㄹ', 'ㅌ'),
                'ㄿ': ('ㄹ', 'ㅍ'),
                'ㅄ': ('ㅂ', 'ㅆ'),
            }

            if j in DOUBLE_CODA_SPLIT:
                first, second = DOUBLE_CODA_SPLIT[j]
                curr['jong'] = first
                next_item['cho'] = second
            else:
                # Single Coda Liaison
                # 꽃이 -> [꼬치]
                curr['jong'] = ''
                next_item['cho'] = j

    # ==========================================
    # 4. Syllable Coda Simplification (음절의 끝소리 규칙)
    # ==========================================
    # Reduce all remaining Codas to ㄱ, ㄴ, ㄷ, ㄹ, ㅁ, ㅂ, ㅇ

    # 4-1. Simplify Complex Codas (겹받침) followed by Consonant or End

    COMPLEX_MAP = {
        'ㄳ': 'ㄱ',
        'ㄵ': 'ㄴ',
        'ㄶ': 'ㄴ', # ㅎ dropped/merged
        'ㄽ': 'ㄹ',
        'ㄾ': 'ㄹ',
        'ㅀ': 'ㄹ', # ㅎ dropped/merged
        'ㅄ': 'ㅂ',
        'ㄻ': 'ㅁ',
        'ㄿ': 'ㅂ',
        'ㄺ': 'ㄱ' # Removed Verb exception: 닭고기 -> [닥꼬기]
    }

    for i in range(len(res)):
        curr = get(i)
        if not curr or not curr['jong']: continue

        j = curr['jong']
        next_item = get(i+1)

        # Determine effective complexity
        if j in COMPLEX_MAP:
             curr['jong'] = COMPLEX_MAP[j]
        # elif j == 'ㄺ': # Removed verb rule
        #     pass
        elif j == 'ㄼ':
            # Special case: 밟다 -> [밥따]. 넓다 -> [널따].
            # Simple heuristic
            if curr['char'].startswith('밟'):
                curr['jong'] = 'ㅂ'
            else:
                curr['jong'] = 'ㄹ'

    # 4-2. Neutralization (대표음화)
    # ㅍ -> ㅂ, ㅋ -> ㄱ, ㅅ/ㅆ/ㅈ/ㅊ/ㅌ/ㅎ -> ㄷ
    NEUTRAL_MAP = {
        'ㅍ': 'ㅂ',
        'ㅋ': 'ㄱ',
        'ㅅ': 'ㄷ', 'ㅆ': 'ㄷ', 'ㅈ': 'ㄷ', 'ㅊ': 'ㄷ', 'ㅌ': 'ㄷ', 'ㅎ': 'ㄷ',
        'ㄲ': 'ㄱ'
    }

    for i in range(len(res)):
        curr = get(i)
        if not curr or not curr['jong']: continue
        if curr['jong'] in NEUTRAL_MAP:
            curr['jong'] = NEUTRAL_MAP[curr['jong']]

    # ==========================================
    # 5. Assimilation (음운 동화)
    # ==========================================

    # 5-1. Nasalization (비음화)
    # Obstruent (ㄱ,ㄷ,ㅂ) + Nasal (ㄴ,ㅁ) -> Nasal (ㅇ,ㄴ,ㅁ)
    NASAL_MAP = {'ㄱ':'ㅇ', 'ㄷ':'ㄴ', 'ㅂ':'ㅁ'}
    NASALS = ['ㄴ', 'ㅁ']

    for i in range(len(res) - 1):
        curr = get(i)
        next_item = get(i+1)
        if curr and next_item:
            # Case: Nasal/Obstruent + ㄹ -> ㄹ becomes ㄴ
            # e.g. 백로 -> [뱅노] (ㄱ+ㄹ->ㅇ+ㄴ), 종로 -> [종노] (ㅇ+ㄹ->ㅇ+ㄴ)
            # Conditions: Jong is ㄱ,ㄷ,ㅂ,ㅁ,ㅇ AND Cho is ㄹ
            if curr['jong'] in ['ㄱ','ㄷ','ㅂ','ㅁ','ㅇ'] and next_item['cho'] == 'ㄹ':
                next_item['cho'] = 'ㄴ'

            # Apply Normal Nasalization: ㄱ,ㄷ,ㅂ + ㄴ,ㅁ -> ㅇ,ㄴ,ㅁ
            if curr['jong'] in NASAL_MAP and next_item['cho'] in NASALS:
                curr['jong'] = NASAL_MAP[curr['jong']]

    # 5-2. Lateralization (유음화)
    # ㄴ + ㄹ -> ㄹ + ㄹ / ㄹ + ㄴ -> ㄹ + ㄹ
    for i in range(len(res) - 1):
        curr = get(i)
        next_item = get(i+1)
        if curr and next_item:
            if curr['jong'] == 'ㄴ' and next_item['cho'] == 'ㄹ':
                curr['jong'] = 'ㄹ'
            elif curr['jong'] == 'ㄹ' and next_item['cho'] == 'ㄴ':
                # Special Check: 공권력 -> [공꿘녁] (Exception to lateralization)
                # But for standard rule-based G2P, Lateralization is dominant.
                next_item['cho'] = 'ㄹ'

    # ==========================================
    # 6. Tensification (경음화 - 된소리되기)
    # ==========================================
    # ㄱ,ㄷ,ㅂ + ㄱ,ㄷ,ㅂ,ㅅ,ㅈ -> ㄲ,ㄸ,ㅃ,ㅆ,ㅉ
    TENSIFICATION_TARGETS = {'ㄱ':'ㄲ', 'ㄷ':'ㄸ', 'ㅂ':'ㅃ', 'ㅅ':'ㅆ', 'ㅈ':'ㅉ'}
    TRIGGERS = ['ㄱ', 'ㄷ', 'ㅂ']

    for i in range(len(res) - 1):
        curr = get(i)
        next_item = get(i+1)
        if curr and next_item:
             if curr['jong'] in TRIGGERS and next_item['cho'] in TENSIFICATION_TARGETS:
                 next_item['cho'] = TENSIFICATION_TARGETS[next_item['cho']]

    # --- Recompose ---
    final_str = ""
    for i, item in enumerate(res):
        if item is None:
            final_str += text[i]
        else:
            try:
                c = CHO.index(item['cho'])
                j = JUNG.index(item['jung'])
                jo = JONG.index(item['jong'])
                char_code = 0xAC00 + (c * 588) + (j * 28) + jo
                final_str += chr(char_code)
            except:
                final_str += item['char']

    return final_str

from sync_manager import SyncManager

REFERENCE_FILE = 'reference_words.xlsx'
reference_cache = None
reference_cache_mtime = 0

# [Google Sheets Config]
CREDENTIALS_PATH = os.path.join(BASE_DIR, 'credentials.json')
SHEET_URL = 'https://docs.google.com/spreadsheets/d/114C5f1aowSR6TVG4OtY-RwmvCgbu3k-Gz81GndxPKV8/edit'

# Initialize SyncManager
sync_manager = SyncManager(CREDENTIALS_PATH, SHEET_URL)

def load_reference_dict():
    """
    Load reference data.
    Priority 1: Google Sheets (if connected)
    Priority 2: Local Cache (if Sheet fails)
    Priority 3: Local Excel File (Legacy)
    """
    global reference_cache
    
    # 1. Try Google Sheets (Primary)
    print("Loading dictionary from Google Sheets...")
    sheet_data = sync_manager.fetch_data()
    
    if sheet_data:
        reference_cache = sheet_data
        print(f"Loaded {len(sheet_data)} words from Google Sheets.")
        
        # [Optional] Update local excel as backup
        try:
           # We could save back to excel here for offline backup, but skipping for speed.
           pass
        except: pass
        
        return reference_cache

    # 2. Fallback to Memory Cache
    if reference_cache:
        print("Using memory cache (Sheet sync failed).")
        return reference_cache

    # 3. Fallback to Local File (if GSheet totally fails)
    print("Using local file backup (Sheet sync failed).")
    
    path = os.path.join(BASE_DIR, REFERENCE_FILE)
    if not os.path.exists(path):
        print("Reference file not found.")
        return {}

    try:
        # Load without header to avoid encoding issues, assuming fixed column order
        # Col 1: Word, Col 2: Main, Col 3: Sub (0-indexed)
        # Col 4: Pronunciation (Optional)
        df = pd.read_excel(path, header=0) # Use header=0 to skip the first row keys

        ref_dict = {}

        # Iterate by row index to be safe against column name encoding
        for idx, row in df.iterrows():
            try:
                # Safe access by position
                word = str(row.iloc[1]).strip()
                raw_main = str(row.iloc[2]).strip()
                raw_sub = str(row.iloc[3]).strip()

                # Check for pronunciation column (index 4) if exists
                pronunciation = ""
                if len(row) > 4:
                    val = str(row.iloc[4]).strip()
                    if val and val != 'nan':
                        pronunciation = val

                if not word or word == 'nan': continue

                # Normalize Categories to match Admin UI values
                # Example: "1. 사람 / 신체" -> "사람/신체"
                # Remove leading numbers and dots, remove spaces

                # 1. Main Category Normalization
                # Remove "1. ", "2. " etc
                main_clean = raw_main
                if '.' in main_clean:
                    parts = main_clean.split('.', 1)
                    if len(parts) > 1:
                        main_clean = parts[1]

                # Standardize known categories (remove external spaces, keep internal slash if needed)
                # Admin UI expects: "사람/신체", "음식", "생활/사물", "장소/환경", "놀이/운동", "동작/상태"
                main_clean = main_clean.replace(" ", "") # Remove all spaces first

                # Mapping common variations just in case
                if "사람" in main_clean and "신체" in main_clean: main_clean = "사람/신체"
                elif "생활" in main_clean and "사물" in main_clean: main_clean = "생활/사물"
                elif "장소" in main_clean and "환경" in main_clean: main_clean = "장소/환경"
                elif "놀이" in main_clean and "운동" in main_clean: main_clean = "놀이/운동"
                elif ("서술" in main_clean) or ("개념" in main_clean) or ("동작" in main_clean and "상태" in main_clean): main_clean = "서술/개념"

                # 2. Sub Category Normalization
                # Just strip for now, UI might need fuzzy match or exact match

                sub_clean = raw_sub.replace(" ", "")
                # Only replace , and / if NOT inside parentheses (e.g. keep "서술어(행동/상태)")
                if '(' not in sub_clean:
                    sub_clean = sub_clean.replace(",", "·").replace("/", "·")


                ref_dict[word] = {
                    'main': main_clean,
                    'sub': sub_clean,
                    'pronunciation': pronunciation
                }
            except Exception as row_e:
                continue

        print(f"Loaded {len(ref_dict)} words from reference dictionary.")
        print(f"Loaded {len(ref_dict)} words from reference dictionary.")
        reference_cache = ref_dict
        reference_cache_mtime = current_mtime
        return reference_cache
        return ref_dict

    except Exception as e:
        print(f"Error loading reference dictionary: {e}")
        return {}

@app.route('/api/analyze', methods=['POST'])
def analyze_name():
    req = request.json
    name = req.get('name', '')
    manual_pronunciation = req.get('pronunciation', '') # User override

    if not name:
        return jsonify([])

    # 1. Determine Pronunciation
    if manual_pronunciation:
        pronunciation = manual_pronunciation
    else:
        pronunciation = korean_g2p(name)

    # 2. Analyze the PRONUNCIATION
    # Use the pronunciation string for phoneme extraction
    decomposed = decompose_hangul(pronunciation)
    suggestions = []

    total_chars = len([d for d in decomposed if d is not None])

    # [NEW] Check if the word has ANY consonants other than initial 'ㅇ'
    # If a word has proper consonants (like 'ㄱ', 'ㄴ', 'ㅇ(받침)'), then initial 'ㅇ' should be silent (skipped).
    # Only if the word has ZERO meaningful consonants (e.g. '우유', '아이', '오이'), treat initial 'ㅇ' as 'ㅇ(모음)'.
    has_meaningful_consonants = False
    for item in decomposed:
        if item is None: continue
        # Check Cho (if not 'ㅇ')
        if item['cho'] != 'ㅇ': has_meaningful_consonants = True
        # Check Jong (if exists) - Jong 'ㅇ' is a consonant!
        if item['jong'] != '': has_meaningful_consonants = True

    # Logic:
    # - "우유" -> Cho:'ㅇ', Jong:'' -> has_meaningful_consonants = False -> Suggest [ㅇ(모음)]
    # - "양"   -> Cho:'ㅇ', Jong:'ㅇ' -> has_meaningful_consonants = True (due to Jong) -> Skip Cho 'ㅇ', Suggest [ㅇ(받침)]
    # - "이유" -> Cho:'ㅇ', Jong:'' / Cho:'ㅇ', Jong:'' -> False -> Suggest [ㅇ(모음)] (Wait, '이유' is technically pure vowels? Yes)
    # - "감"   -> Cho:'ㄱ' -> True -> Skip Cho 'ㅇ' (if any)

    for idx, item in enumerate(decomposed):
        if item is None: continue

        # 1. Cho (Onset)
        cho = item['cho']
        if cho == 'ㅇ':
            if not has_meaningful_consonants:
                 # Only suggest 'ㅇ(모음)' if there are NO other consonants in the word
                pos = "어두초성" if idx == 0 else "어중초성"
                suggestions.append({
                    'main': 'ㅇ(모음)',
                    'sub': pos,
                    'desc': f"{item['char']}의 첫소리 (모음)"
                })
            else:
                pass # Skip silent 'ㅇ' when other consonants exist
        else:
            pos = "어두초성" if idx == 0 else "어중초성"
            suggestions.append({
                'main': cho,
                'sub': pos,
                'desc': f"{item['char']}의 초성"
            })

        # 2. Jong (Final)
        jong = item['jong']
        if jong != '':
            phoneme = "ㅇ(받침)" if jong == "ㅇ" else jong
            pos = "어말종성" if idx == total_chars - 1 else "어중종성"

            suggestions.append({
                'main': phoneme,
                'sub': pos,
                'desc': f"{item['char']}의 받침"
            })

    # 3. If NO consonants were found (e.g. "우유" -> only vowels/zero onset)
    # Suggest 'ㅇ(모음)' automatically
    if not suggestions:
        suggestions.append({
            'main': 'ㅇ(모음)',
            'sub': '',
            'desc': '자음 없음 (모음)'
        })

    # 3. Lookup in Reference Dictionary
    ref_dict = load_reference_dict()
    reference_info = None

    # Try exact match
    if name in ref_dict:
        reference_info = ref_dict[name]
    else:
        # Try simplified match (remove spaces?)
        n_clean = name.replace(" ", "")
        if n_clean in ref_dict:
            reference_info = ref_dict[n_clean]

    return jsonify({
        'suggestions': suggestions,
        'pronunciation': pronunciation,
        'reference': reference_info
    })

@app.route('/api/upload', methods=['POST'])
@requires_auth
def upload_card():
    user_id = request.args.get('user')
    if not user_id: user_id = request.form.get('user_id')

    registrations_json = request.form.get('registrations') 
    try:
        registrations = json.loads(registrations_json)
    except:
        return jsonify({'error': 'Invalid JSON'}), 400

    if user_id:
        folder_path = get_user_dir(user_id)
        # [FIX] Dynamic Relative Path (user_images vs user_test)
        rel_path = os.path.relpath(folder_path, BASE_DIR)
        web_path_prefix = rel_path.replace(os.sep, '/')
    else:
        first_phoneme = registrations[0].get('main', "기타")
        target_folder_name = get_folder_path(first_phoneme)
        folder_path = os.path.join(BASE_DIR, target_folder_name)
        web_path_prefix = target_folder_name
        if not os.path.exists(folder_path): os.makedirs(folder_path, exist_ok=True)

    file = request.files['file']
    raw_name = request.form.get('name')
    name = raw_name.replace(' ', '') if raw_name else raw_name

    if file:
        # [FIX] Enforce NFC for Hangul (Prevent NFD decomposition)
        nfc_filename = unicodedata.normalize('NFC', file.filename)
        original_filename = safe_filename(nfc_filename)
        # [NEW] Force WebP extension
        name_base, _ = os.path.splitext(original_filename)
        filename = f"{name_base}.webp"

        save_path = os.path.join(folder_path, filename)
        is_confirmed = request.form.get('confirmed') == 'true'

        if os.path.exists(save_path):
            is_orphan = True
            conflicting_card_name = "알 수 없음"
            try:
                current_data_check = load_data()
                for card in current_data_check:
                    if card.get('folder') == web_path_prefix and card.get('image') == filename:
                        is_orphan = False
                        conflicting_card_name = card.get('name', '이름 없음')
                        break
            except: is_orphan = False 

            if is_orphan:
                pass 
            else:
                if not is_confirmed:
                    msg = f"중복 발견! \n경로: {web_path_prefix}/{filename}\n\n[사용 중인 카드명]: {conflicting_card_name}\n\n서버에 이미 등록된 카드입니다."
                    return jsonify({
                        'duplicate': True, 
                        'filename': filename, 
                        'message': msg,
                        'existing_url': f"/{web_path_prefix}/{filename}" 
                    })
                
                base, ext = os.path.splitext(filename)
                counter = 1
                while os.path.exists(os.path.join(folder_path, filename)):
                    filename = f"{base}_{counter}{ext}"
                    counter += 1
                save_path = os.path.join(folder_path, filename)

        try:
            img = Image.open(file)
            MAX_DIM = 1000
            # Resize
            if img.width > MAX_DIM or img.height > MAX_DIM:
                img.thumbnail((MAX_DIM, MAX_DIM), Image.Resampling.LANCZOS)
            
            # [NEW] Save as WebP (Keep Transparency)
            # format='WEBP', quality=85 is the sweet spot
            img.save(save_path, format='WEBP', quality=85, optimize=True)
            
        except Exception as e:
            print(f"Image conversion failed: {e}")
            return jsonify({'error': '이미지 변환 저장 실패'}), 500
        
        # [FIXED] Removed redundant 2nd duplicate check
        pass

        current_data = load_data()
        
        # [FIX] Deduplicate: Remove existing entry if it exists (to prevent ghost duplicates)
        current_data = [item for item in current_data 
                        if not (item.get('image') == filename and 
                                (item.get('folder') == web_path_prefix or item.get('folder') == os.path.basename(folder_path)))]

        # [Background Sync] Prepare updates
        updates_to_sync = []

        for reg in registrations:
             # Prepare Clean Data for Sync
             # Prepare Clean Data for Sync (Use Language Categories for Sheet)
             s_word = reg.get('name', name).strip()
             
             # [FIX] Sanitize Word for Sheet Sync (Remove [Pronunciation] suffix if present)
             # User reported "Name [Pronunciation]" being saved. We want only "Name".
             if '[' in s_word and s_word.endswith(']'):
                 s_word = s_word.split('[')[0].strip()

             # [FIX] Map Semantic Categories to Sheet Columns (Main/Sub)
             # part_of_speech = Theme (Main Category), language_category = Sub (Sub Category)
             s_main = reg.get('part_of_speech', '').strip() 
             s_sub = reg.get('language_category', '').strip()
             s_pron = reg.get('pronunciation', '').strip()
             
             # [OPTIMIZATION] Smart Skip: If data matches existing Sheet data, don't sync
             need_sync = True
             try:
                 # Check global cache (safely)
                 if 'reference_cache' in globals() and reference_cache and s_word in reference_cache:
                     ref = reference_cache[s_word]
                     r_main = ref.get('main', '').strip()
                     r_sub = ref.get('sub', '').strip()
                     r_pron = ref.get('pronunciation', '').strip()
                     
                     # Check if categories match
                     if s_main == r_main and s_sub == r_sub:
                         # Check pronunciation (only if update provides one)
                         if not s_pron or s_pron == r_pron:
                             need_sync = False
                             print(f"[Smart Skip] No changes for '{s_word}', skipping Sheet sync.")
             except Exception as e_skip:
                 print(f"[Smart Skip Error] Proceeding with sync safely: {e_skip}")
                 need_sync = True

             if need_sync:
                updates_to_sync.append((s_word, s_main, s_sub, s_pron))

             new_item = {
                 'folder': web_path_prefix, # [FIX] Use full relative path (e.g. 'user_images/beta_...') instead of basename
                 'image': filename,
                 'filename': filename,
                 'name': reg.get('name', name),
                 'main': reg.get('main', ''),
                 'sub': reg.get('sub', ''),
                 'part_of_speech': reg.get('part_of_speech', ''),
                 'language_category': reg.get('language_category', '')
             }
             current_data.append(new_item)
             
             try:
                 lang_cat = reg.get('language_category', '기타')
                 if lang_cat:
                     cat_dir = os.path.join(BASE_DIR, '범주', lang_cat)
                     os.makedirs(cat_dir, exist_ok=True)
                     shutil.copy2(save_path, os.path.join(cat_dir, filename))
             except: pass

        if save_data(current_data):
            # [Background Sync] Trigger GSheet Update
            def run_sync():
                print(f"[Background] Syncing {len(updates_to_sync)} words to GSheet...")
                for (w, m, s, p) in updates_to_sync:
                    if w:
                        sync_manager.update_word(w, m, s, p)
            
            threading.Thread(target=run_sync).start()

            update_version() # [Version Update]
            return jsonify({'success': True, 'msg': 'Upload successful', 'filename': filename})
        else:
             return jsonify({'error': 'Failed to save data info'}), 500

    return jsonify({'error': 'Unknown error'}), 500

@app.route('/api/cards', methods=['DELETE'])
@requires_auth
def delete_card():
    try:
        req_data = request.json
        if not req_data: return jsonify({'error': 'Invalid request'}), 400
        if isinstance(req_data, list): targets = req_data
        else: targets = [req_data]

        target_filenames = set(t.get('image') for t in targets)
        current_data = load_data()
        new_data = []
        deleted_count = 0
        
        # [1] 개인 그림 삭제
        user_id = request.args.get('user', 'guest')
        user_dir = get_user_dir(user_id)
        for t in targets:
            fname = t.get('image', '')
            user_path = os.path.join(user_dir, fname)
            if os.path.exists(user_path):
                try: os.remove(user_path)
                except: pass

        # [2] 시스템 카드 삭제 (유니코드 호환성 강화 + 타입 안전장치)
        for item in current_data:
             # Ensure types are string
            img_name = str(item.get('image', ''))
            folder = str(item.get('folder', ''))
            
            if img_name in target_filenames:
                deleted_count += 1
                
                # 삭제 시도 (NFC & NFD 모두 체크)
                paths_to_check = []
                # 1. 있는 그대로
                paths_to_check.append(os.path.join(BASE_DIR, folder, img_name))
                # 2. NFC (윈도우 표준)
                f_nfc = unicodedata.normalize('NFC', folder)
                n_nfc = unicodedata.normalize('NFC', img_name)
                paths_to_check.append(os.path.join(BASE_DIR, f_nfc, n_nfc))
                # 3. NFD (맥/리눅스 표준 - 자소 분리)
                f_nfd = unicodedata.normalize('NFD', folder)
                n_nfd = unicodedata.normalize('NFD', img_name)
                # 3-1. Handle potential None or unexpected return
                if f_nfd and n_nfd:
                    paths_to_check.append(os.path.join(BASE_DIR, f_nfd, n_nfd))
                
                file_deleted = False
                for p in paths_to_check:
                    if os.path.exists(p):
                        try: 
                            os.remove(p)
                            print(f"[삭제 성공] {p}")
                            file_deleted = True
                            break # 하나 지웠으면 끝
                        except: pass
                
                if not file_deleted:
                    print(f"[알림] 파일이 디스크에 없어서 장부에서만 지웁니다: {img_name}")
                
                # [FIX] Also delete from Category folder (Ghost file cleanup)
                lang_cat = item.get('language_category')
                if lang_cat:
                    cat_path = os.path.join(BASE_DIR, '범주', lang_cat, img_name)
                    if os.path.exists(cat_path):
                        try:
                            os.remove(cat_path)
                            print(f"[범주 파일 삭제 성공] {cat_path}")
                        except: pass
                    
                    # Also try NFD/NFC for category path just in case
                    cat_nfc = os.path.join(BASE_DIR, '범주', unicodedata.normalize('NFC', lang_cat), unicodedata.normalize('NFC', img_name))
                    if os.path.exists(cat_nfc):
                        try: os.remove(cat_nfc)
                        except: pass

                continue # 장부에서 제외 (삭제)

            new_data.append(item)

        if deleted_count > 0:
            save_data(new_data)
            update_version() # [Version Update]
            return jsonify({'success': True, 'deleted_count': deleted_count})
        return jsonify({'success': True, 'msg': 'No changes'})

    except Exception as e:
        print(f"Delete error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/cards', methods=['PUT'])
@requires_auth
def update_card():
    req_data = request.json
    # Identify target by original image (and folder)
    target_image = req_data.get('original_image')
    target_folder = req_data.get('original_folder')

    if not target_image: 
        return jsonify({'error': 'Original Image ID required'}), 400
    
    # New Values
    new_pos = req_data.get('part_of_speech', '')
    new_cat = req_data.get('language_category', '')

    current_data = load_data()
    updated_count = 0
    new_data = []

    # Iterate and update ALL matching entries (One-to-Many support)
    for item in current_data:
        # Check match (Normalize check just in case, but usually strict string match is enough if from DB)
        # Using strict match on image filename is safest as it's the unique ID for the File.
        if item.get('image') == target_image:
             if target_folder and item.get('folder') != target_folder:
                 new_data.append(item)
                 continue

             # Update Fields
             item['part_of_speech'] = new_pos
             item['language_category'] = new_cat
             
             # Also update category folder if needed? 
             # (Moving files between '범주' folders is complex. 
             #  For now, just update the DATA. File movement is a bigger task if we want to sync physical folders.
             #  Given the user request is just "Update Category", updating the DB is the priority.)
             #  TODO: Ideally we should move the physical file in '범주/Category' too, but let's stick to DB first.
             
             updated_count += 1
        
        new_data.append(item)

    if updated_count > 0:
        if save_data(new_data):
            
            # [Background Sync] Update Google Sheet with new categories
            # Gather unique word updates to prevent duplicate API calls
            unique_updates = {}
            for item in new_data:
                if item.get('image') == target_image:
                     w = item.get('name', '').strip()
                     m = item.get('part_of_speech', '').strip()
                     s = item.get('language_category', '').strip()
                     # We don't have pronunciation here, so pass empty string (SyncManager won't overwrite)
                     if w:
                         unique_updates[w] = (w, m, s, "")
            
            def run_edit_sync():
                print(f"[Background] Syncing {len(unique_updates)} edits to GSheet...")
                for (w, m, s, p) in unique_updates.values():
                    sync_manager.update_word(w, m, s, p)

            threading.Thread(target=run_edit_sync).start()

            threading.Thread(target=run_edit_sync).start()

            update_version() # [Version Update]
            return jsonify({'success': True, 'updated_count': updated_count})
        else:
            return jsonify({'error': 'Save failed'}), 500
    
    return jsonify({'success': True, 'msg': 'No matches found, nothing updated'})

def load_data():
    if not os.path.exists(os.path.join(BASE_DIR, EXCEL_FILE)): return []
    try:
        df = pd.read_excel(os.path.join(BASE_DIR, EXCEL_FILE)).fillna('')
        for col in ['main', 'sub', 'name', 'folder', 'image', 'part_of_speech', 'language_category']:
            if col not in df.columns: df[col] = ''
        
        return sort_data([
            {**record, 
             'image': unicodedata.normalize('NFC', str(record.get('image',''))),
             'folder': unicodedata.normalize('NFC', str(record.get('folder','')))
            } for record in df.to_dict(orient='records')
        ])
    except: return []

def save_data(data_list):
    try:
        data_list = sort_data(data_list)
        df = pd.DataFrame(data_list)
        df.to_excel(os.path.join(BASE_DIR, EXCEL_FILE), index=False)
        js_content = f"// Created by server.py\nconst soundData = {json.dumps(data_list, ensure_ascii=False, indent=4)};"
        with open(os.path.join(BASE_DIR, DATA_FILE), 'w', encoding='utf-8') as f: f.write(js_content)
        return True
    except: return False

def get_folder_path(phoneme):
    # [FIX] Explicit Mapping for tricky folder names
    FOLDER_MAPPING = {
        'ㅇ(받침)': '19_받침(ㅇ)',
        'ㄲ': '17_\u3132', # Force Compatibility Jamo
        'ㄸ': '07_\u3138',
        'ㅃ': '03_\u3143',
        'ㅆ': '12_\u3146',
        'ㅉ': '14_\u3149',
        # Add Explicit Choseong Jamo Keys (Just in case input is raw Jamo)
        '\u1101': '17_\u3132',
        '\u1104': '07_\u3138',
        '\u1108': '03_\u3143',
        '\u1109': '12_\u3146',
        '\u110d': '14_\u3149'
    }
    # Check both Jamo and Compat inputs
    norm_p = unicodedata.normalize('NFC', phoneme) # Compat
    if norm_p in FOLDER_MAPPING: return FOLDER_MAPPING[norm_p]
    
    norm_p_jb = unicodedata.normalize('NFD', phoneme) # Jamo likely
    if norm_p_jb in FOLDER_MAPPING: return FOLDER_MAPPING[norm_p_jb]

    for item in os.listdir(BASE_DIR):
        if os.path.isdir(os.path.join(BASE_DIR, item)):
            if phoneme in item: return item
    return phoneme

# Image User Upload (Legacy/Guest)
@app.route('/upload', methods=['POST'])
def user_upload():
    # 1. User ID Extraction
    user_id = request.args.get('user')
    if not user_id: user_id = request.form.get('user_id')
    if not user_id:
        referer = request.headers.get('Referer', '')
        if referer and 'user=' in referer:
            try:
                from urllib.parse import urlparse, parse_qs
                parsed = urlparse(referer)
                query = parse_qs(parsed.query)
                if 'user' in query: user_id = query['user'][0]
            except: pass
    if not user_id: user_id = 'guest'

    folder_path = get_user_dir(user_id)
    if not os.path.exists(folder_path): os.makedirs(folder_path, exist_ok=True)

    # Check Storage Limit (30 files)
    current_files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.png','.jpg','.jpeg','.webp'))]
    if len(current_files) >= 30:
        return jsonify({'error': 'Storage full'}), 403

    uploaded_files = request.files.getlist('files') or request.files.getlist('file')
    saved_files = []

    for file in uploaded_files[:1]: # JS sends only 1 usually
        if file and file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            # [FIX] Enforce NFC for Hangul
            nfc_filename = unicodedata.normalize('NFC', file.filename)
            filename = safe_filename(nfc_filename)
            save_path = os.path.join(folder_path, filename)
            
            base, ext = os.path.splitext(filename)
            counter = 1
            while os.path.exists(save_path):
                filename = f"{base}_{counter}{ext}"
                save_path = os.path.join(folder_path, filename)
                counter += 1
            
            try:
                img = Image.open(file)
                MAX_DIM = 1000
                if img.width > MAX_DIM or img.height > MAX_DIM:
                    img.thumbnail((MAX_DIM, MAX_DIM), Image.Resampling.LANCZOS)
                
                ext = os.path.splitext(filename)[1].lower()
                if ext in ['.jpg', '.jpeg']: img.save(save_path, optimize=True, quality=80)
                elif ext == '.png': img.save(save_path, optimize=True)
                elif ext == '.webp': img.save(save_path, quality=80)
                else: img.save(save_path)
                
                # [FIX] Use Dynamic Path (user_images vs user_test)
                folder_rel = os.path.relpath(folder_path, BASE_DIR).replace(os.sep, '/')
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

@app.route('/api/user_cards', methods=['GET', 'DELETE'])
def handle_user_cards():
    # User ID Logic (Same as above)
    user_id = request.args.get('user')
    if not user_id:
        referer = request.headers.get('Referer', '')
        if referer and 'user=' in referer:
            try:
                from urllib.parse import urlparse, parse_qs
                parsed = urlparse(referer)
                query = parse_qs(parsed.query)
                if 'user' in query: user_id = query['user'][0]
            except: pass
    if not user_id: user_id = 'guest'

    user_dir = get_user_dir(user_id)

    if request.method == 'GET':
        cards = []
        if os.path.exists(user_dir):
            files = os.listdir(user_dir)
            try: files.sort(key=lambda x: os.path.getmtime(os.path.join(user_dir, x)))
            except: pass
            
            for filename in files:
                if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                    name = os.path.splitext(filename)[0]
                    # [FIX] Use Dynamic Path
                    folder_rel = os.path.relpath(user_dir, BASE_DIR).replace(os.sep, '/')
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
        if not filename: return jsonify({'error': 'Filename required'}), 400
        
        file_path = os.path.join(user_dir, filename)
        if os.path.exists(file_path):
            try: os.remove(file_path)
            except: pass
            return jsonify({'success': True})
        return jsonify({'success': True}) # Idempotent success

# Presets Management
@app.route('/api/user_presets', methods=['GET', 'POST'])
def handle_presets():
    user_id = request.args.get('user', 'guest')
    
    if request.method == 'GET':
        presets = load_presets(user_id)
        return jsonify(presets)

    if request.method == 'POST':
        try:
            new_presets = request.json
            if not isinstance(new_presets, list):
                 return jsonify({'error': 'Presets must be a list'}), 400
            
            if save_presets(user_id, new_presets):
                return jsonify({'success': True})
            else:
                return jsonify({'error': 'Save failed'}), 500
        except Exception as e:
             print(f"Preset save error: {e}")
             return jsonify({'error': 'Invalid JSON'}), 400

def load_presets(user_id):
    user_dir = get_user_dir(user_id)
    path = os.path.join(user_dir, 'presets.json')
    
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except: return []

    # [Fallback] Check legacy global file (from previous version)
    global_path = os.path.join(BASE_DIR, 'user_presets.json')
    if os.path.exists(global_path):
        try:
            with open(global_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # If it was a dict {user_id: [presets]}
            if isinstance(data, dict):
                user_data = data.get(user_id)
                if user_data:
                    # Auto-Migrate to personal file
                    save_presets(user_id, user_data)
                    return user_data
        except: pass
            
    return []

def save_presets(user_id, data):
    user_dir = get_user_dir(user_id)
    if not os.path.exists(user_dir): os.makedirs(user_dir, exist_ok=True)
    
    path = os.path.join(user_dir, 'presets.json')
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return True
    except: return False

@app.route('/api/backup_code', methods=['GET'])
@requires_auth
def backup_code():
    try:
        # Create in-memory zip
        memory_file = io.BytesIO()
        
        # Targets
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
            'backup', '__pycache__', '.git', '.history', '.vscode', '.idea', 'venv', 'env', '.gemini',
            'user_images', '범주' # Heavy assets excluded
        }

        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(BASE_DIR):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
                
                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    if ext in INCLUDE_EXTENSIONS:
                        abs_path = os.path.join(root, file)
                        rel_path = os.path.relpath(abs_path, BASE_DIR)
                        zipf.write(abs_path, rel_path)

        memory_file.seek(0)
        
        timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
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

@app.route('/api/fix_paths', methods=['GET'])
@requires_auth
def fix_beta_paths():
    """
    Utility to:
    1. Fix broken 'beta_' paths (missing 'user_images/')
    2. Merge 'ㅇ(받침)' folder into '19_받침(ㅇ)'
    """
    try:
        data = load_data()
        new_data = []
        fixed_count = 0
        seen_keys = set()
        
        # [Job 1] Merge Folders
        wrong_folder = os.path.join(BASE_DIR, 'ㅇ(받침)')
        correct_folder = os.path.join(BASE_DIR, '19_받침(ㅇ)')
        
        if os.path.exists(wrong_folder):
            if not os.path.exists(correct_folder):
                os.makedirs(correct_folder, exist_ok=True)
                
            for filename in os.listdir(wrong_folder):
                src = os.path.join(wrong_folder, filename)
                dst = os.path.join(correct_folder, filename)
                if os.path.isfile(src):
                    # Move (Overwrite if exists to be safe/update)
                    shutil.move(src, dst)
            
            # Remove empty wrong folder
            try: os.rmdir(wrong_folder)
            except: pass


        for item in data:
            # [FIX] Enforce NFC Normalization for Data
            folder = unicodedata.normalize('NFC', str(item.get('folder', '')))
            image = unicodedata.normalize('NFC', str(item.get('image', '')))
            
            # Update item with clean NFC values
            item['folder'] = folder
            item['image'] = image
            
            # [Job 2] Fix DB Paths for merged folder
            # If folder was 'ㅇ(받침)', change to '19_받침(ㅇ)'
            if folder == 'ㅇ(받침)':
                folder = '19_받침(ㅇ)'
                item['folder'] = folder
                fixed_count += 1

            # [Job 3] Fix Beta Paths
            if folder.startswith('beta_') and not folder.startswith(USER_IMAGES_DIR):
                new_folder = os.path.join(USER_IMAGES_DIR, folder).replace('\\', '/')
                item['folder'] = new_folder
                folder = new_folder
                fixed_count += 1
            
            # Key for deduplication
            key = f"{folder}|{image}"
            
            if key not in seen_keys:
                seen_keys.add(key)
                new_data.append(item)
                
        if fixed_count > 0 or len(data) != len(new_data) or not os.path.exists(wrong_folder):
            save_data(new_data)
            return jsonify({
                'success': True, 
                'msg': f'Fixed {fixed_count} paths & Merged folders. Total: {len(data)} -> {len(new_data)}'
            })
        else:
            return jsonify({'success': True, 'msg': 'All correct. No changes.'})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
