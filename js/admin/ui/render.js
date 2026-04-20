// === 3. Rendering Logic (render.js) ===

window.renderGrid = function () {
    const grid = document.getElementById('card-grid');
    if (!grid) return;
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
    window.currentFilteredCards = allCards.filter(c => {
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

                // [NEW] Check Search Keywords
                const keywords = (c.search_keywords || '').normalize('NFC');
                const keywordMatch = normalizeForSearch(keywords).includes(search);

                matchS = textMatch || mixedMatch || keywordMatch;
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

        // [NEW] Context Menu Handler
        el.oncontextmenu = (e) => {
            e.preventDefault();
            if (window.showCardContextMenu) window.showCardContextMenu(e, c);
        };

        grid.appendChild(el);
    });
}

// Select All
window.selectAllCards = function () {
    // Select all visible cards
    currentFilteredCards.forEach(c => {
        const sig = getCardSig(c);
        selectedCards.add(sig);
    });
    renderGrid();
}

// Toggle Selection
window.toggleSelection = function (card, element, event, index) {
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
