import pandas as pd

# 다양한 카테고리의 샘플 데이터
data = [
    {"folder": "00_vowel", "main": "ㅇ(모음)", "sub": "어두초성", "name": "우유", "image": "milk.png"},
    {"folder": "00_vowel", "main": "ㅇ(모음)", "sub": "어두초성", "name": "아이스크림", "image": "icecream.png"},
    
    {"folder": "01_bieup", "main": "ㅂ", "sub": "어두초성", "name": "바나나", "image": "banana.png"},
    {"folder": "01_bieup", "main": "ㅂ", "sub": "어중초성", "name": "나비", "image": "butterfly.png"},
    
    {"folder": "05_digit", "main": "ㄷ", "sub": "어두초성", "name": "다람쥐", "image": "squirrel.png"},
    
    {"folder": "09_siot", "main": "ㅅ", "sub": "어두초성", "name": "사자", "image": "lion.png"},
    
    {"folder": "15_giyok", "main": "ㄱ", "sub": "어두초성", "name": "가방", "image": "bag.png"},
    {"folder": "15_giyok", "main": "ㄱ", "sub": "어중종성", "name": "수박", "image": "watermelon.png"},
    
    {"folder": "19_hieut", "main": "ㅎ", "sub": "어두초성", "name": "하마", "image": "hippo.png"},
]

print("word.xlsx 파일에 샘플 데이터를 씁니다...")
df = pd.DataFrame(data)
df.to_excel("word.xlsx", index=False)
print("완료!")
