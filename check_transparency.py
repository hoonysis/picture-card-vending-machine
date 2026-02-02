import os

def check_transparency(path):
    with open(path, 'rb') as f:
        data = f.read()
    
    # Simple PNG header check
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        print(f"{os.path.basename(path)}: Not a PNG")
        return

    # Look for Color Type 6 (Truecolor with apha) in IHDR
    # IHDR matches first chunk after signature
    # Signature (8) + Length (4) + ChunkType (4) -> IHDR starts at 12, Data at 16
    # Width (4), Height (4), BitDepth (1), ColorType (1) -> Offset 25
    color_type = data[25]
    print(f"{os.path.basename(path)}: Color Type = {color_type}")
    
    if color_type == 6:
        print("Image has Alpha Channel (Truecolor + Alpha).")
    elif color_type == 4:
        print("Image has Alpha Channel (Grayscale + Alpha).")
    elif color_type == 3:
        print("Image is Indexed Color (Palette). Might have transparency via tRNS chunk.")
    else:
        print("Image does NOT have consistent Alpha Channel (Type 0 or 2).")

    # We can't easily scan pixels without PIL, but Color Type 6 is a strong indicator of intent.

check_transparency(r"C:\Users\hoony\.gemini\antigravity\brain\26d651cf-9c36-4455-bcc0-8a2427dc5b37\uploaded_image_1769134854169.png")
