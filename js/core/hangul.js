// === 2. Hangul Utilities (hangul.js) ===

const CHO_SUNG = ["\u3131", "\u3132", "\u3134", "\u3137", "\u3138", "\u3139", "\u3141", "\u3142", "\u3143", "\u3145", "\u3146", "\u3147", "\u3148", "\u3149", "\u314A", "\u314B", "\u314C", "\u314D", "\u314E"];
const JUNG_SUNG = ["\u314F", "\u3150", "\u3151", "\u3152", "\u3153", "\u3154", "\u3155", "\u3156", "\u3157", "\u3158", "\u3159", "\u315A", "\u315B", "\u315C", "\u315D", "\u315E", "\u315F", "\u3160", "\u3161", "\u3162", "\u3163"];

// 1. Choseong Only (For 'ㄱㅈ' -> '과자')
window.getChoSeong = function (str) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const diff = code - 0xAC00;
            const chosungIdx = Math.floor(diff / (21 * 28));
            result += CHO_SUNG[chosungIdx];
        } else {
            result += str[i];
        }
    }
    return result;
}

// 2. Vowels Only (For 'ㅜㅠ' -> '우유')
window.getVowelsOnly = function (str) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const diff = code - 0xAC00;
            const jungsungIdx = Math.floor((diff % (21 * 28)) / 28);
            result += JUNG_SUNG[jungsungIdx];
        } else {
            // Check if it's already a Jamo Vowel (U+314F~U+3163)
            if (code >= 0x314F && code <= 0x3163) {
                result += str[i];
            }
        }
    }
    return result;
}

// 3. Smart Mixed (Cho + Jung, NO Jongseong, NO Initial 'ㅇ') (For 'ㅏㄱ' -> '아기')
window.getSmartMixed = function (str) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const diff = code - 0xAC00;
            const chosungIdx = Math.floor(diff / (21 * 28));
            const jungsungIdx = Math.floor((diff % (21 * 28)) / 28);

            // ChoSeong (Skip if 'ㅇ')
            if (CHO_SUNG[chosungIdx] !== 'ㅇ') {
                result += CHO_SUNG[chosungIdx];
            }
            // JungSeong (Always include)
            result += JUNG_SUNG[jungsungIdx];

            // JongSeong (ALWAYS SKIP)
        } else {
            result += str[i];
        }
    }
    return result;
}
