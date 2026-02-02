
// Custom Modal Logic

// State
let currentConfirmCallback = null;
let currentInputMode = false; // Track if we are in input mode

// Helper to open modal
function openCustomModal(title, message, isConfirm, inputType, onConfirm) {
    const overlay = document.getElementById('custom-modal-overlay');
    const titleEl = overlay.querySelector('.modal-title');
    const msgEl = document.getElementById('modal-message');
    const inputEl = document.getElementById('modal-input');
    const optionsEl = document.getElementById('modal-preset-options'); // Now likely null or unused
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const confirmBtn = document.getElementById('modal-confirm-btn');

    titleEl.innerText = title;
    msgEl.innerHTML = message;

    // Reset Input
    inputEl.value = '';
    currentInputMode = !!inputType;

    // Handle Input
    if (inputType) {
        inputEl.style.display = 'block';
        setTimeout(() => inputEl.focus(), 100);
    } else {
        inputEl.style.display = 'none';
        confirmBtn.focus();
    }

    // (Cleanup) Ensure options are hidden if element still exists
    if (optionsEl) optionsEl.style.display = 'none';

    if (isConfirm || inputType) {
        cancelBtn.style.display = 'inline-block';
        confirmBtn.innerText = '확인';
        currentConfirmCallback = onConfirm;
    } else {
        cancelBtn.style.display = 'none';
        confirmBtn.innerText = '확인';
        currentConfirmCallback = onConfirm || null;
    }

    overlay.style.display = 'flex';
}

// Public API
window.showConfirm = function (message, onConfirm) {
    openCustomModal("확인", message, true, null, onConfirm);
};

window.showAlert = function (message, onOk) {
    openCustomModal("알림", message, false, null, onOk);
};

window.showPrompt = function (title, message, onInput) {
    openCustomModal(title, message, true, 'text', onInput);
};

window.closeCustomModal = function () {
    const overlay = document.getElementById('custom-modal-overlay');
    overlay.style.display = 'none';
    currentConfirmCallback = null;
    currentInputMode = false;
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const inputEl = document.getElementById('modal-input');
    const optionsEl = document.getElementById('modal-preset-options');

    if (confirmBtn) {
        confirmBtn.onclick = () => {
            if (currentConfirmCallback) {
                if (currentInputMode && inputEl) {
                    currentConfirmCallback(inputEl.value);
                } else {
                    currentConfirmCallback();
                }
            }
            window.closeCustomModal();
        };
    }

    if (cancelBtn) {
        cancelBtn.onclick = () => {
            window.closeCustomModal();
        };
    }
});
