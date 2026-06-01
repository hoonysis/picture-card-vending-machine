// === 6. Render Logic (render.js) ===

// 카드 렌더링 (검색 + 필터 통합)
window.renderCards = function () {
    window.inventoryEl.innerHTML = '';

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

                // [NEW] Keyword Search
                const keywords = (card.search_keywords || '').normalize('NFC');
                const keywordMatch = normalizeForSearch(keywords).includes(searchVal);

                return textMatch || mixedMatch || keywordMatch;
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

            // 2. Search Filter
            if (searchVal) {
                // Strict Search logic
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
                const keywords = (card.search_keywords || '').normalize('NFC');
                const keywordMatch = normalizeForSearch(keywords).includes(searchVal);

                if (textMatch || mixedMatch || keywordMatch) return true;
                return false;
            }

            // 3. Syllable Filter (Only apply if NOT Searching globally, or applying combined?)
            // Requirement: Syllable filter should work in Language mode too?
            // Currently UI shows syllable tabs in Language mode too.
            if (!activeSyllables.has('All')) {
                let cleanName = card.name.split('[')[0].trim();
                const len = cleanName.length;
                if (len >= 6 && activeSyllables.has(6)) return true;
                if (activeSyllables.has(len)) return true;
                return false;
            }

            return true;
        });

        // 언어 모드 정렬: 가나다순
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));

        // 언어 모드는 같은 단어/같은 이미지가 조음 위치별로 중복 등록되어 있어도
        // 화면에서는 한 번만 보여준다. 단어가 같아도 이미지가 다르면 별도 카드로 유지한다.
        const seenKeys = new Set();
        filtered = filtered.filter(card => {
            const key = `${card.name || ''}|${card.image || ''}`;
            if (seenKeys.has(key)) return false;
            seenKeys.add(key);
            return true;
        });
    }

    // 렌더링
    filtered.forEach(card => {
        const el = document.createElement('div');
        el.className = 'card has-tooltip';
        el.dataset.tooltipText = `${card.name} / ${card.language_category || "미분류"}`;

        el.draggable = true;
        el.ondragstart = (e) => {
            window.dragSrcEl = el;
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', JSON.stringify(card));
            el.classList.add('dragging');
        };
        el.ondragend = () => el.classList.remove('dragging');
        el.onclick = () => addToBasket(card);

        // Name Formatting (Remove [pronunciation])
        let displayName = card.name;
        if (displayName.includes('[')) {
            displayName = displayName.split('[')[0].trim();
        }

        // Kebab Menu Button
        const kebabBtn = document.createElement('div');
        kebabBtn.className = 'card-menu-btn';
        kebabBtn.innerHTML = '⋮';
        kebabBtn.title = '메뉴 보기';
        kebabBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent card click
            if (window.showCardContextMenu) window.showCardContextMenu(e, card);
        };

        const encodePath = (value) => String(value || '')
            .split('/')
            .map(part => encodeURIComponent(part))
            .join('/');
        const imgPath = card.image_path
            ? `/${encodePath(card.image_path)}`
            : `/${encodePath(card.folder)}/${encodeURIComponent(card.image)}`;

        el.innerHTML = `
            <img src="${imgPath}" class="card-img" onerror="this.src='images/apple.png'">
            <div class="card-name">${displayName}</div>
        `;
        el.appendChild(kebabBtn);
        window.inventoryEl.appendChild(el);
    });
}
