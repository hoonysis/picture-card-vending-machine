// === 7. Main Initialization (main.js) ===

// === 초기화 ===
window.init = async function () {
    // 서버에서 데이터 가져오기 시도 (실패 시 data.js 의 soundData 사용)
    try {
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

    if (window.createSidebar) createSidebar(); // Articulation sidebar
    if (window.createPositionMenu) createPositionMenu(); // Position Tabs
    if (window.createSyllableMenu) createSyllableMenu(); // Syllable Tabs
    if (window.createLanguageMenu) createLanguageMenu(); // Language sidebar (dynamic)

    // Initialize Mode UI
    // Pass the element that already has 'active' class (set in HTML) to prevent it from being cleared
    const activeBtn = document.querySelector('.tab-btn.active');
    setMode(currentMode, activeBtn);

    if (window.loadPresets) loadPresets();
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
        if (artMenu) artMenu.classList.remove('hidden');
        if (langMenu) langMenu.classList.add('hidden');
        if (title) title.innerText = "목표 음소 선택";

        // Restore Articulation Tabs
        // Restore Articulation Tabs
        createPositionMenu(); // Position Tabs
        createSyllableMenu(); // Syllable Tabs

        renderCards();
    } else {
        if (artMenu) artMenu.classList.add('hidden');
        if (langMenu) langMenu.classList.remove('hidden');
        if (title) title.innerText = "언어 범주 선택";

        // Clear Tabs initially (will be filled if needed or cleared)
        // Clear Tabs initially (will be filled if needed or cleared)
        // tabsContainer.innerHTML = ''; // createPositionMenu will handle clearing if called, but here we skipped it.
        // But we need to CLEAR position tabs for Language Mode
        const posTabs = document.querySelector('.position-tabs');
        if (posTabs) posTabs.innerHTML = '';

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
    if (window.loadPresets) loadPresets();
};

// Start
document.addEventListener('DOMContentLoaded', init);
