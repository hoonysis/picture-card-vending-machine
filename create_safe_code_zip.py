import zipfile
import os
import glob

# [SAFETY FIRST]
# This script creates a 'Safe Update' zip containing ONLY code logic.
# It explicitly EXCLUDES data files (word.xlsx, data.js, images/) to prevent accidental overwrites.

files_to_zip = [
    'admin.html',
    'index.html',
    'style.css',
    'server.py',
    # New Admin Modules
    'js/admin/admin_data.js',
    'js/admin/admin_util.js',
    'js/admin/admin_api.js',
    'js/admin/admin_ui.js',
    'js/admin/admin_upload.js',
    # Existing Logic
    'js/logic_basket.js',
    'js/logic_preset.js',
    'js/logic_print.js',
    'css/admin.css'
]

output_zip = 'safe_code_update.zip'

print(f"{'='*30}")
print(f"[SAFE UPDATE] CREATING ARCHIVE")
print(f"{'='*30}")

with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for file in files_to_zip:
        if os.path.exists(file):
            zipf.write(file, arcname=file)
            print(f"[ADDED] {file}")
        else:
            print(f"[MISSING] {file}")

print(f"\n[SAVED] {output_zip}")
print(f"[INFO] Upload this file to PythonAnywhere to update ONLY the logic.")
print("[NOTE] word.xlsx and data.js were NOT included.")
