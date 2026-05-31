// Filtering helpers for the stable local card inventory.

var matchesSyllableFilter = window.matchesSyllableFilter = function (card, activeSyllables) {
    if (activeSyllables.has('All')) return true;

    const cleanName = (card.name || '').split('[')[0].trim();
    const len = cleanName.length;

    if (len >= 6 && activeSyllables.has(6)) return true;
    return activeSyllables.has(len);
};

var matchesInventorySearch = window.matchesInventorySearch = function (card, rawSearchVal, searchVal) {
    if (!searchVal) return true;

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

    return textMatch || mixedMatch || keywordMatch;
};

var normalizeLanguageCategory = window.normalizeLanguageCategory = function (value) {
    return (value || '').trim().replace(/[·/]/g, '.');
};

var matchesLanguageCategory = window.matchesLanguageCategory = function (card, state) {
    if (state.currentTheme === 'All') return true;

    if (state.currentSubCategory &&
        state.currentSubCategory !== '전체' &&
        state.currentSubCategory !== 'All') {

        const targetSub = normalizeLanguageCategory(state.currentSubCategory);
        const cardSub = normalizeLanguageCategory(card.language_category);

        return cardSub === targetSub || cardSub.includes(targetSub) || targetSub.includes(cardSub);
    }

    if (state.languageThemes[state.currentTheme]) {
        return state.languageThemes[state.currentTheme].includes(card.language_category);
    }

    return card.language_category === state.currentTheme;
};

var dedupeLanguageCards = window.dedupeLanguageCards = function (items) {
    const seenKeys = new Set();
    const uniqueItems = [];

    items.forEach(item => {
        const uniqueKey = item.name + '|' + item.image;
        if (!seenKeys.has(uniqueKey)) {
            seenKeys.add(uniqueKey);
            uniqueItems.push(item);
        }
    });

    return uniqueItems;
};

var dedupeArticulationSearchCards = window.dedupeArticulationSearchCards = function (items) {
    const seenKeys = new Set();
    const uniqueItems = [];

    items.forEach(item => {
        const uniqueKey = item.name + '|' + item.image;
        if (!seenKeys.has(uniqueKey)) {
            seenKeys.add(uniqueKey);
            uniqueItems.push(item);
        }
    });

    return uniqueItems;
};

var filterArticulationCards = window.filterArticulationCards = function (items, state, rawSearchVal, searchVal) {
    let filtered = items.filter(card => {
        if (state.currentPhoneme !== 'All' && card.main !== state.currentPhoneme) return false;
        if (!state.activePositions.has('All') && !state.activePositions.has(card.sub)) return false;
        if (!matchesSyllableFilter(card, state.activeSyllables)) return false;
        return matchesInventorySearch(card, rawSearchVal, searchVal);
    });

    const POS_SCORE = { '어두초성': 1, '어중초성': 2, '어중종성': 3, '어말종성': 4 };

    if (state.currentPhoneme !== 'All') {
        filtered.sort((a, b) => {
            const scoreA = POS_SCORE[a.sub] || 5;
            const scoreB = POS_SCORE[b.sub] || 5;
            if (scoreA !== scoreB) return scoreA - scoreB;
            return (a.name || '').localeCompare(b.name || '', 'ko');
        });
    }

    if (searchVal) {
        if (isVowelOnlyHangulSyllableSearch(rawSearchVal)) {
            filtered = dedupeArticulationSearchCards(filtered);
        } else {
            filtered = filtered.filter(card => isDirectArticulationSearchMatch(card, rawSearchVal, searchVal));
        }
        filtered = sortSearchResultsByRelevance(filtered, rawSearchVal, searchVal);
    }

    return filtered;
};

var filterLanguageCards = window.filterLanguageCards = function (items, state, rawSearchVal, searchVal) {
    let filtered = items.filter(card => {
        if (!matchesLanguageCategory(card, state)) return false;
        if (!matchesSyllableFilter(card, state.activeSyllables)) return false;
        return matchesInventorySearch(card, rawSearchVal, searchVal);
    });

    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
    filtered = dedupeLanguageCards(filtered);

    if (searchVal) {
        filtered = sortSearchResultsByRelevance(filtered, rawSearchVal, searchVal);
    }

    return filtered;
};
