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
