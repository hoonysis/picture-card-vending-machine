# 그림카드 자판기 — Backlog

> 최종 업데이트: 2026-03-29 (R5 완료 — 모듈화 전체 완료)

---

## 완료된 작업

### [R0] logic_core.js 정리
- **상태**: ✅ 완료 (확인만 — 제거 불필요)
- **내용**: `index.html`에서 이미 제거됨. `local_index.html`만 참조. 원본 보존용으로 유지.

### [R1] server.py 모듈화 (2026-03-29)
- **상태**: ✅ 완료
- **내용**: 1,287줄 → 7개 파일(최대 320줄)로 분할. Flask Blueprint 구조.
- **산출물**: `routes/auth.py`, `static.py`, `cards.py`, `upload.py`, `user.py`, `admin.py`
- **버그 12개 동시 수정** (B1~B12): check_auth 미정의, get_user_dir 미정의, 죽은 코드, 래퍼 함수 정리, save_data 이중 호출 등
- **추가 수정**: `local_server.py` Blueprint 엔드포인트 키 변경 (`serve_index` → `static_bp.serve_index`)
- **상세 계획**: `plans/server_modularization.md`

### [R3] logic_upload.js 분할 (2026-03-29)
- **상태**: ✅ 완료
- **내용**: 833줄 → 4개 파일(최대 248줄)로 분할.
- **산출물**:
  - `js/logic_upload.js` (83줄) — 진입점: 상태변수, 초기화
  - `js/upload/analyze.js` (248줄) — analyzeName, deconjugate, 제안 UI
  - `js/upload/interceptor.js` (202줄) — 릴레이 큐, 리네임 인터셉터 모달
  - `js/upload/submit.js` (170줄) — uploadCard (POST /api/upload)
- **백업**: `backups/before_upload_split/logic_upload.js`
- **상세 계획**: `plans/upload_modularization.md`

---

## 이미 완료 확인 (레거시 원본만 남은 상태)

### [R2] admin_ui.js (951줄)
- **상태**: ✅ 완료 + 🗑️ 레거시 삭제 (2026-03-29)
- **내용**: `js/admin/ui/` 6개 파일로 분할 완료됨 (2026-02-12). 미사용 원본 `admin_ui.js` 삭제.

### [R4] admin_upload.js (704줄)
- **상태**: ✅ 완료 + 🗑️ 레거시 삭제 (2026-03-29)
- **내용**: `admin.html`에서 미사용. 레거시 원본 `admin_upload.js` 삭제.

---

## 대기 중 작업

### [R5] 최종 점검 (2026-03-29)
- **상태**: ✅ 완료
- **내용**: 전체 줄 수 재집계 완료 (1,000줄 초과 파일 0개), 레거시 `admin_ui.js`/`admin_upload.js` 삭제, `research.md` 최종 업데이트, git 커밋 체계 전환

---

## 기술 부채

| # | 항목 | 심각도 | 비고 |
|---|------|--------|------|
| 1 | `ADMIN_PASS` 하드코딩 | 🟡 | `.env` 분리 필요 |
| 2 | `credentials.json` 루트 노출 | 🟡 | `.gitignore` 확인 |
| 3 | `brain_manager.py` 역할 불명 | 🟢 | 사용 여부 확인 필요 |
| 4 | `local_index.html` + `logic_core.js` 레거시 | 🟢 | 원본 보존용, 필요시 `js/core/` 전환 |
| 5 | `data.js` 42,275줄 서버 폴백 | 🟢 | 동기화 문제 가능성 |
| 6 | 전역 변수 다수 (프론트엔드) | 🟢 | 프론트 모듈화 시 정리 |
