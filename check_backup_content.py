import zipfile
import os

backups = [
    'backup/code_backup_20260201_145106.zip',
    'backup/code_backup_20260201_010224.zip'
]

target_file = 'js/admin/admin_upload.js'
# Keywords associated with the new feature
keywords = ['건너뛰기', '중단', 'relay-controls']

for bk in backups:
    try:
        with zipfile.ZipFile(bk, 'r') as zf:
            if target_file in zf.namelist():
                with zf.open(target_file) as f:
                    content = f.read().decode('utf-8', errors='ignore')
                    found_keywords = [k for k in keywords if k in content]
                    print(f"[{bk}] Found: {found_keywords}")
            else:
                print(f"[{bk}] {target_file} NOT FOUND")
    except Exception as e:
        print(f"[{bk}] Error: {e}")
