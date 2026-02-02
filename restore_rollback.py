import os
import shutil

# Restoration Config
backup_source_dir = '_update/code_backup_20260201_081947'
target_root_dir = '.'

files_to_restore = [
    'admin.html',
    'server.py',
    'js/admin/admin_upload.js',
    'js/admin/admin_ui.js',
    'js/admin/admin_api.js'
]

print(f"Starting Rollback from: {backup_source_dir}")

for file_rel_path in files_to_restore:
    src_path = os.path.join(backup_source_dir, file_rel_path)
    dst_path = os.path.join(target_root_dir, file_rel_path)

    if os.path.exists(src_path):
        # Create dir if needed (unlikely for existing structure but safe)
        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
        
        try:
            shutil.copy2(src_path, dst_path)
            print(f"  [+] Restored: {file_rel_path}")
        except Exception as e:
            print(f"  [!] Failed to copy {file_rel_path}: {e}")
    else:
        print(f"  [?] Missing in backup: {file_rel_path}")

print("\nRollback File Copy Complete.")
