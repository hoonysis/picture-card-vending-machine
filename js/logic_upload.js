
// ============================================
// Admin Upload & Analysis Logic
// ============================================

// --- Upload State ---
let uploadQueue = [];
let isRelayMode = false;
let interceptedFile = null;
let isRenaming = false; // State to track F4 target

// [NEW] Dictionary Form Converter (Heuristic)
function deconjugate(name) {
    if (!name) return "";
    name = name.trim();

    // 1. Basic Substitution Rules
    // Common Endings: 요 -> 다
    if (name.endsWith('요')) {
        const stem = name.slice(0, -1); // "먹어"

        // "해요" -> "하다"
        if (stem.endsWith('해')) {
            return stem.slice(0, -1) + '하다'; // "공부해" -> "공부하다"
        }

        // "워요" -> "ㅂ다" (추워요 -> 춥다, 더워요 -> 덥다)
        if (stem.endsWith('워')) {
            return stem.slice(0, -1) + 'ㅂ다';
        }

        // "아요/어요" -> "다"
        // This is tricky. 
        // "먹어요" -> "먹다" (stem: 먹어)
        // "가요" -> "가다" (stem: 가)
        // "봐요" -> "보다" (stem: 봐 -> 보 + 아)

        if (stem.endsWith('어')) {
            return stem.slice(0, -1) + '다'; // 먹어 -> 먹다
        }
        if (stem.endsWith('아')) {
            // 낫아 -> 낫다? (irregular)
            // 살아 -> 살다?
            return stem.slice(0, -1) + '다';
        }

        return stem + '다'; // Generic fallback
    }

    return ""; // Return empty if no clear conjugation found (user can fill manually)
}

// [Fix] Missing Helpers
function showLoading(msg) {
    const el = document.getElementById('loading-overlay');
    if (el) el.style.display = 'flex';
}
function hideLoading() {
    const el = document.getElementById('loading-overlay');
    if (el) el.style.display = 'none';
}

// --- Drag & Drop Handlers (Relay) ---
async function handleRelayFiles(fileList) {
    if (fileList.length === 0) return;

    // Convert FileList to Array
    const files = Array.from(fileList);

    // Always use queue logic to ensure Rename Interceptor triggers
    isRelayMode = true;
    const initialLength = uploadQueue.length;
    uploadQueue.push(...files);

    // If we were not already processing (queue was empty), start now
    if (initialLength === 0) {
        processNextInQueue();
    } else {
        showAlert(`목록에 ${files.length}장이 추가되었습니다.\n(현재 대기열: ${uploadQueue.length}장)`);
    }
}

function processNextInQueue() {
    if (uploadQueue.length === 0) {
        isRelayMode = false;
        showAlert("✅ 모든 릴레이 업로드가 완료되었습니다!");
        if (window.loadCards) window.loadCards(); // [Fix] Refresh list only at the end
        return;
    }

    const file = uploadQueue.shift(); // Get next file

    // Mock FileInput
    const container = new DataTransfer();
    container.items.add(file);
    document.getElementById('file-input').files = container.files;

    // Open Interceptor (Progress passed as argument)
    openRenameInterceptor(file, uploadQueue.length);
}

// --- Analysis Logic ---
// --- Analysis Logic ---
// [Fix] Ensure analyzeName has initial log
async function analyzeName(name) {
    if (window.isGlobalProcessing) return; // Prevent Double
    window.isGlobalProcessing = true;
    console.log("🔍 analyzeName Called with:", name);
    // [Fix] Auto-fetch if no name provided
    if (!name) {
        const input = document.getElementById('input-name');
        if (input) name = input.value;
    }
    console.log("🔍 Processing Name:", name);


    if (!name) return; // Still empty? Then verify logic
    const analysisName = name.trim();
    if (!analysisName) return;

    // [Fix] Get Manual Pronunciation if exists
    const inputPron = document.getElementById('input-pronunciation');
    const manualPron = inputPron ? inputPron.value.trim() : "";

    showLoading();

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: analysisName,
                pronunciation: manualPron // Send manual input
            })
        });
        const data = await response.json();
        // 1. Auto-Check Language Category
        // Fix: Server returns 'reference' or 'category_ref'
        const ref = data.reference || data.category_ref;
        if (ref) {
            // Expected: { main: "언어이해", sub: "사물명사(학용품)" }

            // Normalize Helper: Remove spaces, parens, special chars
            const normalize = (str) => {
                if (!str) return "";
                return str.replace(/[\s\(\)\/·,.]/g, '');
            };

            const targetMain = normalize(ref.main);
            const targetSub = normalize(ref.sub);

            const allRadios = document.querySelectorAll('input[name="language_selection"]');
            let radio = null;

            for (const r of allRadios) {
                // Use dataset if available, fallback to value check
                const rMain = normalize(r.dataset.theme || r.value.split('|')[0]);
                const rSub = normalize(r.dataset.sub || r.value.split('|')[1]);

                // 1. Main Category must match
                // (Server: "사람/신체" vs UI: "사람신체")
                if (targetMain.includes(rMain) || rMain.includes(targetMain)) {
                    // 2. Sub Category Match
                    if (targetSub === rSub) {
                        radio = r;
                        break;
                    }
                    // 3. Fallback: Prefix Match (e.g., "사물명사" vs "사물명사(학용품)")
                    if (targetSub.startsWith(rSub) || rSub.startsWith(targetSub)) {
                        radio = r;
                        break;
                    }
                }
            }

            if (radio) {
                radio.checked = true;

                // Visual Highlight
                const wrapper = radio.closest('label') || radio.parentElement;
                if (wrapper) {
                    wrapper.style.backgroundColor = '#fff9c4';
                    wrapper.style.transition = 'background-color 0.5s';
                    setTimeout(() => wrapper.style.backgroundColor = '', 2000);
                }

                if (radio.onchange) radio.onchange(); // Trigger UI update to set dataset vars

                // Feedback Toast
                const suggArea = document.getElementById('suggestion-area');
                if (suggArea) {
                    // Clear previous feedback
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
                // Show warning feedback
                const suggArea = document.getElementById('suggestion-area');
                if (suggArea) {
                    const feedback = document.createElement('div');
                    feedback.innerHTML = `⚠️ 분류 실패: <b>${ref.main} > ${ref.sub}</b> (목록에 없음)`;
                    feedback.style.cssText = "background:#ff9800; color:white; padding:8px; border-radius:4px; margin-bottom: 10px; text-align: center; font-size:0.9rem;";
                    suggArea.prepend(feedback);
                }
            }
        }

        // [NEW] Populate Search Keywords (Tag1)
        // [NEW] Populate Search Tags (3 Fields)
        const tag1Input = document.getElementById('input-tag1');
        const tag2Input = document.getElementById('input-tag2');
        const tag3Input = document.getElementById('input-tag3');

        if (tag1Input && tag2Input && tag3Input) {
            let tags = [];
            let foundSheetTags = false;

            // 1. Priority: Sheet Data (ref.tag1/2/3 or ref.search_keywords)
            if (ref && (ref.tag1 || ref.tag2 || ref.tag3)) {
                tags = [ref.tag1, ref.tag2, ref.tag3];
                foundSheetTags = true;
            } else if (ref && ref.search_keywords) {
                tags = ref.search_keywords.split(',').map(s => s.trim());
                foundSheetTags = true;
            }

            // Fill inputs from Sheet Data if found
            if (foundSheetTags) {
                tag1Input.value = tags[0] || "";
                tag2Input.value = tags[1] || "";
                tag3Input.value = tags[2] || "";
            }

            // 2. Fallback: Auto-Analyze (Deconjugate) ONLY if Tag 1 is still empty
            // This ensures we don't overwrite manual Noun tags (which have no conjugation) with empty strings,
            // or overwrite existing valid tags with guessed verbs.
            if (!tag1Input.value) {
                const autoBase = deconjugate(analysisName);
                if (autoBase) {
                    tag1Input.value = autoBase;
                }
            }
        }

        // 2. Update Display Name (Robust Update)
        const finalPron = (data && data.pronunciation) ? `[${data.pronunciation}]` : "";
        const dispInput = document.getElementById('input-display-name');

        if (dispInput) {
            let currentVal = dispInput.value.trim();
            // If empty, start with analyzed name
            if (!currentVal) currentVal = analysisName;

            // Remove existing pronunciation tag if present (to replace it)
            if (currentVal.includes('[')) {
                currentVal = currentVal.replace(/\[.*?\]/, '').trim();
            }

            // Append new pronunciation
            if (finalPron) {
                dispInput.value = `${currentVal} ${finalPron}`;
            } else {
                dispInput.value = currentVal;
            }

            // [Fix] Ensure Pronunciation Input matches server result (if it changed)
            const pronInput = document.getElementById('input-pronunciation');
            if (pronInput && data.pronunciation) {
                pronInput.value = data.pronunciation;
            }
        }

        // 3. Render Suggestions (Phoneme Analysis)
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


// --- Interceptor Modal ---
function openRenameInterceptor(file, remainingCount = 0) {
    interceptedFile = file;
    isRenaming = true;

    // 1. Update UI (Targeting INLINE Elements)
    const srContainer = document.getElementById('smart-rename-container');
    const srOriginal = document.getElementById('sr-original');
    const srCount = document.getElementById('sr-count');
    const srBadge = document.getElementById('main-remain-badge');
    const srInput = document.getElementById('sr-input');
    // srKeywords removed

    if (srOriginal) srOriginal.textContent = file.name;

    // Header Count
    if (srCount) {
        if (remainingCount > 0) {
            srCount.textContent = `(남은 작업: ${remainingCount}장)`;
            srCount.style.display = 'inline';
        } else {
            srCount.style.display = 'none';
        }
    }

    // Main Badge
    if (srBadge) {
        if (remainingCount > 0) {
            srBadge.textContent = `(${remainingCount}장 남음)`;
            srBadge.style.display = 'inline';
        } else {
            srBadge.style.display = 'none';
        }
    }

    // 2. Smart Name Logic
    const originalName = file.name;
    let cleanName = originalName.substring(0, originalName.lastIndexOf('.'));
    if (/ \(\d+\)$/.test(cleanName)) {
        cleanName = cleanName.replace(/ \(\d+\)$/, '');
    }

    if (srInput) srInput.value = cleanName;

    // [NEW] Auto-Generate Keywords - Removed (Redundant with Main UI)

    // 3. Update Main Preview (Already handled by FileReader below, but ensuring visibility)
    // Inline UI doesn't have a separate interceptor-preview usually, it uses the main preview area?
    // admin_test.html has <img id="interceptor-preview"> in the POPUP modal. 
    // The INLINE UI uses the main <img id="preview">.
    const reader = new FileReader();
    reader.onload = (e) => {
        const mainPreview = document.getElementById('preview');
        if (mainPreview) {
            mainPreview.src = e.target.result;
            mainPreview.style.display = 'block';
        }
        // Also update popup preview just in case
        const popupPreview = document.getElementById('interceptor-preview');
        if (popupPreview) popupPreview.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // 4. Show Container
    if (srContainer) srContainer.style.display = 'block';

    // 5. Auto-Run Analysis
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
    // [FIX] Use Inline Input ID
    const input = document.getElementById('sr-input');
    if (!input) return;

    // [New] Prevent Double Submit - Find the Active Button
    // Since this can be called by Enter key or Button click, we find the Confirm button explicitly
    const confirmBtn = document.querySelector('#rename-interceptor-modal .btn-primary');
    if (confirmBtn && confirmBtn.disabled) return; // Already processing

    const newName = input.value.trim();
    if (!newName) {
        showAlert("이름을 입력해주세요.");
        return;
    }
    if (!interceptedFile) return;

    // disable button temporarily
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.style.backgroundColor = '#ccc';
        confirmBtn.style.cursor = 'not-allowed';
        const originalText = confirmBtn.innerText;
        confirmBtn.innerText = '처리 중...';

        // Re-enable after delay or when done (isRenaming=false handles close)
        // logic below closes modal via isRenaming=false which is good.
        // But we must reset state if we return early or error.
        setTimeout(() => {
            // In case modal is reused, reset button state
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.style.backgroundColor = '';
                confirmBtn.style.cursor = 'pointer';
                confirmBtn.innerText = originalText;
            }
        }, 1500); // Simple debounce
    }

    // Update Hidden Input & Display Input
    const hiddenName = document.getElementById('input-name');
    if (hiddenName) hiddenName.value = newName;

    const displayName = document.getElementById('input-display-name');
    if (displayName) displayName.value = newName;

    // [NEW] Transfer Keywords - Removed (Redundant)

    // Trigger Analysis
    if (typeof analyzeName === 'function') {
        analyzeName(newName);
    }

    // [Fix] Update Main Preview Image
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
        // Focus "Save All" button
        // In original: document.querySelector('button[onclick="uploadCard()"]')
        // We will make sure uploadCard is available
        const saveBtn = document.getElementById('btn-upload-save'); // Assuming ID or use querySelector
        if (saveBtn) saveBtn.focus();
        else {
            // Fallback selector - attempt to focus the main Save button
            const mainSave = document.querySelector('.btn-primary[onclick*="uploadCard"]');
            if (mainSave) mainSave.focus();
        }
    }
}


// --- Upload Card ---
async function uploadCard(isConfirmed = false) {
    if (window.isGlobalProcessing) return; // Prevent Double
    window.isGlobalProcessing = true;
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

    const formData = new FormData();

    // [New] Prevent Double Click on Save Button
    // Looking for the button that called this. Since uploadCard is global, we search for the specific button
    const saveAllBtn = document.querySelector('.btn-save-all') || document.querySelector('button[onclick*="uploadCard"]');
    let originalBtnText = "";

    if (saveAllBtn) {
        if (saveAllBtn.disabled) return; // Already running
        saveAllBtn.disabled = true;
        saveAllBtn.style.backgroundColor = '#ccc';
        saveAllBtn.style.cursor = 'not-allowed';
        originalBtnText = saveAllBtn.innerText;
        saveAllBtn.innerText = '저장 중...';
    }


    // Cleanup Old File if needed (Unique Filename Strategy)
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
    formData.append('confirmed', 'true'); // Always confirmed per user request

    // [NEW] Append Search Keywords (Joined)
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
            document.getElementById('interceptor-preview').style.display = 'none';
            document.getElementById('input-name').value = '';
            document.getElementById('input-display-name').value = '';
            document.getElementById('input-pronunciation').value = '';

            // Clear Language Selection
            document.querySelectorAll('input[name="language_selection"]').forEach(r => {
                r.checked = false;
                if (r.onchange) r.onchange();
            });

            document.getElementById('suggestion-area').innerHTML = '<p style="color:#999; margin:0; text-align:center; padding-top: 30px; font-size:0.85rem;">단어 이름을 입력하고 분석을 눌러주세요.</p>';

            const dropZone = document.getElementById('drop-zone');
            if (dropZone) dropZone.classList.remove('dragover');

            // [Fix] Don't reload entire list during relay (prevent flooding)
            if (!isRelayMode && window.loadCards) window.loadCards();

            // Relay Trigger
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
        if (!isRelayMode) hideLoading();
        // Hide loading anyway to be safe, processNext will show it again if needed? 
        // Logic says: showLoading called in processNext? No, uploadCard calls showLoading.
        // So hiding here is fine.
        hideLoading();

        // [New] Re-enable Save Button
        if (saveAllBtn) {
            saveAllBtn.disabled = false;
            saveAllBtn.style.backgroundColor = ''; // Restore CSS or class style
            saveAllBtn.style.cursor = 'pointer';
            if (originalBtnText) saveAllBtn.innerText = originalBtnText;
        }
        window.isGlobalProcessing = false;
    }
}


// --- Suggestion UI Helpers (Moved from admin.html) ---
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
    // PHONEMES and POSITIONS must be available (global from admin_data.js)
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

    // getPhonemeOptions and getPosOptions from admin_ui.js (window scope)
    const pOptions = window.getPhonemeOptions ? window.getPhonemeOptions(main) : '';
    const posOptions = window.getPosOptions ? window.getPosOptions(sub) : '';

    div.innerHTML = `
<input type="checkbox" class="sugg-check" checked>
<select class="sugg-main" style="width: auto; padding: 5px; flex:1;">${pOptions}</select>
<select class="sugg-sub" style="width: auto; padding: 5px; flex:1;">${posOptions}</select>
<span style="color:#999; font-size:0.8rem; flex:1;">${desc || ''}</span>
`;

    // UI Logic for 'ㅇ(모음)'
    const mainSelect = div.querySelector('.sugg-main');
    const subSelect = div.querySelector('.sugg-sub');

    const updateSubVisibility = () => {
        if (mainSelect.value === 'ㅇ(모음)') {
            subSelect.style.display = 'none';
        } else {
            subSelect.style.display = 'inline-block';
        }
    };

    mainSelect.onchange = updateSubVisibility;
    updateSubVisibility();

    return div;
}

// Handler glue
window.handleFileSelect = function (input) {
    if (input.files && input.files.length > 0) {
        handleRelayFiles(input.files);
    }
};

// Exports
window.handleRelayFiles = handleRelayFiles;
window.processNextInQueue = processNextInQueue;
window.uploadCard = uploadCard;
window.analyzeName = analyzeName;
window.openRenameInterceptor = openRenameInterceptor;
window.closeInterceptorModal = closeInterceptorModal;
window.confirmInterceptorName = confirmInterceptorName;
window.renderSuggestions = renderSuggestions;
window.addManualRow = addManualRow;

// --- Initialization ---
function initUpload() {
    // 1. Bind Drop Zone
    // 1. Bind Drop Zone
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        console.log("✅ Drop Zone Found, binding events...");

        // Prevent default on the document level to stop "Open in Tab"
        window.addEventListener('dragover', (e) => e.preventDefault(), false);
        window.addEventListener('drop', (e) => e.preventDefault(), false);

        dropZone.ondragover = (e) => {
            e.preventDefault();
            e.stopPropagation(); // Explicitly stop propagation
            dropZone.classList.add('dragover');
        };

        dropZone.ondragleave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        };

        dropZone.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation(); // Stop browser from opening
            dropZone.classList.remove('dragover');

            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                console.log("📂 Files dropped:", e.dataTransfer.files);
                handleRelayFiles(e.dataTransfer.files);
            }
        };

        // Click to open file dialog 
        dropZone.onclick = () => {
            const input = document.getElementById('file-input');
            if (input) input.click();
        };
    }

    // 2. Bind File Input
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.onchange = (e) => {
            handleRelayFiles(e.target.files);
        };
    }

    // 3. Manual Add Button
    const manualBtn = document.getElementById('manual-add-btn');
    if (manualBtn && window.addManualRow) {
        manualBtn.onclick = window.addManualRow;
    }
}

window.initUpload = initUpload;
// [DEBUG] Expose to Window Explicitly
window.analyzeName = analyzeName;
window.handleRelayFiles = handleRelayFiles;
window.openRenameInterceptor = openRenameInterceptor;
console.log("✅ admin_upload.js Loaded & Functions Exposed");
