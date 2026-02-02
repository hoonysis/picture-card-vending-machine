import struct
import os

def get_png_dimensions(data):
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError("Not a valid PNG file")
    w = struct.unpack('>I', data[16:20])[0]
    h = struct.unpack('>I', data[20:24])[0]
    return w, h

def png_to_ico(png_path, ico_path):
    with open(png_path, 'rb') as f:
        png_data = f.read()

    try:
        width, height = get_png_dimensions(png_data)
        print(f"PNG Dimensions: {width}x{height}")
    except Exception as e:
        print(f"Error parsing PNG: {e}")
        return

    b_width = width if width < 256 else 0
    b_height = height if height < 256 else 0

    ico_header = struct.pack('<HHH', 0, 1, 1)
    entry = struct.pack('<BBBBHHII', 
                        b_width, b_height, 0, 0, 
                        1, 32, 
                        len(png_data), 
                        22)

    with open(ico_path, 'wb') as f:
        f.write(ico_header)
        f.write(entry)
        f.write(png_data)
    
    print(f"Successfully converted {png_path} to {ico_path}")

if __name__ == "__main__":
    png_file = r"C:\Users\hoony\.gemini\antigravity\brain\26d651cf-9c36-4455-bcc0-8a2427dc5b37\uploaded_image_1769134854169.png"
    ico_file = r"g:\내 드라이브\이기훈\이기훈\교재\코딩\그림카드 자판기\images\favicon.ico"
    
    if os.path.exists(png_file):
        png_to_ico(png_file, ico_file)
    else:
        print(f"File not found: {png_file}")
