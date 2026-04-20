// === 2. Filter & Options Logic (filter.js) ===

// --- Option Helpers ---
const POSITIONS = ["어두초성", "어중초성", "어중종성", "어말종성"];

window.getPhonemeOptions = function (selected) {
    if (typeof PHONEMES === 'undefined') return '';
    return PHONEMES.map(p => `<option value="${p}" ${p === selected ? 'selected' : ''}>${p}</option>`).join('');
}

window.getPosOptions = function (selected) {
    return POSITIONS.map(p => `<option value="${p}" ${p === selected ? 'selected' : ''}>${p}</option>`).join('');
}

// --- Language UI ---
window.renderLanguageCheckboxes = function () {
    const container = document.getElementById('language-checkbox-container');
    if (!container || typeof LANGUAGE_THEMES === 'undefined') return;
    container.innerHTML = '';

    Object.keys(LANGUAGE_THEMES).forEach(theme => {
        const groupDiv = document.createElement('div');
        groupDiv.style.marginBottom = '15px';

        const title = document.createElement('div');
        title.innerText = theme;
        title.style.fontWeight = 'bold';
        title.style.color = '#1565c0';
        title.style.marginBottom = '5px';
        title.style.fontSize = '0.9rem';
        groupDiv.appendChild(title);

        const subContainer = document.createElement('div');
        subContainer.style.display = 'flex';
        subContainer.style.flexWrap = 'wrap';
        subContainer.style.gap = '8px';

        const subs = LANGUAGE_THEMES[theme].filter(s => s !== '전체');
        subs.forEach(sub => {
            const label = document.createElement('label');
            label.style.display = 'inline-flex';
            label.style.alignItems = 'center';
            label.style.gap = '6px';
            label.style.fontSize = '0.9rem';
            label.style.cursor = 'pointer';
            label.style.background = '#fff';
            label.style.padding = '6px 12px';
            label.style.borderRadius = '20px';
            label.style.border = '1px solid #cfd8dc';
            label.style.transition = 'all 0.2s';
            label.style.whiteSpace = 'nowrap';
            label.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            label.style.minWidth = 'fit-content';

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'language_selection';
            input.value = `${theme}|${sub}`;
            input.dataset.theme = theme;
            input.dataset.sub = sub;
            input.style.accentColor = '#2196F3';

            input.onchange = () => {
                document.querySelectorAll('#language-checkbox-container label').forEach(l => {
                    l.style.background = '#fff';
                    l.style.borderColor = '#cfd8dc';
                    l.style.color = '#333';
                    l.style.fontWeight = 'normal';
                    l.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                });
                if (input.checked) {
                    label.style.background = '#e3f2fd';
                    label.style.borderColor = '#2196F3';
                    label.style.color = '#1565c0';
                    label.style.fontWeight = 'bold';
                    label.style.boxShadow = '0 2px 4px rgba(33, 150, 243, 0.2)';
                }
            };

            let htmlContent = sub;
            if (sub.includes('(')) {
                htmlContent = sub.replace(/\(([^)]+)\)/, '<span style="font-size:0.9em">($1)</span>');
            }

            label.appendChild(input);
            label.insertAdjacentHTML('beforeend', `<span>${htmlContent}</span>`);
            subContainer.appendChild(label);
        });

        groupDiv.appendChild(subContainer);
        container.appendChild(groupDiv);
    });
}

window.populateFilterLanguageMain = function () {
    const el = document.getElementById('filter-language-main');
    if (!el || typeof LANGUAGE_THEMES === 'undefined') return;
    el.innerHTML = '<option value="All">모든 언어대범주</option>';

    Object.keys(LANGUAGE_THEMES).forEach(theme => {
        const opt = document.createElement('option');
        opt.value = theme;
        opt.text = theme;
        el.appendChild(opt);
    });
    if (window.updateFilterLanguageSub) window.updateFilterLanguageSub();
}

window.updateFilterLanguageSub = function () {
    const mainVal = document.getElementById('filter-language-main').value;
    const subEl = document.getElementById('filter-language-sub');
    if (!subEl) return;

    subEl.innerHTML = '<option value="All">모든 언어소범주</option>';

    if (mainVal !== 'All' && typeof LANGUAGE_THEMES !== 'undefined' && LANGUAGE_THEMES[mainVal]) {
        const subs = LANGUAGE_THEMES[mainVal].filter(s => s !== '전체');
        subs.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.text = s;
            subEl.appendChild(opt);
        });
    }
}

window.toggleList = function () {
    const container = document.getElementById('list-container');
    const icon = document.getElementById('list-toggle-icon');
    if (!container || !icon) return;

    if (container.style.display === 'none') {
        container.style.display = 'block';
        icon.innerText = '▲ 접기';
    } else {
        container.style.display = 'none';
        icon.innerText = '▼ 펼치기';
    }
}
