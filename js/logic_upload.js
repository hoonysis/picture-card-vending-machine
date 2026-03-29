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
