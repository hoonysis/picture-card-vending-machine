
import pandas as pd
import os
import shutil
import json

EXCEL_FILE = 'word.xlsx'
DATA_FILE = 'data.js'
BASE_DIR = os.getcwd()
CATEGORY_DIR = os.path.join(BASE_DIR, '범주')

# Mapping: Old Sub -> New Sub
# Main Category: 동작/상태 -> 서술/개념
SUB_CATEGORY_MAP = {
    # Old -> New
    "움직임(동사)": "서술어(행동/상태)",
    "감정·상태(기분,몸상태 등)": "감정",
    "속성(크기,길이,높이,무게 등)": "기초인지(크기,높이,길이,무게,색깔,위치 등)",
    "기초인지(색깔,숫자,글자,위치 등)": "기초인지(크기,높이,길이,무게,색깔,위치 등)", # Merge Attribute & Basic Cog
    "말놀이(의성어,의태어)": "말놀이(의성어,의태어)"
}

NEW_MAIN_CATEGORY = "서술/개념"
OLD_MAIN_CATEGORY = "동작/상태"

def migrate_excel():
    print(f"Reading {EXCEL_FILE}...")
    try:
        df = pd.read_excel(EXCEL_FILE).fillna('')
    except Exception as e:
        print(f"Error reading excel: {e}")
        return

    changes_count = 0
    
    # Iterate and Update
    for index, row in df.iterrows():
        main_cat = str(row.get('language_category', '')).strip()
        # Some rows might have "동작/상태" as main category directly, or it might be implicit via sub-category match?
        # In this system, 'language_category' column usually holds the SUB category in the Excel?
        # Wait, let's check the schema.
        # Based on data.js: "language_category": "간식·음료" (This is Sub)
        # But wait, in index.html LANGUAGE_THEMES keys are Main, values are Sub.
        # So 'language_category' in data.js seems to be the SUB category name?
        # Let's verify with data.js content from previous turn.
        # "part_of_speech": "음식", "language_category": "간식·음료"
        # Ah! 'part_of_speech' is the MAIN category (e.g., '음식')
        # 'language_category' is the SUB category (e.g., '간식·음료')
        
        current_main = str(row.get('part_of_speech', '')).strip()
        current_sub = str(row.get('language_category', '')).strip()
        
        if current_main == OLD_MAIN_CATEGORY:
            # Update Main Category
            df.at[index, 'part_of_speech'] = NEW_MAIN_CATEGORY
            
            # Map Sub Category
            # Try exact match first
            if current_sub in SUB_CATEGORY_MAP:
                df.at[index, 'language_category'] = SUB_CATEGORY_MAP[current_sub]
            else:
                # If exact match fails, try partial or just leave it (or map to '서술어' default?)
                # Let's try to be smart.
                if "움직임" in current_sub: val = SUB_CATEGORY_MAP["움직임(동사)"]
                elif "감정" in current_sub: val = SUB_CATEGORY_MAP["감정·상태(기분,몸상태 등)"]
                elif "속성" in current_sub: val = SUB_CATEGORY_MAP["속성(크기,길이,높이,무게 등)"]
                elif "기초" in current_sub: val = SUB_CATEGORY_MAP["기초인지(색깔,숫자,글자,위치 등)"]
                elif "말놀이" in current_sub: val = SUB_CATEGORY_MAP["말놀이(의성어,의태어)"]
                else: val = "서술어(행동/상태)" # Fallback default
                
                df.at[index, 'language_category'] = val
            
            changes_count += 1

    if changes_count > 0:
        print(f"Updated {changes_count} rows in Excel.")
        df.to_excel(EXCEL_FILE, index=False)
        print("Excel saved.")
        return True
    else:
        print("No rows matched for migration in Excel.")
        return False

def regenerate_js():
    print("Regenerating data.js...")
    try:
        df = pd.read_excel(EXCEL_FILE).fillna('')
        data_list = df.to_dict(orient='records')
        js_content = f"// 자동 생성된 파일입니다. (created by migrate_categories.py)\n"
        js_content += f"const soundData = {json.dumps(data_list, ensure_ascii=False, indent=4)};"
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            f.write(js_content)
        print("data.js updated.")
    except Exception as e:
        print(f"Error regenerating JS: {e}")

def sanitize_folder_name(name):
    return name.replace('/', ',').replace('·', ',')

def rename_folders():
    print("Renaming folders in '범주'...")
    if not os.path.exists(CATEGORY_DIR):
        print("'범주' directory not found.")
        return

    # Old main prefix cleaned
    old_main_clean = sanitize_folder_name(OLD_MAIN_CATEGORY)
    new_main_clean = sanitize_folder_name(NEW_MAIN_CATEGORY)

    for item in os.listdir(CATEGORY_DIR):
        if item.startswith(old_main_clean):
            old_path = os.path.join(CATEGORY_DIR, item)
            if os.path.isdir(old_path):
                # Parse old sub-category
                # Format: "동작,상태-움직임(동사)"
                parts = item.split('-', 1)
                if len(parts) < 2: continue
                
                old_sub_clean = parts[1]
                
                # Reverse lookup the Clean Sub to Original Map key?
                # Harder because we don't know exact chars replaced.
                # Heuristic: try to find which key corresponds to this folder suffix
                
                target_sub = None
                
                # We can try to match substrings from our map keys
                found_key = None
                for key in SUB_CATEGORY_MAP.keys():
                    key_clean = sanitize_folder_name(key)
                    if key_clean == old_sub_clean:
                        found_key = key
                        break
                
                if not found_key:
                    # Try partials
                    if "움직임" in old_sub_clean: found_key = "움직임(동사)"
                    elif "감정" in old_sub_clean: found_key = "감정·상태(기분,몸상태 등)"
                    elif "속성" in old_sub_clean: found_key = "속성(크기,길이,높이,무게 등)"
                    elif "기초" in old_sub_clean: found_key = "기초인지(색깔,숫자,글자,위치 등)"
                    elif "말놀이" in old_sub_clean: found_key = "말놀이(의성어,의태어)"

                if found_key:
                    new_sub_raw = SUB_CATEGORY_MAP[found_key]
                    new_sub_clean = sanitize_folder_name(new_sub_raw)
                    new_folder_name = f"{new_main_clean}-{new_sub_clean}"
                    new_path = os.path.join(CATEGORY_DIR, new_folder_name)
                    
                    if old_path != new_path:
                        try:
                            # If target exists, merge?
                            if os.path.exists(new_path):
                                print(f"Target folder exists: {new_folder_name}. Merging content...")
                                for subfile in os.listdir(old_path):
                                    src = os.path.join(old_path, subfile)
                                    dst = os.path.join(new_path, subfile)
                                    if not os.path.exists(dst):
                                        shutil.move(src, dst)
                                # Remove old empty folder
                                os.rmdir(old_path)
                            else:
                                os.rename(old_path, new_path)
                                print(f"Renamed: {item} -> {new_folder_name}")
                        except Exception as e:
                            print(f"Error renaming {item}: {e}")
                else:
                    print(f"Skipping unknown folder: {item}")

if __name__ == "__main__":
    if migrate_excel():
        regenerate_js()
        rename_folders()
    else:
        # even if excel didn't change (maybe already changed), try renaming folders just in case
        rename_folders()
