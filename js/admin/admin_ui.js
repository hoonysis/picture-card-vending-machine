// ==========================================
// 🎨 Admin UI Logic (Rendering & Interactions)
// ==========================================

let selectedCards = new Set();
let currentFilteredCards = [];
let lastSelectedIndex = -1; // For shift-click range selection
window.renderedUniqueCards = []; // Expose for selection logic

// --- Helper Functions ---
function getCardSig(c) {
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

function selectAllCards() {
    // Select all visible cards
    currentFilteredCards.forEach(c => {
        const sig = getCardSig(c);
        selectedCards.add(sig);
    });
    renderGrid();
}

function toggleSelection(card, element, event, index) {
    const listToUse = window.renderedUniqueCards.length ? window.renderedUniqueCards : currentFilteredCards;
    const sig = getCardSig(card);

    // Shift Multiselect
    if (event.shiftKey && lastSelectedIndex !== -1 && lastSelectedIndex !== index) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        const grid = document.getElementById('card-grid');

        for (let i = start; i <= end; i++) {
            const targetCard = listToUse[i];
            if (!targetCard) continue;

            const targetSig = getCardSig(targetCard);
            selectedCards.add(targetSig);

            if (grid.children[i]) {
                grid.children[i].classList.add('selected');
            }
        }
    } else if (event.ctrlKey || event.metaKey) { // [NEW] Ctrl Click (Toggle)
        if (selectedCards.has(sig)) {
            selectedCards.delete(sig);
            element.classList.remove('selected');
        } else {
            selectedCards.add(sig);
            element.classList.add('selected');
        }
    } else { // [NEW] Normal Click (Exclusive Select) 
        // Deselect All Others logic 
        selectedCards.clear();
        const allSelected = document.querySelectorAll('.card.selected');
        allSelected.forEach(el => el.classList.remove('selected'));

        // Select Current
        selectedCards.add(sig);
        element.classList.add('selected');
    }

    lastSelectedIndex = index;
}

// --- Main Rendering ---
function renderGrid() {
    const grid = document.getElementById('card-grid');
    grid.innerHTML = '';

    const filterP = document.getElementById('filter-phoneme').value;
    const filterPos = document.getElementById('filter-pos').value;
    const searchInput = document.getElementById('search-input');
    const filterLangMain = document.getElementById('filter-language-main') ? document.getElementById('filter-language-main').value : 'All';
    const filterLangSub = document.getElementById('filter-language-sub') ? document.getElementById('filter-language-sub').value : 'All';


    // Normalize inputs for proper comparison
    const rawSearch = searchInput.value.trim().normalize('NFC');
    const search = normalizeForSearch(rawSearch);

    console.log("Sorting Cards...");
    currentFilteredCards = allCards.filter(c => {
        const matchP = filterP === 'All' || c.main === filterP;
        const matchPos = filterPos === 'All' || c.sub === filterPos;

        // New Language Filters
        const cMain = c.part_of_speech || "미분류";
        const cSub = c.language_category || "";

        const matchLangMain = filterLangMain === 'All' || cMain === filterLangMain;
        const matchLangSub = filterLangSub === 'All' || cSub === filterLangSub;

        // Advanced Search
        let matchS = true;
        if (search) {
            // Strict Search Logic
            const isPureVowel = /^[ㅏ-ㅣ]+$/.test(rawSearch);
            const isPureCho = /^[ㄱ-ㅎ]+$/.test(rawSearch);

            if (isPureVowel) {
                // Normalize target vowel
                matchS = normalizeForSearch(c._vowel || '').includes(search);
            } else if (isPureCho) {
                // Consonants - no normalization needed
                matchS = (c._cho || '').includes(rawSearch);
            } else {
                // Default: Text (Syllables) or Mixed (Cho+Jung)
                const cardName = (c.name || '').normalize('NFC');
                const textMatch = normalizeForSearch(cardName).includes(search);
                const mixedMatch = normalizeForSearch(c._mixed || '').includes(search);
                matchS = textMatch || mixedMatch;
            }
        }

        return matchP && matchPos && matchLangMain && matchLangSub && matchS;
    }).sort((a, b) => {
        // Sorting Logic:
        // 1. Initial Consonant (ChoSeong) Group (ㄱ, ㄴ, ㄷ...)
        // 2. Word Length (Shortest first)
        // 3. Name Alphabetical (Group homonyms)
        // 4. Filename Alphabetical

        const nameA = a.name ? a.name.split('[')[0].trim() : '';
        const nameB = b.name ? b.name.split('[')[0].trim() : '';

        // 1. Initial Consonant Index
        const getChoIdx = (str) => {
            if (!str) return 999;
            const code = str.charCodeAt(0);
            // Hangul Syllable Area
            if (code >= 0xAC00 && code <= 0xD7A3) {
                return Math.floor(((code - 0xAC00) / 28) / 21);
            }
            // Hangul Jamo Area
            if (code >= 0x3131 && code <= 0x314E) {
                return 100 + code;
            }
            return 200 + code; // Non-hangul
        };

        const idxA = getChoIdx(nameA);
        const idxB = getChoIdx(nameB);

        if (idxA !== idxB) return idxA - idxB;

        // 2. Word Length
        if (nameA.length !== nameB.length) return nameA.length - nameB.length;

        // 3. Name Alphabetical (Same word grouping)
        if (nameA !== nameB) return nameA.localeCompare(nameB);

        // 4. Filename (Homonym ordering)
        return a.image.localeCompare(b.image);
    });

    console.log("Sorted count:", currentFilteredCards.length);

    // Update Statistics
    const totalCount = currentFilteredCards.length;

    // Count unique images for Language Words (deduplicate by image filename)
    const uniqueLangWords = new Set();
    currentFilteredCards.forEach(c => {
        if (c.part_of_speech && c.part_of_speech !== '미분류') {
            uniqueLangWords.add(c.image);
        }
    });
    const langCount = uniqueLangWords.size;

    const statsEl = document.getElementById('list-stats');
    if (statsEl) {
        statsEl.innerHTML = `조음 단어 : <span style="color:#2196F3; font-weight:bold;">${totalCount}</span>개 / 언어 단어 : <span style="color:#4CAF50; font-weight:bold;">${langCount}</span>개`;
    }

    // ---------------------------------------------------------
    // Deduplicate by Image (One Card per Image)
    // ---------------------------------------------------------
    const groupedCards = new Map();

    currentFilteredCards.forEach(c => {
        if (!groupedCards.has(c.image)) {
            // Create Composite Card
            groupedCards.set(c.image, {
                ...c,
                phoneme_list: []
            });
        }
        const composite = groupedCards.get(c.image);
        // Collect Full Phoneme Info
        composite.phoneme_list.push({ main: c.main, sub: c.sub });
    });

    // Flatten back to array
    const uniqueCards = Array.from(groupedCards.values());
    window.renderedUniqueCards = uniqueCards; // Expose global

    // Render UNIQUE cards
    uniqueCards.forEach((c, index) => {
        const el = document.createElement('div');
        el.className = 'card';

        const sig = getCardSig(c);
        if (selectedCards.has(sig)) {
            el.classList.add('selected');
        }

        // URL 인코딩 제거
        const imgSrc = `${c.folder}/${c.image}`;

        // 언어 정보 표시 (있으면)
        const langInfo = (c.part_of_speech || c.language_category)
            ? `<div style="font-size: 0.65rem; color: #2196F3; margin-top:2px;">${c.part_of_speech || '-'} / ${c.language_category || '-'}</div>`
            : '';

        el.innerHTML = `
            <div class="card-info" style="padding: 5px; display: flex; flex-direction: column; gap: 4px; align-items: center; text-align: center;">
                <!-- Thumbnail Image -->
                <img src="${imgSrc}" style="max-width: 100%; max-height: 50px; object-fit: contain; border-radius: 4px;" loading="lazy">

                <div style="font-size: 0.8rem; font-weight: bold; line-height: 1.1; word-break: keep-all; color: #000;">
                    ${c.name} <span style="font-size:0.7rem; color:#888; font-weight:normal;">(${c.image})</span>
                </div>
                ${langInfo}
            </div>
        `;
        el.onclick = (e) => toggleSelection(c, el, e, index); // index here is from uniqueCards
        grid.appendChild(el);
    });
}

// Make globally available
window.getCardSig = getCardSig;
window.selectAllCards = selectAllCards;
window.renderGrid = renderGrid;

// --- Loading Helpers ---
let loadingTimer = null;

function showLoading(msg) {
    if (loadingTimer) clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            // Optional: Update text if msg provided 
        }
    }, 3000);
}

function hideLoading() {
    if (loadingTimer) {
        clearTimeout(loadingTimer);
        loadingTimer = null;
    }
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

function renderGridWithLoading() {
    showLoading();
    setTimeout(() => {
        if (window.renderGrid) window.renderGrid();
        hideLoading();
    }, 50);
}

// --- Option Helpers ---
const POSITIONS = ["어두초성", "어중초성", "어중종성", "어말종성"];

function getPhonemeOptions(selected) {
    if (typeof PHONEMES === 'undefined') return '';
    return PHONEMES.map(p => `<option value="${p}" ${p === selected ? 'selected' : ''}>${p}</option>`).join('');
}

function getPosOptions(selected) {
    return POSITIONS.map(p => `<option value="${p}" ${p === selected ? 'selected' : ''}>${p}</option>`).join('');
}

// --- Custom Modal Helpers ---
function showAlert(msg) {
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

function closeAlert() {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) modal.style.display = 'none';
}

function closeCustomConfirm() {
    const modal = document.getElementById('custom-confirm-modal');
    if (modal) modal.style.display = 'none';
}

function showConfirm(msg, callback) {
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

function showDuplicateModal(existingUrl, filename) {
    const modal = document.getElementById('duplicate-modal');
    const existingImg = document.getElementById('dup-existing-img');
    const newImg = document.getElementById('dup-new-img');

    const previewEl = document.getElementById('preview');
    const previewSrc = previewEl ? previewEl.src : '';

    if (existingImg) existingImg.src = existingUrl;
    if (newImg) newImg.src = previewSrc;

    if (modal) modal.style.display = 'flex';
}

function closeDuplicateModal() {
    const modal = document.getElementById('duplicate-modal');
    if (modal) modal.style.display = 'none';
}

function confirmDuplicateUpload() {
    closeDuplicateModal();
    if (window.uploadCard) window.uploadCard(true);
}

function showHelpModal() {
    const modal = document.getElementById('help-modal');
    if (modal) {
        modal.style.display = 'flex';
        const btn = modal.querySelector('.btn-primary');
        if (btn) btn.focus();
    }
}

function closeHelpModal() {
    const modal = document.getElementById('help-modal');
    if (modal) modal.style.display = 'none';
}

// --- Edit Modal Logic ---
let currentEditCard = null;

function updateEditCategoryOptions(selectedValue = null) {
    const mainSelect = document.getElementById('edit-part-speech');
    const subSelect = document.getElementById('edit-category');
    if (!mainSelect || !subSelect) return;

    const mainVal = mainSelect.value;
    subSelect.innerHTML = '';

    let subs = [];
    if (typeof LANGUAGE_THEMES !== 'undefined' && LANGUAGE_THEMES[mainVal]) {
        subs = LANGUAGE_THEMES[mainVal].filter(s => s !== '전체');
    }

    if (subs.length === 0) {
        const opt = document.createElement('option');
        opt.value = "";
        opt.text = "-";
        subSelect.appendChild(opt);
    } else {
        subs.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.text = s;
            subSelect.appendChild(opt);
        });
    }

    if (selectedValue) {
        subSelect.value = selectedValue;
    }
}

function openEditModal(card) {
    currentEditCard = card;
    const modal = document.getElementById('edit-modal');
    if (modal) modal.style.display = 'flex';

    const img = document.getElementById('edit-preview-img');
    if (img) img.src = `${card.folder}/${card.image}`;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val || '';
    };

    setVal('edit-original-folder', card.folder);
    setVal('edit-original-image', card.image);
    setText('edit-name-display', card.name);

    let phonemeHTML = "";
    if (card.phoneme_list && card.phoneme_list.length > 0) {
        phonemeHTML = card.phoneme_list.map(p => `<div>${p.main} / ${p.sub}</div>`).join('');
    } else {
        phonemeHTML = `<div>${card.main} / ${card.sub}</div>`;
    }
    const pDisplay = document.getElementById('edit-phoneme-display');
    if (pDisplay) pDisplay.innerHTML = phonemeHTML;

    setVal('edit-name', card.name);
    setVal('edit-phoneme', card.main);
    setVal('edit-pos', card.sub);

    const pVal = card.part_of_speech || '미분류';
    setVal('edit-part-speech', pVal);

    updateEditCategoryOptions(card.language_category);
}

function closeModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) modal.style.display = 'none';
    currentEditCard = null;
}

async function saveEdit() {
    if (!currentEditCard) return;

    showLoading();

    const payload = {
        original_folder: currentEditCard.folder,
        original_image: currentEditCard.image,
        original_main: currentEditCard.main,
        original_sub: currentEditCard.sub,
        name: null,
        main: null,
        sub: null,
        part_of_speech: document.getElementById('edit-part-speech').value,
        language_category: document.getElementById('edit-category').value
    };

    try {
        const res = await fetch('/api/cards', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            closeModal();
            if (typeof selectedCards !== 'undefined') selectedCards.clear();
            if (window.loadCards) window.loadCards();
        } else showAlert("수정 실패");
    } catch (e) {
        showAlert("오류 발생");
    } finally {
        hideLoading();
    }
}

async function deleteCard() {
    showConfirm("정말 삭제하시겠습니까?", async () => {
        showLoading();
        try {
            const res = await fetch('/api/cards', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folder: currentEditCard.folder,
                    image: currentEditCard.image,
                    main: currentEditCard.main,
                    sub: currentEditCard.sub,
                    name: currentEditCard.name
                })
            });
            if (res.ok) {
                closeModal();
                if (typeof selectedCards !== 'undefined') selectedCards.clear();
                if (typeof DATA_VERSION !== 'undefined') DATA_VERSION = Date.now();
                if (window.loadCards) window.loadCards();
            } else showAlert("삭제 실패");
        } catch (e) {
            showAlert("오류 발생");
        } finally {
            hideLoading();
        }
    });
}

// --- Filter & Language UI ---
function renderLanguageCheckboxes() {
    const container = document.getElementById('language-checkbox-container');
    if (!container || typeof LANGUAGE_THEMES === 'undefined') return;
    container.innerHTML = '';

    Object.keys(LANGUAGE_THEMES).forEach(theme => {
        const groupDiv = document.createElement('div');
        groupDiv.style.marginBottom = '15px';

        const title = document.createElement('div');
        title.innerText = theme;
        title.style.fontWeight = 'bold';
        title.style.color = '#1565c0';
        title.style.marginBottom = '5px';
        title.style.fontSize = '0.9rem';
        groupDiv.appendChild(title);

        const subContainer = document.createElement('div');
        subContainer.style.display = 'flex';
        subContainer.style.flexWrap = 'wrap';
        subContainer.style.gap = '8px';

        const subs = LANGUAGE_THEMES[theme].filter(s => s !== '전체');
        subs.forEach(sub => {
            const label = document.createElement('label');
            label.style.display = 'inline-flex';
            label.style.alignItems = 'center';
            label.style.gap = '6px';
            label.style.fontSize = '0.9rem';
            label.style.cursor = 'pointer';
            label.style.background = '#fff';
            label.style.padding = '6px 12px';
            label.style.borderRadius = '20px';
            label.style.border = '1px solid #cfd8dc';
            label.style.transition = 'all 0.2s';
            label.style.whiteSpace = 'nowrap';
            label.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            label.style.minWidth = 'fit-content';

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'language_selection';
            input.value = `${theme}|${sub}`;
            input.dataset.theme = theme;
            input.dataset.sub = sub;
            input.style.accentColor = '#2196F3';

            input.onchange = () => {
                document.querySelectorAll('#language-checkbox-container label').forEach(l => {
                    l.style.background = '#fff';
                    l.style.borderColor = '#cfd8dc';
                    l.style.color = '#333';
                    l.style.fontWeight = 'normal';
                    l.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                });
                if (input.checked) {
                    label.style.background = '#e3f2fd';
                    label.style.borderColor = '#2196F3';
                    label.style.color = '#1565c0';
                    label.style.fontWeight = 'bold';
                    label.style.boxShadow = '0 2px 4px rgba(33, 150, 243, 0.2)';
                }
            };

            let htmlContent = sub;
            if (sub.includes('(')) {
                htmlContent = sub.replace(/\(([^)]+)\)/, '<span style="font-size:0.9em">($1)</span>');
            }

            label.appendChild(input);
            label.insertAdjacentHTML('beforeend', `<span>${htmlContent}</span>`);
            subContainer.appendChild(label);
        });

        groupDiv.appendChild(subContainer);
        container.appendChild(groupDiv);
    });
}

function populateFilterLanguageMain() {
    const el = document.getElementById('filter-language-main');
    if (!el || typeof LANGUAGE_THEMES === 'undefined') return;
    el.innerHTML = '<option value="All">모든 언어대범주</option>';

    Object.keys(LANGUAGE_THEMES).forEach(theme => {
        const opt = document.createElement('option');
        opt.value = theme;
        opt.text = theme;
        el.appendChild(opt);
    });
    if (window.updateFilterLanguageSub) window.updateFilterLanguageSub();
}

function updateFilterLanguageSub() {
    const mainVal = document.getElementById('filter-language-main').value;
    const subEl = document.getElementById('filter-language-sub');
    if (!subEl) return;

    subEl.innerHTML = '<option value="All">모든 언어소범주</option>';

    if (mainVal !== 'All' && typeof LANGUAGE_THEMES !== 'undefined' && LANGUAGE_THEMES[mainVal]) {
        const subs = LANGUAGE_THEMES[mainVal].filter(s => s !== '전체');
        subs.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.text = s;
            subEl.appendChild(opt);
        });
    }
}

function toggleList() {
    const container = document.getElementById('list-container');
    const icon = document.getElementById('list-toggle-icon');
    if (!container || !icon) return;

    if (container.style.display === 'none') {
        container.style.display = 'block';
        icon.innerText = '▲ 접기';
    } else {
        container.style.display = 'none';
        icon.innerText = '▼ 펼치기';
    }
}

// Exports
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.renderGridWithLoading = renderGridWithLoading;
window.getPhonemeOptions = getPhonemeOptions;
window.getPosOptions = getPosOptions;
window.showAlert = showAlert;
window.closeAlert = closeAlert;
window.showConfirm = showConfirm;
window.closeCustomConfirm = closeCustomConfirm;
window.showDuplicateModal = showDuplicateModal;
window.closeDuplicateModal = closeDuplicateModal;
window.confirmDuplicateUpload = confirmDuplicateUpload;
window.showHelpModal = showHelpModal;
window.closeHelpModal = closeHelpModal;
window.openEditModal = openEditModal;
window.closeModal = closeModal;
window.saveEdit = saveEdit;
window.deleteCard = deleteCard;
window.updateEditCategoryOptions = updateEditCategoryOptions;
window.renderLanguageCheckboxes = renderLanguageCheckboxes;
window.populateFilterLanguageMain = populateFilterLanguageMain;
window.updateFilterLanguageSub = updateFilterLanguageSub;
window.toggleList = toggleList;

// --- Toolbar Handlers ---
function handleEditBtn() {
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

function handleDeselect() {
    selectedCards.clear();
    renderGrid();
}

async function handleDeleteSelected() {
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

async function handleDeleteAll() {
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
        } else if (confirmModal && confirmModal.style.display === 'flex') { // Fixed: display check
            closeCustomConfirm();
        } else {
            selectedCards.clear();
            renderGrid();
            if (contextMenu) contextMenu.style.display = 'none';
        }
    }

    // 3. Delete (Delete Selected)
    else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isInput) return;
        if (selectedCards.size > 0) {
            handleDeleteSelected();
        }
    }

    // 4. F2 (Edit)
    else if (e.key === 'F2') {
        if (isInput) return;
        handleEditBtn();
    }

    // [NEW] F3 (Analyze)
    else if (e.key === 'F3') {
        // Allow F3 even in inputs, as it's a function key often used for this purpose
        e.preventDefault();
        if (window.analyzeName && document.getElementById('input-name')) {
            // Pass the value from logic if needed, but analyzeName usually reads from DOM or takes arg
            // check admin_upload.js: analyzeName(name)
            // if called without arg, it might fail? 
            // Logic in admin_upload.js: analyzeName(name) checks if name is present.
            // But the onclick in HTML is: if(window.analyzeName) analyzeName()
            // Wait, analyzeName(name) needs a name. 
            // HTML line 120: onclick="if(window.analyzeName) analyzeName()"
            // Let's check analyzeName implementation in admin_upload.js line 52.
            // It takes `name`. IF name is undefined, it returns.
            // BUT, wait. In admin.html, the onclick calls `analyzeName()`.
            // Does `analyzeName()` grab the value if argument is missing?
            // Looking at admin_upload.js:
            // `async function analyzeName(name) { if (!name) return; ... }`
            // If called with no args, `name` is undefined, so it returns immediately.
            // So the button in HTML `analyzeName()` probably DOES NOTHING?!
            // Let me double check admin.html line 130: `onkeydown="if(event.key==='Enter' && window.analyzeName) analyzeName()"`
            // It seems I might have missed something. 
            // If the existing button works, then `analyzeName` must handle empty args.
            // checking admin_upload.js again.
            // Line 52: `async function analyzeName(name) { if (!name) return; ... }`
            // This implies providing a name is mandatory.
            // So `analyzeName()` (no args) -> `name` is undefined -> returns.

            // UNLESS, I missed a modification where it reads from input if null.
            // Let me re-read admin_upload.js in the view_file output.
            // Ah, I don't see it reading from DOM.
            // Wait, maybe the HTML calls it differently?
            // HTML Line 120: `onclick="if(window.analyzeName) analyzeName()"`
            // If that is true, the button is BROKEN too?
            // Or maybe `name` implies event object? No.

            // Let's look at `admin_upload.js` imports/exports or if I missed a line. 
            // I'll assume I need to pass the value.
            const nameVal = document.getElementById('input-name').value;
            // But wait, if I hit F3 while focusing on input-name, I want to analyze THAT.
            window.analyzeName(nameVal);
        }
    }

    // 5. F4 (Smart Action)
    else if (e.key === 'F4') {
        e.preventDefault();
        // Check global flag from admin_upload.js
        if (typeof window.isRenaming !== 'undefined' && window.isRenaming) {
            if (window.confirmInterceptorName) window.confirmInterceptorName();
        } else {
            if (window.uploadCard) window.uploadCard();
        }
    }
});

// Exports
window.handleEditBtn = handleEditBtn;
window.handleDeselect = handleDeselect;
window.handleDeleteSelected = handleDeleteSelected;
window.handleDeleteAll = handleDeleteAll;

// --- Initialization Helpers ---

function populateSelects() {
    const phSelect = document.getElementById('filter-phoneme');
    const posSelect = document.getElementById('filter-pos');

    // Safety check for PHONEMES/POSITIONS
    if (phSelect && typeof PHONEMES !== 'undefined') {
        phSelect.innerHTML = '<option value="All">모든 음소</option>' +
            PHONEMES.map(p => `<option value="${p}">${p}</option>`).join('');
    }

    // POSITIONS is local to this file, so we can use it directly if defined
    // But check if POSITIONS is defined in scope (it is at top of file)
    if (posSelect && typeof POSITIONS !== 'undefined') {
        posSelect.innerHTML = '<option value="All">모든 위치</option>' +
            POSITIONS.map(p => `<option value="${p}">${p}</option>`).join('');
    }
}

function initContextMenu() {
    const contextMenu = document.getElementById('custom-context-menu');
    const cardGrid = document.getElementById('card-grid');

    if (!contextMenu || !cardGrid) return; // Guard

    // 1. Disable Global Right Click
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });

    // 2. Show Custom Menu only on Card Grid
    cardGrid.addEventListener('contextmenu', function (e) {
        e.preventDefault();

        // Show temporarily to measure size
        contextMenu.style.display = 'block';
        contextMenu.style.visibility = 'hidden';

        const menuWidth = contextMenu.offsetWidth;
        const menuHeight = contextMenu.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let x = e.clientX;
        let y = e.clientY;

        // Smart Positioning
        if (x + menuWidth > windowWidth) x -= menuWidth;
        if (y + menuHeight > windowHeight) y -= menuHeight;

        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.style.visibility = 'visible';
    });

    // 3. Hide Menu on Click Elsewhere
    document.addEventListener('click', function () {
        contextMenu.style.display = 'none';
        contextMenu.style.visibility = 'visible'; // Reset to default behavior if needed
    });
}

// Additional Exports
window.populateSelects = populateSelects;
window.initContextMenu = initContextMenu;
