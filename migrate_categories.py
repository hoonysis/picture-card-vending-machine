import pandas as pd
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_FILE = 'word.xlsx'
DATA_FILE = 'data.js'

def migrate():
    excel_path = os.path.join(BASE_DIR, EXCEL_FILE)
    if not os.path.exists(excel_path):
        print("Excel file not found!")
        return

    print("Loading word.xlsx...")
    df = pd.read_excel(excel_path).fillna('')

    if 'language_category' not in df.columns:
        print("'language_category' missing.")
        return

    count = 0

    # Adding space before '등'
    replacements = {
        '감정·상태(기분,몸상태등)': '감정·상태(기분,몸상태 등)',
        '속성(크기,길이,높이,무게등)': '속성(크기,길이,높이,무게 등)',
        '기초인지(색깔,숫자,글자,위치등)': '기초인지(색깔,숫자,글자,위치 등)'
    }

    for idx, row in df.iterrows():
        cat = row['language_category']
        if cat in replacements:
            df.at[idx, 'language_category'] = replacements[cat]
            count += 1

    print(f"Updated {count} categories to spaced '등'.")

    if count > 0:
        df.to_excel(excel_path, index=False)
        print("Saved to Excel.")

        data_list = df.to_dict(orient='records')
        js_content = f"// 자동 생성된 파일입니다. (created by migrate_categories.py)\n"
        js_content += f"const soundData = {json.dumps(data_list, ensure_ascii=False, indent=4)};"
        with open(os.path.join(BASE_DIR, DATA_FILE), 'w', encoding='utf-8') as f:
            f.write(js_content)
        print("Regenerated data.js")
    else:
        print("No changes made.")

if __name__ == "__main__":
    migrate()
