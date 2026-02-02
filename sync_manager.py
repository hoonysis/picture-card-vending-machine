
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import pandas as pd
import os
import json

class SyncManager:
    def __init__(self, key_file_path, sheet_url):
        self.key_file_path = key_file_path
        self.sheet_url = sheet_url
        self.client = None
        self.sheet = None
        self.SCOPE = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']

    def connect(self):
        try:
            if not os.path.exists(self.key_file_path):
                print(f"[SyncManager] Key file not found: {self.key_file_path}")
                return False
            
            creds = ServiceAccountCredentials.from_json_keyfile_name(self.key_file_path, self.SCOPE)
            self.client = gspread.authorize(creds)
            
            # Open by URL
            self.sheet = self.client.open_by_url(self.sheet_url).sheet1 # Default to first sheet
            print("[SyncManager] Successfully connected to Google Sheets.")
            return True
        except Exception as e:
            print(f"[SyncManager] Connection failed: {e}")
            return False

    def fetch_data(self):
        """
        Fetches data from Google Sheet and returns a normalized dictionary
        Format: { 'word': {'main': '...', 'sub': '...', 'pronunciation': '...'} }
        """
        if not self.client:
            if not self.connect():
                return {}

        try:
            # Get all records
            records = self.sheet.get_all_records()
            # If empty or fetch failed
            if not records:
                return {}

            ref_dict = {}
            count = 0

            for row in records:
                try:
                    # Adjust key access based on actual sheet headers
                    # The user's sheet likely has Korean headers based on load_reference_dict usage of iloc 
                    # But get_all_records uses headers as keys.
                    # Let's assume headers are similar to what user sees or access by index logic?
                    # Gspread get_all_values() is safer to use by index like server.py does.
                    pass
                except: continue

            # Re-implementing with get_all_values to mimic server.py's iloc logic
            # This is safer than relying on header names which might change or contain spaces
            rows = self.sheet.get_all_values()
            
            if not rows: return {}

            # indices based on server.py
            # 1: Word, 2: Main, 3: Sub, 4: Pronunciation (Optional)
            # Row 0 is header
            
            for i, row in enumerate(rows):
                if i == 0: continue # Skip header
                
                # Safety pad
                if len(row) < 4: continue
                
                word = str(row[1]).strip()
                raw_main = str(row[2]).strip()
                raw_sub = str(row[3]).strip()
                
                pronunciation = ""
                if len(row) > 4:
                    val = str(row[4]).strip()
                    if val and val.lower() != 'nan':
                        pronunciation = val

                # [NEW] Tag Support (Cols 6, 7, 8 -> Index 5, 6, 7)
                tags = ["", "", ""]
                for t_idx in range(3):
                    col_idx = 5 + t_idx
                    if len(row) > col_idx:
                        t_val = str(row[col_idx]).strip()
                        if t_val and t_val.lower() != 'nan':
                            tags[t_idx] = t_val
                
                # [DEBUG] Print for first few rows
                if i < 5:
                    print(f"[Sync Debug] Row {i}: Word={word}, Tags={tags}")

                if not word: continue

                # [SMART SYNC] Handle "Word [Pronunciation]" format
                # If Sheet has "멍멍이 [멍멍이]", we want to find it with key "멍멍이"
                clean_key = word
                if '[' in word and word.endswith(']'):
                    parts = word.split('[')
                    clean_key = parts[0].strip()

                # --- Normalization Logic (Copied from server.py) ---
                
                # --- Normalization Logic (Synced with server.py) ---
                
                # [NEW] Comprehensive Reverse Lookup for UI Taxonomy
                TAXONOMY_MAP = {
                    # 1. 사람/신체
                    "사람": ("사람/신체", ""), "신체": ("사람/신체", ""), "가족": ("사람/신체", "가족"), "직업": ("사람/신체", "직업"), 
                    "신체부위": ("사람/신체", "신체부위"), "옷": ("사람/신체", "옷·장신구"), "장신구": ("사람/신체", "옷·장신구"),
                    "옷·장신구": ("사람/신체", "옷·장신구"),

                    # 2. 음식
                    "음식": ("음식", ""), "과일": ("음식", "과일·채소"), "채소": ("음식", "과일·채소"), "과일·채소": ("음식", "과일·채소"),
                    "식사": ("음식", "식사·요리"), "요리": ("음식", "식사·요리"), "식사·요리": ("음식", "식사·요리"),
                    "간식": ("음식", "간식·음료"), "음료": ("음식", "간식·음료"), "간식·음료": ("음식", "간식·음료"),
                    "식재료": ("음식", "식재료"),

                    # 3. 생활/사물
                    "생활": ("생활/사물", ""), "사물": ("생활/사물", ""), "가구": ("생활/사물", "가구·가전"), "가전": ("생활/사물", "가구·가전"), "가구·가전": ("생활/사물", "가구·가전"),
                    "주방": ("생활/사물", "주방·욕실용품"), "욕실": ("생활/사물", "주방·욕실용품"), "주방·욕실용품": ("생활/사물", "주방·욕실용품"),
                    "학용품": ("생활/사물", "학용품"), "장난감": ("생활/사물", "장난감"), "생활용품": ("생활/사물", "생활용품"),

                    # 4. 장소/환경
                    "장소": ("장소/환경", "장소"), "환경": ("장소/환경", ""), "동물": ("장소/환경", "동물·곤충"), "곤충": ("장소/환경", "동물·곤충"), "동물·곤충": ("장소/환경", "동물·곤충"),
                    "식물": ("장소/환경", "식물·자연"), "자연": ("장소/환경", "식물·자연"), "식물·자연": ("장소/환경", "식물·자연"),
                    "교통": ("장소/환경", "교통기관"), "교통기관": ("장소/환경", "교통기관"),

                    # 5. 놀이/운동
                    "놀이": ("놀이/운동", "취미·놀이"), "운동": ("놀이/운동", "운동"), # 운동 could be Sub or Main, context matters but default to Main is safer? No, usually if specific, it's sub.
                    "악기": ("놀이/운동", "악기·예술"), "예술": ("놀이/운동", "악기·예술"), "악기·예술": ("놀이/운동", "악기·예술"),
                    "취미": ("놀이/운동", "취미·놀이"), "취미·놀이": ("놀이/운동", "취미·놀이"),
                    "기념일": ("놀이/운동", "기념일·행사"), "행사": ("놀이/운동", "기념일·행사"), "기념일·행사": ("놀이/운동", "기념일·행사"),

                    # 6. 서술/개념
                    "서술": ("서술/개념", ""), "개념": ("서술/개념", ""), "동작": ("서술/개념", ""), "상태": ("서술/개념", ""),
                    "서술어": ("서술/개념", "서술어(행동/상태)"), "행동": ("서술/개념", "서술어(행동/상태)"),
                    "감정": ("서술/개념", "감정"), "색깔": ("서술/개념", "색깔/모양"), "모양": ("서술/개념", "색깔/모양"), "색깔/모양": ("서술/개념", "색깔/모양"),
                    "수": ("서술/개념", "수/양/비교"), "양": ("서술/개념", "수/양/비교"), "비교": ("서술/개념", "수/양/비교"), "수/양/비교": ("서술/개념", "수/양/비교"),
                    "위치": ("서술/개념", "위치/방향"), "방향": ("서술/개념", "위치/방향"), "위치/방향": ("서술/개념", "위치/방향"),
                    "세부": ("서술/개념", "세부부위"), "세부부위": ("서술/개념", "세부부위"),
                    "범주": ("서술/개념", "범주어"), "범주어": ("서술/개념", "범주어"),
                    "시간": ("서술/개념", "시간/순서/날짜"), "순서": ("서술/개념", "시간/순서/날짜"), "날짜": ("서술/개념", "시간/순서/날짜"), "시간/순서/날짜": ("서술/개념", "시간/순서/날짜"),
                    "한글": ("서술/개념", "한글/글자"), "글자": ("서술/개념", "한글/글자"), "한글/글자": ("서술/개념", "한글/글자"),
                    "말놀이": ("서술/개념", "말놀이(의성어,의태어)"), "의성어": ("서술/개념", "말놀이(의성어,의태어)"), "의태어": ("서술/개념", "말놀이(의성어,의태어)")
                }

                def map_category(raw_txt):
                    clean = raw_txt.replace(" ", "").replace(".", "").strip()
                    for k, (m, s) in TAXONOMY_MAP.items():
                        if k in clean:
                            return m, s
                    return "", ""

                # 1. Try mapping from Main Column
                found_main, found_sub_from_main = map_category(raw_main)
                
                # 2. Try mapping from Sub Column (Usually more specific)
                found_main_from_sub, found_sub = map_category(raw_sub)

                # Prioritize: 
                if found_main_from_sub:
                    main_clean = found_main_from_sub
                    sub_clean = found_sub
                elif found_main:
                    main_clean = found_main
                    if found_sub_from_main:
                       sub_clean = found_sub_from_main
                    else:
                        sub_clean = raw_sub.replace(" ", "")
                else:
                    main_clean = raw_main.replace(" ", "")
                    sub_clean = raw_sub.replace(" ", "")

                # Final Sub Cleanup (Parens check)
                if '(' not in sub_clean:
                    sub_clean = sub_clean.replace(",", "·").replace("/", "·")

                data_entry = {
                    'main': main_clean,
                    'sub': sub_clean,
                    'pronunciation': pronunciation,
                    'tag1': tags[0],
                    'tag2': tags[1],
                    'tag3': tags[2]
                }

                # Store original key
                ref_dict[word] = data_entry
                
                # Store clean key (if different, effectively creating an alias)
                if clean_key != word:
                    # Only overwrite if not already there (or priority? Sheet usually unique)
                    if clean_key not in ref_dict:
                        ref_dict[clean_key] = data_entry
                count += 1

            print(f"[SyncManager] Fetched {count} words from Google Sheet.")
            return ref_dict

        except Exception as e:
            print(f"[SyncManager] Fetch error: {e}")
            return {}

    def update_word(self, word, main, sub, pronunciation="", tags=None):
        """
        Updates an existing word or adds a new one to the Google Sheet.
        Structure: Word | Main | Sub | Pronunciation | Tag1 | Tag2 | Tag3
        """
        if tags is None: tags = ["", "", ""]
        if not self.client:
            if not self.connect():
                return False

        try:
            # 1. Search for the word (Column B -> Index 2)
            # Find all values in col 2 to find row index physically
            # (gspread find can be slow, but safe)
            try:
                cell = self.sheet.find(word, in_column=2)
            except gspread.exceptions.CellNotFound:
                cell = None

            if cell:
                # Update existing row
                row_idx = cell.row
                # Update cols 3 (Main), 4 (Sub), 5 (Pronunciation)
                self.sheet.update_cell(row_idx, 3, main)
                self.sheet.update_cell(row_idx, 4, sub)
                if pronunciation:
                    self.sheet.update_cell(row_idx, 5, pronunciation)
                
                # Update Tags (Col 6, 7, 8)
                for i, tag in enumerate(tags):
                    if tag: # Only update if has value? Or overwrite? 
                        # Let's overwrite only if provided (safe)
                        # Or consistent with main/sub?
                        self.sheet.update_cell(row_idx, 6 + i, tag)
                        
                print(f"[SyncManager] Updated '{word}' in Google Sheet (Row {row_idx}).")
            else:
                # Append new row
                # ID (Col 1) is mostly empty.
                new_row = ["", word, main, sub, pronunciation]
                self.sheet.append_row(new_row)
                print(f"[SyncManager] Added '{word}' to Google Sheet.")
                
            return True

        except Exception as e:
            print(f"[SyncManager] Update error: {e}")
            return False

# Singleton instance
# (Should be instantiated in server.py)
