// === 5. Search Logic (search.js) ===

window.isGlobalSearching = false;

window.handleGlobalSearch = function (val) {
    const clearBtn = document.querySelector('.search-clear-btn');
    if (val.length > 0) {
        clearBtn.style.display = 'block';
        window.isGlobalSearching = true;

        // Reset All Filters VISUALLY
        resetFiltersForSearch();
    } else {
        clearBtn.style.display = 'none';
        window.isGlobalSearching = false;
    }
    renderCards();
};

window.clearGlobalSearch = function () {
    const input = document.getElementById('global-search-input');
    input.value = '';
    handleGlobalSearch('');
    input.focus();
};

// Helper for phonetic search equivalence (ㅔ == ㅐ)
window.normalizeForSearch = function (text) {
    // NFD decompose to separate Jamo, replace 'ㅐ'(1162) with 'ㅔ'(1166), then Recompose NFC
    // Also handle compatibility Jamo 'ㅐ'(3150) -> 'ㅔ'(3154) just in case
    return (text || '').normalize('NFD')
        .replace(/\u1162/g, '\u1166')
        .replace(/\u3150/g, '\u3154')
        .normalize('NFC');
}
