
// ==========================================
// ⭐ 나만의 그림 (User Upload) Logic
// ==========================================

// Global State for Upload
let cropper = null; // Cropper.js instance
let uploadImageEl = null;

// In-memory list of user cards (synced with server)
let userCards = [];

function initUpload() {
    console.log("Initializing Upload Logic (Cropper.js)...");
    uploadImageEl = document.getElementById('crop-image');

    // Load initial user cards
    fetchUserCards();
}

// 1. Fetch User Cards
async function fetchUserCards() {
    try {
        const res = await fetch(`/api/user_cards?t=${Date.now()}`); // Cache busting
        if (res.ok) {
            userCards = await res.json();
            console.log("User cards loaded:", userCards.length);
        }
    } catch (e) {
        console.warn("Failed to fetch user cards (server might not be ready):", e);
        userCards = [];
    }
}

// 2. Select 'My Cards' Menu
function selectMyCards(btn) {
    // 1. toggle Active State
    // Deactivate all buttons (phoneme-btn AND my-cards-btn)
    document.querySelectorAll('.phoneme-btn').forEach(b => b.classList.remove('active'));

    if (btn) btn.classList.add('active');

    // 2. Hide other tabs/searches if necessary
    const posTabs = document.querySelector('.position-tabs');
    if (posTabs) posTabs.style.display = 'none'; // Hide articulation position tabs

    // [FIX] Reset Filters (Syllable) to avoid confusion
    if (typeof window.resetFilters === 'function') window.resetFilters();

    // 3. Render
    renderMyCards();
}

// 3. Render 'My Cards' Grid
window.renderMyCards = function () {
    const inventoryEl = document.getElementById('inventory');
    inventoryEl.innerHTML = '';

    // Title update (Optional)
    // const title = document.getElementById('sidebar-title');
    // if(title) title.innerText = "⭐ 나만의 그림 보관함";

    // A. Add "Upload New (+)" Card logic
    const currentCount = userCards.length;
    const maxLimit = 30;

    const uploadCard = document.createElement('div');
    uploadCard.className = 'card';
    uploadCard.style.border = '2px dashed #aaa';
    uploadCard.style.backgroundColor = '#f9f9f9';
    uploadCard.style.justifyContent = 'center';
    uploadCard.style.cursor = 'pointer';

    uploadCard.innerHTML = `
        <div style="font-size: 3rem; color: #aaa;">+</div>
        <div style="font-size: 1rem; font-weight: bold; color: #555; margin-top:10px;">새 그림 추가</div>
        <div style="font-size: 0.8rem; color: ${currentCount >= maxLimit ? 'red' : '#888'}; margin-top:5px;">
            (${currentCount} / ${maxLimit})
        </div>
    `;

    uploadCard.onclick = () => {
        if (currentCount >= maxLimit) {
            // Use custom modal instead of alert
            if (window.showAlert) {
                window.showAlert(`<b>⚠️ 저장 공간이 가득 찼습니다!</b><br><span style="font-size:0.9rem; color:#666;">(최대 ${maxLimit}장까지 저장 가능)</span><br><br>기존 그림을 삭제 후 다시 시도해주세요.`);
            } else {
                alert(`저장 공간이 가득 찼습니다! (최대 ${maxLimit}장)\n기존 그림을 삭제 후 다시 시도해주세요.`);
            }
            return;
        }
        openUploadModal();
    };
    inventoryEl.appendChild(uploadCard);

    // B. Render User Cards
    if (userCards.length === 0) {
        // Show placeholder or just the upload button
    }

    userCards.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card user-uploaded-card'; // Add marker class
        cardDiv.dataset.filename = card.image; // Store filename for deletion
        // path is relative to server root. user cards usually in 'user_images/...'
        const imgSrc = card.path; // API should return full relative path

        cardDiv.innerHTML = `
            <img src="${imgSrc}" class="card-img">
            <div class="card-name">${card.name}</div>
            <div style="font-size: 0.75rem; color: #2196F3; margin-top: 2px;">나만의 그림</div>
        `;

        // Tooltip logic
        if (card.name.length >= 4) {
            cardDiv.classList.add('has-tooltip');
            cardDiv.dataset.tooltipText = card.name;
        }

        cardDiv.onclick = () => addToBasket(imgSrc, card.name);
        inventoryEl.appendChild(cardDiv);
    });
}


// ==========================================
// 🖼️ Modal & Crop Logic (Cropper.js)
// ==========================================

function openUploadModal() {
    document.getElementById('upload-modal-overlay').style.display = 'flex';
    resetUploadStep();
}

function closeUploadModal() {
    document.getElementById('upload-modal-overlay').style.display = 'none';
    resetUploadStep();
}

function resetUploadStep() {
    document.getElementById('upload-step-1').style.display = 'block';
    document.getElementById('upload-step-2').style.display = 'none';
    document.getElementById('upload-confirm-btn').style.display = 'none';
    document.getElementById('upload-name-input').value = '';
    document.getElementById('upload-file-input').value = '';

    // Destroy previous cropper
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    if (uploadImageEl) uploadImageEl.src = '';
}

// Drag & Drop
function handleDragOver(e) { e.preventDefault(); }
function handleFileDrop(e) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) processFile(files[0]);
}
function handleFileSelect(input) {
    if (input.files.length > 0) processFile(input.files[0]);
}

function processFile(file) {
    if (!file.type.startsWith('image/')) {
        alert("이미지 파일만 업로드 가능합니다.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        // Setup UI
        document.getElementById('upload-step-1').style.display = 'none';
        document.getElementById('upload-step-2').style.display = 'flex';
        document.getElementById('upload-confirm-btn').style.display = 'block';
        document.getElementById('upload-confirm-btn').innerText = "자르기 및 저장";

        // Name guess
        let name = file.name.split('.')[0];
        document.getElementById('upload-name-input').value = name;

        // Init Cropper
        initCropper(e.target.result);
    };
    reader.readAsDataURL(file);
}

function initCropper(imgSrc) {
    if (!uploadImageEl) uploadImageEl = document.getElementById('crop-image');
    uploadImageEl.src = imgSrc;

    // Check if cropper exists and destroy
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }

    // Create new Cropper
    cropper = new Cropper(uploadImageEl, {
        aspectRatio: NaN, // Start Free (Canvas Style)
        viewMode: 1,
        autoCropArea: 0.8,

        // 🔒 Disable Image Manipulation
        dragMode: 'none',   // No image dragging
        zoomable: false,    // No wheel zoom
        movable: false,     // No image move

        // 🔓 Enable Crop Box Manipulation
        restore: false,
        guides: true,
        center: false,      // ✨ Fix: Don't force center the box
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,

        // Removed cropstart logic to prevent "Jumping"
        // Users can resize generally freely like in most simple editors
    });
}
// Old canvas logic removed


function drawCanvas() {
    if (!uploadCtx) return;
    uploadCtx.clearRect(0, 0, 300, 300);
    uploadCtx.fillStyle = "#eee";
    uploadCtx.fillRect(0, 0, 300, 300);

    if (uploadImage) {
        uploadCtx.drawImage(
            uploadImage,
            uploadOffsetX, uploadOffsetY,
            uploadImage.width * uploadScale,
            uploadImage.height * uploadScale
        );
    }
}

// Mouse Interaction
function startDrag(e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
}
function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    uploadOffsetX += dx;
    uploadOffsetY += dy;

    startX = e.clientX;
    startY = e.clientY;

    drawCanvas();
}
function endDrag() {
    isDragging = false;
}

function handleZoom(e) {
    e.preventDefault();
    const zoomSpeed = 0.001;
    // zoom logic...
    const delta = e.deltaY * -zoomSpeed;
    applyZoom(delta);
}

function handleSlider(e) {
    const val = parseInt(e.target.value);
    // 100 = baseScale
    // newScale = baseScale * (val / 100)
    const newScale = baseScale * (val / 100);

    // Adjust offset to keep center? For now simple scale update
    // Ideally we zoom towards center logic but plain update is often enough for simple UI
    // Let's try to keep center relative to viewport

    // Simple approach: calculate ratio and update
    const ratio = newScale / uploadScale;

    // Zoom around center of canvas (150, 150)
    // (offsetX - 150) * ratio + 150 = newOffsetX

    uploadOffsetX = (uploadOffsetX - 150) * ratio + 150;
    uploadOffsetY = (uploadOffsetY - 150) * ratio + 150;

    uploadScale = newScale;
    drawCanvas();
}

// +/- Buttons
window.stepZoom = function (dir) {
    const slider = document.getElementById('zoom-slider');
    let val = parseInt(slider.value);
    val += dir * 20; // Step 20
    if (val < 10) val = 10;
    if (val > 500) val = 500;
    slider.value = val;
    // Trigger event
    slider.dispatchEvent(new Event('input'));
}

function applyZoom(deltaPercent) {
    // deltaPercent is e.g. -0.1 or +0.1
    // We want to update Scale and Slider

    const oldScale = uploadScale;
    let newScale = oldScale + (oldScale * deltaPercent);

    // Limits based on baseScale
    // Min: 0.1 * baseScale
    // Max: 5 * baseScale
    if (newScale < baseScale * 0.1) newScale = baseScale * 0.1;
    if (newScale > baseScale * 5.0) newScale = baseScale * 5.0;

    // Sync Slider
    const sliderVal = (newScale / baseScale) * 100;
    document.getElementById('zoom-slider').value = sliderVal;

    // Apply Center Zoom logic
    // Zoom point is mouse position usually, but wheel is generic here. Center (150,150)
    const ratio = newScale / oldScale;
    uploadOffsetX = (uploadOffsetX - 150) * ratio + 150;
    uploadOffsetY = (uploadOffsetY - 150) * ratio + 150;

    uploadScale = newScale;
    drawCanvas();
}


// ==========================================
// 🚀 Final Processing & Upload
// ==========================================
function processUpload() {
    if (!cropper) return;

    const nameInput = document.getElementById('upload-name-input');
    const name = nameInput.value.trim();
    if (!name) {
        alert("카드의 이름을 입력해주세요.");
        return;
    }

    // 1. Get Cropped Canvas (1000x1000 for high quality)
    const finalCanvas = cropper.getCroppedCanvas({
        width: 1000,
        height: 1000,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
    });

    if (!finalCanvas) {
        alert("이미지 처리 실패");
        return;
    }

    // 2. Convert to Blob
    finalCanvas.toBlob(async (blob) => {
        console.log("Image processed. Size:", blob.size);

        // 3. Send to Server
        const formData = new FormData();
        // Use user-typed name for filename so server saves it correctly
        // [Unique Filename] Append timestamp to bypass caching
        const timestamp = Date.now();
        const filename = `${name}_${timestamp}.webp`;
        formData.append('file', blob, filename);
        formData.append('name', name);

        try {
            const btn = document.getElementById('upload-confirm-btn');
            btn.innerText = "업로드 중...";
            btn.disabled = true;

            const res = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const result = await res.json();
                console.log("Upload Success:", result);
                userCards.push(result.card);
                renderMyCards();
                closeUploadModal();
            } else if (res.status === 403) {
                // Handle 403 (Storage Full)
                if (window.showAlert) {
                    window.showAlert("<b>⚠️ 저장 공간이 가득 찼습니다!</b><br>기존 그림을 삭제해야 새로운 그림을 올릴 수 있습니다.");
                } else {
                    alert("⚠️ 저장 공간이 가득 찼습니다! (최대 30장)\n기존 그림을 삭제해야 새로운 그림을 올릴 수 있습니다.");
                }
            } else {
                throw new Error("Server returned " + res.status);
            }
        } catch (e) {
            console.error(e);
            let msg = "업로드 실패: " + e.message;
            // if (window.location.protocol === 'file:') msg = "⚠️ 오류: 웹 서버 필요";

            if (window.showAlert) window.showAlert(msg);
            else alert(msg);
        } finally {
            const btn = document.getElementById('upload-confirm-btn');
            btn.innerText = "저장하기";
            btn.disabled = false;
        }
    }, 'image/webp', 0.8);
}

// 4. Delete Function (Called from logic_ui.js)
// 4. Delete Function (Called from logic_ui.js)
window.deleteUserCard = function (filename) {
    // [User Request] Silent Delete without confirmation
    executeDelete(filename);
}

async function executeDelete(filename) {
    try {
        const res = await fetch('/api/user_cards', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: filename })
        });

        if (res.ok) {
            // Update local list
            userCards = userCards.filter(c => c.image !== filename);
            renderMyCards();
            // User requested NO success alert
            // alert("삭제되었습니다."); 
        } else {
            console.error("Delete failed");
            if (window.showAlert) window.showAlert("삭제 실패: 서버 오류");
            else alert("삭제 실패: 서버 오류");
        }
    } catch (e) {
        console.error(e);
        if (window.showAlert) window.showAlert("삭제 중 오류 발생");
        else alert("삭제 중 오류 발생");
    }
}

// ==========================================
// 5. Drag & Drop Handlers (Missing Fix)
// ==========================================
window.handleDragOver = function (e) {
    e.preventDefault();
    e.stopPropagation();
    // Optional: Visual feedback (can be handled via CSS :hover or dragover class)
}

window.handleDrop = function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const mockInput = { files: e.dataTransfer.files };
        handleFileSelect(mockInput);
    }
}
