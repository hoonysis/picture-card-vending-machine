// View-model helpers for inventory cards in the stable local core UI.

var getInventoryCardImageSrc = window.getInventoryCardImageSrc = function (item) {
    return `${encodeURIComponent(item.folder)}/${encodeURIComponent(item.image)}`;
};

var getInventoryCardExtraInfo = window.getInventoryCardExtraInfo = function (item, mode) {
    if (mode === 'articulation') {
        return `<div style="font-size: 0.75rem; color: #666; margin-top: 2px;">${item.main}, ${item.sub}</div>`;
    }
    if (item.language_category) {
        return `<div style="font-size: 0.75rem; color: #666; margin-top: 2px;">${item.language_category}</div>`;
    }
    return '';
};

var getInventoryCardView = window.getInventoryCardView = function (item, mode) {
    const rawName = item.name || '';
    const cleanName = rawName.split('[')[0].trim();

    return {
        imgSrc: getInventoryCardImageSrc(item),
        basketName: rawName,
        extraInfo: getInventoryCardExtraInfo(item, mode),
        hasTooltip: cleanName.length >= 4,
        tooltipText: rawName
    };
};
