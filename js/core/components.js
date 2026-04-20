// === 3. UI Components (components.js) ===
// Sidebar, Tabs Creation Logic

// --- Language Mode Logic (6-Theme Structure) ---
const LANGUAGE_THEMES = {
    "사람/신체": ["전체", "가족", "직업", "신체부위", "옷·장신구"],
    "음식": ["전체", "과일·채소", "식사·요리", "간식·음료", "식재료"],
    "생활/사물": ["전체", "가구·가전", "주방·욕실용품", "학용품", "장난감", "생활용품"],
    "장소/환경": ["전체", "동물·곤충", "식물·자연", "교통기관", "장소"],
    "놀이/운동": ["전체", "운동", "악기·예술", "취미·놀이", "기념일·행사"],
    "서술/개념": ["전체", "서술어(행동/상태)", "감정", "색깔/모양", "수/양/비교", "위치/방향", "세부부위", "범주어", "시간/순서/날짜", "한글/글자", "말놀이(의성어,의태어)"]
};

// 언어 메뉴 생성
window.createLanguageMenu = function () {
    const menu = document.getElementById('language-menu');
    menu.innerHTML = '';

    // 0. Global 'All' Button
    // Calculate Total Language Unique Count
    const totalLangUnique = new Set();
    window.soundData.forEach(c => {
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
        window.soundData.forEach(c => {
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
            window.soundData.forEach(c => {
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

// 사이드바 생성 (음소 목록)
window.createSidebar = function () {
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
    const totalCount = window.soundData.length;

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
        const count = window.soundData.filter(c => c.main === p).length;

        const btn = document.createElement('button');
        btn.className = `phoneme-btn ${p === currentPhoneme ? 'active' : ''}`;
        btn.innerHTML = `<span>${p} <span style="font-weight:normal; opacity:0.7; font-size:0.7em;">(${count})</span></span>`;
        btn.onclick = () => selectPhoneme(p, btn);
        artMenu.appendChild(btn);
    });

    // We should call render with default params ONLY if Articulation mode is active
    if (currentMode === 'articulation') renderCards();
}

// 조음 메뉴 생성 (위치 탭)
window.createPositionMenu = function () {
    const tabsContainer = document.querySelector('.position-tabs');
    if (!tabsContainer) return; // Guard
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
window.createSyllableMenu = function () {
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
    const leftGroup = document.querySelector('.filter-left-group');
    if (leftGroup) {
        leftGroup.appendChild(syllableContainer);
    }

    // Add visual separator (border) if in Articulation Mode (where Position tabs exist)
    if (currentMode === 'articulation') {
        syllableContainer.style.borderLeft = '1px solid #ddd';
        syllableContainer.style.paddingLeft = '10px';
        syllableContainer.style.marginLeft = '5px';
    }

    if (activeSyllables.size === 0) activeSyllables.add('All');
}
