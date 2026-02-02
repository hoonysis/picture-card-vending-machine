import json
import os
import shutil
import re

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = 'data.js'
CATEGORY_DIR = '범주'

def load_data():
    data_path = os.path.join(BASE_DIR, DATA_FILE)
    if not os.path.exists(data_path):
        print(f"Error: {DATA_FILE} not found.")
        return []
    
    with open(data_path, 'r', encoding='utf-8') as f:
        content = f.read()
        # Remove JS declaration to get pure JSON
        # Expecting: const soundData = [...];
        match = re.search(r'const\s+soundData\s*=\s*(\[.*\])\s*;', content, re.DOTALL)
        if match:
            json_str = match.group(1)
            try:
                return json.loads(json_str)
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON: {e}")
                return []
        else:
            print("Could not find soundData array in data.js")
            return []

def migrate():
    print("Starting migration of images to Category folders...")
    
    data = load_data()
    if not data:
        print("No data to migrate.")
        return

    count = 0
    skipped = 0
    errors = 0
    
    # Create base category directory
    base_category_path = os.path.join(BASE_DIR, CATEGORY_DIR)
    if not os.path.exists(base_category_path):
        os.makedirs(base_category_path)
        print(f"Created base directory: {base_category_path}")

    # Target Category for Pilot Run (Set to None to process all)
    # TARGET_POS = "음식"
    # TARGET_CAT = "과일·채소"
    
    # Configure target for this run
    # Configure target for this run (None = Process All)
    TARGET_POS = None
    TARGET_CAT = None
    
    print(f"Targeting logic: ALL CATEGORIES")

    # Process each item
    for item in data:
        folder = item.get('folder', '')
        image = item.get('image', '')
        pos = item.get('part_of_speech', '').strip()
        cat = item.get('language_category', '').strip()
        
        if not folder or not image:
            continue
            
        if not pos or not cat:
            skipped += 1
            continue
            
        # Filter Logic
        if TARGET_POS and pos != TARGET_POS:
            continue
        if TARGET_CAT and cat != TARGET_CAT:
            continue
            
        # Source Path
        src_path = os.path.join(BASE_DIR, folder, image)
        
        if not os.path.exists(src_path):
            print(f"Warning: Source file not found: {src_path}")
            errors += 1
            continue
            
        # Destination Path
        # Structure: 범주/대범주,대범주-소범주,소범주/이미지
        
        pos_clean = pos.replace('/', ',').replace('·', ',')
        cat_clean = cat.replace('/', ',').replace('·', ',')
        folder_name = f"{pos_clean}-{cat_clean}"
        
        dest_dir = os.path.join(base_category_path, folder_name)
        if not os.path.exists(dest_dir):
            os.makedirs(dest_dir)
            
        dest_path = os.path.join(dest_dir, image)
        
        # Copy file
        try:
            shutil.copy2(src_path, dest_path)
            # print(f"Copied: {image} -> {folder_name}/")
            count += 1
        except Exception as e:
            print(f"Error copying {image}: {e}")
            errors += 1
            
    print("-" * 30)
    print(f"Migration Complete.")
    print(f"Total Processed: {count}")
    print(f"Skipped (No Category): {skipped}")
    print(f"Errors (Missing Source/Copy Failed): {errors}")

if __name__ == "__main__":
    migrate()
