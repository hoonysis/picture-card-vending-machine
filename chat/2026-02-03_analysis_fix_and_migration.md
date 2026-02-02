# 2026-02-03 작업 요약: 서버 언어 분석 복구 및 데이터 대이동

## 1. 작업 개요
*   **목표**: 관리자 페이지에서 '언어 자동 분석' 기능이 작동하지 않는 문제 해결.
*   **결과**: 로컬 및 서버 정상 작동 확인 완료.
*   **주요 성과**:
    1.  `server.py`의 엑셀 인덱싱 오류 수정 (0-based Indexing).
    2.  서버 데이터(`user_images` 등)가 새 폴더로 이관되지 않은 문제 발견 및 해결.
    3.  서버 진단 키트(`/api/debug/status`) 도입.

## 2. 문제 원인 및 해결 (Detailed Log)

### A. 엑셀 인덱스 불일치 (Code Issue)
*   **증상**: `load_reference_dict`가 단어를 찾지 못하거나 엉뚱한 값을 가져옴.
*   **대화명**: "엑셀 칸을 한 칸 옆으로 읽고 있었음."
*   **원인**: `pd.read_excel` 사용 시 `header` 옵션과 인덱스 접근(`iloc`)이 `reference_words.xlsx`의 실제 구조(Col 0=Word)와 달랐음.
*   **해결**:
    *   `server.py` 수정: `row.iloc[1]` -> `row.iloc[0]` (단어 컬럼 인덱스 변경).
    *   `unicodedata.normalize('NFC')` 적용으로 한글 자소 분리 방지.

### B. 서버 데이터 누락 (Infra Issue)
*   **증상**: 코드(`picture-card-vending-machine`)는 최신인데 서버에서 'Coming Soon'이 뜨거나 분석이 안 됨.
*   **원인**:
    1.  Web 탭 설정이 구 폴더(`vending_machine`)를 보고 있었음.
    2.  새 폴더(`picture-...`)에는 `.gitignore` 된 데이터 파일(`word.xlsx`, `user_images/`)이 없었음.
*   **해결 (서버 이사 프로토콜)**:
    1.  **데이터 복사**: `cp -r vending_machine/* picture-card-vending-machine/`
    2.  **코드 원복**: `git reset --hard origin/main` (복사 중 덮어쓴 코드를 복구)
    3.  **경로 수정**: PythonAnywhere Web 탭에서 Source code 경로 변경.

## 3. 새로 추가된 기능
*   **`/api/debug/status`**: 서버 내부 상태(파일 존재 유무, 캐시 크기, Pandas 버전 등)를 JSON으로 반환하는 진단용 엔드포인트.
*   **진단 스크립트**: `check_analysis_logic.py`, `inspect_excel_raw.py` (사용 후 삭제됨).

## 4. 교훈 (Lessons Learned) -> AI_GUIDE.md 반영됨
*   **엑셀은 0번부터**: `iloc[0]`이 국룰이다.
*   **폴더 이사는 신중하게**: `cp`로 데이터를 옮기고, `git reset`으로 코드를 지켜라.
*   **로그보다 진단 키트**: `Error Log` 뒤지는 것보다 `debug_status` 한 번 호출하는 게 빠르다.
