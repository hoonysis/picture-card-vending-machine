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

// --- Advanced Hangul Search Logic ---
// --- Advanced Hangul Search Logic ---
const CHO_SUNG = ["\u3131", "\u3132", "\u3134", "\u3137", "\u3138", "\u3139", "\u3141", "\u3142", "\u3143", "\u3145", "\u3146", "\u3147", "\u3148", "\u3149", "\u314A", "\u314B", "\u314C", "\u314D", "\u314E"];
const JUNG_SUNG = ["\u314F", "\u3150", "\u3151", "\u3152", "\u3153", "\u3154", "\u3155", "\u3156", "\u3157", "\u3158", "\u3159", "\u315A", "\u315B", "\u315C", "\u315D", "\u315E", "\u315F", "\u3160", "\u3161", "\u3162", "\u3163"];
const JONG_SUNG = ["", "\u3131", "\u3132", "\u3133", "\u3134", "\u3135", "\u3136", "\u3137", "\u3139", "\u313A", "\u313B", "\u313C", "\u313D", "\u313E", "\u313F", "\u3140", "\u3141", "\u3142", "\u3144", "\u3145", "\u3146", "\u3147", "\u3148", "\u314A", "\u314B", "\u314C", "\u314D", "\u314E"];

// 1. Choseong Only (For 'ㄱㅈ' -> '과자')
function getChoSeong(str) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const diff = code - 0xAC00;
            const chosungIdx = Math.floor(diff / (21 * 28));
            result += CHO_SUNG[chosungIdx];
        } else {
            result += str[i];
        }
    }
    return result;
}
window.getChoSeong = getChoSeong; // Export for external use

// 2. Vowels Only (For 'ㅜㅠ' -> '우유')
function getVowelsOnly(str) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const diff = code - 0xAC00;
            const jungsungIdx = Math.floor((diff % (21 * 28)) / 28);
            result += JUNG_SUNG[jungsungIdx];
        } else {
            // Check if it's already a Jamo Vowel (U+314F~U+3163)
            if (code >= 0x314F && code <= 0x3163) {
                result += str[i];
            }
        }
    }
    return result;
}

// 3. Smart Mixed (Cho + Jung, NO Jongseong, NO Initial 'ㅇ') (For 'ㅏㄱ' -> '아기')
function getSmartMixed(str) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const diff = code - 0xAC00;
            const chosungIdx = Math.floor(diff / (21 * 28));
            const jungsungIdx = Math.floor((diff % (21 * 28)) / 28);

            // ChoSeong (Skip if 'ㅇ')
            if (CHO_SUNG[chosungIdx] !== 'ㅇ') {
                result += CHO_SUNG[chosungIdx];
            }
            // JungSeong (Always include)
            result += JUNG_SUNG[jungsungIdx];

            // JongSeong (ALWAYS SKIP)
        } else {
            result += str[i];
        }
    }
    return result;
}





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

    // [Dynamic Placeholder]
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
        if (mode === 'articulation') {
            searchInput.placeholder = "🗣️ 조음 자판기에서 검색... (초성, 음절, 단어)";
        } else {
            searchInput.placeholder = "📚 언어 자판기에서 검색... (초성, 음절, 단어)";
        }
    }

    // Tab Style Update
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // Sidebar Visibility
    const artMenu = document.getElementById('articulation-menu');

    const langMenu = document.getElementById('language-menu');
    const title = document.getElementById('sidebar-title');

    // Tab Container
    const tabsContainer = document.querySelector('.position-tabs');

    if (mode === 'articulation') {
        artMenu.classList.remove('hidden');
        langMenu.classList.add('hidden');
        title.innerText = "목표 음소 선택";

        // Restore Articulation Tabs
        // Restore Articulation Tabs
        createPositionMenu(); // Position Tabs
        createSyllableMenu(); // Syllable Tabs

        renderCards();
    } else {
        artMenu.classList.add('hidden');
        langMenu.classList.remove('hidden');
        title.innerText = "언어 범주 선택";

        // Clear Tabs initially (will be filled if needed or cleared)
        // Clear Tabs initially (will be filled if needed or cleared)
        // tabsContainer.innerHTML = ''; // createPositionMenu will handle clearing if called, but here we skipped it.
        // But we need to CLEAR position tabs for Language Mode
        document.querySelector('.position-tabs').innerHTML = '';

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
                document.querySelectorAll('#language-menu .phoneme-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            } else {
                renderCards();
            }
        }, 50); // Increased timeout slightly to ensure DOM render
    }
    // Refresh Presets List for the new mode
    loadPresets();
};

// 조음 메뉴 생성 (위치 탭) - Renamed from createArticulationMenu
// 조음 메뉴 생성 (위치 탭) - Renamed from createArticulationMenu
function createPositionMenu() {
    const tabsContainer = document.querySelector('.position-tabs');
    tabsContainer.innerHTML = '';

    const positions = ["전체", "어두초성", "어중초성", "어중종성", "어말종성"];
    positions.forEach(pos => {
        const btn = document.createElement('button');
        btn.className = 'pos-btn';

        const val = pos === '전체' ? 'All' : pos;
        if (activePositions.has(val)) btn.classList.add('active');

        btn.innerText = pos;
        btn.onclick = () => filterPos(val, btn);
        tabsContainer.appendChild(btn);
    });

    if (activePositions.size === 0) activePositions.add('All');
}

// 음절 메뉴 생성 (공통)
// 음절 메뉴 생성 (공통)
function createSyllableMenu() {
    // Remove existing if any
    const oldSyllTabs = document.querySelector('.syllable-tabs');
    if (oldSyllTabs) oldSyllTabs.remove();

    const syllableContainer = document.createElement('div');
    syllableContainer.className = 'syllable-tabs';

    const syllables = ["전체", "1음절", "2음절", "3음절", "4음절", "5음절", "6음절 이상"];
    syllables.forEach(syll => {
        const btn = document.createElement('button');
        btn.className = 'syllable-btn';

        const val = syll === '전체' ? 'All' : parseInt(syll);

        // Check Set
        if (activeSyllables.has(val)) btn.classList.add('active');

        btn.innerText = syll;
        btn.onclick = () => filterSyllable(val, btn);
        syllableContainer.appendChild(btn);
    });

    // Append next to position tabs
    // Wrapper structure: <div class="filter-left-group"> <div class="position-tabs"></div> <div class="syllable-tabs"></div> </div>
    document.querySelector('.filter-left-group').appendChild(syllableContainer);

    // Add visual separator (border) if in Articulation Mode (where Position tabs exist)
    if (currentMode === 'articulation') {
        syllableContainer.style.borderLeft = '1px solid #ddd';
        syllableContainer.style.paddingLeft = '10px';
        syllableContainer.style.marginLeft = '5px';
    }

    if (activeSyllables.size === 0) activeSyllables.add('All');
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
    const menu = document.getElementById('language-menu');
    menu.innerHTML = '';

    // 0. Global 'All' Button
    // 0. Global 'All' Button
    // Calculate Total Language Unique Count
    const totalLangUnique = new Set();
    soundData.forEach(c => {
        if (c.part_of_speech && c.part_of_speech !== '미분류') {
            totalLangUnique.add(c.image);
        }
    });
    const totalLangCount = totalLangUnique.size;

    const globalBtn = document.createElement('button');
    globalBtn.className = 'phoneme-btn global-all';
    globalBtn.innerHTML = `<span>전체 보기 <span style="font-weight:normal; opacity:0.8;">(${totalLangCount})</span></span>`;
    globalBtn.style.marginBottom = '10px';
    globalBtn.dataset.theme = 'All'; // Attribute for restoration
    globalBtn.dataset.sub = 'All';

    globalBtn.onclick = () => selectLanguageFilter('All', 'All', globalBtn);
    menu.appendChild(globalBtn);

    // [New] My Cards Button (Integrated)
    const myCardsBtn = document.createElement('button');
    myCardsBtn.className = 'phoneme-btn my-cards-btn';
    myCardsBtn.innerHTML = `<span>⭐ 나만의 그림</span>`;
    myCardsBtn.style.marginBottom = '10px';
    myCardsBtn.onclick = () => {
        if (typeof selectMyCards === 'function') selectMyCards(myCardsBtn);
    };
    menu.appendChild(myCardsBtn);

    Object.keys(LANGUAGE_THEMES).forEach(theme => {
        // Calculate Theme Count (Unique)
        const themeSubs = LANGUAGE_THEMES[theme].filter(s => s !== '전체');
        const uniqueThemeItems = new Set();
        soundData.forEach(c => {
            // Check if card belongs to this theme
            if (themeSubs.includes(c.language_category) || c.language_category === theme) {
                uniqueThemeItems.add(c.image);
            }
        });
        const themeCount = uniqueThemeItems.size;

        // 1. Container for Header + 'All' Button
        const headerContainer = document.createElement('div');
        headerContainer.style.display = 'flex';
        headerContainer.style.justifyContent = 'space-between';
        headerContainer.style.alignItems = 'center';
        headerContainer.style.padding = '12px 10px 4px 10px';
        headerContainer.style.marginTop = '5px';
        headerContainer.style.borderBottom = '1px solid rgba(255,255,255,0.1)';

        // Label
        const label = document.createElement('span');
        label.innerText = `${theme} (${themeCount})`;
        label.style.color = '#FFB74D';
        label.style.fontSize = '0.9rem';
        label.style.fontWeight = 'bold';

        // 'All' Button (Inline)
        const allBtn = document.createElement('button');
        allBtn.innerText = '전체';
        allBtn.style.background = 'rgba(255,255,255,0.1)';
        allBtn.style.border = 'none';
        allBtn.style.color = '#ccc';
        allBtn.style.fontSize = '0.75rem';
        allBtn.style.padding = '2px 8px';
        allBtn.style.borderRadius = '10px';
        allBtn.style.cursor = 'pointer';
        allBtn.dataset.theme = theme; // Attribute
        allBtn.dataset.sub = '전체';

        allBtn.onmouseover = () => allBtn.style.background = 'rgba(255,255,255,0.2)';
        allBtn.onmouseout = () => allBtn.style.background = 'rgba(255,255,255,0.1)';

        allBtn.onclick = () => selectLanguageFilter(theme, "전체", allBtn);

        headerContainer.appendChild(label);
        headerContainer.appendChild(allBtn);
        menu.appendChild(headerContainer);

        // 2. Sub-categories (Buttons) - Skip '전체'
        const subCats = LANGUAGE_THEMES[theme].filter(s => s !== '전체');
        subCats.forEach(sub => {
            // Calculate Sub Count (Unique)
            const uniqueSubItems = new Set();
            soundData.forEach(c => {
                if ((c.language_category || "").trim() === sub) {
                    uniqueSubItems.add(c.image);
                }
            });
            const subCount = uniqueSubItems.size;

            const btn = document.createElement('button');
            btn.className = 'phoneme-btn sub-cat-item';
            btn.style.fontSize = '0.9rem';
            btn.style.padding = '6px 10px 6px 15px';
            btn.style.justifyContent = 'flex-start';
            btn.style.whiteSpace = 'nowrap'; // Prevent wrapping

            // Styled text with count
            let htmlContent = sub;
            if (sub.includes('(')) {
                htmlContent = sub.replace(/\(([^)]+)\)/, '<span style="font-size:0.9em">($1)</span>');
            }
            btn.innerHTML = `<span>${htmlContent} <span style="font-weight:normal; opacity:0.7; font-size:0.85em;">(${subCount})</span></span>`;

            btn.dataset.theme = theme; // Attribute
            btn.dataset.sub = sub;

            btn.onclick = () => selectLanguageFilter(theme, sub, btn);
            menu.appendChild(btn);
        });
    });
}

function selectLanguageFilter(theme, sub, btn) {
    currentTheme = theme;
    currentSubCategory = sub;

    // [FIX] Reset Filters (Syllable) when switching categories
    if (typeof resetFilters === 'function') resetFilters();
    const menu = document.getElementById('language-menu');
    menu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // Clear Global Search
    const globInput = document.getElementById('global-search-input');
    if (globInput && globInput.value !== '') {
        globInput.value = '';
        document.querySelector('.search-clear-btn').style.display = 'none';
        isGlobalSearching = false;
    }

    // Render Cards
    renderCards();

    // Clear Top Tabs if any (to avoid confusion)
    const tabsContainer = document.querySelector('.position-tabs');
    if (tabsContainer) tabsContainer.innerHTML = '';
}

function renderLanguageTabs(theme) {
    // Deprecated: No longer showing top tabs in Language Mode
}


// 사이드바 생성 (음소 목록) - Modified to append to specific menu
function createSidebar() {
    const artMenu = document.getElementById('articulation-menu');
    artMenu.innerHTML = ''; // Prevent duplication
    // 원하는 정렬 순서
    const orderList = [
        "ㅇ(모음)",
        "ㅂ", "ㅃ", "ㅍ", "ㅁ",
        "ㄷ", "ㄸ", "ㅌ", "ㄴ",
        "ㅅ", "ㅆ",
        "ㄹ",
        "ㅈ", "ㅉ", "ㅊ",
        "ㄱ", "ㄲ", "ㅋ", "ㅇ(받침)",
        "ㅎ"
    ];

    // 1) Use orderList as the fixed phoneme list (Show ALL even if empty)
    const phonemes = orderList;

    // 정렬 로직 적용
    phonemes.sort((a, b) => {
        const idxA = orderList.indexOf(a);
        const idxB = orderList.indexOf(b);

        // 둘 다 순서 리스트에 있으면 순서대로
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        // a만 있으면 a가 먼저
        if (idxA !== -1) return -1;
        // b만 있으면 b가 먼저
        if (idxB !== -1) return 1;
        // 둘 다 없으면 가나다순
        return a.localeCompare(b);
    });

    // 0. Global 'All' Button
    // Count Total
    const totalCount = soundData.length;

    const globalBtn = document.createElement('button');
    globalBtn.className = 'phoneme-btn global-all';
    globalBtn.innerHTML = `<span>전체 보기 <span style="font-weight:normal; opacity:0.7; font-size:0.75em;">(${totalCount})</span></span>`;
    globalBtn.style.marginBottom = '10px';
    // Removed hardcoded background
    globalBtn.onclick = () => selectPhoneme('All', globalBtn);
    // Insert at top
    artMenu.appendChild(globalBtn);

    // [New] My Cards Button (Integrated)
    const myCardsBtn = document.createElement('button');
    myCardsBtn.className = 'phoneme-btn my-cards-btn';
    myCardsBtn.innerHTML = `<span>⭐ 나만의 그림</span>`;
    myCardsBtn.onclick = () => {
        if (typeof selectMyCards === 'function') selectMyCards(myCardsBtn);
    };
    artMenu.appendChild(myCardsBtn);

    // 첫 번째 음소 자동 선택 (Default to 'All' if nothing selected, or keep 'ㅇ(모음)')
    if (!currentPhoneme) currentPhoneme = 'All';
    if (currentPhoneme === 'All') globalBtn.classList.add('active');

    phonemes.forEach((p, index) => {
        // Count per Phoneme
        const count = soundData.filter(c => c.main === p).length;

        const btn = document.createElement('button');
        btn.className = `phoneme-btn ${p === currentPhoneme ? 'active' : ''}`;
        btn.innerHTML = `<span>${p} <span style="font-weight:normal; opacity:0.7; font-size:0.7em;">(${count})</span></span>`;
        btn.onclick = () => selectPhoneme(p, btn);
        artMenu.appendChild(btn);
    });
    // renderCards(); // Called in init? No, called at end of createSidebar originally. 
    // We should call render with default params
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
    document.querySelectorAll('.phoneme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    resetFilters();

    // Special Case: If 'ㅇ(모음)' is selected, HIDE position tabs
    const posTabs = document.querySelector('.position-tabs');
    if (phoneme === 'ㅇ(모음)') {
        if (posTabs) posTabs.style.display = 'none';
        // Force 'All' since positions are irrelevant
        activePositions.clear();
        activePositions.add('All');
    } else {
        if (posTabs) posTabs.style.display = 'flex';
    }

    // 검색어 초기화
    // document.getElementById('search-box').value = ''; // Old
    const globInput = document.getElementById('global-search-input');
    if (globInput && globInput.value !== '') {
        globInput.value = '';
        document.querySelector('.search-clear-btn').style.display = 'none';
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
    const clearBtn = document.querySelector('.search-clear-btn');
    if (val.length > 0) {
        clearBtn.style.display = 'block';
        isGlobalSearching = true;

        // Reset All Filters VISUALLY (but logic is handled dynamically in renderCards or here)
        // actually, user wants "filters to automatically change to 'All'"
        // So we explicitly reset variables and UI
        resetFiltersForSearch();
    } else {
        clearBtn.style.display = 'none';
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
        document.querySelectorAll('#articulation-menu .phoneme-btn').forEach(b => b.classList.remove('active'));
        const globalBtn = document.querySelector('#articulation-menu .global-all');
        if (globalBtn) globalBtn.classList.add('active');

        // Show position tabs again if they were hidden by 'ㅇ(모음)'
        const posTabs = document.querySelector('.position-tabs');
        if (posTabs) posTabs.style.display = 'flex';
    } else {
        currentTheme = 'All';
        currentSubCategory = 'All';
        document.querySelectorAll('#language-menu button').forEach(b => b.classList.remove('active'));
        const globalBtn = document.querySelector('#language-menu .global-all');
        if (globalBtn) globalBtn.classList.add('active');

        // Clear top tabs if any
        const tabsContainer = document.querySelector('.position-tabs');
        if (tabsContainer) tabsContainer.innerHTML = '';
    }
}

// Helper for phonetic search equivalence (ㅔ == ㅐ)
function normalizeForSearch(text) {
    // NFD decompose to separate Jamo, replace 'ㅐ'(1162) with 'ㅔ'(1166), then Recompose NFC
    // Also handle compatibility Jamo 'ㅐ'(3150) -> 'ㅔ'(3154) just in case
    return (text || '').normalize('NFD')
        .replace(/\u1162/g, '\u1166')
        .replace(/\u3150/g, '\u3154')
        .normalize('NFC');
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

    let filtered = [];

    if (currentMode === 'articulation') {
        // 조음 모드 필터링
        filtered = window.soundData.filter(card => {
            if (currentPhoneme !== 'All' && card.main !== currentPhoneme) return false;
            if (!activePositions.has('All') && !activePositions.has(card.sub)) return false;

            // Syllable Count Filter (Multi-Select)
            if (!activeSyllables.has('All')) {
                // Extract clean name
                let cleanName = card.name.split('[')[0].trim();
                const len = cleanName.length;

                let match = false;
                if (len >= 6 && activeSyllables.has(6)) match = true;
                else if (activeSyllables.has(len)) match = true;

                if (!match) return false;
            }

            if (searchVal) {
                // Strict Search Logic
                const isPureVowel = /^[ㅏ-ㅣ]+$/.test(rawSearchVal); // Use RAW for type detection
                const isPureCho = /^[ㄱ-ㅎ]+$/.test(rawSearchVal);   // Use RAW for type detection

                if (isPureVowel) {
                    // Normalize target vowel string too
                    return normalizeForSearch(card._vowel || '').includes(searchVal);
                }
                if (isPureCho) {
                    // Consonants don't need 'ㅔ/ㅐ' normalization
                    return (card._cho || '').includes(rawSearchVal);
                }

                // Default: Text (Syllables) or Mixed (Cho+Jung)
                const cardName = (card.name || '').normalize('NFC');
                const textMatch = normalizeForSearch(cardName).includes(searchVal);
                const mixedMatch = normalizeForSearch(card._mixed || '').includes(searchVal);

                return textMatch || mixedMatch;
            }
            return true;
        });

        // [Fix] Enforce Position Priority Sort for Articulation Mode
        // Use 'sub' field (Metadata) instead of spelling analysis for accuracy (e.g. 'ㅅ' patchim sounding like 'ㄷ')
        const POS_SCORE = { '어두초성': 1, '어중초성': 2, '어중종성': 3, '어말종성': 4 };

        if (currentPhoneme !== 'All') {
            filtered.sort((a, b) => {
                const scoreA = POS_SCORE[a.sub] || 5;
                const scoreB = POS_SCORE[b.sub] || 5;
                if (scoreA !== scoreB) return scoreA - scoreB;
                return (a.name || '').localeCompare(b.name || '', 'ko');
            });
        }
    } else {
        // 언어 모드 필터링
        filtered = window.soundData.filter(card => {
            // 1. Category Filter
            let categoryMatch = true;
            if (currentTheme !== 'All') {
                // Check if currentTheme is a Main Category
                // 1. Precise Sub-Category Match (Prioritized)
                // If a specific sub-category is selected (and it's not '전체' or 'All')
                if (currentSubCategory &&
                    currentSubCategory !== '전체' &&
                    currentSubCategory !== 'All') {

                    // Exact match (robust with trim & normalization)
                    const normalizeCat = (str) => (str || "").trim().replace(/[·/]/g, '.'); // Handle both separators
                    const targetSub = normalizeCat(currentSubCategory);
                    const cardSub = normalizeCat(card.language_category);

                    // Simple equals or includes for robustness
                    categoryMatch = (cardSub === targetSub) || (cardSub.includes(targetSub)) || (targetSub.includes(cardSub));
                }
                // 2. Theme Match (Show All in Theme)
                // If '전체' is selected, check if card belongs to ANY sub-category of this theme
                else if (LANGUAGE_THEMES[currentTheme]) {
                    // Check if card's category is listed in the theme's sub-categories
                    categoryMatch = LANGUAGE_THEMES[currentTheme].includes(card.language_category);
                }
                // 3. Fallback
                else {
                    categoryMatch = (card.language_category === currentTheme);
                }
            }
            if (!categoryMatch) return false;

            // 2. Syllable Count Filter (Shared)
            if (!activeSyllables.has('All')) {
                let cleanName = card.name.split('[')[0].trim();
                const len = cleanName.length;

                let match = false;
                if (len >= 6 && activeSyllables.has(6)) match = true;
                else if (activeSyllables.has(len)) match = true;

                if (!match) return false;
            }

            // 3. Search Filter
            if (searchVal) {
                // Strict Search Logic
                const isPureVowel = /^[ㅏ-ㅣ]+$/.test(rawSearchVal);
                const isPureCho = /^[ㄱ-ㅎ]+$/.test(rawSearchVal);

                if (isPureVowel) {
                    return normalizeForSearch(card._vowel || '').includes(searchVal);
                }
                if (isPureCho) {
                    return (card._cho || '').includes(rawSearchVal);
                }

                const cardName = (card.name || '').normalize('NFC');
                const textMatch = normalizeForSearch(cardName).includes(searchVal);
                const mixedMatch = normalizeForSearch(card._mixed || '').includes(searchVal);

                return textMatch || mixedMatch;
            }
            return true;
        });

        // [Fix] Enforce Alphabetical Sort for Language Mode (Override Server Weights)
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));

        // Deduplicate by Name AND Image for Language Mode
        // Previously only name was checked, hiding homonyms (same name, different picture)
        const seenKeys = new Set();
        const uniqueFiltered = [];
        filtered.forEach(item => {
            const uniqueKey = item.name + "|" + item.image; // Composite key
            if (!seenKeys.has(uniqueKey)) {
                seenKeys.add(uniqueKey);
                uniqueFiltered.push(item);
            }
        });
        filtered = uniqueFiltered;
    }

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
        // 실제 이미지 경로: 폴더/파일명 (특수문자 처리를 위해 인코딩)
        // 실제 이미지 경로: 폴더/파일명 (특수문자 처리를 위해 인코딩)
        // 실제 이미지 경로: 폴더/파일명 (특수문자 처리를 위해 인코딩)
        // 실제 이미지 경로: 폴더/파일명 (특수문자 처리를 위해 인코딩)
        // 실제 이미지 경로: 폴더/파일명 (특수문자 처리를 위해 인코딩)
        const imgSrc = `${encodeURIComponent(item.folder)}/${encodeURIComponent(item.image)}`;

        let extraInfo = '';
        if (currentMode === 'articulation') {
            // Show "Phoneme, Position" for Articulation Mode to distinguish duplicates
            extraInfo = `<div style="font-size: 0.75rem; color: #666; margin-top: 2px;">${item.main}, ${item.sub}</div>`;
        } else {
            // Show "Sub-category" for Language Mode (e.g. "동물")
            if (item.language_category) {
                extraInfo = `<div style="font-size: 0.75rem; color: #666; margin-top: 2px;">${item.language_category}</div>`;
            }
        }

        card.innerHTML = `
            <button class="card-menu-btn" title="메뉴">⋮</button>
            <img src="${imgSrc}" class="card-img" loading="lazy" onerror="this.src='https://via.placeholder.com/150?text=${encodeURIComponent(item.name)}'">
            <div class="card-name">${item.name}</div>
            ${extraInfo}
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

        // Smart Tooltip Logic: 4음절 이상인 경우에만 툴팁 적용
        // Clean name for length check
        const cleanName = item.name.split('[')[0].trim();
        const cleanLength = cleanName.length; // 음절 수 계산 (공백 포함 여부는 정책 나름, 여기선 trim후 길이)

        if (cleanLength >= 4) {
            card.classList.add('has-tooltip');
            card.dataset.tooltipText = item.name; // Full Name (with pronunciation)
        }

        card.onclick = () => addToBasket(imgSrc, item.name);
        inventoryEl.appendChild(card);
    });
}

// 보이는 카드 모두 담기
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

// 장바구니 담기 (수정: X버튼 제거, Shift 선택 추가)
