// === 1. 샘플 데이터 (나중에 엑셀 연동 시 이 구조를 따름) ===
// data.js 에서 soundData를 불러옵니다.


// === 2. 상태 변수 ===
let currentMode = 'language'; // 'articulation' or 'language'
let currentPhoneme = "";
let activePositions = new Set(['All']); // 'All' or Set of keys
let activeSyllables = new Set(['All']); // 'All' or Set of numbers/keys
let currentLanguageCategory = null; // For Language Mode
let currentPresetName = null;
let dragSrcEl = null;

const sidebarEl = document.getElementById('sidebar');
const inventoryEl = document.getElementById('inventory');
const basketGrid = document.getElementById('basket-grid');
const presetListEl = document.getElementById('preset-list');

// Cache Buster removed by user request (Speed priority)
// let DATA_VERSION = Date.now();

// Search and Hangul helpers are loaded from js/logic_core_utils.js.

// === 3. 초기화 ===
async function init() {
    // 서버에서 데이터 가져오기 시도 (실패 시 data.js 의 soundData 사용)
    try {
        // [Version Check Removed]
        /*
        try {
            const vRes = await fetch('/api/version');
            if (vRes.ok) {
                const vData = await vRes.json();
                DATA_VERSION = vData.version || Date.now();
                console.log("[Client] Server Data Version:", DATA_VERSION);
            }
        } catch (e) { console.error("Version load failed", e); }
        */

        const res = await fetch('/api/cards');
        if (res.ok) {
            window.soundData = await res.json();
            console.log("Loaded data from server API");
        }
    } catch (e) {
        console.log("Server API not available, using static data.js");
    }

    // Fallback: If window.soundData is empty but global soundData exists (from data.js), use it.
    if (!window.soundData && typeof soundData !== 'undefined') {
        window.soundData = soundData;
    }

    // Pre-calculate search keys for performance
    if (window.soundData) {
        console.log("Pre-calculating keys for " + window.soundData.length + " items.");
        window.soundData.forEach(c => {
            // Fix: Use CLEAN name (remove [pronunciation]) to avoid double-counting phonemes
            // e.g. "감 [감]" -> "감" -> so _vowel is "ㅏ" not "ㅏㅏ"
            const rawName = c.name || '';
            const cleanName = rawName.split('[')[0].trim().normalize('NFC');

            c._cho = getChoSeong(cleanName);
            c._vowel = getVowelsOnly(cleanName);
            c._mixed = getSmartMixed(cleanName);
        });
    } else {
        console.error("No soundData found!");
    }

    createSidebar(); // Articulation sidebar
    createPositionMenu(); // Position Tabs
    createSyllableMenu(); // Syllable Tabs
    createLanguageMenu(); // Language sidebar (dynamic)

    // Initialize Mode UI
    // Pass the element that already has 'active' class (set in HTML) to prevent it from being cleared
    const activeBtn = document.querySelector('.tab-btn.active');
    setMode(currentMode, activeBtn);

    loadPresets();
}

// 모드 전환
window.setMode = function (mode, btn) {
    currentMode = mode;

    LogicMenuView.setSearchPlaceholder(mode);
    LogicMenuView.setTabButtonActive(btn);
    LogicMenuView.setModeLayout(mode);

    if (mode === 'articulation') {
        createPositionMenu(); // Position Tabs
        createSyllableMenu(); // Syllable Tabs

        renderCards();
    } else {
        // Render Syllable Tabs (Shared)
        createSyllableMenu();


        // Persistence Logic
        if (!currentTheme) {
            // First time entry: Default to Global All
            currentTheme = 'All';
            currentSubCategory = 'All';
        }

        // Restore Selection (Find button and click/select)
        setTimeout(() => {
            let btn;
            if (currentTheme === 'All') {
                // FIX: Must scope to #language-menu to avoid selecting the hidden Articulation button
                btn = document.querySelector('#language-menu .phoneme-btn.global-all');
            } else {
                btn = document.querySelector(`.phoneme-btn[data-theme="${currentTheme}"][data-sub="${currentSubCategory}"]`);
            }

            if (btn) {
                // Trigger selection
                selectLanguageFilter(currentTheme, currentSubCategory, btn);
                // Force active class (Backup)
                LogicMenuView.setLanguageButtonActive(btn);
            } else {
                renderCards();
            }
        }, 50); // Increased timeout slightly to ensure DOM render
    }
    // Refresh Presets List for the new mode
    loadPresets();
};

function createPositionMenu() {
    if (activePositions.size === 0) activePositions.add('All');
    LogicMenuView.renderPositionMenu(
        { activePositions },
        { onFilterPos: (pos, btn) => window.filterPos(pos, btn) }
    );
}

function createSyllableMenu() {
    if (activeSyllables.size === 0) activeSyllables.add('All');
    LogicMenuView.renderSyllableMenu(
        { activeSyllables, currentMode },
        { onFilterSyllable: (syll, btn) => window.filterSyllable(syll, btn) }
    );
}

// --- Language Mode Logic (6-Theme Structure) ---
const LANGUAGE_THEMES = {
    "사람/신체": ["전체", "가족", "직업", "신체부위", "옷·장신구"],
    "음식": ["전체", "과일·채소", "식사·요리", "간식·음료", "식재료"],
    "생활/사물": ["전체", "가구·가전", "주방·욕실용품", "학용품", "장난감", "생활용품"],
    "장소/환경": ["전체", "동물·곤충", "식물·자연", "교통기관", "장소"],
    "놀이/운동": ["전체", "운동", "악기·예술", "취미·놀이", "기념일·행사"],
    "서술/개념": ["전체", "서술어(행동/상태)", "감정", "색깔/모양", "수/양/비교", "위치/방향", "세부부위", "범주어", "시간/순서/날짜", "한글/글자", "말놀이(의성어,의태어)"]
};

let currentTheme = null; // Selected Theme (Sidebar)
let currentSubCategory = "전체"; // Selected Tab (Top)

function createLanguageMenu() {
    LogicMenuView.renderLanguageMenu(
        { soundData: window.soundData, languageThemes: LANGUAGE_THEMES },
        {
            onSelectLanguageFilter: selectLanguageFilter,
            onSelectMyCards: (btn) => {
                if (typeof selectMyCards === 'function') selectMyCards(btn);
            }
        }
    );
}

function selectLanguageFilter(theme, sub, btn) {
    currentTheme = theme;
    currentSubCategory = sub;

    // [FIX] Reset Filters (Syllable) when switching categories
    if (typeof resetFilters === 'function') resetFilters();
    LogicMenuView.setLanguageButtonActive(btn);

    // Clear Global Search
    const globInput = document.getElementById('global-search-input');
    if (globInput && globInput.value !== '') {
        globInput.value = '';
        LogicMenuView.setSearchClearVisible(false);
        isGlobalSearching = false;
    }

    // Render Cards
    renderCards();

    // Clear Top Tabs if any (to avoid confusion)
    LogicMenuView.clearPositionTabs();
}

function createSidebar() {
    if (!currentPhoneme) currentPhoneme = 'All';
    LogicMenuView.renderArticulationSidebar(
        { soundData: window.soundData, currentPhoneme },
        {
            onSelectPhoneme: selectPhoneme,
            onSelectMyCards: (btn) => {
                if (typeof selectMyCards === 'function') selectMyCards(btn);
            }
        }
    );
    if (currentMode === 'articulation') renderCards();
}

window.resetFilters = function () {
    // 탭 초기화 (위치 & 음절) -> Set All
    activePositions.clear();
    activePositions.add('All');
    createPositionMenu(); // Re-render to update UI

    activeSyllables.clear();
    activeSyllables.add('All');
    createSyllableMenu(); // Re-render to update UI
}

// 음소 선택
function selectPhoneme(phoneme, btn) {
    currentPhoneme = phoneme;
    LogicMenuView.setArticulationButtonActive(btn);

    resetFilters();

    // Special Case: If 'ㅇ(모음)' is selected, HIDE position tabs
    if (phoneme === 'ㅇ(모음)') {
        LogicMenuView.setPositionTabsVisible(false);
        // Force 'All' since positions are irrelevant
        activePositions.clear();
        activePositions.add('All');
    } else {
        LogicMenuView.setPositionTabsVisible(true);
    }

    // 검색어 초기화
    // document.getElementById('search-box').value = ''; // Old
    const globInput = document.getElementById('global-search-input');
    if (globInput && globInput.value !== '') {
        globInput.value = '';
        LogicMenuView.setSearchClearVisible(false);
        isGlobalSearching = false;
    }

    renderCards();
}

// 위치 필터 (Multi-Select)
window.filterPos = function (pos, btn) {
    if (pos === 'All') {
        activePositions.clear();
        activePositions.add('All');
    } else {
        if (activePositions.has('All')) activePositions.delete('All');

        if (activePositions.has(pos)) {
            activePositions.delete(pos);
        } else {
            activePositions.add(pos);
        }

        if (activePositions.size === 0) activePositions.add('All');
    }
    createPositionMenu(); // Re-render UI
    renderCards();
}

// 음절 필터 (Multi-Select)
window.filterSyllable = function (syll, btn) {
    if (syll === 'All') {
        activeSyllables.clear();
        activeSyllables.add('All');
    } else {
        if (activeSyllables.has('All')) activeSyllables.delete('All');

        if (activeSyllables.has(syll)) {
            activeSyllables.delete(syll);
        } else {
            activeSyllables.add(syll);
        }

        if (activeSyllables.size === 0) activeSyllables.add('All');
    }
    createSyllableMenu(); // Re-render UI
    renderCards();
}

// === Global Search Logic ===
let isGlobalSearching = false;

window.handleGlobalSearch = function (val) {
    if (val.length > 0) {
        LogicMenuView.setSearchClearVisible(true);
        isGlobalSearching = true;

        // Reset All Filters VISUALLY (but logic is handled dynamically in renderCards or here)
        // actually, user wants "filters to automatically change to 'All'"
        // So we explicitly reset variables and UI
        resetFiltersForSearch();
    } else {
        LogicMenuView.setSearchClearVisible(false);
        isGlobalSearching = false;
        // Optional: Do we restore previous state? User didn't specify. 
        // For now, staying in 'All' state is safer/simpler.
    }
    renderCards();
};

window.clearGlobalSearch = function () {
    const input = document.getElementById('global-search-input');
    input.value = '';
    handleGlobalSearch('');
    input.focus();
};

function resetFiltersForSearch() {
    // 1. Reset Position
    activePositions.clear();
    activePositions.add('All');
    createPositionMenu();

    // 2. Reset Syllable
    activeSyllables.clear();
    activeSyllables.add('All');
    createSyllableMenu();

    // 3. Reset Phoneme (Articulation) or Theme (Language)
    if (currentMode === 'articulation') {
        currentPhoneme = 'All';
        LogicMenuView.setArticulationAllActive();

        // Show position tabs again if they were hidden by 'ㅇ(모음)'
        LogicMenuView.setPositionTabsVisible(true);
    } else {
        currentTheme = 'All';
        currentSubCategory = 'All';
        LogicMenuView.setLanguageAllActive();

        // Clear top tabs if any
        LogicMenuView.clearPositionTabs();
    }
}

// 카드 렌더링 (검색 + 필터 통합)
window.renderCards = function () {
    inventoryEl.innerHTML = '';

    // New Global Search Input
    const searchInput = document.getElementById('global-search-input');

    // Normalize inputs for proper comparison
    const rawSearchVal = searchInput ? searchInput.value.trim().normalize('NFC') : '';
    const searchVal = normalizeForSearch(rawSearchVal);
    // const searchDis = disassembleHangul(searchVal); // Not used anymore

    const filterState = {
        currentPhoneme,
        activePositions,
        activeSyllables,
        currentTheme,
        currentSubCategory,
        languageThemes: LANGUAGE_THEMES
    };

    let filtered = currentMode === 'articulation'
        ? filterArticulationCards(window.soundData, filterState, rawSearchVal, searchVal)
        : filterLanguageCards(window.soundData, filterState, rawSearchVal, searchVal);

    // [FIX] Client-side sorting removed to respect Server's advanced sorting (4-Level Position Sort)
    // The server already sends data sorted optimally for both Articulation (Position) and Language (Name).
    // filtered.sort((a, b) => { ... });

    if (filtered.length === 0) {
        inventoryEl.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px; color:#999;">카드가 없습니다.</div>';
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        const cardView = getInventoryCardView(item, currentMode);
        const imgSrc = cardView.imgSrc;

        card.innerHTML = `
            <button class="card-menu-btn" title="메뉴">⋮</button>
            <img src="${imgSrc}" class="card-img" loading="lazy" onerror="this.src='https://via.placeholder.com/150?text=${encodeURIComponent(cardView.basketName)}'">
            <div class="card-name">${cardView.basketName}</div>
            ${cardView.extraInfo}
        `;

        // [New] Menu Button Event
        const menuBtn = card.querySelector('.card-menu-btn');
        if (menuBtn) {
            menuBtn.onclick = (e) => {
                e.stopPropagation(); // Prevent card selection / addToBasket
                const rect = menuBtn.getBoundingClientRect();
                const event = new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: rect.left,
                    clientY: rect.bottom + 5
                });
                menuBtn.dispatchEvent(event);
            };
        }

        if (cardView.hasTooltip) {
            card.classList.add('has-tooltip');
            card.dataset.tooltipText = cardView.tooltipText;
        }

        card.onclick = () => addToBasket(imgSrc, cardView.basketName);
        inventoryEl.appendChild(card);
    });
}

// 보이는 카드 모두 담기
window.addAllVisible = function () {
    const cards = inventoryEl.querySelectorAll('.card');
    if (cards.length === 0) return window.showAlert ? window.showAlert("담을 카드가 없습니다.") : alert("담을 카드가 없습니다.");

    // Batch Save: Save state ONCE before adding all
    if (typeof saveState === 'function') saveState();

    // 확인창 제거
    cards.forEach(card => {
        const img = card.querySelector('img').src; // 렌더링된 이미지 src 사용
        const name = card.querySelector('.card-name').innerText;
        // Pass true to skip saving state for each individual add
        addToBasket(img, name, true);
    });

    // Auto scroll to bottom
    if (basketGrid && basketGrid.parentElement) {
        basketGrid.parentElement.scrollTop = basketGrid.parentElement.scrollHeight;
    }
};

// === 4. 멀티 선택 및 드래그 로직 ===
let lastClickedIndex = -1; // Shift 선택을 위한 마지막 클릭 인덱스
