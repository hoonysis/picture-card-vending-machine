# 그림카드 자판기 — Troubleshooting Log

> 최종 업데이트: 2026-03-29

---

## [TS-001] server.py Blueprint 전환 후 로컬 자판기 접속 안 됨

- **날짜**: 2026-03-29
- **증상**: 런처(0_통합런처.bat)로 자판기 실행 시 "여기는 자판기 서버페이지 입니다" 안내 화면만 표시. 관리자 페이지는 정상.
- **원인**: `local_server.py`가 `server.app.view_functions['serve_index']`를 오버라이드하는데, Blueprint 전환 후 엔드포인트 이름이 `'static_bp.serve_index'`로 변경되어 오버라이드가 적용 안 됨.
- **수정**: `local_server.py:24` — `'serve_index'` → `'static_bp.serve_index'`
- **교훈**: Flask Blueprint 전환 시 `view_functions` 키가 `{blueprint_name}.{function_name}` 형식으로 바뀐다. monkey-patch 방식으로 라우트를 오버라이드하는 코드가 있으면 같이 업데이트해야 함.
- **관련 파일**: `local_server.py`, `routes/static.py`
