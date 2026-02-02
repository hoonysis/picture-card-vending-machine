import zipfile
import os

files_to_zip = [
    'admin.html',
    'js/logic_basket.js',
    'js/logic_preset.js',
    'js/logic_print.js',
    'word.xlsx',
    'data.js',
    'server.py' # Critical Update: Disable Auto-Delete
]

output_zip = 'update_restore.zip'

with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for file in files_to_zip:
        if os.path.exists(file):
            zipf.write(file, arcname=file)
            print(f"Added: {file}")
        else:
            print(f"Warning: File not found: {file}")

print(f"Created {output_zip} successfully.")
