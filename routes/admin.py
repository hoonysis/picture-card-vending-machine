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
@requires_auth
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
@requires_auth
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
