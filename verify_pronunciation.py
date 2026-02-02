import sys
import os

# Add current directory to path so we can import server
sys.path.append(os.getcwd())

from server import korean_g2p, load_reference_dict

def test_pronunciation_lookup():
    print("Loading reference dictionary...")
    ref_dict = load_reference_dict()
    print(f"Loaded {len(ref_dict)} words.")
    
    # Pick a sample word that is likely in the file
    # unique test case where pronunciation might need lookup or just verifying any word
    # Let's check the first few keys to pick one
    sample_keys = list(ref_dict.keys())[:5]
    print(f"Sample keys: {sample_keys}")
    
    for word in sample_keys:
        excel_pron = ref_dict[word].get('pronunciation', '')
        g2p_pron = korean_g2p(word)
        
        print(f"Word: {word}")
        print(f"  Excel Pronunciation: '{excel_pron}'")
        print(f"  Server G2P Result:   '{g2p_pron}'")
        
        if excel_pron and g2p_pron == excel_pron:
            print("  [SUCCESS] Server is using the Excel pronunciation.")
        elif not excel_pron:
            print("  [INFO] No pronunciation in Excel for this word.")
        else:
            print("  [WARNING] Mismatch! Server might be ignoring Excel or rule took precedence (which shouldn't happen if logic is correct).")

if __name__ == "__main__":
    test_pronunciation_lookup()
