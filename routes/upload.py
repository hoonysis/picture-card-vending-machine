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
