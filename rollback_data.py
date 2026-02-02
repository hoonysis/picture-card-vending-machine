import zipfile
import os
import shutil
import glob

BACKUP_DIR = 'backup'
DEST_DIR = '.'

def rollback_files():
    # Find latest zip
    zips = glob.glob(os.path.join(BACKUP_DIR, 'code_backup_*.zip'))
    if not zips:
        print("No backup zips found!")
        return

    latest_zip = max(zips, key=os.path.getctime)
    print(f"Restoring from: {latest_zip}")

    try:
        with zipfile.ZipFile(latest_zip, 'r') as zip_ref:
            # Extract word.xlsx and data.js
            for file in ['word.xlsx', 'data.js']:
                try:
                    zip_ref.extract(file, DEST_DIR)
                    print(f"Restored {file}")
                except KeyError:
                    print(f"{file} not found in zip.")
                    
        print("Rollback complete.")
    except Exception as e:
        print(f"Error during rollback: {e}")

if __name__ == "__main__":
    rollback_files()
