import os
import shutil

def main():
    # Base directory is current directory
    base_dir = os.path.dirname(os.path.abspath(__file__))
    cards_dir = os.path.join(base_dir, 'cards')

    if not os.path.exists(cards_dir):
        print(f"Error: 'cards' directory not found at {cards_dir}")
        return

    moved_count = 0
    
    print("Scanning 'cards' directory to revert changes...")
    
    # Iterate over items in cards directory
    for item in os.listdir(cards_dir):
        src_path = os.path.join(cards_dir, item)
        
        # Only move directories back
        if not os.path.isdir(src_path):
            continue
            
        dest_path = os.path.join(base_dir, item)
        
        if os.path.exists(dest_path):
            print(f"[SKIP] {item} -> already exists in root")
        else:
            try:
                shutil.move(src_path, dest_path)
                print(f"[RESTORE] cards/{item} -> {item}")
                moved_count += 1
            except Exception as e:
                print(f"[ERROR] Failed to move {item}: {e}")

    # Clean up empty cards dir
    try:
        if not os.listdir(cards_dir):
            os.rmdir(cards_dir)
            print("Removed empty 'cards' directory.")
        else:
            print("'cards' directory is not empty, kept it.")
    except:
        pass

    print("-" * 30)
    print(f"Rollback Complete. Restored: {moved_count}")
    print("-" * 30)

if __name__ == "__main__":
    main()
