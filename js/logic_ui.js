// === Custom Context Menu Logic ===
const contextMenu = document.getElementById('custom-context-menu');
const imageModal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-img');
const modalCaption = document.getElementById('modal-caption');
let currentRightClickTarget = null; // Store target for actions

document.addEventListener('contextmenu', function (e) {
    e.preventDefault(); // Block default browser menu

    // Hide previous menu if any
    contextMenu.style.display = 'none';
    currentRightClickTarget = null;

    const target = e.target;
    const basketSection = target.closest('.basket-section');
    const inventoryGrid = target.closest('.inventory-grid');
    const card = target.closest('.card'); // Could be in basket or inventory

    let menuItems = [];

    // 1. Context: Basket Section (Card or Background)
    if (basketSection) {
        // Common Menu Items first
        menuItems.push({ text: '☑️ 전체 선택', action: 'select_all' });
        menuItems.push({ text: '⬜ 선택 해제', action: 'deselect' });
        menuItems.push({ type: 'divider' });
        menuItems.push({ text: '📋 선택 복사', action: 'duplicate' });
        menuItems.push({ text: '🗑️ 선택 삭제', action: 'delete' });
        menuItems.push({ type: 'divider' });
        menuItems.push({ text: '🗑️ 전체 삭제', action: 'clear_all', danger: true });

        // Add Zoom if clicked on a card
        if (card && card.classList.contains('in-basket')) {
            currentRightClickTarget = card;
            menuItems.push({ type: 'divider' });
            menuItems.push({ text: '🔍 크게 보기', action: 'zoom' });
            menuItems.push({ text: '📸 캡처 복사', action: 'copy_image' });
        } else {
            // Background click
        }
    }
    // 2. Context: Inventory Grid (Card only)
    else if (inventoryGrid) {
        if (card && !card.classList.contains('in-basket')) {
            // Right-clicked ON a card in inventory
            currentRightClickTarget = card;

            // [NEW] Check if it's a User Uploaded Card
            if (card.classList.contains('user-uploaded-card')) {
                menuItems.push({ text: '🗑️ 삭제하기', action: 'delete_user_card', danger: true });
                menuItems.push({ type: 'divider' });
            }

            menuItems.push({ text: '🔍 크게 보기', action: 'zoom' });
            menuItems.push({ text: '📸 캡처 복사', action: 'copy_image' });
        }
        // Background of inventory -> No menu (blocked)
    }

    // If we have items, show menu
    if (menuItems.length > 0) {
        renderCtxMenu(menuItems, e.pageX, e.pageY);
    }
});

// Hide menu on click anywhere (EXCEPT when interacting with Tutorial, Menu, or Button)
document.addEventListener('click', function (e) {
    const isTutorial = e.target.closest('.driver-popover') || e.target.closest('#driver-highlighted-element-stage');
    const isMenu = e.target.closest('#custom-context-menu');
    const isMenuBtn = e.target.closest('.card-menu-btn'); // [SAFEGUARD]

    // If clicking tutorial elements OR menu OR the open button, DO NOT close
    if (isTutorial || isMenu || isMenuBtn) return;

    contextMenu.style.display = 'none';
});

function renderCtxMenu(items, x, y) {
    contextMenu.innerHTML = '';

    items.forEach(item => {
        if (item.type === 'divider') {
            const div = document.createElement('div');
            div.className = 'ctx-divider';
            contextMenu.appendChild(div);
        } else {
            const div = document.createElement('div');
            div.className = 'ctx-menu-item';
            div.innerText = item.text;

            // Apply Danger Style if flag is set
            if (item.danger) {
                div.style.color = '#e74c3c'; // Red color
                div.style.fontWeight = 'bold';
            }

            div.onclick = (e) => {
                handleCtxAction(item.action);
                contextMenu.style.display = 'none'; // Auto-close menu
            };
            contextMenu.appendChild(div);
        }
    });

    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.style.display = 'block';
}

function handleCtxAction(action) {
    if (action === 'select_all') {
        if (window.selectAll) window.selectAll();
    } else if (action === 'deselect') {
        clearSelection();
    } else if (action === 'duplicate') {
        const selected = basketGrid.querySelectorAll('.card.in-basket.selected');
        let targets = [];
        if (selected.length > 0) {
            targets = Array.from(selected);
        } else if (currentRightClickTarget) {
            targets = [currentRightClickTarget];
        }
        if (targets.length === 0) return window.showAlert ? window.showAlert("복사할 카드를 선택해주세요.") : alert("복사할 카드를 선택해주세요.");
        targets.forEach(card => {
            const imgSrc = card.dataset.img || card.querySelector('img').getAttribute('src');
            const name = card.dataset.name || card.querySelector('.card-name').innerText;
            addToBasket(imgSrc, name);
        });
    } else if (action === 'delete') {
        deleteSelected();
    } else if (action === 'clear_all') {
        if (window.clearBasket) window.clearBasket();
    } else if (action === 'zoom') {
        if (currentRightClickTarget) {
            const img = currentRightClickTarget.querySelector('img').src;
            const name = currentRightClickTarget.querySelector('.card-name').innerText;
            openImageModal(img, name);
        }
    } else if (action === 'copy_image') {
        if (currentRightClickTarget) {
            const imgEl = currentRightClickTarget.querySelector('img');
            if (imgEl) {
                copyImageToClipboard(imgEl.src);
            }
        }
    } else if (action === 'delete_user_card') {
        if (currentRightClickTarget && currentRightClickTarget.dataset.filename) {
            if (window.deleteUserCard) {
                window.deleteUserCard(currentRightClickTarget.dataset.filename);
            }
        }
    }
}

// === Clipboard Helper (Auto-Convert to PNG for Compatibility) ===
async function copyImageToClipboard(src) {
    try {
        // 1. Load Image Object to get dimensions & data
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Required for canvas.toBlob
        img.src = src;

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        // 2. Draw to Canvas (Convert to PNG)
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // 3. Get PNG Blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

        // 4. Write PNG to Clipboard
        await navigator.clipboard.write([
            new ClipboardItem({
                'image/png': blob
            })
        ]);

        if (window.showAlert) window.showAlert("📸 클립보드에 복사되었습니다!<br>원하는 곳에 붙여넣기(Ctrl+V) 하세요.");
        else alert("복사 완료!");

    } catch (err) {
        console.warn("Standard Copy failed. Trying fallback...", err);
        tryLegacyCopy(src);
    }
}

// === Legacy Fallback for Insecure Contexts (HTTP/File) ===
// Converts image to Base64 -> Creates hidden img -> Selects -> execCommand('copy')
async function tryLegacyCopy(src) {
    try {
        // 1. Fetch & Convert to Base64
        const response = await fetch(src);
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = function () {
            const base64data = reader.result;

            // 2. Create hidden container
            const div = document.createElement('div');
            div.contentEditable = true;
            div.style.position = 'fixed';
            div.style.left = '-9999px';
            div.style.whiteSpace = 'nowrap';

            // 3. Create Image with Base64 Source
            const img = document.createElement('img');
            img.src = base64data;
            div.appendChild(img);
            document.body.appendChild(div);

            // 4. Select the image
            const range = document.createRange();
            range.selectNode(img);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            // 5. Execute Copy
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    if (window.showAlert) window.showAlert("📸 (호환모드) 복사되었습니다!<br>원하는 곳에 붙여넣기(Ctrl+V) 하세요.");
                    else alert("복사 완료!");
                } else {
                    throw new Error("execCommand returned false");
                }
            } catch (execErr) {
                console.error("Legacy Copy Failed:", execErr);
                if (window.showAlert) window.showAlert("이 브라우저/환경에서는 이미지 복사가 차단되었습니다.<br>우클릭 -> '이미지 다른 이름으로 저장'을 이용해주세요.");
                else alert("복사 실패");
            } finally {
                // Cleanup
                document.body.removeChild(div);
                selection.removeAllRanges();
            }
        };

        reader.readAsDataURL(blob);

    } catch (err) {
        console.error("Fallback Fetch Error:", err);
        if (window.showAlert) window.showAlert("이미지 로드 실패 (CORS/Network Error)");
    }
}

// === Image Modal Logic ===
function openImageModal(src, caption) {
    modalImg.src = src;
    modalCaption.innerText = caption;
    imageModal.style.display = 'flex';
}

window.closeImageModal = function () {
    imageModal.style.display = 'none';
    modalImg.src = ''; // clear
};

// ESC key to close modal
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeImageModal();
        closeInputGuideModal();
        contextMenu.style.display = 'none';
    }
});

// === Input Guide Modal ===
function openInputGuideModal() {
    document.getElementById('input-guide-modal').style.display = 'flex';
}

function closeInputGuideModal() {
    document.getElementById('input-guide-modal').style.display = 'none';
}
