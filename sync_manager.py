
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import pandas as pd
import os
import json
import unicodedata

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
                if word:
                    word = unicodedata.normalize('NFC', word)

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
                
                # --- Normalization Logic (Synced with server.py - STRICT MODE) ---
                
                # [CHANGED] Strict Matching Logic (User Request)
                # No more fuzzy mapping. User guarantees Sheet text matches Admin UI text.

                def normalize_category(txt):
                    if not txt or txt.lower() == 'nan': return ""
                    # 0. NFC Normalization (Critical for Server/Linux compatibility)
                    txt = unicodedata.normalize('NFC', txt)
                    
                    # 1. Remove spaces
                    clean = txt.replace(" ", "")
                    # 2. Standardize Separators will be handled below
                    return clean

                main_clean = normalize_category(raw_main)
                sub_clean = normalize_category(raw_sub)

                # Fix Sub-Category Separators: "/" or "," -> "·" (Admin UI uses · for sub-items)
                sub_clean = sub_clean.replace("/", "·").replace(",", "·")

                # Main Category Separators: Keep "/" (Admin UI uses "사람/신체")
                # User must input "사람/신체". If they input "사람", it will fail finding the radio button.
                # This is intended per user request ("Strict Match").

                # Final Sub Cleanup (Parens check - legacy)
                if '(' not in sub_clean:
                    sub_clean = sub_clean.replace(",", "·").replace("/", "·")
                
                # Also normalize key and tags
                clean_key = unicodedata.normalize('NFC', clean_key)
                # (Tags are part of data_entry, should we normalize them?)
                # Yes, let's normalize everything for safety.

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
