> 최초 작성: 2026-03-07 | 최종 수정: 2026-03-29 (R3 완료) | 작성자: Claude

# 그림카드 자판기 — 코드베이스 현황 분석

---

## 1. 프로젝트 개요

- **목적**: 언어치료사/교사용 그림카드 선택 및 인쇄 도구
- **두 가지 모드**:
  - 📚 **언어 자판기**: 언어 범주(사람/신체, 음식, 생활/사물 등 6개 테마) 기반 카드 탐색
  - 🗣️ **조음 자판기**: 목표 음소(ㅂ, ㄷ, ㄱ... 등) + 위치(어두초성/어중/어말) 기반 카드 탐색
- **기술 스택**: Flask(Python) 백엔드 + 바닐라 JS 프론트엔드 + SQLite(cards.db)
- **실행 방식**: Electron PC 앱 전용 (브라우저 직접 접속 시 GATEKEEPER 차단)
- **배포**: PythonAnywhere (hangruclass.pythonanywhere.com)

---

## 2. 파일 구조 및 줄 수 현황

### ✅ 모듈화 완료 (2026-03-29)
| 파일 | 줄 수 | 상태 |
|------|--------|------|
| `server.py` | **53줄** | ✅ Blueprint 허브 (1,287줄 → 7파일 분할) |
| `routes/auth.py` | 73줄 | 로그인/인증 데코레이터 |
| `routes/static.py` | 116줄 | 정적 파일 서빙 |
| `routes/cards.py` | 320줄 | 카드 CRUD + 음소 분석 |
| `routes/upload.py` | 179줄 | 어드민 카드 업로드 |
| `routes/user.py` | 198줄 | 유저/프리셋/게스트 업로드 |
| `routes/admin.py` | 287줄 | 동기화/백업/경로수정 |

### 📊 정적 데이터 (분할 대상 아님)
| 파일 | 줄 수 | 상태 |
|------|--------|------|
| `data.js` | **42,275줄** | ✅ 정적 데이터 파일 |

### ✅ 모듈화 완료 — JS (2026-03-29)
| 파일 | 줄 수 | 상태 |
|------|--------|------|
| `js/logic_upload.js` | **83줄** | ✅ 진입점 허브 (833줄 → 4파일 분할) |
| `js/upload/analyze.js` | 248줄 | analyzeName, deconjugate, 제안 UI |
| `js/upload/interceptor.js` | 202줄 | 릴레이 큐, 리네임 인터셉터 모달 |
| `js/upload/submit.js` | 170줄 | uploadCard (POST /api/upload) |

### 🟡 700~999줄 (경고 구간)
| 파일 | 줄 수 | 역할 |
|------|--------|------|
| `js/logic_core.js` | **951줄** | 핵심 로직 (필터/렌더/사이드바/검색) — ⚠️ 미완성 리팩토링 |
| `js/admin/admin_ui.js` | **951줄** | 어드민 UI 전반 |
| `js/logic_preset.js` | **452줄** | 저장소(프리셋) CRUD |
| `js/logic_basket.js` | **573줄** | 인쇄 대기 목록, 멀티선택, 드래그, Undo/Redo |
| `js/logic_tutorial.js` | **500줄** | Driver.js 기반 튜토리얼 |

### ✅ 정상 범위
| 파일 | 줄 수 | 역할 |
|------|--------|------|
| `index.html` | 395줄 | 전체 앱 뼈대, 모달 HTML, JS 로드 |
| `js/logic_print.js` | 371줄 | 인쇄 레이아웃 생성 및 실행 |
| `js/logic_ui.js` | 283줄 | 컨텍스트 메뉴, 이미지 모달, 기타 UI |
| `js/logic_modal.js` | 95줄 | 커스텀 모달 컨트롤러 |
| `js/temp_gate.js` | 252줄 | 로그인 게이트 (PIN 방식) |
| `style.css` | **11줄** | ⚠️ 거의 비어있음 — 실제 스타일은 CSS 파일들에 분산 |

### js/core/ (부분 리팩토링 결과 — 2026-02-12)
| 파일 | 줄 수 | 역할 |
|------|--------|------|
| `js/core/state.js` | 21줄 | 전역 상태 선언 |
| `js/core/hangul.js` | 64줄 | 한글 분해 유틸 |
| `js/core/components.js` | 270줄 | 사이드바 생성 함수들 |
| `js/core/filter.js` | 144줄 | 위치/음절 필터 로직 |
| `js/core/search.js` | 35줄 | 검색 로직 |
| `js/core/render.js` | 192줄 | 카드 렌더링 |
| `js/core/main.js` | 138줄 | 초기화 및 모드 전환 |

### js/admin/ (어드민 전용)
| 파일 | 줄 수 | 역할 |
|------|--------|------|
| ~~`js/admin/admin_ui.js`~~ | ~~951줄~~ | 🗑️ 삭제 (2026-03-29) — `js/admin/ui/`로 분할 완료, 미사용 레거시 |
| ~~`js/admin/admin_upload.js`~~ | ~~704줄~~ | 🗑️ 삭제 (2026-03-29) — `admin.html`에서 미사용 레거시 |
| `js/admin/admin_data.js` | 131줄 | 어드민 데이터 로드/저장 |
| `js/admin/admin_api.js` | 52줄 | 어드민 API 호출 |
| `js/admin/admin_util.js` | (미확인) | 어드민 유틸 |

---

## 3. 핵심 아키텍처 이해

### 3-1. 데이터 흐름
```
[server.py] /api/cards
    → DB(cards.db) or word.xlsx 읽기
    → JSON 반환
        ↓
[logic_core.js] init()
    → fetch('/api/cards') 성공 시: window.soundData 세팅
    → 실패 시: data.js의 정적 soundData 사용 (Fallback)
        ↓
renderCards() → inventory 그리드에 카드 렌더링
```

### 3-2. 카드 데이터 구조 (soundData 항목)
```js
{
  name: "바나나",          // 카드 이름 (발음 포함 시 "감 [감]" 형식)
  image: "바나나.webp",    // 이미지 파일명
  folder: "02_ㅂ",        // 이미지 폴더 (자음 분류)
  main: "ㅂ",             // 목표 음소 (조음 모드)
  sub: "어두초성",         // 음소 위치 (조음 모드)
  language_category: "과일·채소", // 언어 범주
  part_of_speech: "명사", // 품사
  search_keywords: "바나나 banana" // 검색 보조 키워드
}
```

### 3-3. GATEKEEPER (보안)
```
브라우저 접속 시 → window.electron 체크 → 없으면 차단 모달 표시
                                            → PictureCardSetup.exe 다운로드 유도
Electron 앱 → preload.js가 contextBridge로 window.electron 주입 → 정상 진입
```

### 3-4. temp_gate.js (로그인 PIN)
- 이전 SmartGate 방식. PIN 입력으로 접근 제어.
- GATEKEEPER(Electron)과 별개로 운영되는 2중 잠금 구조.

### 3-5. 미완성 리팩토링 상황 (⚠️ 중요)
```
[현재 상태]
index.html
  → js/core/state.js     ← NEW (분리됨)
  → js/core/hangul.js    ← NEW (분리됨)
  → js/core/components.js← NEW (분리됨)
  → js/core/filter.js    ← NEW (분리됨)
  → js/core/search.js    ← NEW (분리됨)
  → js/core/render.js    ← NEW (분리됨)
  → js/core/main.js      ← NEW (분리됨)
  → js/logic_core.js     ← OLD (951줄 그대로 존재)  ← 문제!
  → js/logic_basket.js
  → ...
```
**`logic_core.js`가 리팩토링 이후에도 그대로 남아있음.** `js/core/`로 분리가 시작됐지만 `logic_core.js`가 삭제되지 않아 중복 코드 혹은 혼용 가능성 있음. 확인 필요.

---

## 4. 주요 기능별 코드 위치

| 기능 | 파일 | 핵심 함수 |
|------|------|-----------|
| 앱 초기화 | `logic_core.js:94` | `init()` |
| 카드 렌더링 | `logic_core.js:695` | `renderCards()` |
| 사이드바 생성 (조음) | `logic_core.js:465` | `createSidebar()` |
| 사이드바 생성 (언어) | `logic_core.js:313` | `createLanguageMenu()` |
| 모드 전환 | `logic_core.js:155` | `setMode()` |
| 인쇄 대기 목록 | `logic_basket.js` | `addToBasket()`, `undo()`, `redo()` |
| 선택 인쇄 | `logic_print.js` | `printSelected()` |
| 전체 인쇄 | `logic_print.js` | `printAll()` |
| 저장소(프리셋) | `logic_preset.js` | `addNewPreset()`, `loadPresets()` |
| 이미지 업로드 | `upload/submit.js` | `uploadCard()` |
| 업로드 이름 분석 | `upload/analyze.js` | `analyzeName()`, `deconjugate()` |
| 릴레이/인터셉터 | `upload/interceptor.js` | `handleRelayFiles()`, `openRenameInterceptor()` |
| 커스텀 모달 | `logic_modal.js` | `showAlert()`, `showConfirm()` |
| 튜토리얼 | `logic_tutorial.js` | Driver.js 기반 |
| 한글 검색 | `logic_core.js:24` | `getChoSeong()`, `getVowelsOnly()`, `getSmartMixed()` |
| 초성 정규화 | `logic_core.js:685` | `normalizeForSearch()` (ㅔ/ㅐ 동치) |

---

## 5. 발견된 문제점 / 기술 부채

### ✅ 해결됨

1. ~~**`server.py` 1,287줄 — 1,000줄 한계 초과**~~ → **2026-03-29 모듈화 완료** (7파일, 최대 320줄)

2. ~~**`js/logic_upload.js` 833줄 — 경고 구간**~~ → **2026-03-29 모듈화 완료** (4파일, 최대 248줄)

3. ~~**`js/logic_core.js` 리팩토링 미완성**~~ → 확인 결과 `index.html`에서 이미 제거됨. `local_index.html`만 참조 (원본 보존용)

### 🔴 Critical (미해결)

2. **`credentials.json` 루트에 공개 노출**
   - Google Sheets API 인증 파일로 추정
   - `.gitignore` 등록 여부 확인 필요 (민감한 파일)

4. **`admin.html` 비밀번호 하드코딩 (server.py)**
   - `ADMIN_PASS = '1emdgksrmfn'` 소스코드에 평문 노출
   - `.env`로 분리 필요

### 🟡 Warning (기능 있으나 주의 필요)

5. **`style.css` 11줄** — 사실상 비어있음. 실제 스타일이 어디에 있는지 확인 필요 (CSS 파일이 분산되어 있을 수 있음)

6. **`data.js` 42,275줄** — 정적 데이터 파일이므로 줄 수 자체는 문제 없으나, 서버 API 폴백으로만 쓰임. 서버 데이터와 동기화 문제 발생 가능

7. ~~**`js/admin/admin_ui.js` 951줄**~~ → **2026-03-29 삭제** — `js/admin/ui/`로 분할 완료 후 미사용 레거시 제거

### 🟢 구조적 관찰

8. ~~**`js/core/` vs `js/logic_core.js` 혼용**~~ → 확인 완료: `js/core/`가 실제 사용 중. `logic_core.js`는 `local_index.html` 전용 레거시

9. **전역 변수 다수** — `currentMode`, `currentPhoneme`, `currentTheme`, `activePositions`, `activeSyllables` 등이 전역으로 선언됨

10. **`brain_manager.py`, `sync_manager.py`** — 역할 미파악. 현재 서버 실행에 포함되는지 확인 필요

---

## 6. LocalStorage 키 구조

| 키 | 저장 내용 |
|----|-----------|
| `presets` | 저장소(프리셋) 목록 JSON |
| (기타) | temp_gate.js 관련 로그인 상태 추정 |

---

## 7. 다음 작업 시 참고사항

- ~~`logic_core.js` vs `js/core/` 정리~~ → 확인 완료 (js/core/ 사용 중)
- ~~`logic_core.js` vs `js/core/` 정리~~ → 확인 완료 (js/core/ 사용 중)
- ~~`server.py` 분할~~ → 2026-03-29 완료
- ~~`logic_upload.js` 분할~~ → 2026-03-29 완료 (4파일)
- ~~`backlog.md`, `troubleshooting.md`, `plans/` 생성~~ → 2026-03-29 완료
- **`credentials.json` 보안**: `.gitignore` 등록 여부 확인 필요
- **프론트엔드 모듈화 잔여**: `admin_ui.js`(951줄) — 레거시, 실사용 없음. 필요시 분할.
- **`local_server.py` 주의**: Blueprint 전환 시 `view_functions` 키가 바뀜 (TS-001 참조)
