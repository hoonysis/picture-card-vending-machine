// === 5. Input & Keyboard Handlers (input.js) ===

// --- Toolbar Handlers ---
window.handleEditBtn = function () {
    if (selectedCards.size !== 1) {
        return showAlert("수정할 단어를 1개만 선택해주세요.");
    }
    const sig = Array.from(selectedCards)[0];
    const cardObj = JSON.parse(sig);

    // Attempt to find full object in rendered list
    const composite = window.renderedUniqueCards.find(c => c.image === cardObj.image);
    if (composite) openEditModal(composite);
    else openEditModal(cardObj); // Fallback
}

window.handleDeselect = function () {
    selectedCards.clear();
    renderGrid();
}

window.handleDeleteSelected = async function () {
    if (selectedCards.size === 0) return showAlert("선택된 항목이 없습니다.");

    showConfirm(`선택한 ${selectedCards.size}개의 항목을 삭제하시겠습니까?`, async () => {
        showLoading();
        const targets = Array.from(selectedCards).map(sig => JSON.parse(sig));

        try {
            const res = await fetch('/api/cards', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(targets)
            });

            const data = await res.json();
            if (data.success) {
                selectedCards.clear();
                if (typeof DATA_VERSION !== 'undefined') DATA_VERSION = Date.now();
                if (window.loadCards) window.loadCards();
            } else {
                showAlert("삭제 실패: " + (data.error || "Unknown"));
            }
        } catch (e) {
            console.error(e);
            showAlert("오류 발생");
        } finally {
            hideLoading();
        }
    });
}

window.handleDeleteAll = async function () {
    if (currentFilteredCards.length === 0) return showAlert("삭제할 목록이 없습니다.");

    showConfirm(`현재 목록에 있는 모든 항목(${currentFilteredCards.length}개)을 정말 삭제하시겠습니까?
주의: 이 작업은 되돌릴 수 없습니다.`,
        async () => {
            const input = prompt("삭제하려면 '삭제'를 입력하세요.");
            if (input !== '삭제') return;

            try {
                const res = await fetch('/api/cards', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(currentFilteredCards)
                });
                const data = await res.json();
                if (data.success) {
                    selectedCards.clear();
                    if (window.loadCards) window.loadCards();
                } else {
                    showAlert("삭제 실패: " + (data.error || "Unknown"));
                }
            } catch (e) {
                console.error(e);
                showAlert("오류 발생");
            }
        });
}

// --- Global Keyboard Shortcuts ---
document.addEventListener('keydown', function (e) {
    if (window.isGlobalProcessing) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return;
    }

    const tag = e.target.tagName;
    const isInput = (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable);

    // 1. Ctrl + A (Select All)
    if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) {
        if (isInput) return;
        e.preventDefault();
        selectAllCards(); // Use the exported function
    }

    // 2. Esc (Deselect / Close Modal)
    else if (e.key === 'Escape') {
        const editModal = document.getElementById('edit-modal');
        const dupModal = document.getElementById('duplicate-modal');
        const confirmModal = document.getElementById('custom-confirm-modal');
        const contextMenu = document.getElementById('contextMenu');

        if (editModal && editModal.style.display === 'flex') {
            closeModal();
        } else if (dupModal && dupModal.style.display === 'flex') { // Fixed: display check
            if (window.closeDuplicateModal) closeDuplicateModal();
            else dupModal.style.display = 'none';
        } else if (confirmModal && confirmModal.style.display === 'flex') {
            closeCustomConfirm();
        } else if (contextMenu && contextMenu.style.display === 'block') {
            // Context Menu close handled by window click, but explicit Esc is nice
            // But usually context menu closing is native.
        } else {
            handleDeselect();
        }
    }

    // 3. Delete (Delete Selected)
    else if (e.key === 'Delete') {
        if (isInput) return;
        if (selectedCards.size > 0) handleDeleteSelected();
    }

    // Prevent Key Repeats (Important for F3, F4)
    if (e.repeat) return;

    // 4. F2 (Edit)
    else if (e.key === 'F2') {
        e.preventDefault();
        if (selectedCards.size > 0) handleEditBtn();
    }

    // 5. F3 (Analyze)
    else if (e.key === 'F3') {
        e.preventDefault(); // Always block browser Find
        const nameInput = document.getElementById('input-name');

        // Only run if input exists and is visible (not in modal edit mode if checking activeElement, or generic?)
        // The user likely wants to analyze whatever is in the main input-name field ANYTIME F3 is pressed.
        if (nameInput) {
            const val = nameInput.value.trim();
            if (val && window.analyzeName) {
                // Focus input too, for better UX
                nameInput.focus();
                window.analyzeName(val);
            } else {
                // If empty, maybe focus input?
                nameInput.focus();
            }
        }
    }

    // 6. F4 (Upload / Save)
    else if (e.key === 'F4') {
        e.preventDefault(); // Always block browser default (Address Bar etc)

        // Find Modal
        const interceptor = document.getElementById('rename-interceptor-modal');
        let isInterceptorOpen = false;

        if (interceptor) {
            // [Fix] Check computed style for real visibility
            // Inline style might be empty initially (relying on CSS class)
            // But logic_upload opens it with style.display = 'block'
            // So checking for 'block' explicitly, or strict visibility check
            isInterceptorOpen = (interceptor.style.display === 'block' || interceptor.style.display === 'flex');
        }

        // Case 1: Rename Modal is Open -> Confirm Name
        if (isInterceptorOpen) {
            if (window.confirmInterceptorName) window.confirmInterceptorName();
        }
        // Case 2: Main Screen -> Upload/Save All
        else {
            // Find the actual button to trigger its onclick logic (which handles constraints)
            // Prioritize the main save button with the icon
            const saveBtn = document.getElementById('btn-upload-save'); // Use explicit ID

            if (saveBtn) {
                saveBtn.click();
                saveBtn.focus(); // Visual feedback
            } else if (window.uploadCard) {
                // Fallback to direct call if button not found (shouldn't happen now)
                window.uploadCard();
            }
        }
    }
});
