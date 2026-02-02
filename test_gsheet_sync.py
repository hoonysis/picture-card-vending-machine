
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from sync_manager import SyncManager

CREDENTIALS_PATH = 'credentials.json'
SHEET_URL = 'https://docs.google.com/spreadsheets/d/114C5f1aowSR6TVG4OtY-RwmvCgbu3k-Gz81GndxPKV8/edit'

def test_sync():
    print("Testing SyncManager...")
    manager = SyncManager(CREDENTIALS_PATH, SHEET_URL)
    
    if not manager.connect():
        print("Connection Failed!")
        return

    data = manager.fetch_data()
    print(f"Fetched {len(data)} items.")
    
    if data:
        # Print first 3 items
        keys = list(data.keys())[:3]
        for k in keys:
            print(f"{k}: {data[k]}")

if __name__ == "__main__":
    test_sync()
