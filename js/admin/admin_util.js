// ==========================================
// 🛠️ Admin Utility Functions (Hangul & Search)
// ==========================================

// Create Hangul Disassembler for Search
const CHO_SUNG_SEARCH = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const JUNG_SUNG_SEARCH = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
const JONG_SUNG_SEARCH = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

// 1. Choseong Only (For 'ㄱㅈ' -> '과자')
function getChoSeong(str) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const diff = code - 0xAC00;
            const chosungIdx = Math.floor(diff / (21 * 28));
            result += CHO_SUNG_SEARCH[chosungIdx];
        } else {
            result += str[i];
        }
    }
    return result;
}

// 2. Vowels Only (For 'ㅜㅠ' -> '우유')
function getVowelsOnly(str) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const diff = code - 0xAC00;
            const jungsungIdx = Math.floor((diff % (21 * 28)) / 28);
            result += JUNG_SUNG_SEARCH[jungsungIdx];
        } else {
            // Check if it's already a Jamo Vowel
            // U+314F (ㅏ) ~ U+3163 (ㅣ)
            if (code >= 0x314F && code <= 0x3163) {
                result += str[i];
            }
        }
    }
    return result;
}

// 3. Smart Mixed (Cho + Jung, NO Jongseong, NO Initial 'ㅇ')
// For 'ㅏㄱ' -> '아기' (ㅇㅏ (drop ㅇ) -> ㅏ, ㄱㅣ -> ㄱㅣ : result ㅏㄱㅣ)
// For '고기' -> 'ㄱㅗㄱㅣ'
// For '떡국' -> 'ㄸㅓㄱㅜ' (Jongseong ㄱ, ㄱ removed)
function getSmartMixed(str) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const diff = code - 0xAC00;
            const chosungIdx = Math.floor(diff / (21 * 28));
            const jungsungIdx = Math.floor((diff % (21 * 28)) / 28);

            // ChoSeong (Skip if 'ㅇ')
            if (CHO_SUNG_SEARCH[chosungIdx] !== 'ㅇ') {
                result += CHO_SUNG_SEARCH[chosungIdx];
            }
            // JungSeong (Always include)
            result += JUNG_SUNG_SEARCH[jungsungIdx];

            // JongSeong (ALWAYS SKIP per user request)
        } else {
            result += str[i];
        }
    }
    return result;
}

// Helper for phonetic search equivalence (ㅔ == ㅐ)
function normalizeForSearch(text) {
    // NFD decompose to separate Jamo, replace 'ㅐ'(1162) with 'ㅔ'(1166), then Recompose NFC
    return (text || '').normalize('NFD')
        .replace(/\u1162/g, '\u1166')
        .replace(/\u3150/g, '\u3154')
        .normalize('NFC');
}
