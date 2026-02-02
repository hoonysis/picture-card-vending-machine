import pandas as pd
import json
import os

EXCEL_FILE = 'word.xlsx'
DATA_FILE = 'data.js'

def deduplicate_data():
    if not os.path.exists(EXCEL_FILE):
        print("word.xlsx not found.")
        return

    # Load All
    df = pd.read_excel(EXCEL_FILE)
    print(f"Original Count: {len(df)}")

    # Deduplicate based on 'image' (filename) column
    # If multiple entries exist for 'apple.png', keep the first one.
    df_clean = df.drop_duplicates(subset=['image'], keep='first')
    
    print(f"Cleaned Count: {len(df_clean)}")

    # Update Files
    df_clean.to_excel(EXCEL_FILE, index=False)
    
    # Update data.js
    data_list = df_clean.to_dict(orient='records')
    js_content = f"// Deduplicated by fix_duplicates.py\nconst soundData = {json.dumps(data_list, ensure_ascii=False, indent=4)};"
    
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)
        
    print("Files updated successfully.")

if __name__ == "__main__":
    deduplicate_data()
