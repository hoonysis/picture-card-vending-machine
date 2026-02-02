
import sys
import os

# Adjust path to import server
sys.path.append(os.path.abspath("n:/공유/공유받은/0. 한그루 원장, 부원장 공유/코딩/그림카드 자판기"))

try:
    from server import korean_g2p
except ImportError:
    # If path issue, try loading file directly or mocking
    print("Could not import server.py directly.")
    sys.exit(1)

test_cases = {
    "국물": "궁물",
    "믿다": "믿따", # Tensification
    "밥물": "밤물", # Nasalization
    "종로": "종노", # Nasalization of Liquid
    "백로": "뱅노", # Liquid Nasalization (Obstruent)
    "신라": "실라", # Lateralization
    "칼날": "칼랄", # Lateralization
    "같이": "가치", # Palatalization
    "굳이": "구지", # Palatalization
    "꽃밭": "꼳빧", # Complex Tensification (꽃->꼳, 밭->받 -> [꼳빧])
    "닭": "닥",     # Coda Simplification
    "닭고기": "닥꼬기", # Coda Simp + Tensification. IF '달꼬기' -> Wrong (Verb rule applied to Noun)
    "흙": "흑",
    "흙과": "흑꽈", # If '흘꽈' -> Wrong
    "값": "갑",
    "값이": "갑씨", # Liaison
    "좋아": "조아", # H-dropping
    "놓고": "노코", # Aspiration
    "좋소": "조쏘", # H + s -> ss
}

print("Running G2P Tests...")
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
