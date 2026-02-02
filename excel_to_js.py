import pandas as pd
import json
import os

# 파일 경로 설정
EXCEL_FILE = 'word.xlsx'
JS_FILE = 'data.js'

def main():
    print(f"'{EXCEL_FILE}' 파일을 읽어서 변환을 시작합니다...")

    if not os.path.exists(EXCEL_FILE):
        print(f"오류: '{EXCEL_FILE}' 파일이 없습니다. 파일이 있는지 확인해주세요.")
        return

    try:
        # 엑셀 파일 읽기 (NaN 값은 빈 문자열로 처리)
        df = pd.read_excel(EXCEL_FILE).fillna('')
        
        # 데이터프레임을 딕셔너리 리스트로 변환
        data_list = df.to_dict(orient='records')
        
        # JS 파일 내용 생성
        js_content = f"// 자동 생성된 파일입니다. (created by excel_to_js.py)\n"
        js_content += f"// 수정하지 마세요. 엑셀 파일을 수정하고 변환기를 실행하세요.\n\n"
        js_content += f"const soundData = {json.dumps(data_list, ensure_ascii=False, indent=4)};"

        # JS 파일 쓰기
        with open(JS_FILE, 'w', encoding='utf-8') as f:
            f.write(js_content)
            
        print(f"변환 성공! '{JS_FILE}' 파일이 업데이트 되었습니다.")
        print(f"총 {len(data_list)}개의 카드가 저장되었습니다.")

    except Exception as e:
        print(f"변환 중 오류가 발생했습니다: {e}")

if __name__ == "__main__":
    main()
