
import os
import json
import shutil
import unicodedata
import pandas as pd
import traceback
from PIL import Image

class FileManager:
    def __init__(self, base_dir, data_manager=None):
        self.base_dir = base_dir
        self.data_manager = data_manager # dependency for sorting
        
        self.excel_file = 'word.xlsx'
        self.data_file = 'data.js'
        self.user_images_dir = 'user_images'

    def safe_filename(self, filename):
        filename = unicodedata.normalize('NFC', filename)
        filename = os.path.basename(filename)
        for char in ['\\', '/', ':', '*', '?', '"', '<', '>', '|']:
            filename = filename.replace(char, '_')
        filename = filename.replace(' ', '')
        return filename

    def find_file_robustly(self, path_str):
        """
        Iteratively finds a file by matching each path component (folder/file) 
        checking for NFC/NFD normalization AND case-insensitivity.
        Returns the absolute path if found, otherwise None.
        """
        try:
            current_path = self.base_dir
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

    def load_data(self):
        path = os.path.join(self.base_dir, self.excel_file)
        if not os.path.exists(path): return []
        try:
            df = pd.read_excel(path).fillna('')
            for col in ['main', 'sub', 'name', 'folder', 'image', 'part_of_speech', 'language_category', 'search_keywords']:
                if col not in df.columns: df[col] = ''
            
            data_list = [
                {**record, 
                 'image': unicodedata.normalize('NFC', str(record.get('image',''))),
                 'folder': unicodedata.normalize('NFC', str(record.get('folder','')))
                } for record in df.to_dict(orient='records')
            ]
            
            if self.data_manager:
                return self.data_manager.sort_data(data_list)
            return data_list
            
        except: return []

    def save_data(self, data_list):
        try:
            if self.data_manager:
                data_list = self.data_manager.sort_data(data_list)
            
            df = pd.DataFrame(data_list)
            df.to_excel(os.path.join(self.base_dir, self.excel_file), index=False)
            
            js_content = f"// Created by server.py\nconst soundData = {json.dumps(data_list, ensure_ascii=False, indent=4)};"
            with open(os.path.join(self.base_dir, self.data_file), 'w', encoding='utf-8') as f: f.write(js_content)
            return True
        except Exception as e:
            print(f"[ERROR] Failed to save data: {e}")
            traceback.print_exc()
            return False

    def get_folder_path(self, phoneme):
        # [FIX] Explicit Mapping for tricky folder names
        FOLDER_MAPPING = {
            'ㅇ(받침)': '19_받침(ㅇ)',
            'ㄲ': '17_\u3132', # Force Compatibility Jamo
            'ㄸ': '07_\u3138',
            'ㅃ': '03_\u3143',
            'ㅆ': '12_\u3146',
            'ㅉ': '14_\u3149',
            # Add Explicit Choseong Jamo Keys
            '\u1101': '17_\u3132',
            '\u1104': '07_\u3138',
            '\u1108': '03_\u3143',
            '\u1109': '12_\u3146',
            '\u110d': '14_\u3149'
        }
        
        norm_p = unicodedata.normalize('NFC', phoneme)
        if norm_p in FOLDER_MAPPING: return FOLDER_MAPPING[norm_p]
        
        norm_p_jb = unicodedata.normalize('NFD', phoneme) 
        if norm_p_jb in FOLDER_MAPPING: return FOLDER_MAPPING[norm_p_jb]

        for item in os.listdir(self.base_dir):
            if os.path.isdir(os.path.join(self.base_dir, item)):
                if phoneme in item: return item
        return phoneme

    def process_image_upload(self, file, folder_path, filename):
        """
        Saves image with resizing and WebP conversion.
        Returns: (success, saved_filename, error_msg)
        """
        try:
            save_path = os.path.join(folder_path, filename)
            
            # Auto-rename if exists
            base, ext = os.path.splitext(filename)
            counter = 1
            while os.path.exists(save_path):
                filename = f"{base}_{counter}{ext}"
                save_path = os.path.join(folder_path, filename)
                counter += 1
            
            img = Image.open(file)
            MAX_DIM = 1000
            # Resize
            if img.width > MAX_DIM or img.height > MAX_DIM:
                img.thumbnail((MAX_DIM, MAX_DIM), Image.Resampling.LANCZOS)
            
            # Save as WebP (Keep Transparency)
            # FORCE .webp extension if not present? 
            # The caller usually forces .webp in filename.
            # But let's check extension of target filename.
            
            target_ext = os.path.splitext(filename)[1].lower()
            
            if target_ext == '.webp':
                img.save(save_path, format='WEBP', quality=85, optimize=True)
            elif target_ext in ['.jpg', '.jpeg']:
                img.save(save_path, optimize=True, quality=80)
            elif target_ext == '.png':
                img.save(save_path, optimize=True)
            else:
                img.save(save_path)
                
            return True, filename, None
            
        except Exception as e:
            return False, None, str(e)
