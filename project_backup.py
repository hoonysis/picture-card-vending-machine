import os
import zipfile
import datetime

# Configuration
BACKUP_DIR_NAME = 'backup'
SOURCE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(SOURCE_DIR, BACKUP_DIR_NAME)

# Targets
# We include files with these extensions to ensure we capture all code and config.
INCLUDE_EXTENSIONS = {
    '.py', '.js', '.css', '.html',            # Code
    '.bat', '.sh', '.cmd',                    # Scripts
    '.json', '.xml', '.yaml', '.yml', '.txt', # Config/Data
    '.md',                                    # Docs
    '.xlsx', '.csv',                          # Data Sheets
    '.db',                                    # Database
    '.code-workspace'                         # VSCode Workspace
}

# Directories to explicitly skip (to save time or avoid cycles)
SKIP_DIRS = {
    BACKUP_DIR_NAME, 
    '__pycache__', 
    '.git', 
    '.history', 
    '.vscode', 
    '.idea',
    'venv',
    'env',
    '.gemini' # Agent directory
}

def create_backup():
    # 1. Prepare Backup Directory
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        print(f"Created backup directory: {BACKUP_DIR}")

    # 2. Generate Filename
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"code_backup_{timestamp}.zip"
    zip_filepath = os.path.join(BACKUP_DIR, zip_filename)

    print(f"Start backup to: {zip_filename}")
    
    file_count = 0
    skipped_count = 0

    try:
        with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(SOURCE_DIR):
                # Modify dirs in-place to skip specific directories
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
                
                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    
                    if ext in INCLUDE_EXTENSIONS:
                        abs_path = os.path.join(root, file)
                        rel_path = os.path.relpath(abs_path, SOURCE_DIR)
                        
                        # Write to zip
                        zipf.write(abs_path, rel_path)
                        print(f"  [+] {rel_path}")
                        file_count += 1
                    else:
                        skipped_count += 1

        print("-" * 30)
        print(f"Backup Complete!")
        print(f"Location: {zip_filepath}")
        print(f"Total Files: {file_count}")
        print(f"Skipped Files: {skipped_count} (Images/Binaries etc.)")
        
    except Exception as e:
        print(f"Backup Failed: {e}")
        # Try to delete incomplete file
        if os.path.exists(zip_filepath):
            os.remove(zip_filepath)

if __name__ == "__main__":
    create_backup()
    # Keep window open if run from double-click
    input("\nPress Enter to exit...")
