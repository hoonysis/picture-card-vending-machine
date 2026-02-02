import pandas as pd
import os

file_path = 'g:/내 드라이브/이기훈/이기훈/교재/코딩/그림카드 자판기(백업)/reference_words.xlsx'

if not os.path.exists(file_path):
    print(f"File not found at: {file_path}")
    exit(1)

try:
    df = pd.read_excel(file_path)
    print("Columns:", df.columns.tolist())
    
    pronunciation_col = None
    for col in df.columns:
        if '발음' in str(col) or 'pronunciation' in str(col).lower():
            pronunciation_col = col
            break
            
    if pronunciation_col:
        print(f"Found pronunciation column: '{pronunciation_col}'")
        print("\nLast 10 rows of pronunciation:")
        print(df[pronunciation_col].tail(10))
        
        total_rows = len(df)
        filled_rows = df[pronunciation_col].notna().sum()
        print(f"\nTotal rows: {total_rows}")
        print(f"Filled pronunciation rows: {filled_rows}")
        
        if total_rows == filled_rows:
            print("All rows have pronunciation data.")
        else:
            print(f"Missing pronunciation for {total_rows - filled_rows} rows.")
            # Print missing rows
            missing = df[df[pronunciation_col].isna()]
            print("\nFirst 5 rows with missing pronunciation:")
            print(missing.head())
    else:
        print("Could not find a column named '발음' or 'pronunciation'.")
        print("First 5 rows of dataframe:")
        print(df.head())

except Exception as e:
    print(f"Error reading excel file: {e}")
