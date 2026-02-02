import zipfile
import os
import glob
import pandas as pd
import io

def scan_backups():
    backups = glob.glob('backup/*.zip')
    backups.sort(key=os.path.getctime, reverse=True)
    
    print(f"{'Backup Time':<25} | {'File Size':<10} | {'Row Count':<10}")
    print("-" * 50)
    
    for zip_path in backups:
        try:
            with zipfile.ZipFile(zip_path, 'r') as z:
                if 'word.xlsx' in z.namelist():
                    with z.open('word.xlsx') as f:
                        content = f.read()
                        size = len(content)
                        try:
                            df = pd.read_excel(io.BytesIO(content))
                            rows = len(df)
                        except:
                            rows = "Error"
                        
                        time_str = os.path.basename(zip_path).replace('code_backup_', '').replace('.zip', '')
                        print(f"{time_str:<25} | {size:<10} | {rows:<10}")
        except Exception as e:
            pass

scan_backups()
