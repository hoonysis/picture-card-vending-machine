
import os
import time
import pandas as pd
import unicodedata
import g2p
from sync_manager import SyncManager

class DataManager:
    def __init__(self, base_dir):
        self.base_dir = base_dir
        self.reference_file = 'reference_words.xlsx'
        
        # [Cache]
        self.reference_cache = {}
        self.reference_cache_mtime = 0
        self.last_reference_error = "No error recorded"
        
        # [Google Sheets Config]
        self.credentials_path = os.path.join(base_dir, 'credentials.json')
        self.sheet_url = 'https://docs.google.com/spreadsheets/d/114C5f1aowSR6TVG4OtY-RwmvCgbu3k-Gz81GndxPKV8/edit'
        
        # Initialize SyncManager
        self.sync_manager = SyncManager(self.credentials_path, self.sheet_url)

    def load_reference_dict(self):
        """
        Load reference data.
        Priority 1: Google Sheets (if connected)
        Priority 2: Local Cache (if Sheet fails)
        Priority 3: Local Excel File (Legacy)
        """
        path = os.path.join(self.base_dir, self.reference_file)
        if not os.path.exists(path):
            self.last_reference_error = f"File not found at {path}"
            return {}
            
        # Check modification time
        try:
            current_mtime = os.path.getmtime(path)
            # If cache exists and file hasn't changed, return cache
            if self.reference_cache and self.reference_cache_mtime and current_mtime == self.reference_cache_mtime:
                return self.reference_cache
        except Exception as e:
            print(f"Error checking mtime: {e}")

        print("Reloading reference dictionary (File changed or no cache).")

        try:
            # Load without header to avoid encoding issues
            df = pd.read_excel(path, header=0) 

            ref_dict = {}

            for idx, row in df.iterrows():
                try:
                    word = str(row.iloc[0]).strip()
                    if word and word != 'nan':
                        word = unicodedata.normalize('NFC', word)
                    
                    raw_main = str(row.iloc[1]).strip() 
                    raw_sub = str(row.iloc[2]).strip()
                    if raw_main == 'nan': raw_main = ''
                    if raw_sub == 'nan': raw_sub = ''

                    pronunciation = ""
                    if len(row) > 3:
                        val = str(row.iloc[3]).strip()
                        if val and val != 'nan':
                            pronunciation = val

                    tag1 = ""
                    if len(row) > 4:
                        val = str(row.iloc[4]).strip()
                        if val and val != 'nan':
                            tag1 = val

                    if not word or word == 'nan': continue

                    ref_dict[word] = {
                        'main': raw_main,
                        'sub': raw_sub,
                        'pronunciation': pronunciation,
                        'tag1': tag1
                    }

                except Exception as row_e:
                    continue
            
            self.reference_cache = ref_dict
            self.reference_cache_mtime = os.path.getmtime(path)
            self.last_reference_error = "Success"
            print(f"Loaded {len(ref_dict)} words from reference dictionary.")
            return ref_dict

        except Exception as e:
            self.last_reference_error = str(e)
            print(f"Reference load error: {e}")
            return {}

    def normalize_for_search(self, text):
        if not text:
            return ""
        text = unicodedata.normalize('NFD', text)
        return text.replace('\u1162', '\u1166').replace('\u3150', '\u3154')

    def get_sort_key(self, item):
        main = str(item.get('main', '')).strip()
        name = item.get('name', '')
        
        try:
            # 1. Articulation Category?
            if main and main in g2p.PHONEME_ORDER:
                pos_score = g2p.get_position_score(str(name), main)
                return (pos_score, str(name))
                
            # 2. Language Category?
            return (1000, str(name))
            
        except Exception as e:
            print(f"[Sort Error] Item: {name}, Error: {e}")
            return (9999, str(name))

    def sort_data(self, data_list):
        data_list.sort(key=self.get_sort_key)
        return data_list

    def korean_g2p(self, text):
        """
        G2P Wrapper that inspects reference dict first.
        """
        ref_dict = {}
        try:
            ref_dict = self.load_reference_dict()
        except: pass
        
        return g2p.korean_g2p(text, ref_dict)
