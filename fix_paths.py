import os
import pandas as pd
import json
import unicodedata

BASE_DIR = os.getcwd()
EXCEL_FILE = 'word.xlsx'
DATA_FILE = 'data.js'
CATEGORY_DIR = '범주'

def normalize(text):
    return unicodedata.normalize('NFC', text) if text else ""

def scan_category_images():
    """Scans the '범주' directory and returns a map {filename: relative_folder_path}"""
    image_map = {}
    print(f"Scanning {CATEGORY_DIR}...")
    
    for root, dirs, files in os.walk(os.path.join(BASE_DIR, CATEGORY_DIR)):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                # Use NFC for safe matching
                norm_name = normalize(file)
                rel_folder = os.path.relpath(root, BASE_DIR).replace('\\', '/')
                image_map[norm_name] = rel_folder
                
    print(f"Found {len(image_map)} images in {CATEGORY_DIR}")
    return image_map

def fix_paths():
    if not os.path.exists(EXCEL_FILE):
        print("Excel file not found!")
        return

    df = pd.read_excel(EXCEL_FILE).fillna('')
    print(f"Loaded {len(df)} rows from {EXCEL_FILE}")
    
    category_map = scan_category_images()
    
    updated_count = 0
    
    for index, row in df.iterrows():
        current_folder = str(row['folder'])
        image_name = str(row['image'])
        
        if not image_name: continue
        
        if not image_name: continue
        
        # Force Check '범주' first (Server Logic Priority)
        norm_name = normalize(image_name)
        
        if norm_name in category_map:
            new_folder = category_map[norm_name]
            
            # If current folder is different, update it
            # Normalize slashes for comparison
            normalized_current = current_folder.replace('\\', '/')
            if normalized_current != new_folder:
                df.at[index, 'folder'] = new_folder
                # print(f"[Fixed] {image_name}: {current_folder} -> {new_folder}")
                updated_count += 1
        else:
            # Not in category, leave as is (User Image or Phoneme only)
            pass

    if updated_count > 0:
        print(f"Saving {updated_count} changes to {EXCEL_FILE}...")
        df.to_excel(EXCEL_FILE, index=False)
        
        # Update data.js manually or let server do it? Let's do it here to be sure.
        data_list = df.to_dict(orient='records')
        js_content = f"// Created by fix_paths.py\nconst soundData = {json.dumps(data_list, ensure_ascii=False, indent=4)};"
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            f.write(js_content)
        print("Updated data.js")
    else:
        print("No paths needed fixing.")

if __name__ == "__main__":
    fix_paths()
