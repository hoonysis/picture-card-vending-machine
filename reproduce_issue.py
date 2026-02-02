import sys
import os

# Adjust path to import server
sys.path.append(os.path.abspath("n:/공유/공유받은/0. 한그루 원장, 부원장 공유/코딩/그림카드 자판기"))

try:
    from server import korean_g2p
except ImportError:
    print("Could not import server.py directly.")
    sys.exit(1)

test_cases = {
    "손가락": "송까락", # User expectation: Place Assimilation (ㄴ->ㅇ) + Tensification (ㄱ->ㄲ)
    "찐빵": "찜빵",     # User expectation: Place Assimilation (ㄴ->ㅁ)
    "신문": "심문",     # Example of Place Assimilation (ㄴ->ㅁ before ㅁ)
    "한강": "항강",     # Example of Place Assimilation (ㄴ->ㅇ before ㄱ)
}

print("Running Custom G2P Reproduction...")
failed = 0
for word, expected in test_cases.items():
    result = korean_g2p(word)
    if result != expected:
        print(f"[FAIL] {word}: Expected '{expected}', Got '{result}'")
        failed += 1
    else:
        print(f"[PASS] {word} -> {result}")

if failed == 0:
    print("\nAll tests passed!")
else:
    print(f"\n{failed} tests failed.")
