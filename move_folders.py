import os
import shutil

def main():
    # Base directory is current directory
    base_dir = os.path.dirname(os.path.abspath(__file__))
    cards_dir = os.path.join(base_dir, 'cards')

    # Create 'cards' directory if not exists
    if not os.path.exists(cards_dir):
        print(f"Creating directory: {cards_dir}")
        os.makedirs(cards_dir)

    # Setup counters
    moved_count = 0
    skipped_count = 0

    print("Scanning directories...")
    
    # Iterate over items in root
    for item in os.listdir(base_dir):
        src_path = os.path.join(base_dir, item)
        
        # Skip files, only move directories
        if not os.path.isdir(src_path):
            continue

        # Skip special directories
        if item in ['cards', 'user_images', 'css', 'js', 'static', 'templates', '__pycache__', '.git', '.idea', '.vscode']:
            continue
            
        # Skip hidden directories
        if item.startswith('.'):
            continue

        # Heuristic: Move folders starting with digits (01_..., 20_..., 99_...)
        # This covers the user's structure (01_ㅇ(모음), etc.)
        if item[0].isdigit():
            dest_path = os.path.join(cards_dir, item)
            
            if os.path.exists(dest_path):
                print(f"[SKIP] {item} -> already exists in cards/")
                skipped_count += 1
            else:
                try:
                    shutil.move(src_path, dest_path)
                    print(f"[MOVE] {item} -> cards/{item}")
                    moved_count += 1
                except Exception as e:
                    print(f"[ERROR] Failed to move {item}: {e}")

    print("-" * 30)
    print(f"Migration Complete.")
    print(f"Moved: {moved_count}, Skipped: {skipped_count}")
    print("-" * 30)

if __name__ == "__main__":
    main()
