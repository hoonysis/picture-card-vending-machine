
import unicodedata
import os

# To avoid circular imports, we'll pass reference_dict as an argument instead of importing server.
# Or better, we can load it here if needed, but dependency injection is cleaner.

CHO_LIST = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
JUNG_LIST = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']
JONG_LIST = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

# Sort Key Logic
PHONEME_ORDER = [
    "ㅇ(모음)", "ㅂ", "ㅃ", "ㅍ", "ㅁ",
    "ㄷ", "ㄸ", "ㅌ", "ㄴ", "ㅅ", "ㅆ",
    "ㄹ", "ㅈ", "ㅉ", "ㅊ", "ㄱ", "ㄲ", "ㅋ", "ㅇ(받침)", "ㅎ"
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

def korean_g2p(text, reference_dict=None):
    """
    A comprehensive rule-based G2P for Korean words based on Standard Pronunciation Rules.
    Prioritizes 'Reference Dictionary' pronunciation if available.
    """
    # 0. Check Dictionary Override first
    if reference_dict:
        try:
            if text in reference_dict:
                override = reference_dict[text].get('pronunciation')
                if override:
                    return override
            # Remove spaces check
            text_clean = text.replace(" ", "")
            if text_clean in reference_dict:
                override = reference_dict[text_clean].get('pronunciation')
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
