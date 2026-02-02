
import pandas as pd
import os

REFERENCE_FILE = 'reference_words.xlsx'

def check_reference_dict():
    path = REFERENCE_FILE
    if not os.path.exists(path):
        print("Reference file not found.")
        return
        
    try:
        print(f"Loading {path}...")
        df = pd.read_excel(path, header=0)
        print("Columns:", df.columns.tolist())
        print("First 3 rows:")
        print(df.head(3))
        
        print("\nChecking first row detail:")
        if not df.empty:
            row = df.iloc[0]
            print(f"Row Length: {len(row)}")
            for i in range(len(row)):
                print(f"Index {i}: {row.iloc[i]}")
                
    except Exception as e:
        print(f"Error loading reference dictionary: {e}")

if __name__ == "__main__":
    check_reference_dict()
