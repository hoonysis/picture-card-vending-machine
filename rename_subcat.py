
import pandas as pd
import os
import shutil
import json

EXCEL_FILE = 'word.xlsx'
DATA_FILE = 'data.js'
BASE_DIR = os.getcwd()
CATEGORY_DIR = os.path.join(BASE_DIR, '범주')

OLD_NAME = "기초인지(크기,높이,길이,무게,색깔,위치 등)"
NEW_NAME = "기초인지(비교개념,위치,색깔 등)"
MAIN_CATEGORY = "서술/개념"

def migrate_excel():
    print(f"Reading {EXCEL_FILE}...")
    try:
        df = pd.read_excel(EXCEL_FILE).fillna('')
    except Exception as e:
        print(f"Error reading excel: {e}")
        return False

    changes_count = 0
    
    # Iterate and Update
    for index, row in df.iterrows():
        current_main = str(row.get('part_of_speech', '')).strip()
        current_sub = str(row.get('language_category', '')).strip()
        
        if current_main == MAIN_CATEGORY and current_sub == OLD_NAME:
            df.at[index, 'language_category'] = NEW_NAME
            changes_count += 1

    if changes_count > 0:
        print(f"Updated {changes_count} rows in Excel.")
        df.to_excel(EXCEL_FILE, index=False)
        print("Excel saved.")
        return True
    else:
        print("No rows matched for rename in Excel.")
        return False

def regenerate_js():
    print("Regenerating data.js...")
    try:
        df = pd.read_excel(EXCEL_FILE).fillna('')
        data_list = df.to_dict(orient='records')
        js_content = f"// 자동 생성된 파일입니다. (created by rename_basic_cognition.py)\n"
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
        return

    main_clean = sanitize_folder_name(MAIN_CATEGORY)
    old_sub_clean = sanitize_folder_name(OLD_NAME)
    new_sub_clean = sanitize_folder_name(NEW_NAME)

    old_folder_name = f"{main_clean}-{old_sub_clean}"
    new_folder_name = f"{main_clean}-{new_sub_clean}"

    old_path = os.path.join(CATEGORY_DIR, old_folder_name)
    new_path = os.path.join(CATEGORY_DIR, new_folder_name)

    if os.path.exists(old_path):
        if os.path.exists(new_path):
            print(f"Target folder exists: {new_folder_name}. Merging...")
            # Simple merge logic if needed (though unlikely for rename)
            for subfile in os.listdir(old_path):
                src = os.path.join(old_path, subfile)
                dst = os.path.join(new_path, subfile)
                if not os.path.exists(dst):
                    shutil.move(src, dst)
            try:
                os.rmdir(old_path)
            except:
                pass
        else:
            try:
                os.rename(old_path, new_path)
                print(f"Renamed folder: {old_folder_name} -> {new_folder_name}")
            except Exception as e:
                print(f"Error renaming folder: {e}")
    else:
        print(f"Old folder not found: {old_folder_name}")

if __name__ == "__main__":
    if migrate_excel():
        regenerate_js()
        rename_folders()
    else:
        # Try rename anyway
        rename_folders()
