// === 4. Filtering Logic (filter.js) ===

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
window.selectPhoneme = function (phoneme, btn) {
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

// 언어 필터 선택
window.selectLanguageFilter = function (theme, sub, btn) {
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

window.resetFiltersForSearch = function () {
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
