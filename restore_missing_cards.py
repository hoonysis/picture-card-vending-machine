import os
import pandas as pd
import json
import unicodedata
import re

BASE_DIR = os.getcwd()
EXCEL_FILE = 'word.xlsx'
DATA_FILE = 'data.js'
CATEGORY_DIR = '범주'

def normalize(text):
    return unicodedata.normalize('NFC', text) if text else ""

def restore_missing_cards():
    if not os.path.exists(EXCEL_FILE):
        print("Excel file not found!")
        return

    # Load existing DB
    df = pd.read_excel(EXCEL_FILE).fillna('')
    existing_images = set(normalize(str(x)) for x in df['image'].tolist())
    
    print(f"Loaded {len(df)} rows. Found {len(existing_images)} unique known images.")
    
    new_rows = []
    
    # [MODIFIED] Walk through '범주' AND Standard Phoneme Folders
    search_roots = [os.path.join(BASE_DIR, CATEGORY_DIR)]
    
    # Add Phoneme Folders (01_... to 20_...)
    for item in os.listdir(BASE_DIR):
        if os.path.isdir(os.path.join(BASE_DIR, item)):
            # Check if it starts with number like '01_' or '17_'
            if re.match(r'^\d{2}_', item):
                search_roots.append(os.path.join(BASE_DIR, item))

    print(f"Scanning {len(search_roots)} directories...")

    for search_root in search_roots:
        if not os.path.exists(search_root): continue
        
        for root, dirs, files in os.walk(search_root):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                    norm_name = normalize(file)
                    
                    # If already exists in DB, skip
                    if norm_name in existing_images:
                        continue
                    
                    # FOUND A MISSING CARD!
                    rel_folder = os.path.relpath(root, BASE_DIR).replace('\\', '/')
                    folder_name = os.path.basename(root) # e.g. "장소,환경-식물,자연" or "17_ㄲ"
                    
                    # Infer Metadata
                    name_base = os.path.splitext(norm_name)[0] # e.g. "까치"
                    if '[' in name_base and ']' in name_base:
                         # e.g. "까치[까치]"
                         readable_name = name_base
                    else:
                         readable_name = f"{name_base}[{name_base}]" # Default format

                    # Category Inference
                    main_cat = "기타"
                    sub_cat = "기타"
                    lang_cat = "기타"
                    
                    # Case 1: Category Folder
                    if CATEGORY_DIR in rel_folder:
                        if '-' in folder_name:
                            parts = folder_name.split('-')
                            # Parse "장소,환경" -> "장소/환경"
                            main_cat = parts[0].replace(',', '/')
                            lang_cat = parts[1].replace(',', '·') # UI uses dots usually
                        else:
                            lang_cat = folder_name
                    
                    # Case 2: Phoneme Folder (e.g. 17_ㄲ)
                    else:
                        # Guess main phoneme from folder name
                        # "17_ㄲ" -> "ㄲ"
                        if '_' in folder_name:
                             main_cat = folder_name.split('_')[1]
                        
                        # Can't easily guess Language Category from phoneme folder.
                        # Leave as "기타" or try to map if possible?
                        # For articulation buttons, Language Category is not critical if 'main' (Phoneme) matches?
                        # ACTUALLY, 'main' column is used for Phoneme!
                        pass

                    new_item = {
                        'folder': rel_folder,
                        'image': norm_name,
                        'filename': norm_name,
                        'name': readable_name,
                        'main': main_cat, # Phoneme or Category
                        'sub': '',
                        'part_of_speech': "명사", # Default
                        'language_category': lang_cat
                    }
                    
                    new_rows.append(new_item)
                    # Add to existing_images to prevent duplicates if found in both folders
                    existing_images.add(norm_name)
                    print(f"[Restoring] {readable_name} (in {rel_folder})")

    if new_rows:
        print(f"Found {len(new_rows)} missing cards. Adding to Excel...")
        new_df = pd.DataFrame(new_rows)
        df = pd.concat([df, new_df], ignore_index=True)
        
        df.to_excel(EXCEL_FILE, index=False)
        
        # Update data.js
        data_list = df.to_dict(orient='records')
        js_content = f"// Created by restore_missing_cards.py\nconst soundData = {json.dumps(data_list, ensure_ascii=False, indent=4)};"
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            f.write(js_content)
            
        print("Success! Database updated.")
    else:
        print("No missing cards found.")

if __name__ == "__main__":
    restore_missing_cards()
