import pandas as pd

# 샘플 데이터 (초기 엑셀 파일 생성용)
data = [
    {"folder": "01_giyok", "main": "ㄱ", "sub": "initial", "name": "가방", "image": "g_01_bag.png"},
    {"folder": "01_giyok", "main": "ㄱ", "sub": "initial", "name": "가위", "image": "g_02_scissors.png"},
    {"folder": "01_giyok", "main": "ㄱ", "sub": "medial", "name": "아기", "image": "g_03_baby.png"},
    {"folder": "01_giyok", "main": "ㄱ", "sub": "medial", "name": "고기", "image": "g_04_meat.png"},
    {"folder": "01_giyok", "main": "ㄱ", "sub": "final", "name": "국", "image": "g_05_soup.png"},
    {"folder": "01_giyok", "main": "ㄱ", "sub": "final", "name": "수박", "image": "g_06_watermelon.png"},
    {"folder": "02_nieun", "main": "ㄴ", "sub": "initial", "name": "나비", "image": "n_01_butterfly.png"},
    {"folder": "02_nieun", "main": "ㄴ", "sub": "initial", "name": "나무", "image": "n_02_tree.png"},
    {"folder": "02_nieun", "main": "ㄴ", "sub": "medial", "name": "바나나", "image": "n_03_banana.png"},
    {"folder": "02_nieun", "main": "ㄴ", "sub": "final", "name": "눈", "image": "n_04_eye.png"},
    {"folder": "02_nieun", "main": "ㄴ", "sub": "final", "name": "신발", "image": "n_05_shoes.png"},
    {"folder": "03_siot", "main": "ㅅ", "sub": "initial", "name": "사자", "image": "s_01_lion.png"},
    {"folder": "03_siot", "main": "ㅅ", "sub": "medial", "name": "우산", "image": "s_02_umbrella.png"},
]

df = pd.DataFrame(data)
df.to_excel("card_data.xlsx", index=False)
print("card_data.xlsx 파일이 생성되었습니다.")
