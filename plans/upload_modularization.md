# Round 3: logic_upload.js 분할 계획

> 작성: 2026-03-29 | 상태: ✅ **완료 (2026-03-29)**

---

## 현황

- `js/logic_upload.js` **833줄** — 경고 구간
- `admin.html`, `index.html` 양쪽에서 로드
- `index.html`에서는 `initUpload()`만 호출하나, 실질적으로 admin 전용 기능 (drop-zone 없음)
- `handleFileImport` 죽은 참조 발견 (`index.html:163`에서 호출하지만 어디에도 정의 안 됨)

---

## 함수 맵 (833줄 전체)

| 줄 범위 | 함수 | 줄 수 | 그룹 |
|----------|------|-------|------|
| 6~10 | 상태 변수 (uploadQueue 등) | 5 | 공통 상태 |
| 13~51 | `deconjugate()` | 39 | 분석 헬퍼 |
| 54~61 | `showLoading/hideLoading` | 8 | UI 헬퍼 |
| 64~81 | `handleRelayFiles()` | 18 | 릴레이 큐 |
| 83~106 | `processNextInQueue()` | 24 | 릴레이 큐 |
| 109~129 | `resetUploadForm()` | 21 | 릴레이 큐 |
| 135~325 | `analyzeName()` | **190** | 분석 로직 (가장 큼) |
| 329~401 | `openRenameInterceptor()` | 73 | 인터셉터 모달 |
| 404~416 | `closeInterceptorModal()` | 13 | 인터셉터 모달 |
| 418~498 | `confirmInterceptorName()` | 81 | 인터셉터 모달 |
| 502~673 | `uploadCard()` | **172** | 업로드 실행 |
| 677~694 | `renderSuggestions()` | 18 | 제안 UI |
| 696~712 | `addManualRow()` | 17 | 제안 UI |
| 714~751 | `createRow()` | 38 | 제안 UI |
| 754~758 | `handleFileSelect()` | 5 | 초기화 |
| 760~770 | window exports (1차) | 11 | exports |
| 772~828 | `initUpload()` | 57 | 초기화 |
| 829~833 | window exports (2차) + 디버그 | 5 | exports |

---

## 분할 구조

```
js/
  ├── logic_upload.js          (~60줄)  진입점: 상태변수, 초기화, exports 허브
  ├── upload/
  │   ├── analyze.js           (~240줄) analyzeName + deconjugate + renderSuggestions + createRow + addManualRow
  │   ├── interceptor.js       (~180줄) 릴레이 큐 + 인터셉터 모달 (openRenameInterceptor, confirm, close, handleRelayFiles, processNextInQueue, resetUploadForm)
  │   └── submit.js            (~180줄) uploadCard (메인 업로드 실행)
```

### 그룹핑 근거

1. **`analyze.js`** (~240줄): 분석 관련 전부 묶음
   - `deconjugate()` — analyzeName 내부에서만 사용
   - `analyzeName()` — 핵심 분석 함수
   - `renderSuggestions()`, `addManualRow()`, `createRow()` — 분석 결과 UI
   - 독립적: 다른 그룹을 호출하지 않음

2. **`interceptor.js`** (~180줄): 파일 드래그앤드롭 + 이름 변경 모달
   - `handleRelayFiles()`, `processNextInQueue()`, `resetUploadForm()` — 큐 관리
   - `openRenameInterceptor()`, `confirmInterceptorName()`, `closeInterceptorModal()` — 모달
   - 의존성: `analyzeName()` 호출 (window 스코프로 접근)

3. **`submit.js`** (~180줄): 업로드 실행
   - `uploadCard()` — 검증 → FormData 구성 → POST → 후처리
   - 의존성: `processNextInQueue()` 호출 (window 스코프로 접근)

4. **`logic_upload.js`** (~60줄): 진입점
   - 상태 변수 선언 (`uploadQueue`, `isRelayMode`, `interceptedFile`, `isRenaming`)
   - `showLoading/hideLoading` (여러 파일에서 사용)
   - `initUpload()` — drop zone 바인딩
   - `handleFileSelect()` — file input 글루
   - 모든 window export 한 곳에서 관리

---

## 의존성 그래프

```
logic_upload.js (상태 + 초기화)
  ├── upload/analyze.js (analyzeName, deconjugate, suggestions)
  │     ↑ 독립 (window.showLoading만 사용)
  ├── upload/interceptor.js (릴레이 큐 + 모달)
  │     → window.analyzeName 호출
  │     → window.showAlert 호출 (admin_ui에서 제공)
  │     → window.loadCards 호출 (admin_data에서 제공)
  ├── upload/submit.js (uploadCard)
  │     → window.processNextInQueue 호출
  │     → window.showAlert 호출
  │     → window.loadCards 호출
  └── 모두 window 스코프로 통신 (기존 패턴 유지)
```

---

## admin.html 스크립트 태그 변경

**Before:**
```html
<script src="js/logic_upload.js?v=20260201_1615"></script>
```

**After:**
```html
<script src="js/upload/analyze.js"></script>
<script src="js/upload/interceptor.js"></script>
<script src="js/upload/submit.js"></script>
<script src="js/logic_upload.js?v=7"></script>
```

순서: logic_upload (상태 선언 먼저!) → analyze → interceptor → submit

---

## index.html 변경

`index.html`에서 `logic_upload.js`는 `initUpload()`만 호출.
`initUpload()`가 `logic_upload.js`에 남으므로 **변경 불필요**.
단, 분할된 파일도 로드해야 `handleRelayFiles` 등이 정의됨:

```html
<script src="js/upload/analyze.js"></script>
<script src="js/upload/interceptor.js"></script>
<script src="js/upload/submit.js"></script>
<script src="js/logic_upload.js?v=7"></script>
```

또는 `index.html`에서 이 기능이 실제로 필요 없다면, `logic_upload.js`만 로드하고 나머지는 admin 전용으로 둘 수 있음. (`initUpload()`가 drop-zone 못 찾으면 그냥 return하므로 에러 안 남)

→ **안전한 선택: 양쪽 다 4개 파일 로드**

---

## 같이 수정할 버그

| # | 내용 |
|---|------|
| B1 | `handleFileImport` 죽은 참조 (`index.html:163`) — 제거 또는 정의 |
| B2 | `showLoading/hideLoading` 중복 정의 (admin_ui/common.js에도 있음) — logic_upload.js 버전 유지, 충돌 확인 |
| B3 | 중복 주석 `// --- Analysis Logic ---` 2번 (132~133줄) — 정리 |
| B4 | window exports 2군데 중복 (760~770, 829~833) — 한 곳으로 통합 |

---

## 검증 체크리스트

- [ ] `admin.html` 어드민 페이지 정상 로드
- [ ] 파일 드래그앤드롭 → 인터셉터 모달 → 이름 입력 → 분석 → 업로드 전체 플로우
- [ ] 릴레이 모드 (여러 파일 연속 업로드)
- [ ] `index.html` 에러 없이 로드 (콘솔 체크)
- [ ] F3 (분석), F4 (업로드/확인) 단축키 동작

---

---

# 소넷 받아쓰기용 완성 코드

## 실행 순서

```
Step 0  백업
Step 1  js/upload/ 폴더 생성
Step 2  js/upload/analyze.js 생성
Step 3  js/upload/interceptor.js 생성
Step 4  js/upload/submit.js 생성
Step 5  js/logic_upload.js 교체 (진입점만 남김)
Step 6  admin.html 스크립트 태그 수정
Step 7  index.html 스크립트 태그 수정
Step 8  검증
```

---

## Step 0: 백업

```bash
mkdir -p backups/before_upload_split
cp js/logic_upload.js backups/before_upload_split/logic_upload.js
```

---

## Step 1: `js/upload/` 폴더 생성

```bash
mkdir -p js/upload
```

---

## Step 2: `js/upload/analyze.js`

```javascript
// ============================================
// Upload - Analysis & Suggestions
// ============================================

// --- Dictionary Form Converter (Heuristic) ---
function deconjugate(name) {
    if (!name) return "";
    name = name.trim();

    if (name.endsWith('요')) {
        const stem = name.slice(0, -1);
        if (stem.endsWith('해')) return stem.slice(0, -1) + '하다';
        if (stem.endsWith('워')) return stem.slice(0, -1) + 'ㅂ다';
        if (stem.endsWith('어')) return stem.slice(0, -1) + '다';
        if (stem.endsWith('아')) return stem.slice(0, -1) + '다';
        return stem + '다';
    }

    return "";
}

// --- Analysis Logic ---
async function analyzeName(name) {
    if (window.isGlobalProcessing) return;
    window.isGlobalProcessing = true;
    console.log("🔍 analyzeName Called with:", name);

    if (!name) {
        const input = document.getElementById('input-name');
        if (input) name = input.value;
    }
    console.log("🔍 Processing Name:", name);

    if (!name) { window.isGlobalProcessing = false; return; }
    const analysisName = name.trim();
    if (!analysisName) { window.isGlobalProcessing = false; return; }

    const inputPron = document.getElementById('input-pronunciation');
    const manualPron = inputPron ? inputPron.value.trim() : "";

    showLoading();

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: analysisName,
                pronunciation: manualPron
            })
        });
        const data = await response.json();
        console.log("🔍 Server Response for '" + analysisName + "':", data);

        // 1. Auto-Check Language Category
        const ref = data.reference || data.category_ref;
        if (ref) {
            const normalize = (str) => {
                if (!str) return "";
                return str.replace(/[\s\(\)\/·,.]/g, '');
            };

            const targetMain = normalize(ref.main);
            const targetSub = normalize(ref.sub);

            const allRadios = document.querySelectorAll('input[name="language_selection"]');
            let radio = null;

            for (const r of allRadios) {
                const rMain = normalize(r.dataset.theme || r.value.split('|')[0]);
                const rSub = normalize(r.dataset.sub || r.value.split('|')[1]);

                if (targetMain.includes(rMain) || rMain.includes(targetMain)) {
                    if (targetSub === rSub) { radio = r; break; }
                    if (targetSub.startsWith(rSub) || rSub.startsWith(targetSub)) { radio = r; break; }
                }
            }

            if (radio) {
                radio.checked = true;
                const wrapper = radio.closest('label') || radio.parentElement;
                if (wrapper) {
                    wrapper.style.backgroundColor = '#fff9c4';
                    wrapper.style.transition = 'background-color 0.5s';
                    setTimeout(() => wrapper.style.backgroundColor = '', 2000);
                }
                if (radio.onchange) radio.onchange();

                const suggArea = document.getElementById('suggestion-area');
                if (suggArea) {
                    const oldFb = document.getElementById('analysis-feedback');
                    if (oldFb) oldFb.remove();

                    const feedback = document.createElement('div');
                    feedback.id = 'analysis-feedback';
                    feedback.innerHTML = `✨ 자동 분류 성공: <b>${ref.main} > ${ref.sub}</b>`;
                    feedback.style.cssText = "background:#4CAF50; color:white; padding:8px; border-radius:4px; margin-bottom: 10px; text-align: center; animation: fadeIn 0.5s; font-size:0.9rem;";
                    suggArea.prepend(feedback);
                }
            } else {
                console.warn(`[WARN] Server returned category [${ref.main}|${ref.sub}] but no UI match found.`);
                const suggArea = document.getElementById('suggestion-area');
                if (suggArea) {
                    const feedback = document.createElement('div');
                    feedback.innerHTML = `⚠️ 분류 실패: <b>${ref.main} > ${ref.sub}</b> (목록에 없음)`;
                    feedback.style.cssText = "background:#ff9800; color:white; padding:8px; border-radius:4px; margin-bottom: 10px; text-align: center; font-size:0.9rem;";
                    suggArea.prepend(feedback);
                }
            }
        }

        // 2. Populate Search Tags
        const tag1Input = document.getElementById('input-tag1');
        const tag2Input = document.getElementById('input-tag2');
        const tag3Input = document.getElementById('input-tag3');

        if (tag1Input && tag2Input && tag3Input) {
            let tags = [];
            let foundSheetTags = false;

            if (ref && (ref.tag1 || ref.tag2 || ref.tag3)) {
                tags = [ref.tag1, ref.tag2, ref.tag3];
                foundSheetTags = true;
            } else if (ref && ref.search_keywords) {
                tags = ref.search_keywords.split(',').map(s => s.trim());
                foundSheetTags = true;
            }

            if (foundSheetTags) {
                tag1Input.value = tags[0] || "";
                tag2Input.value = tags[1] || "";
                tag3Input.value = tags[2] || "";
            }

            if (!tag1Input.value) {
                const autoBase = deconjugate(analysisName);
                if (autoBase) tag1Input.value = autoBase;
            }
        }

        // 3. Update Display Name
        const finalPron = (data && data.pronunciation) ? `[${data.pronunciation}]` : "";
        const dispInput = document.getElementById('input-display-name');

        if (dispInput) {
            let currentVal = dispInput.value.trim();
            if (!currentVal) currentVal = analysisName;
            if (currentVal.includes('[')) {
                currentVal = currentVal.replace(/\[.*?\]/, '').trim();
            }
            dispInput.value = finalPron ? `${currentVal} ${finalPron}` : currentVal;

            const pronInput = document.getElementById('input-pronunciation');
            if (pronInput && data.pronunciation) {
                pronInput.value = data.pronunciation;
            }
        }

        // 4. Render Suggestions
        if (data && data.suggestions) {
            renderSuggestions(data.suggestions);
        }

    } catch (e) {
        console.error("Analysis failed", e);
        showAlert("분석 중 오류가 발생했습니다: " + e.message);
    } finally {
        hideLoading();
        window.isGlobalProcessing = false;
    }
}


// --- Suggestion UI ---
function renderSuggestions(suggestions) {
    const area = document.getElementById('suggestion-area');
    if (!area) return;
    area.innerHTML = '';

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '5px';
    container.id = 'sugg-container';

    suggestions.forEach((item) => {
        const row = createRow(item.main, item.sub, item.desc);
        container.appendChild(row);
    });

    area.appendChild(container);
}

function addManualRow() {
    let container = document.getElementById('sugg-container');
    if (!container) {
        const area = document.getElementById('suggestion-area');
        area.innerHTML = '';
        container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '5px';
        container.id = 'sugg-container';
        area.appendChild(container);
    }
    if (typeof PHONEMES !== 'undefined' && typeof POSITIONS !== 'undefined') {
        container.appendChild(createRow(PHONEMES[0], POSITIONS[0], '직접 추가'));
    }
}

function createRow(main, sub, desc) {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '5px';
    div.style.padding = '5px';
    div.style.background = '#f9f9f9';
    div.style.borderRadius = '4px';
    div.className = 'sugg-row';

    const pOptions = window.getPhonemeOptions ? window.getPhonemeOptions(main) : '';
    const posOptions = window.getPosOptions ? window.getPosOptions(sub) : '';

    div.innerHTML = `
<input type="checkbox" class="sugg-check" checked>
<select class="sugg-main" style="width: auto; padding: 5px; flex:1;">${pOptions}</select>
<select class="sugg-sub" style="width: auto; padding: 5px; flex:1;">${posOptions}</select>
<span style="color:#999; font-size:0.8rem; flex:1;">${desc || ''}</span>
`;

    const mainSelect = div.querySelector('.sugg-main');
    const subSelect = div.querySelector('.sugg-sub');

    const updateSubVisibility = () => {
        subSelect.style.display = mainSelect.value === 'ㅇ(모음)' ? 'none' : 'inline-block';
    };

    mainSelect.onchange = updateSubVisibility;
    updateSubVisibility();

    return div;
}

// --- Exports ---
window.analyzeName = analyzeName;
window.deconjugate = deconjugate;
window.renderSuggestions = renderSuggestions;
window.addManualRow = addManualRow;
```

---

## Step 3: `js/upload/interceptor.js`

```javascript
// ============================================
// Upload - Relay Queue & Rename Interceptor
// ============================================

// --- Drag & Drop Handlers (Relay) ---
async function handleRelayFiles(fileList) {
    if (fileList.length === 0) return;

    const files = Array.from(fileList);
    isRelayMode = true;
    const initialLength = uploadQueue.length;
    uploadQueue.push(...files);

    if (initialLength === 0) {
        processNextInQueue();
    } else {
        showAlert(`목록에 ${files.length}장이 추가되었습니다.\n(현재 대기열: ${uploadQueue.length}장)`);
    }
}

function processNextInQueue() {
    window.isGlobalProcessing = false;

    if (uploadQueue.length === 0) {
        isRelayMode = false;
        showAlert("✅ 모든 릴레이 업로드가 완료되었습니다!");
        if (window.loadCards) window.loadCards();
        return;
    }

    const file = uploadQueue.shift();
    resetUploadForm();

    const container = new DataTransfer();
    container.items.add(file);
    document.getElementById('file-input').files = container.files;

    openRenameInterceptor(file, uploadQueue.length);
}

function resetUploadForm() {
    const ids = ['input-name', 'input-display-name', 'input-pronunciation', 'sr-input'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const radios = document.querySelectorAll('input[name="language_selection"]');
    radios.forEach(r => r.checked = false);

    const container = document.getElementById('sugg-container');
    if (container) container.innerHTML = '';
}


// --- Interceptor Modal ---
function openRenameInterceptor(file, remainingCount = 0) {
    interceptedFile = file;
    isRenaming = true;

    const srContainer = document.getElementById('smart-rename-container');
    const srOriginal = document.getElementById('sr-original');
    const srCount = document.getElementById('sr-count');
    const srBadge = document.getElementById('main-remain-badge');
    const srInput = document.getElementById('sr-input');

    if (srOriginal) srOriginal.textContent = file.name;

    if (srCount) {
        if (remainingCount > 0) {
            srCount.textContent = `(남은 작업: ${remainingCount}장)`;
            srCount.style.display = 'inline';
        } else {
            srCount.style.display = 'none';
        }
    }

    if (srBadge) {
        if (remainingCount > 0) {
            srBadge.textContent = `(${remainingCount}장 남음)`;
            srBadge.style.display = 'inline';
        } else {
            srBadge.style.display = 'none';
        }
    }

    const originalName = file.name;
    let cleanName = originalName.substring(0, originalName.lastIndexOf('.'));
    if (/ \(\d+\)$/.test(cleanName)) {
        cleanName = cleanName.replace(/ \(\d+\)$/, '');
    }

    if (srInput) srInput.value = cleanName;

    const reader = new FileReader();
    reader.onload = (e) => {
        const mainPreview = document.getElementById('preview');
        if (mainPreview) {
            mainPreview.src = e.target.result;
            mainPreview.style.display = 'block';
        }
        const popupPreview = document.getElementById('interceptor-preview');
        if (popupPreview) popupPreview.src = e.target.result;
    };
    reader.readAsDataURL(file);

    if (srContainer) srContainer.style.display = 'block';

    confirmInterceptorName(true);

    if (srInput) {
        srInput.focus();
        srInput.select();
        isRenaming = false;
    }
}

function closeInterceptorModal() {
    const srContainer = document.getElementById('rename-interceptor-modal');
    if (srContainer) srContainer.style.display = 'none';
    isRenaming = false;
    interceptedFile = null;
    document.getElementById('file-input').value = '';

    if (isRelayMode) {
        uploadQueue = [];
        isRelayMode = false;
        showAlert("업로드가 취소되었습니다.");
    }
}

function confirmInterceptorName(skipFocus = false) {
    const input = document.getElementById('sr-input');
    if (!input) return;

    const confirmBtn = document.querySelector('#rename-interceptor-modal .btn-primary');
    if (confirmBtn && confirmBtn.disabled) return;

    const newName = input.value.trim();
    if (!newName) {
        showAlert("이름을 입력해주세요.");
        return;
    }
    if (!interceptedFile) return;

    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.style.backgroundColor = '#ccc';
        confirmBtn.style.cursor = 'not-allowed';
        const originalText = confirmBtn.innerText;
        confirmBtn.innerText = '처리 중...';

        setTimeout(() => {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.style.backgroundColor = '';
                confirmBtn.style.cursor = 'pointer';
                confirmBtn.innerText = originalText;
            }
        }, 1500);
    }

    const hiddenName = document.getElementById('input-name');
    if (hiddenName) hiddenName.value = newName;

    const displayName = document.getElementById('input-display-name');
    if (displayName) displayName.value = newName;

    if (typeof analyzeName === 'function') {
        analyzeName(newName);
    }

    if (interceptedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const mainPreview = document.getElementById('preview');
            if (mainPreview) {
                mainPreview.src = e.target.result;
                mainPreview.style.display = 'block';
            }
        };
        reader.readAsDataURL(interceptedFile);
    }

    isRenaming = false;

    if (!skipFocus) {
        const saveBtn = document.getElementById('btn-upload-save');
        if (saveBtn) saveBtn.focus();
        else {
            const mainSave = document.querySelector('.btn-primary[onclick*="uploadCard"]');
            if (mainSave) mainSave.focus();
        }
    }
}

// --- Exports ---
window.handleRelayFiles = handleRelayFiles;
window.processNextInQueue = processNextInQueue;
window.openRenameInterceptor = openRenameInterceptor;
window.closeInterceptorModal = closeInterceptorModal;
window.confirmInterceptorName = confirmInterceptorName;
```

---

## Step 4: `js/upload/submit.js`

```javascript
// ============================================
// Upload - Card Submit (POST /api/upload)
// ============================================

async function uploadCard(isConfirmed = false) {
    if (window.isGlobalProcessing) return;

    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (!file) return showAlert("이미지를 선택해주세요.");

    const analysisName = document.getElementById('input-name').value;
    let displayName = document.getElementById('input-display-name').value;

    if (!analysisName) return showAlert("단어 이름을 입력해주세요.");
    if (!displayName) displayName = analysisName;

    // Language Data
    const selectedLang = document.querySelector('input[name="language_selection"]:checked');
    if (!selectedLang) {
        return showAlert("⚠️ 언어 범주 선택 필수\n\n오른쪽 '언어 분류 선택' 영역에서\n단어에 맞는 카테고리를 반드시 체크해야 합니다.");
    }

    const posVal = selectedLang.dataset.theme;
    const catVal = selectedLang.dataset.sub;
    const pronVal = document.getElementById('input-pronunciation').value;

    const rows = document.querySelectorAll('.sugg-row');
    const registrations = [];

    rows.forEach(row => {
        const checkbox = row.querySelector('.sugg-check');
        if (checkbox && checkbox.checked) {
            const mainVal = row.querySelector('.sugg-main').value;
            let subVal = row.querySelector('.sugg-sub').value;
            if (mainVal === 'ㅇ(모음)') subVal = '';

            registrations.push({
                main: mainVal,
                sub: subVal,
                part_of_speech: posVal,
                language_category: catVal,
                pronunciation: pronVal,
                search_keywords: [
                    document.getElementById('input-tag1') ? document.getElementById('input-tag1').value.trim() : "",
                    document.getElementById('input-tag2') ? document.getElementById('input-tag2').value.trim() : "",
                    document.getElementById('input-tag3') ? document.getElementById('input-tag3').value.trim() : ""
                ].filter(Boolean).join(',')
            });
        }
    });

    if (registrations.length === 0) {
        return showAlert("⚠️ 조음 분석 정보 필수\n\n좌측 '조음 분석' 영역에서 분석을 실행하거나,\n[+ 직접 추가하기]를 통해 음소 정보를 입력해야 합니다.");
    }

    // Validation Passed: NOW set the lock
    window.isGlobalProcessing = true;

    const formData = new FormData();

    // Prevent Double Click
    const saveAllBtn = document.querySelector('.btn-save-all') || document.querySelector('button[onclick*="uploadCard"]');
    let originalBtnText = "";

    if (saveAllBtn) {
        if (saveAllBtn.disabled) return;
        saveAllBtn.disabled = true;
        saveAllBtn.style.backgroundColor = '#ccc';
        saveAllBtn.style.cursor = 'not-allowed';
        originalBtnText = saveAllBtn.innerText;
        saveAllBtn.innerText = '저장 중...';
    }

    // Cleanup Old File if needed
    if (typeof allCards !== 'undefined') {
        const oldCard = allCards.find(c => c.name === analysisName);
        if (oldCard) {
            try {
                await fetch('/api/cards', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        folder: oldCard.folder,
                        image: oldCard.image,
                        main: oldCard.main,
                        sub: oldCard.sub,
                        name: oldCard.name
                    })
                });
            } catch (e) { console.warn("Old file delete failed", e); }
        }
    }

    // Unique Filename
    const timestamp = Date.now();
    const lastDot = file.name.lastIndexOf('.');
    const ext = lastDot !== -1 ? file.name.substring(lastDot) : '';
    const finalFilename = `${analysisName}_${timestamp}${ext}`;

    formData.append('file', file, finalFilename);
    formData.append('name', displayName);
    formData.append('registrations', JSON.stringify(registrations));
    formData.append('confirmed', 'true');

    // Search Keywords
    if (window.tempKeywords) {
        formData.append('search_keywords', window.tempKeywords);
    } else {
        const t1 = document.getElementById('input-tag1') ? document.getElementById('input-tag1').value.trim() : "";
        const t2 = document.getElementById('input-tag2') ? document.getElementById('input-tag2').value.trim() : "";
        const t3 = document.getElementById('input-tag3') ? document.getElementById('input-tag3').value.trim() : "";
        const joined = [t1, t2, t3].filter(Boolean).join(',');
        formData.append('search_keywords', joined || deconjugate(analysisName));
    }

    showLoading(isRelayMode ? `💾 저장 중... (대기: ${uploadQueue.length})` : "💾 저장 중...");

    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            fileInput.value = '';
            const intPreview = document.getElementById('interceptor-preview');
            if (intPreview) intPreview.style.display = 'none';
            document.getElementById('input-name').value = '';
            document.getElementById('input-display-name').value = '';
            document.getElementById('input-pronunciation').value = '';

            document.querySelectorAll('input[name="language_selection"]').forEach(r => {
                r.checked = false;
                if (r.onchange) r.onchange();
            });

            const suggArea = document.getElementById('suggestion-area');
            if (suggArea) {
                suggArea.innerHTML = '<p style="color:#999; margin:0; text-align:center; padding-top: 30px; font-size:0.85rem;">단어 이름을 입력하고 분석을 눌러주세요.</p>';
            }

            const dropZone = document.getElementById('drop-zone');
            if (dropZone) dropZone.classList.remove('dragover');

            if (!isRelayMode && window.loadCards) window.loadCards();

            if (isRelayMode) {
                setTimeout(() => processNextInQueue(), 100);
            }
        } else {
            showAlert("오류 발생: " + data.error);
        }
    } catch (e) {
        console.error(e);
        showAlert("업로드 실패: " + e.message);
    } finally {
        hideLoading();

        if (saveAllBtn) {
            saveAllBtn.disabled = false;
            saveAllBtn.style.backgroundColor = '';
            saveAllBtn.style.cursor = 'pointer';
            if (originalBtnText) saveAllBtn.innerText = originalBtnText;
        }
        window.isGlobalProcessing = false;
    }
}

// --- Exports ---
window.uploadCard = uploadCard;
```

---

## Step 5: `js/logic_upload.js` 교체

기존 파일 전체를 아래로 교체:

```javascript
// ============================================
// Upload Entry Point — State, Init, Exports
// (분할: upload/analyze.js, upload/interceptor.js, upload/submit.js)
// ============================================

// --- Upload State (공유 변수) ---
let uploadQueue = [];
let isRelayMode = false;
let interceptedFile = null;
let isRenaming = false;

// --- Loading Helpers ---
function showLoading(msg) {
    const el = document.getElementById('loading-overlay');
    if (el) el.style.display = 'flex';
}

function hideLoading() {
    const el = document.getElementById('loading-overlay');
    if (el) el.style.display = 'none';
}

// --- File Input Handler ---
window.handleFileSelect = function (input) {
    if (input.files && input.files.length > 0) {
        handleRelayFiles(input.files);
    }
};

// --- Initialization ---
function initUpload() {
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        console.log("✅ Drop Zone Found, binding events...");

        window.addEventListener('dragover', (e) => e.preventDefault(), false);
        window.addEventListener('drop', (e) => e.preventDefault(), false);

        dropZone.ondragover = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        };

        dropZone.ondragleave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        };

        dropZone.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');

            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                console.log("📂 Files dropped:", e.dataTransfer.files);
                handleRelayFiles(e.dataTransfer.files);
            }
        };

        dropZone.onclick = () => {
            const input = document.getElementById('file-input');
            if (input) input.click();
        };
    }

    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.onchange = (e) => {
            handleRelayFiles(e.target.files);
        };
    }

    const manualBtn = document.getElementById('manual-add-btn');
    if (manualBtn && window.addManualRow) {
        manualBtn.onclick = window.addManualRow;
    }
}

// --- Exports ---
window.initUpload = initUpload;
console.log("✅ Upload module loaded (split version)");
```

---

## Step 6: `admin.html` 수정

**찾을 문자열:**
```html
    <script src="js/logic_upload.js?v=20260201_1615"></script>
```

**바꿀 문자열:**
```html
    <script src="js/logic_upload.js?v=7"></script>
    <script src="js/upload/analyze.js"></script>
    <script src="js/upload/interceptor.js"></script>
    <script src="js/upload/submit.js"></script>
```

> ⚠️ `logic_upload.js`가 **반드시 먼저** 로드되어야 함. 상태 변수(`let uploadQueue` 등)가 여기서 선언되고, 나머지 파일에서 참조함.

---

## Step 7: `index.html` 수정

**찾을 문자열:**
```html
        <script src="js/logic_upload.js?v=6"></script>
```

**바꿀 문자열:**
```html
        <script src="js/logic_upload.js?v=7"></script>
        <script src="js/upload/analyze.js"></script>
        <script src="js/upload/interceptor.js"></script>
        <script src="js/upload/submit.js"></script>
```

> ⚠️ admin.html과 동일하게 `logic_upload.js`가 **반드시 먼저**.

---

## Step 8: 검증

- [ ] `admin.html` 정상 로드 (콘솔 에러 없음)
- [ ] 파일 드래그앤드롭 → 인터셉터 → 분석 → 업로드 전체 플로우
- [ ] 릴레이 모드 (여러 파일)
- [ ] F3 (분석), F4 (업로드) 단축키
- [ ] `index.html` 에러 없이 로드
- [ ] 파일별 줄 수 확인 (전부 300줄 이하)

---

## 최종 파일별 줄 수 예상

| 파일 | 줄 수 |
|------|--------|
| `js/logic_upload.js` | ~80줄 |
| `js/upload/analyze.js` | ~230줄 |
| `js/upload/interceptor.js` | ~175줄 |
| `js/upload/submit.js` | ~170줄 |
| **합계** | **~655줄** |
