from PIL import Image
import sys
import os

def convert_to_ico(input_path, output_path=None):
    """
    이미지를 Windows 아이콘(.ico) 파일로 변환합니다.
    여러 사이즈(16, 32, 48, 64, 128, 256)를 포함하여 품질을 높입니다.
    """
    try:
        # 1. 이미지 열기
        img = Image.open(input_path)
        
        # 2. 출력 파일명 자동 생성 (확장자만 ico로 변경)
        if output_path is None:
            output_path = os.path.splitext(input_path)[0] + ".ico"
            
        # 3. 아이콘에 포함할 사이즈 목록 (윈도우 표준 사이즈)
        icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
        
        # 4. 저장
        img.save(output_path, format='ICO', sizes=icon_sizes)
        print(f"✅ 변환 성공! -> {output_path}")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python convert_to_ico.py [이미지파일경로]")
        print("예시: python convert_to_ico.py my_logo.png")
    else:
        input_file = sys.argv[1]
        convert_to_ico(input_file)
