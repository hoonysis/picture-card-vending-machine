// === 1. Common Utilities & State (common.js) ===
// 전역 상태 및 공통 헬퍼 함수

window.selectedCards = new Set();
window.currentFilteredCards = [];
window.lastSelectedIndex = -1; // For shift-click range selection
window.renderedUniqueCards = []; // Expose for selection logic
window.currentEditCard = null;

// --- Loading Helpers ---
let loadingTimer = null;

window.showLoading = function (msg) {
    if (loadingTimer) clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }, 300); // Reduced to 300ms for better responsiveness
}

window.hideLoading = function () {
    if (loadingTimer) {
        clearTimeout(loadingTimer);
        loadingTimer = null;
    }
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

window.renderGridWithLoading = function () {
    showLoading();
    setTimeout(() => {
        if (window.renderGrid) window.renderGrid();
        hideLoading();
    }, 50);
}

// --- Card Signature Helper ---
window.getCardSig = function (c) {
    return JSON.stringify({
        folder: c.folder,
        image: c.image,
        main: c.main,
        sub: c.sub,
        name: c.name,
        part_of_speech: c.part_of_speech,
        language_category: c.language_category
    });
}

// --- Modal & Alert Helpers ---
window.showAlert = function (msg) {
    const modal = document.getElementById('custom-alert-modal');
    const msgEl = document.getElementById('custom-alert-msg');
    if (modal && msgEl) {
        msgEl.innerText = msg;
        modal.style.display = 'flex';
        const btn = modal.querySelector('button');
        if (btn) btn.focus();
    } else {
        alert(msg);
    }
}

window.closeAlert = function () {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) modal.style.display = 'none';
}

window.showConfirm = function (msg, callback) {
    const modal = document.getElementById('custom-confirm-modal');
    const msgEl = document.getElementById('custom-confirm-msg');
    const okBtn = document.getElementById('custom-confirm-ok');

    if (modal && msgEl && okBtn) {
        msgEl.innerText = msg;
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);

        newOkBtn.onclick = () => {
            closeCustomConfirm();
            callback();
        };
        newOkBtn.onkeydown = (e) => {
            if (e.key === 'Enter') {
                closeCustomConfirm();
                callback();
            }
        };

        modal.style.display = 'flex';
        newOkBtn.focus();
    } else {
        if (confirm(msg)) callback();
    }
}

window.closeCustomConfirm = function () {
    const modal = document.getElementById('custom-confirm-modal');
    if (modal) modal.style.display = 'none';
}

// Help Modal
window.showHelpModal = function () {
    const modal = document.getElementById('help-modal');
    if (modal) {
        modal.style.display = 'flex';
        const btn = modal.querySelector('.btn-primary');
        if (btn) btn.focus();
    }
}

window.closeHelpModal = function () {
    const modal = document.getElementById('help-modal');
    if (modal) modal.style.display = 'none';
}

// Duplicate Modal
window.showDuplicateModal = function (existingUrl, filename) {
    const modal = document.getElementById('duplicate-modal');
    const existingImg = document.getElementById('dup-existing-img');
    const newImg = document.getElementById('dup-new-img');

    const previewEl = document.getElementById('preview');
    const previewSrc = previewEl ? previewEl.src : '';

    if (existingImg) existingImg.src = existingUrl;
    if (newImg) newImg.src = previewSrc;

    if (modal) modal.style.display = 'flex';
}

window.closeDuplicateModal = function () {
    const modal = document.getElementById('duplicate-modal');
    if (modal) modal.style.display = 'none';
}

window.confirmDuplicateUpload = function () {
    closeDuplicateModal();
    if (window.uploadCard) window.uploadCard(true);
}
