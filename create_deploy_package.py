import os
import shutil
import datetime

# Target Files
files_to_deploy = [
    'admin.html',
    'js/admin/admin_ui.js',
    'js/admin/admin_upload.js',
    'js/admin/admin_api.js',
    'server.py'
]

# Create Timestamped Folder
timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
base_dir = "_update"
deploy_dir = os.path.join(base_dir, f"deploy_{timestamp}")

if not os.path.exists(deploy_dir):
    os.makedirs(deploy_dir)

print(f"Creating Deployment Package in: {deploy_dir}")

for file_path in files_to_deploy:
    if os.path.exists(file_path):
        # Create subdirs if needed
        dest_path = os.path.join(deploy_dir, file_path)
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        
        shutil.copy2(file_path, dest_path)
        print(f"  [+] Copied: {file_path}")
    else:
        print(f"  [!] Missing: {file_path}")

print("\nDeployment contents prepared.")
print(f"Folder: {os.path.abspath(deploy_dir)}")
