from flask import Blueprint, request, jsonify, current_app
from routes.auth import requires_auth
import os
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
