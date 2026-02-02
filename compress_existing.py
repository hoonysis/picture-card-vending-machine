import os
from PIL import Image
import shutil
import datetime

# Configuration
EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp'}
MAX_SIZE_PX = 800  # Resize if larger than this (width or height)
QUALITY = 80       # Compression quality

def compress_image(image_path):
    try:
        # Open image
        with Image.open(image_path) as img:
            # Check if resize needed
            width, height = img.size
            if width <= MAX_SIZE_PX and height <= MAX_SIZE_PX:
                # If size is small, just optimize save? 
                # Or check file size? Let's force optimize.
                pass
            
            # Calculate new size maintaining aspect ratio
            if width > MAX_SIZE_PX or height > MAX_SIZE_PX:
                if width > height:
                    new_width = MAX_SIZE_PX
                    new_height = int(height * (MAX_SIZE_PX / width))
                else:
                    new_height = MAX_SIZE_PX
                    new_width = int(width * (MAX_SIZE_PX / height))
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                print(f"  [RESIZE] {width}x{height} -> {new_width}x{new_height}")

            # Optimize and Save
            # Create temp buffer or overwrite? Overwrite is safer if we backed up.
            img.save(image_path, optimize=True, quality=QUALITY)
            return True
            
    except Exception as e:
        print(f"  [ERROR] Failed to compress {image_path}: {e}")
        return False

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Create Backup Directory
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_root = os.path.join(base_dir, f'backup_images_{timestamp}')
    
    print(f"Starting Image Compression...")
    print(f"Max Size: {MAX_SIZE_PX}px, Backup: {backup_root}")
    
    processed_count = 0
    saved_space = 0
    
    # Traverse all directories
    for root, dirs, files in os.walk(base_dir):
        # Skip special folders
        if 'backup' in root or '.git' in root or '__pycache__' in root:
            continue
            
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in EXTENSIONS:
                file_path = os.path.join(root, file)
                original_size = os.path.getsize(file_path)
                
                # Filter locally: only compress if > 200KB to save time/risk
                if original_size < 200 * 1024: 
                    continue
                    
                print(f"Processing: {os.path.relpath(file_path, base_dir)} ({original_size/1024:.1f} KB)")
                
                # Backup first
                rel_path = os.path.relpath(file_path, base_dir)
                backup_path = os.path.join(backup_root, rel_path)
                os.makedirs(os.path.dirname(backup_path), exist_ok=True)
                shutil.copy2(file_path, backup_path)
                
                # Compress
                if compress_image(file_path):
                    new_size = os.path.getsize(file_path)
                    reduction = original_size - new_size
                    saved_space += reduction
                    processed_count += 1
                    print(f"  -> Done ({new_size/1024:.1f} KB). Saved {reduction/1024:.1f} KB")

    print("-" * 30)
    print(f"Compression Complete.")
    print(f"Images Processed: {processed_count}")
    print(f"Total Space Saved: {saved_space / (1024*1024):.2f} MB")
    print("-" * 30)

if __name__ == "__main__":
    main()
