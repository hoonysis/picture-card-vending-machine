// ==========================================
// 🌐 Admin API Extensions (Data Loading & Sync)
// ==========================================

let allCards = [];

// --- API Interactions ---
async function loadCards() {
    showLoading(); // [UI] Show
    try {
        const res = await fetch('/api/cards');
        allCards = await res.json();

        // [ADMIN ONLY] Sort by Windows/Unicode order (User Request)
        // This does NOT affect the vending machine (which uses server-side educational sort).
        allCards.sort((a, b) => {
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB, 'ko');
        });

        // Pre-calculate search keys for performance
        console.time("Pre-calc Search Keys");
        allCards.forEach(c => {
            // Fix: Use CLEAN name (remove [pronunciation]) to avoid double-counting phonemes
            const rawName = c.name || '';
            const cleanName = rawName.split('[')[0].trim().normalize('NFC');

            c._cho = getChoSeong(cleanName);       // For 'ㄱㅈ' -> '과자'
            c._vowel = getVowelsOnly(cleanName);   // For 'ㅜㅠ' -> '우유'
            c._mixed = getSmartMixed(cleanName);   // For 'ㅏㄱ' -> '아기' (No Jongseong)
        });
        console.timeEnd("Pre-calc Search Keys");

        renderGrid();
    } catch (e) {
        console.error(e);
        showAlert("데이터 로드 실패");
    } finally {
        hideLoading(); // [UI] Hide
    }
}

function populateSelects() {
    const opts = PHONEMES.map(p => `<option value="${p}">${p}</option>`).join('');
    document.getElementById('edit-phoneme').innerHTML = opts;
    document.getElementById('filter-phoneme').innerHTML = '<option value="All">모든 음소</option>' + opts;
}

// Ensure these functions are globally available if needed by HTML
window.loadCards = loadCards;
window.populateSelects = populateSelects;
