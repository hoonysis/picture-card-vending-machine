"use strict";

// Global Cache for Presets (to reduce API calls on simple renders)
window.userPresetsCache = [];

// Helper to get User ID from URL
function getCurrentUserId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('user') || 'guest';
}

// 1. Fetch Presets from Server (Async)
// 0. Update UI with Current User Name
function updateUserNameDisplay() {
    const userId = getCurrentUserId();
    const titleEl = document.querySelector('.preset-title');
    if (titleEl) {
        if (!titleEl.querySelector('.user-badge')) {
            const badge = document.createElement('span');
            badge.className = 'user-badge';
            badge.style.fontSize = '0.75rem';
            badge.style.color = '#666';
            badge.style.marginLeft = '8px';
            badge.style.fontWeight = 'normal';
            badge.innerText = `(접속 ID: ${userId})`;
            titleEl.appendChild(badge);
        }
    }
}

// 1. Fetch Presets from Server (Async)
// 1. Fetch Presets from Server (Async)
async function fetchUserPresets() {
    const userId = getCurrentUserId();
    let data = [];

    try {
        const res = await fetch(`/api/user_presets?user=${userId}`);
        if (res.ok) {
            data = await res.json();
        } else {
            console.warn("Server returned error, checking LocalStorage...");
            throw new Error("Server Error");
        }
    } catch (e) {
        console.warn("Fetch failed (Offline Mode?), checking LocalStorage:", e);
        // Fallback to LocalStorage
        try {
            const localData = localStorage.getItem('userPresets');
            if (localData) {
                data = JSON.parse(localData);
            }
        } catch (err) {
            console.error("LocalStorage read failed:", err);
        }
    }

    // Update Cache
    window.userPresetsCache = data || [];
    return window.userPresetsCache;
}

// 2. Save Presets to Server (Async)
async function saveUserPresets(presets) {
    const userId = getCurrentUserId();
    // Update Cache Immediately for UI responsiveness
    window.userPresetsCache = presets;

    // Always save to LocalStorage as backup (or primary if offline)
    try {
        localStorage.setItem('userPresets', JSON.stringify(presets));
    } catch (e) {
        console.error("LocalStorage save failed:", e);
    }

    try {
        const res = await fetch(`/api/user_presets?user=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(presets)
        });

        if (!res.ok) {
            throw new Error("Server save failed");
        }
    } catch (e) {
        console.warn("Server save failed (Offline Mode?), saved to LocalStorage only.");
        // Suppress alert in offline mode to avoid annoyance, 
        // OR show a different toast "Saved to local storage"
        // For now, silent fallback is better than error loop.
    }
}

// 3. Add New Preset
window.addNewPreset = async function (mode) {
    const title = mode === 'current' ? "현재 그림 저장" : "빈 저장소 추가";
    const msg = mode === 'current' ?
        "현재 인쇄 대기 목록을 포함하여<br>새로운 저장소를 만듭니다.<br>이름을 입력하세요:" :
        "비어있는 새로운 저장소를 만듭니다.<br>이름을 입력하세요:";

    window.showPrompt(title, msg, async function (name) {
        if (!name) return;

        const cleanName = name.trim();
        if (!cleanName) {
            window.showAlert("이름을 입력해야 합니다.");
            return;
        }

        const presets = await fetchUserPresets(); // Ensure we have latest
        if (presets.some(p => p.name === cleanName)) {
            window.showAlert("이미 존재하는 이름입니다.");
            return;
        }

        // Capture Data
        let initialData = [];
        if (mode === 'current') {
            const currentItems = document.querySelectorAll('#basket-grid .card.in-basket');
            currentItems.forEach(el => {
                initialData.push({
                    name: el.querySelector('.card-name').innerText,
                    img: el.querySelector('img').src
                });
            });
        }

        // Add & Save
        presets.push({ name: cleanName, data: initialData });
        await saveUserPresets(presets);

        window.showAlert("저장 성공! '" + cleanName + "' 저장소가 생성되었습니다.");

        // Auto-switch
        switchPreset(cleanName);
    });
};

// 4. Load & Render Presets
window.loadPresets = async function () {
    updateUserNameDisplay(); // Show User ID

    // 1. Hide Manual Buttons (Cleanup UI)
    const manualBtns = document.querySelector('.backup-group');
    if (manualBtns) manualBtns.style.display = 'none';

    // 2. Fetch Data
    const presets = await fetchUserPresets();

    // 3. Sort
    presets.sort((a, b) => a.name.localeCompare(b.name, 'ko-KR', { sensitivity: 'base' }));

    const container = document.getElementById('preset-list');
    if (container) {
        container.innerHTML = '';
        presets.forEach((preset, index) => {
            const tag = document.createElement('div');
            tag.className = 'preset-tag';

            // Active State
            if (currentPresetName && preset.name === currentPresetName) {
                tag.classList.add('active');
                // Styles are now handled by CSS (.preset-tag.active)
            }

            // Metadata
            const safeName = (preset.name || "").normalize('NFC');
            tag.dataset.name = safeName.toLowerCase();

            let cho = "";
            if (typeof window.getChoSeong === 'function') {
                cho = window.getChoSeong(safeName);
            }
            tag.dataset.cho = cho;

            const escapedName = preset.name.replace(/'/g, "\\'");

            tag.innerHTML = `
                <span onclick="switchPreset('${escapedName}')" style="display:flex; align-items:center; gap:5px; cursor:pointer;">
                    ${currentPresetName === preset.name ? '📂' : '📁'} ${preset.name}
                </span>
                <span class="preset-menu-btn" onclick="togglePresetMenu(event, '${escapedName}')">⋮</span>
            `;
            container.appendChild(tag);
        });

        // Restore Search
        const searchInput = document.getElementById('preset-search-input');
        if (searchInput && searchInput.value.trim() !== '') {
            filterPresets(searchInput.value);
        }
    }
};

// Global Listener to close dropdowns
document.addEventListener('click', function (e) {
    if (!e.target.closest('.preset-menu-btn')) {
        closeAllDropdowns();
    }
});

function closeAllDropdowns() {
    const existing = document.querySelectorAll('.preset-dropdown');
    existing.forEach(el => el.remove());
}

// 4a. Preset Context Menu
window.togglePresetMenu = function (e, name) {
    e.stopPropagation();
    closeAllDropdowns();

    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();

    const dropdown = document.createElement('div');
    dropdown.className = 'preset-dropdown show';

    // Position: Below the button, aligned right
    dropdown.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    dropdown.style.left = (rect.left + window.scrollX) + 'px';

    dropdown.innerHTML = `
        <div class="dropdown-item" onclick="triggerRename('${name}')">
            <span>✏️</span> 이름 변경
        </div>
        <div class="dropdown-item delete" onclick="deletePreset('${name}')">
            <span>🗑️</span> 삭제
        </div>
    `;

    document.body.appendChild(dropdown);
};

// 4b. Rename Logic
window.triggerRename = function (oldName) {
    // Close menu first
    closeAllDropdowns();

    window.showPrompt("이름 변경", `현재 이름: ${oldName}<br>새로운 이름을 입력하세요:`, async function (newName) {
        if (!newName || newName.trim() === "") return;
        const cleanNewName = newName.trim();

        if (cleanNewName === oldName) return; // No change

        let presets = await fetchUserPresets();

        // Check duplicate
        if (presets.some(p => p.name === cleanNewName)) {
            window.showAlert("이미 존재하는 이름입니다.");
            return;
        }

        // Update Name
        const idx = presets.findIndex(p => p.name === oldName);
        if (idx !== -1) {
            presets[idx].name = cleanNewName;
            await saveUserPresets(presets);

            // If renamed active preset, update global var
            if (currentPresetName === oldName) {
                currentPresetName = cleanNewName;
            }

            // window.showAlert("이름이 변경되었습니다."); // Removed by user request
            loadPresets();
        }
    }, oldName); // Pass oldName as default value if prompt supports it (our custom prompt might not, but good practice)
};

// Flag to prevent auto-save during preset switching
window.isSwitchingPreset = false;

// 5. Switch Preset
// 5a. Blocking Toast Helper (Simple & Effective)
function showBlockingToast(msg) {
    const div = document.createElement('div');
    div.id = 'blocking-toast';
    div.style = "position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(0,0,0,0.8); color:white; padding:15px 30px; border-radius:30px; z-index:9999; font-weight:bold; font-size:1.2rem; display:flex; align-items:center; gap:10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);";
    div.innerHTML = `<span class="spinner" style="animation: spin 1s linear infinite;">⏳</span> <span>${msg}</span>`;

    // Add simple spinner style if not exists
    if (!document.getElementById('spinner-style')) {
        const style = document.createElement('style');
        style.id = 'spinner-style';
        style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } } .spinner { display:inline-block; }`;
        document.head.appendChild(style);
    }

    document.body.appendChild(div);
    return div;
}

// 5. Switch Preset (Blocking & Safe)
window.switchPreset = async function (name) {
    if (window.isSwitchingPreset) return; // Prevent double switching
    window.isSwitchingPreset = true; // Lock Auto-Save

    let toast = null;
    try {
        // [SAFETY] Force Save Current State First
        if (currentPresetName) {
            toast = showBlockingToast("저장 중...");
            console.log("[SafeSwitch] Flushing unsaved changes...");
            await window.flushAutoSave();
        }

        currentPresetName = name;

        // Note: We use cache here if available to speed up switching
        // But fetchUserPresets() is safer if syncing is critical. 
        // Let's use cache for reading, but fetch if empty.
        let presets = window.userPresetsCache;
        if (!presets || presets.length === 0) {
            presets = await fetchUserPresets();
        }

        const target = presets.find(p => p.name === name);

        if (target) {
            loadBasket(target.data || []);
            loadPresets(); // Re-render to update 'active' class
        } else {
            loadPresets();
        }
    } catch (e) {
        console.error("Switch Error:", e);
        if (window.showAlert) window.showAlert("이동 중 오류가 발생했습니다.");
    } finally {
        if (toast) toast.remove();
        // Unlock Auto-Save delay
        setTimeout(() => {
            window.isSwitchingPreset = false;
        }, 300); // Slightly longer delay to be safe
    }
};

// 6. Auto-Save Logic (Debounced + Flusy)
let autoSaveTimer = null;

// The actual save function
async function executeSave() {
    const targetName = currentPresetName;
    if (!targetName) return;

    const items = document.querySelectorAll('#basket-grid .card.in-basket');
    const data = [];
    items.forEach(el => {
        data.push({
            name: el.querySelector('.card-name').innerText,
            img: el.querySelector('img').src
        });
    });

    try {
        // Fetch fresh presets to avoid overwriting other changes (simple concurrency)
        const presets = await fetchUserPresets();
        const idx = presets.findIndex(p => p.name === targetName);

        if (idx !== -1) {
            presets[idx].data = data;
            await saveUserPresets(presets);
            console.log(`[AutoSave] Saved preset '${targetName}' (${data.length} items)`);
        }
    } catch (e) {
        console.error("AutoSave Failed:", e);
    }
}

// Debounce Trigger
window.triggerAutoSave = function () {
    if (window.isSwitchingPreset) return; // Skip if switching

    // Cancel existing timer
    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    // Set new timer (1.0s)
    autoSaveTimer = setTimeout(async () => {
        await executeSave();
        autoSaveTimer = null;
    }, 1000);
};

// Immediate Flush (for switching)
window.flushAutoSave = async function () {
    if (autoSaveTimer) {
        console.log("[Flush] Pending save found. Executing immediately...");
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
        await executeSave();
    }
};

// 7. Delete Preset
window.deletePreset = function (name) {
    // Close menu first
    closeAllDropdowns();

    window.showConfirm(`'${name}' 저장소를 정말 삭제하시겠습니까?`, async function () {
        let presets = await fetchUserPresets();
        presets = presets.filter(p => p.name !== name);
        await saveUserPresets(presets);

        if (currentPresetName === name) {
            currentPresetName = null;
        }

        loadPresets();
    });
};

// 8. Filter Presets (Client Side)
window.filterPresets = function (query) {
    const container = document.getElementById('preset-list');
    if (!container) return;
    const tags = container.querySelectorAll('.preset-tag');
    const lowerQuery = query.trim().normalize('NFC').toLowerCase();

    tags.forEach(tag => {
        const name = tag.dataset.name || "";
        const cho = tag.dataset.cho || "";
        if (name.includes(lowerQuery) || cho.includes(lowerQuery)) {
            tag.style.display = "";
        } else {
            tag.style.display = "none";
        }
    });
};

// 9. Load Basket Helper
function loadBasket(data) {
    const basketGrid = document.getElementById('basket-grid');
    const cards = basketGrid.querySelectorAll('.card.in-basket');
    cards.forEach(c => c.remove());

    data.forEach(item => {
        if (typeof addToBasket === 'function') {
            addToBasket(item.img, item.name, true, true); // skipSave=true, fromSystem=true (Bypass Limit)
        }
    });



    const event = new Event('basketLoaded');
    window.dispatchEvent(event);
}

// Init Hook
if (document.readyState === 'complete') {
    window.loadPresets();
} else {
    window.addEventListener('load', window.loadPresets);
}
