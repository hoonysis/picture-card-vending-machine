import pandas as pd
import os

EXCEL_FILE = 'word.xlsx'
DATA_FILE = 'data.js'
import json

def migrate():
    if not os.path.exists(EXCEL_FILE):
        print("Excel file not found!")
        return

    df = pd.read_excel(EXCEL_FILE).fillna('')
    
    changed = False
    
    if 'part_of_speech' not in df.columns:
        print("Adding 'part_of_speech' column...")
        df['part_of_speech'] = ''
        changed = True
        
    if 'language_category' not in df.columns:
        print("Adding 'language_category' column...")
        df['language_category'] = ''
        changed = True

    if changed:
        # Save back to Excel
        df.to_excel(EXCEL_FILE, index=False)
        print("Updated word.xlsx with new columns.")
        
        # Update data.js
        data_list = df.to_dict(orient='records')
        js_content = f"// 자동 생성된 파일입니다. (created by migrate_db.py)\n"
        js_content += f"const soundData = {json.dumps(data_list, ensure_ascii=False, indent=4)};"
        
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            f.write(js_content)
        print("Updated data.js")
    else:
        print("Columns already exist. No changes needed.")

if __name__ == "__main__":
    migrate()
