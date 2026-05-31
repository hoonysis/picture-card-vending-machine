// Menu and filter-control DOM helpers for the stable local UI.
(function (global) {
    const POSITION_LABELS = ["전체", "어두초성", "어중초성", "어중종성", "어말종성"];
    const SYLLABLE_LABELS = ["전체", "1음절", "2음절", "3음절", "4음절", "5음절", "6음절 이상"];
    const ARTICULATION_PHONEME_ORDER = [
        "ㅇ(모음)",
        "ㅂ", "ㅃ", "ㅍ", "ㅁ",
        "ㄷ", "ㄸ", "ㅌ", "ㄴ",
        "ㅅ", "ㅆ",
        "ㄹ",
        "ㅈ", "ㅉ", "ㅊ",
        "ㄱ", "ㄲ", "ㅋ", "ㅇ(받침)",
        "ㅎ"
    ];

    function getElement(selector) {
        return document.querySelector(selector);
    }

    function setSearchPlaceholder(mode) {
        const searchInput = document.getElementById('global-search-input');
        if (!searchInput) return;

        searchInput.placeholder = mode === 'articulation'
            ? "🗣️ 조음 자판기에서 검색... (초성, 음절, 단어)"
            : "📚 언어 자판기에서 검색... (초성, 음절, 단어)";
    }

    function setModeLayout(mode) {
        const artMenu = document.getElementById('articulation-menu');
        const langMenu = document.getElementById('language-menu');
        const title = document.getElementById('sidebar-title');

        if (mode === 'articulation') {
            if (artMenu) artMenu.classList.remove('hidden');
            if (langMenu) langMenu.classList.add('hidden');
            if (title) title.innerText = "목표 음소 선택";
            return;
        }

        if (artMenu) artMenu.classList.add('hidden');
        if (langMenu) langMenu.classList.remove('hidden');
        if (title) title.innerText = "언어 범주 선택";
        clearPositionTabs();
    }

    function setTabButtonActive(btn) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
    }

    function clearPositionTabs() {
        const tabsContainer = getElement('.position-tabs');
        if (tabsContainer) tabsContainer.innerHTML = '';
    }

    function setPositionTabsVisible(visible) {
        const posTabs = getElement('.position-tabs');
        if (posTabs) posTabs.style.display = visible ? 'flex' : 'none';
    }

    function renderPositionMenu(state, callbacks) {
        const tabsContainer = getElement('.position-tabs');
        if (!tabsContainer) return;

        tabsContainer.innerHTML = '';
        POSITION_LABELS.forEach(pos => {
            const btn = document.createElement('button');
            btn.className = 'pos-btn';

            const val = pos === '전체' ? 'All' : pos;
            if (state.activePositions.has(val)) btn.classList.add('active');

            btn.innerText = pos;
            btn.onclick = () => callbacks.onFilterPos(val, btn);
            tabsContainer.appendChild(btn);
        });
    }

    function renderSyllableMenu(state, callbacks) {
        const oldSyllTabs = getElement('.syllable-tabs');
        if (oldSyllTabs) oldSyllTabs.remove();

        const filterGroup = getElement('.filter-left-group');
        if (!filterGroup) return;

        const syllableContainer = document.createElement('div');
        syllableContainer.className = 'syllable-tabs';

        SYLLABLE_LABELS.forEach(syll => {
            const btn = document.createElement('button');
            btn.className = 'syllable-btn';

            const val = syll === '전체' ? 'All' : parseInt(syll, 10);
            if (state.activeSyllables.has(val)) btn.classList.add('active');

            btn.innerText = syll;
            btn.onclick = () => callbacks.onFilterSyllable(val, btn);
            syllableContainer.appendChild(btn);
        });

        filterGroup.appendChild(syllableContainer);

        if (state.currentMode === 'articulation') {
            syllableContainer.style.borderLeft = '1px solid #ddd';
            syllableContainer.style.paddingLeft = '10px';
            syllableContainer.style.marginLeft = '5px';
        }
    }

    function renderLanguageMenu(state, callbacks) {
        const menu = document.getElementById('language-menu');
        if (!menu) return;

        const cards = state.soundData || [];
        const languageThemes = state.languageThemes || {};
        menu.innerHTML = '';

        const totalLangUnique = new Set();
        cards.forEach(c => {
            if (c.part_of_speech && c.part_of_speech !== '미분류') {
                totalLangUnique.add(c.image);
            }
        });

        const globalBtn = document.createElement('button');
        globalBtn.className = 'phoneme-btn global-all';
        globalBtn.innerHTML = `<span>전체 보기 <span style="font-weight:normal; opacity:0.8;">(${totalLangUnique.size})</span></span>`;
        globalBtn.style.marginBottom = '10px';
        globalBtn.dataset.theme = 'All';
        globalBtn.dataset.sub = 'All';
        globalBtn.onclick = () => callbacks.onSelectLanguageFilter('All', 'All', globalBtn);
        menu.appendChild(globalBtn);

        const myCardsBtn = document.createElement('button');
        myCardsBtn.className = 'phoneme-btn my-cards-btn';
        myCardsBtn.innerHTML = `<span>⭐ 나만의 그림</span>`;
        myCardsBtn.style.marginBottom = '10px';
        myCardsBtn.onclick = () => callbacks.onSelectMyCards(myCardsBtn);
        menu.appendChild(myCardsBtn);

        Object.keys(languageThemes).forEach(theme => {
            const themeSubs = languageThemes[theme].filter(s => s !== '전체');
            const uniqueThemeItems = new Set();
            cards.forEach(c => {
                if (themeSubs.includes(c.language_category) || c.language_category === theme) {
                    uniqueThemeItems.add(c.image);
                }
            });

            const headerContainer = document.createElement('div');
            headerContainer.style.display = 'flex';
            headerContainer.style.justifyContent = 'space-between';
            headerContainer.style.alignItems = 'center';
            headerContainer.style.padding = '12px 10px 4px 10px';
            headerContainer.style.marginTop = '5px';
            headerContainer.style.borderBottom = '1px solid rgba(255,255,255,0.1)';

            const label = document.createElement('span');
            label.innerText = `${theme} (${uniqueThemeItems.size})`;
            label.style.color = '#FFB74D';
            label.style.fontSize = '0.9rem';
            label.style.fontWeight = 'bold';

            const allBtn = document.createElement('button');
            allBtn.innerText = '전체';
            allBtn.style.background = 'rgba(255,255,255,0.1)';
            allBtn.style.border = 'none';
            allBtn.style.color = '#ccc';
            allBtn.style.fontSize = '0.75rem';
            allBtn.style.padding = '2px 8px';
            allBtn.style.borderRadius = '10px';
            allBtn.style.cursor = 'pointer';
            allBtn.dataset.theme = theme;
            allBtn.dataset.sub = '전체';
            allBtn.onmouseover = () => allBtn.style.background = 'rgba(255,255,255,0.2)';
            allBtn.onmouseout = () => allBtn.style.background = 'rgba(255,255,255,0.1)';
            allBtn.onclick = () => callbacks.onSelectLanguageFilter(theme, "전체", allBtn);

            headerContainer.appendChild(label);
            headerContainer.appendChild(allBtn);
            menu.appendChild(headerContainer);

            themeSubs.forEach(sub => {
                const uniqueSubItems = new Set();
                cards.forEach(c => {
                    if ((c.language_category || "").trim() === sub) {
                        uniqueSubItems.add(c.image);
                    }
                });

                const btn = document.createElement('button');
                btn.className = 'phoneme-btn sub-cat-item';
                btn.style.fontSize = '0.9rem';
                btn.style.padding = '6px 10px 6px 15px';
                btn.style.justifyContent = 'flex-start';
                btn.style.whiteSpace = 'nowrap';

                let htmlContent = sub;
                if (sub.includes('(')) {
                    htmlContent = sub.replace(/\(([^)]+)\)/, '<span style="font-size:0.9em">($1)</span>');
                }
                btn.innerHTML = `<span>${htmlContent} <span style="font-weight:normal; opacity:0.7; font-size:0.85em;">(${uniqueSubItems.size})</span></span>`;
                btn.dataset.theme = theme;
                btn.dataset.sub = sub;
                btn.onclick = () => callbacks.onSelectLanguageFilter(theme, sub, btn);
                menu.appendChild(btn);
            });
        });
    }

    function renderArticulationSidebar(state, callbacks) {
        const artMenu = document.getElementById('articulation-menu');
        if (!artMenu) return;

        const cards = state.soundData || [];
        const currentPhoneme = state.currentPhoneme || 'All';
        artMenu.innerHTML = '';

        const globalBtn = document.createElement('button');
        globalBtn.className = 'phoneme-btn global-all';
        globalBtn.innerHTML = `<span>전체 보기 <span style="font-weight:normal; opacity:0.7; font-size:0.75em;">(${cards.length})</span></span>`;
        globalBtn.style.marginBottom = '10px';
        globalBtn.onclick = () => callbacks.onSelectPhoneme('All', globalBtn);
        artMenu.appendChild(globalBtn);

        const myCardsBtn = document.createElement('button');
        myCardsBtn.className = 'phoneme-btn my-cards-btn';
        myCardsBtn.innerHTML = `<span>⭐ 나만의 그림</span>`;
        myCardsBtn.onclick = () => callbacks.onSelectMyCards(myCardsBtn);
        artMenu.appendChild(myCardsBtn);

        if (currentPhoneme === 'All') globalBtn.classList.add('active');

        ARTICULATION_PHONEME_ORDER.forEach(p => {
            const count = cards.filter(c => c.main === p).length;
            const btn = document.createElement('button');
            btn.className = `phoneme-btn ${p === currentPhoneme ? 'active' : ''}`;
            btn.innerHTML = `<span>${p} <span style="font-weight:normal; opacity:0.7; font-size:0.7em;">(${count})</span></span>`;
            btn.onclick = () => callbacks.onSelectPhoneme(p, btn);
            artMenu.appendChild(btn);
        });
    }

    function setLanguageButtonActive(btn) {
        const menu = document.getElementById('language-menu');
        if (menu) menu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
    }

    function setArticulationButtonActive(btn) {
        document.querySelectorAll('#articulation-menu .phoneme-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
    }

    function setLanguageAllActive() {
        setLanguageButtonActive(document.querySelector('#language-menu .global-all'));
    }

    function setArticulationAllActive() {
        setArticulationButtonActive(document.querySelector('#articulation-menu .global-all'));
    }

    function setSearchClearVisible(visible) {
        const clearBtn = getElement('.search-clear-btn');
        if (clearBtn) clearBtn.style.display = visible ? 'block' : 'none';
    }

    global.LogicMenuView = {
        setSearchPlaceholder,
        setModeLayout,
        setTabButtonActive,
        clearPositionTabs,
        setPositionTabsVisible,
        renderPositionMenu,
        renderSyllableMenu,
        renderLanguageMenu,
        renderArticulationSidebar,
        setLanguageButtonActive,
        setArticulationButtonActive,
        setLanguageAllActive,
        setArticulationAllActive,
        setSearchClearVisible
    };
})(window);
