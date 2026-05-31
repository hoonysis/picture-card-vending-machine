// Shared helpers for the stable local core UI.

var CORE_CHO_SUNG = ["\u3131", "\u3132", "\u3134", "\u3137", "\u3138", "\u3139", "\u3141", "\u3142", "\u3143", "\u3145", "\u3146", "\u3147", "\u3148", "\u3149", "\u314A", "\u314B", "\u314C", "\u314D", "\u314E"];
var CORE_JUNG_SUNG = ["\u314F", "\u3150", "\u3151", "\u3152", "\u3153", "\u3154", "\u3155", "\u3156", "\u3157", "\u3158", "\u3159", "\u315A", "\u315B", "\u315C", "\u315D", "\u315E", "\u315F", "\u3160", "\u3161", "\u3162", "\u3163"];
var CORE_JONG_SUNG = ["", "\u3131", "\u3132", "\u3133", "\u3134", "\u3135", "\u3136", "\u3137", "\u3139", "\u313A", "\u313B", "\u313C", "\u313D", "\u313E", "\u313F", "\u3140", "\u3141", "\u3142", "\u3144", "\u3145", "\u3146", "\u3147", "\u3148", "\u314A", "\u314B", "\u314C", "\u314D", "\u314E"];

var getChoSeong = window.getChoSeong = function (str) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const diff = code - 0xAC00;
            const chosungIdx = Math.floor(diff / (21 * 28));
            result += CORE_CHO_SUNG[chosungIdx];
        } else {
            result += str[i];
        }
    }
    return result;
};

var getVowelsOnly = window.getVowelsOnly = function (str) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const diff = code - 0xAC00;
            const jungsungIdx = Math.floor((diff % (21 * 28)) / 28);
            result += CORE_JUNG_SUNG[jungsungIdx];
        } else if (code >= 0x314F && code <= 0x3163) {
            result += str[i];
        }
    }
    return result;
};

var getSmartMixed = window.getSmartMixed = function (str) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const diff = code - 0xAC00;
            const chosungIdx = Math.floor(diff / (21 * 28));
            const jungsungIdx = Math.floor((diff % (21 * 28)) / 28);

            if (CORE_CHO_SUNG[chosungIdx] !== 'ㅇ') {
                result += CORE_CHO_SUNG[chosungIdx];
            }
            result += CORE_JUNG_SUNG[jungsungIdx];
        } else {
            result += str[i];
        }
    }
    return result;
};

var normalizeForSearch = window.normalizeForSearch = function (text) {
    return (text || '').normalize('NFD')
        .replace(/\u1162/g, '\u1166')
        .replace(/\u3150/g, '\u3154')
        .normalize('NFC');
};

var splitSearchName = window.splitSearchName = function (rawName) {
    const normalized = (rawName || '').normalize('NFC');
    const match = normalized.match(/^(.*?)\[(.*?)\]\s*$/);
    if (!match) {
        return { displayName: normalized.trim(), pronunciation: '' };
    }
    return {
        displayName: match[1].trim(),
        pronunciation: match[2].trim()
    };
};

var isCoreHangulSyllable = window.isCoreHangulSyllable = function (ch) {
    if (!ch) return false;
    const code = ch.charCodeAt(0);
    return code >= 0xAC00 && code <= 0xD7A3;
};

var decomposeCoreHangul = window.decomposeCoreHangul = function (ch) {
    if (!isCoreHangulSyllable(ch)) return null;

    const diff = ch.charCodeAt(0) - 0xAC00;
    const chosungIdx = Math.floor(diff / (21 * 28));
    const jungsungIdx = Math.floor((diff % (21 * 28)) / 28);
    const jongsungIdx = diff % 28;

    return {
        cho: CORE_CHO_SUNG[chosungIdx],
        jung: CORE_JUNG_SUNG[jungsungIdx],
        jong: CORE_JONG_SUNG[jongsungIdx]
    };
};

var isVowelOnlyHangulSyllableSearch = window.isVowelOnlyHangulSyllableSearch = function (rawSearchVal) {
    const raw = (rawSearchVal || '').normalize('NFC').trim();
    if (!raw) return false;

    for (let i = 0; i < raw.length; i++) {
        const syllable = decomposeCoreHangul(raw[i]);
        if (!syllable || syllable.cho !== '\u3147' || syllable.jong) {
            return false;
        }
    }

    return true;
};

var normalizeArticulationMain = window.normalizeArticulationMain = function (main) {
    return (main || '').trim();
};

var getCoreHangulPositionMap = window.getCoreHangulPositionMap = function (source) {
    const map = {};
    let total = 0;

    for (let i = 0; i < source.length; i++) {
        if (isCoreHangulSyllable(source[i])) {
            map[i] = total;
            total += 1;
        }
    }

    return { map, total };
};

var addDirectArticulationTarget = window.addDirectArticulationTarget = function (targets, main, sub) {
    if (!main) return;
    const key = `${main}|${sub || ''}`;
    if (!targets.some(target => target.key === key)) {
        targets.push({ main, sub: sub || '', key });
    }
};

var addDirectTargetsFromMatchedRange = window.addDirectTargetsFromMatchedRange = function (source, start, length, targets) {
    const { map: hangulIndexByChar, total: totalHangul } = getCoreHangulPositionMap(source);

    for (let i = start; i < start + length && i < source.length; i++) {
        const syllable = decomposeCoreHangul(source[i]);
        if (!syllable) continue;

        const hangulIndex = hangulIndexByChar[i];
        const isFirstHangul = hangulIndex === 0;
        const isLastHangul = hangulIndex === totalHangul - 1;

        addDirectArticulationTarget(
            targets,
            syllable.cho === '\u3147' ? '\u3147(\uBAA8\uC74C)' : syllable.cho,
            isFirstHangul ? '\uC5B4\uB450\uCD08\uC131' : '\uC5B4\uC911\uCD08\uC131'
        );

        if (syllable.jong) {
            addDirectArticulationTarget(
                targets,
                syllable.jong === '\u3147' ? '\u3147(\uBC1B\uCE68)' : syllable.jong,
                isLastHangul ? '\uC5B4\uB9D0\uC885\uC131' : '\uC5B4\uC911\uC885\uC131'
            );
        }
    }
};

var addDirectTargetsFromSourceMatches = window.addDirectTargetsFromSourceMatches = function (source, searchVal, targets) {
    const normalizedSource = normalizeForSearch((source || '').normalize('NFC'));
    if (!normalizedSource || !searchVal) return;

    let index = normalizedSource.indexOf(searchVal);
    while (index !== -1) {
        addDirectTargetsFromMatchedRange(normalizedSource, index, searchVal.length, targets);
        index = normalizedSource.indexOf(searchVal, index + 1);
    }
};

var addJamoFallbackTargets = window.addJamoFallbackTargets = function (rawSearchVal, targets) {
    const raw = (rawSearchVal || '').normalize('NFC');
    for (let i = 0; i < raw.length; i++) {
        if (/[\u3131-\u314E]/.test(raw[i])) {
            addDirectArticulationTarget(targets, raw[i], '');
        }
    }
};

var getDirectArticulationTargets = window.getDirectArticulationTargets = function (card, rawSearchVal, searchVal) {
    const raw = (rawSearchVal || '').normalize('NFC');
    const normalizedSearch = searchVal || normalizeForSearch(raw);
    const targets = [];

    if (!normalizedSearch) return targets;

    if (/^[\u3131-\u314E]+$/.test(raw)) {
        for (let i = 0; i < raw.length; i++) {
            addDirectArticulationTarget(targets, raw[i], '');
            if (raw[i] === '\u3147') {
                addDirectArticulationTarget(targets, '\u3147(\uBAA8\uC74C)', '');
                addDirectArticulationTarget(targets, '\u3147(\uBC1B\uCE68)', '');
            }
        }
        return targets;
    }

    if (/^[\u314F-\u3163]+$/.test(raw)) {
        addDirectArticulationTarget(targets, '\u3147(\uBAA8\uC74C)', '');
        return targets;
    }

    const { displayName, pronunciation } = splitSearchName(card.name);
    addDirectTargetsFromSourceMatches(displayName, normalizedSearch, targets);
    addDirectTargetsFromSourceMatches(pronunciation, normalizedSearch, targets);

    if (targets.length === 0) {
        addJamoFallbackTargets(raw, targets);
    }

    return targets;
};

var doesDirectArticulationTargetMatch = window.doesDirectArticulationTargetMatch = function (card, target) {
    const cardMain = normalizeArticulationMain(card.main);
    const cardSub = (card.sub || '').trim();

    if (target.main === '\u3147') {
        if (cardMain !== '\u3147' && cardMain !== '\u3147(\uBAA8\uC74C)' && cardMain !== '\u3147(\uBC1B\uCE68)') {
            return false;
        }
    } else if (cardMain !== target.main) {
        return false;
    }

    return !target.sub || cardSub === target.sub;
};

var isDirectArticulationSearchMatch = window.isDirectArticulationSearchMatch = function (card, rawSearchVal, searchVal) {
    const targets = getDirectArticulationTargets(card, rawSearchVal, searchVal);
    if (targets.length === 0) return false;

    return targets.some(target => doesDirectArticulationTargetMatch(card, target));
};

var getSearchRank = window.getSearchRank = function (card, rawSearchVal, searchVal) {
    if (!searchVal) return 99;

    const isPureVowel = /^[ㅏ-ㅣ]+$/.test(rawSearchVal);
    const isPureCho = /^[ㄱ-ㅎ]+$/.test(rawSearchVal);
    const { displayName, pronunciation } = splitSearchName(card.name);

    const display = normalizeForSearch(displayName);
    const pron = normalizeForSearch(pronunciation);
    const mixed = normalizeForSearch(card._mixed || '');
    const vowel = normalizeForSearch(card._vowel || '');
    const keywords = normalizeForSearch((card.search_keywords || '').normalize('NFC'));

    if (display.startsWith(searchVal)) return 1;
    if (display.includes(searchVal)) return 2;
    if (pron.includes(searchVal)) return 3;
    if (isPureVowel && vowel.includes(searchVal)) return 4;
    if (isPureCho && (card._cho || '').includes(rawSearchVal)) return 4;
    if (!isPureVowel && !isPureCho && mixed.includes(searchVal)) return 4;
    if (keywords.includes(searchVal)) return 5;

    return 99;
};

var sortSearchResultsByRelevance = window.sortSearchResultsByRelevance = function (items, rawSearchVal, searchVal) {
    if (!searchVal) return items;

    return items
        .map((item, index) => ({
            item,
            index,
            rank: getSearchRank(item, rawSearchVal, searchVal)
        }))
        .sort((a, b) => {
            if (a.rank !== b.rank) return a.rank - b.rank;
            return a.index - b.index;
        })
        .map(entry => entry.item);
};
