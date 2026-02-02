
from PIL import Image
import os

def remove_background(input_path, output_path):
    try:
        img = Image.open(input_path)
        img = img.convert("RGBA")
        datas = img.getdata()
        
        newData = []
        tolerance = 20 # Slightly higher tolerance for clean removal
        
        for item in datas:
            # Check if pixel is white-ish
            if item[0] > 255 - tolerance and item[1] > 255 - tolerance and item[2] > 255 - tolerance:
                 newData.append((255, 255, 255, 0)) # Transparent
            else:
                 newData.append(item)
        
        img.putdata(newData)
        
        # Crop
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
            
        img.save(output_path, "PNG")
        print(f"Success: {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")

input_file = r"C:/Users/hoony/.gemini/antigravity/brain/4694f8ba-953a-4d9f-bd7c-36add477fcea/uploaded_image_1768993601018.png"
output_file = r"g:/내 드라이브/이기훈/이기훈/교재/코딩/그림카드 자판기/images/guide_button_v3.png"

os.makedirs(os.path.dirname(output_file), exist_ok=True)
remove_background(input_file, output_file)
