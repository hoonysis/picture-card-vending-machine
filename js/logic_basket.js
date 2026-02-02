// === Undo/Redo System ===
const historyStack = [];
const redoStack = [];
const MAX_HISTORY = 10;

function updateUndoRedoUI() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = (historyStack.length === 0);
    if (redoBtn) redoBtn.disabled = (redoStack.length === 0);
}

function saveState() {
    if (historyStack.length >= MAX_HISTORY) historyStack.shift();

    const cards = Array.from(document.querySelectorAll('.card.in-basket'));
    const state = cards.map(c => ({
        img: c.dataset.img,
        name: c.dataset.name,
        selected: c.classList.contains('selected')
    }));

    historyStack.push(state);
    redoStack.length = 0; // Clear redo on new action
    updateUndoRedoUI();
}

function restoreState(state) {
    const basketGrid = document.getElementById('basket-grid');
    // Clear current except empty msg (which checked by checkEmpty) behavior
    // Easier: Clear all children
    basketGrid.innerHTML = '';

    state.forEach(data => {
        addToBasket(data.img, data.name, true, true); // true = skipSave, true = fromSystem (Bypass Limit)

        // Restore selection
        if (data.selected) {
            const newCard = basketGrid.lastElementChild;
            if (newCard) newCard.classList.add('selected');
        }
    });
    checkEmpty(); // Ensure empty msg state is correct



    if (window.triggerAutoSave) window.triggerAutoSave();
    updateUndoRedoUI();
}

window.undo = function () {
    if (historyStack.length === 0) return;

    // Save current state to redoStack before undoing
    const currentCards = Array.from(document.querySelectorAll('.card.in-basket'));
    const currentState = currentCards.map(c => ({
        img: c.dataset.img,
        name: c.dataset.name,
        selected: c.classList.contains('selected')
    }));
    redoStack.push(currentState);

    const prevState = historyStack.pop();
    restoreState(prevState);
    updateUndoRedoUI();
}

window.redo = function () {
    if (redoStack.length === 0) return;

    // Save current to history
    const currentCards = Array.from(document.querySelectorAll('.card.in-basket'));
    const currentState = currentCards.map(c => ({
        img: c.dataset.img,
        name: c.dataset.name,
        selected: c.classList.contains('selected')
    }));
    historyStack.push(currentState);

    const nextState = redoStack.pop();
    restoreState(nextState);
    updateUndoRedoUI();
}

function addToBasket(imgSrc, name, skipSave = false, fromSystem = false) {
    if (!skipSave) saveState();
    document.querySelector('.empty-msg')?.remove();

    // [Safe Limit Logic]
    // 1. Check count
    const MAX_ITEMS = 100;
    const currentCount = document.querySelectorAll('.card.in-basket').length;

    // Check Limit (System actions bypass limit)
    if (!fromSystem && currentCount >= MAX_ITEMS) {
        // Use logic_ui's showAlert if available, or fallback
        if (typeof window.showAlert === 'function') {
            window.showAlert(`쾌적한 인쇄를 위해 한 번에 ${MAX_ITEMS}장까지만 담을 수 있어요!`);
        } else {
            alert(`쾌적한 인쇄를 위해 한 번에 ${MAX_ITEMS}장까지만 담을 수 있어요!`);
        }
        return;
    }

    // [Removed Blocking Limit] -> Now we allow adding, then trim later.

    const card = document.createElement('div');
    card.className = 'card in-basket';
    card.draggable = true;
    card.dataset.img = imgSrc;
    card.dataset.name = name;

    card.innerHTML = `
        <button class="card-menu-btn" title="메뉴">⋮</button>
        <img src="${imgSrc}" class="card-img" onerror="this.src='https://via.placeholder.com/150?text=${encodeURIComponent(name)}'">
        <div class="card-name">${name}</div>
    `;

    // [New] Menu Button Event
    const menuBtn = card.querySelector('.card-menu-btn');
    if (menuBtn) {
        menuBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent card selection
            // Manually trigger context menu logic
            // We need to construct a fake event or modify handleCtxMenu to accept coordinates
            // Re-using logic_ui.js's contextmenu listener is tricky because it relies on the 'contextmenu' event type.
            // Better to manually call renderCtxMenu or dispatch a contextmenu event.

            // Dispatching a real contextmenu event is the cleanest way to reuse existing logic_ui.js code
            const rect = menuBtn.getBoundingClientRect();
            const event = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: rect.left,
                clientY: rect.bottom + 5 // Open slightly below
            });
            menuBtn.dispatchEvent(event);
        };
    }

    // 클릭 선택 이벤트 (토글 + Shift 범위)
    card.onclick = (e) => {
        e.stopPropagation();

        const cards = Array.from(basketGrid.querySelectorAll('.card.in-basket'));
        const currentIndex = cards.indexOf(card);

        if (e.shiftKey && lastClickedIndex !== -1) {
            // Shift 키 누른 상태: 범위 선택
            const start = Math.min(lastClickedIndex, currentIndex);
            const end = Math.max(lastClickedIndex, currentIndex);

            for (let i = start; i <= end; i++) {
                cards[i].classList.add('selected');
            }
        } else {
            // 그냥 클릭: 토글
            card.classList.toggle('selected');
            lastClickedIndex = currentIndex;
        }
    };

    addDragEvents(card);
    basketGrid.appendChild(card);



    // Optimize: Only trigger auto-save if user action (debounce handles the rest)
    if (!fromSystem && window.triggerAutoSave) window.triggerAutoSave();
}

// 2. Validate Limit (Post-Process)
// This should be called AFTER batch operations (preset load, undo)


// 전체 선택
window.selectAll = function () {
    const basketGrid = document.getElementById('basket-grid');
    basketGrid.querySelectorAll('.card.in-basket').forEach(el => {
        el.classList.add('selected');
    });
};

// 전체 선택 해제
function clearSelection() {
    basketGrid.querySelectorAll('.card.in-basket.selected').forEach(el => {
        el.classList.remove('selected');
    });
}

// 선택 삭제 (확인창 제거)
window.deleteSelected = function () {
    const basketGrid = document.getElementById('basket-grid');
    const selected = basketGrid.querySelectorAll('.card.in-basket.selected');

    if (selected.length === 0) return window.showAlert ? window.showAlert("선택된 카드가 없습니다.") : alert("선택된 카드가 없습니다.");

    saveState(); // Save before delete

    selected.forEach(card => card.remove());
    checkEmpty();
    if (window.triggerAutoSave) window.triggerAutoSave();
};

// 장바구니 전체 비우기
window.clearBasket = function () {
    const cardsInBasket = basketGrid.querySelectorAll('.card.in-basket');
    if (cardsInBasket.length === 0) return; // 이미 비어있으면 아무것도 안 함

    const doClear = () => {
        saveState(); // Save before clear
        cardsInBasket.forEach(card => card.remove());
        checkEmpty(); // 비운 후 empty-msg 표시
        if (window.triggerAutoSave) window.triggerAutoSave();
    };

    if (window.showConfirm) {
        window.showConfirm("정말 장바구니를 비울까요?", doClear);
    } else if (confirm("정말 장바구니를 비울까요?")) {
        doClear();
    }
};

function checkEmpty() {
    // 마퀴 선택 박스와 empty-msg 제외하고 카드가 있는지 확인
    const cards = basketGrid.querySelectorAll('.card.in-basket');
    if (cards.length === 0) {
        // 이미 empty-msg가 있으면 추가 안 함
        if (!basketGrid.querySelector('.empty-msg')) {
            const msg = document.createElement('div');
            msg.className = 'empty-msg';
            msg.innerText = '카드를 클릭하면 여기에 담깁니다.';
            // marqueeEl 앞에 추가 (HTML 구조 유지)
            basketGrid.appendChild(msg);
        }
    } else {
        // 카드가 있으면 empty-msg 제거
        basketGrid.querySelector('.empty-msg')?.remove();
    }
}

// === 마퀴(드래그) 선택 로직 제거됨 ===

// === 드래그 앤 드롭 (배치 이동 - Placeholder 방식) ===
let placeholderEl = null;

function createPlaceholder() {
    const el = document.createElement('div');
    el.className = 'basket-placeholder';
    return el;
}

function addDragEvents(item) {
    item.addEventListener('dragstart', e => {
        dragSrcEl = item;

        // 선택 동기화
        if (!item.classList.contains('selected')) {
            clearSelection();
            item.classList.add('selected');
        }

        e.dataTransfer.effectAllowed = 'move';
        // 데이터 전송 (필요한 경우)
        e.dataTransfer.setData('text/plain', '');

        // Placeholder 생성
        placeholderEl = createPlaceholder();

        // 선택된 아이템들 숨김 (Placeholder가 대신 자리 차지)
        setTimeout(() => {
            item.classList.add('dragging'); // 표식
            basketGrid.querySelectorAll('.card.in-basket.selected').forEach(el => {
                el.style.display = 'none';
            });
            // 초기 Placeholder 삽입 (현재 위치)
            basketGrid.insertBefore(placeholderEl, item.nextSibling);
        }, 0);
    });

    item.addEventListener('dragend', () => {
        // 복구
        dragSrcEl = null;
        if (placeholderEl && placeholderEl.parentNode) {
            placeholderEl.remove();
        }
        placeholderEl = null;

        basketGrid.querySelectorAll('.card.in-basket.selected').forEach(el => {
            el.style.display = 'flex'; // Restore
            el.classList.remove('dragging');
        });
    });

    // 개별 아이템의 dragover는 방해되지 않도록 무시
    item.addEventListener('dragover', e => e.preventDefault());
}

// === 컨테이너 레벨 이벤트 (핵심 로직) ===
function initBasketDrop() {
    basketGrid.addEventListener('dragover', e => {
        e.preventDefault();
        e.stopPropagation();

        if (!dragSrcEl || !placeholderEl) return;

        const afterElement = getDragAfterElement(basketGrid, e.clientX, e.clientY);

        if (afterElement == null) {
            // 맨 뒤로 이동
            basketGrid.appendChild(placeholderEl);
        } else {
            // 특정 요소 앞으로 이동
            basketGrid.insertBefore(placeholderEl, afterElement);
        }
    });

    basketGrid.addEventListener('drop', e => {
        e.preventDefault();
        if (!dragSrcEl || !placeholderEl) return;

        // 실제 이동 처리
        const selected = basketGrid.querySelectorAll('.card.in-basket.selected');

        saveState(); // Save before reordering

        // Placeholder 위치에 선택된 카드들 삽입
        selected.forEach(card => {
            basketGrid.insertBefore(card, placeholderEl);
        });

        // Placeholder 제거는 dragend에서 처리됨 (또는 여기서 즉시 해도 됨)
        placeholderEl.remove();
        placeholderEl = null;

        // display 복구 (dragend보다 먼저 실행되어 깜빡임 방지)
        selected.forEach(card => card.style.display = 'flex');

        isBasketDirty = true;
        if (window.triggerAutoSave) window.triggerAutoSave();

        // [TUTORIAL TRIGGER]
        window.dispatchEvent(new Event('basket-reordered'));
    });
}

// 2D Flex Grid에서 정확한 위치 찾기
function getDragAfterElement(container, x, y) {
    const draggables = [...container.querySelectorAll('.card.in-basket:not(.dragging)')];

    let closest = { element: null, dist: Infinity };

    draggables.forEach(child => {
        const box = child.getBoundingClientRect();

        // 요소의 중심점
        const centerX = box.left + box.width / 2;
        const centerY = box.top + box.height / 2;

        // 마우스와 중심점 거리
        // (행이 다르면 거리가 멀어지므로 자연스럽게 처리됨)
        const dist = Math.hypot(x - centerX, y - centerY);

        if (dist < closest.dist) {
            closest = { element: child, dist: dist, centerX: centerX };
        }
    });

    if (!closest.element) return null; // 빈 경우

    // 가장 가까운 요소(Target)를 찾았다.
    // 마우스가 Target의 왼쪽인가 오른쪽인가?
    if (x > closest.centerX) {
        return closest.element.nextSibling;
    } else {
        return closest.element;
    }
}

// Initialize helper on load
document.addEventListener('DOMContentLoaded', initBasketDrop);

// === Internal Clipboard for Copy/Paste ===
let appClipboard = [];

// === Keyboard Shortcuts ===
window.addEventListener('keydown', (e) => {
    // Ignore if typing in an input field (e.g. search, preset name)
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // 1. Select All (Ctrl + A)
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault(); // Prevent text selection
        selectAll();
    }

    // 2. Copy (Ctrl + C)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const selected = basketGrid.querySelectorAll('.card.in-basket.selected');
        if (selected.length > 0) {
            appClipboard = []; // Clear previous
            selected.forEach(card => {
                appClipboard.push({
                    img: card.dataset.img,
                    name: card.dataset.name
                });
            });

            // Visual Feedback (Flash)
            selected.forEach(card => {
                card.style.transition = 'filter 0.1s';
                card.style.filter = 'brightness(1.5)';
                setTimeout(() => card.style.filter = '', 150);
            });
        }
    }

    // 3. Paste (Ctrl + V)
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (appClipboard.length > 0) {
            saveState(); // Save once before bulk paste
            appClipboard.forEach(item => {
                addToBasket(item.img, item.name, true); // true = skipSave
            });
            // Auto scroll to bottom to show new items
            basketGrid.parentElement.scrollTop = basketGrid.parentElement.scrollHeight;
        }
    }

    // 4. Delete (Delete or Backspace)
    if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
    }

    // 5. Deselect (Escape)
    if (e.key === 'Escape') {
        clearSelection();
        // Also close modal if open (handled in logic_ui, but safe here too)
    }

    // 6. Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
            redo();
        } else {
            undo();
        }
    }
    // Redo alternative (Ctrl + Y)
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
    }
});

// === Marquee Selection Logic (Explorer Style) ===
// Added: 2026-02-01
// Purpose: Allows multi-select by dragging on empty space, while preserving card DnD.

(function initMarquee() {
    const container = document.querySelector('.basket-section');
    const grid = document.getElementById('basket-grid');
    if (!container || !grid) return;

    let isSelecting = false;
    let startX, startY;
    let marquee = null;
    let initialSelectionState = new Set(); // Stores IDs or Indices of initially selected items

    // Helper: Check collision
    function checkCollision(marqueeRect, cardRect) {
        return !(
            marqueeRect.right < cardRect.left ||
            marqueeRect.left > cardRect.right ||
            marqueeRect.bottom < cardRect.top ||
            marqueeRect.top > cardRect.bottom
        );
    }

    container.addEventListener('mousedown', (e) => {
        // 1. Check if we clicked ON a card (or its children)
        if (e.target.closest('.card.in-basket')) {
            // Let native DnD or Click handle it
            return;
        }

        // 2. Start Selection
        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;

        // [User Request] Do NOT clear selection on mousedown.
        // We use "Additive" logic by default.
        // Capture initial state to support "Smart Additive" (allowing shrinking of current drag)
        initialSelectionState.clear();
        const cards = grid.querySelectorAll('.card.in-basket');
        cards.forEach((card, index) => {
            if (card.classList.contains('selected')) {
                initialSelectionState.add(index);
            }
        });

        // Create Marquee Element
        marquee = document.createElement('div');
        marquee.className = 'selection-marquee';
        marquee.style.left = startX + 'px';
        marquee.style.top = startY + 'px';
        marquee.style.width = '0px';
        marquee.style.height = '0px';
        document.body.appendChild(marquee);

        // Prevent text selection
        document.body.classList.add('no-select');
    });

    window.addEventListener('mousemove', (e) => {
        if (!isSelecting || !marquee) return;

        // Calculate dimensions
        const currentX = e.clientX;
        const currentY = e.clientY;

        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        const left = Math.min(currentX, startX);
        const top = Math.min(currentY, startY);

        marquee.style.width = width + 'px';
        marquee.style.height = height + 'px';
        marquee.style.left = left + 'px';
        marquee.style.top = top + 'px';

        // Real-time Selection Highlight
        const marqueeRect = marquee.getBoundingClientRect();
        const cards = grid.querySelectorAll('.card.in-basket');

        // Logic: Always Additive based on Initial State
        // - If in marquee: Select
        // - If NOT in marquee: Revert to Initial State (Keep if it was selected, Remove if it wasn't)

        cards.forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            const inMarquee = checkCollision(marqueeRect, cardRect);

            if (inMarquee) {
                // Must be selected
                card.classList.add('selected');
            } else {
                // Not in marquee -> Restore initial state
                if (initialSelectionState.has(index)) {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
            }
        });
    });

    window.addEventListener('mouseup', () => {
        if (isSelecting) {
            isSelecting = false;
            if (marquee) marquee.remove();
            marquee = null;
            initialSelectionState.clear();
            document.body.classList.remove('no-select');
        }
    });

})();

// 인쇄 설정
