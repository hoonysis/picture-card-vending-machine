// ============================================
// Upload - Analysis & Suggestions
// ============================================

// --- Dictionary Form Converter (Heuristic) ---
function deconjugate(name) {
    if (!name) return "";
    name = name.trim();

    if (name.endsWith('요')) {
        const stem = name.slice(0, -1);
        if (stem.endsWith('해')) return stem.slice(0, -1) + '하다';
        if (stem.endsWith('워')) return stem.slice(0, -1) + 'ㅂ다';
        if (stem.endsWith('어')) return stem.slice(0, -1) + '다';
        if (stem.endsWith('아')) return stem.slice(0, -1) + '다';
        return stem + '다';
    }

    return "";
}

// --- Analysis Logic ---
async function analyzeName(name) {
    if (window.isGlobalProcessing) return;
    window.isGlobalProcessing = true;
    console.log("🔍 analyzeName Called with:", name);

    if (!name) {
        const input = document.getElementById('input-name');
        if (input) name = input.value;
    }
    console.log("🔍 Processing Name:", name);

    if (!name) { window.isGlobalProcessing = false; return; }
    const analysisName = name.trim();
    if (!analysisName) { window.isGlobalProcessing = false; return; }

    const inputPron = document.getElementById('input-pronunciation');
    const manualPron = inputPron ? inputPron.value.trim() : "";

    showLoading();

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: analysisName,
                pronunciation: manualPron
            })
        });
        const data = await response.json();
        console.log("🔍 Server Response for '" + analysisName + "':", data);

        // 1. Auto-Check Language Category
        const ref = data.reference || data.category_ref;
        if (ref) {
            const normalize = (str) => {
                if (!str) return "";
                return str.replace(/[\s\(\)\/·,.]/g, '');
            };

            const targetMain = normalize(ref.main);
            const targetSub = normalize(ref.sub);

            const allRadios = document.querySelectorAll('input[name="language_selection"]');
            let radio = null;

            for (const r of allRadios) {
                const rMain = normalize(r.dataset.theme || r.value.split('|')[0]);
                const rSub = normalize(r.dataset.sub || r.value.split('|')[1]);

                if (targetMain.includes(rMain) || rMain.includes(targetMain)) {
                    if (targetSub === rSub) { radio = r; break; }
                    if (targetSub.startsWith(rSub) || rSub.startsWith(targetSub)) { radio = r; break; }
                }
            }

            if (radio) {
                radio.checked = true;
                const wrapper = radio.closest('label') || radio.parentElement;
                if (wrapper) {
                    wrapper.style.backgroundColor = '#fff9c4';
                    wrapper.style.transition = 'background-color 0.5s';
                    setTimeout(() => wrapper.style.backgroundColor = '', 2000);
                }
                if (radio.onchange) radio.onchange();

                const suggArea = document.getElementById('suggestion-area');
                if (suggArea) {
                    const oldFb = document.getElementById('analysis-feedback');
                    if (oldFb) oldFb.remove();

                    const feedback = document.createElement('div');
                    feedback.id = 'analysis-feedback';
                    feedback.innerHTML = `✨ 자동 분류 성공: <b>${ref.main} > ${ref.sub}</b>`;
                    feedback.style.cssText = "background:#4CAF50; color:white; padding:8px; border-radius:4px; margin-bottom: 10px; text-align: center; animation: fadeIn 0.5s; font-size:0.9rem;";
                    suggArea.prepend(feedback);
                }
            } else {
                console.warn(`[WARN] Server returned category [${ref.main}|${ref.sub}] but no UI match found.`);
                const suggArea = document.getElementById('suggestion-area');
                if (suggArea) {
                    const feedback = document.createElement('div');
                    feedback.innerHTML = `⚠️ 분류 실패: <b>${ref.main} > ${ref.sub}</b> (목록에 없음)`;
                    feedback.style.cssText = "background:#ff9800; color:white; padding:8px; border-radius:4px; margin-bottom: 10px; text-align: center; font-size:0.9rem;";
                    suggArea.prepend(feedback);
                }
            }
        }

        // 2. Populate Search Tags
        const tag1Input = document.getElementById('input-tag1');
        const tag2Input = document.getElementById('input-tag2');
        const tag3Input = document.getElementById('input-tag3');

        if (tag1Input && tag2Input && tag3Input) {
            let tags = [];
            let foundSheetTags = false;

            if (ref && (ref.tag1 || ref.tag2 || ref.tag3)) {
                tags = [ref.tag1, ref.tag2, ref.tag3];
                foundSheetTags = true;
            } else if (ref && ref.search_keywords) {
                tags = ref.search_keywords.split(',').map(s => s.trim());
                foundSheetTags = true;
            }

            if (foundSheetTags) {
                tag1Input.value = tags[0] || "";
                tag2Input.value = tags[1] || "";
                tag3Input.value = tags[2] || "";
            }

            if (!tag1Input.value) {
                const autoBase = deconjugate(analysisName);
                if (autoBase) tag1Input.value = autoBase;
            }
        }

        // 3. Update Display Name
        const finalPron = (data && data.pronunciation) ? `[${data.pronunciation}]` : "";
        const dispInput = document.getElementById('input-display-name');

        if (dispInput) {
            let currentVal = dispInput.value.trim();
            if (!currentVal) currentVal = analysisName;
            if (currentVal.includes('[')) {
                currentVal = currentVal.replace(/\[.*?\]/, '').trim();
            }
            dispInput.value = finalPron ? `${currentVal} ${finalPron}` : currentVal;

            const pronInput = document.getElementById('input-pronunciation');
            if (pronInput && data.pronunciation) {
                pronInput.value = data.pronunciation;
            }
        }

        // 4. Render Suggestions
        if (data && data.suggestions) {
            renderSuggestions(data.suggestions);
        }

    } catch (e) {
        console.error("Analysis failed", e);
        showAlert("분석 중 오류가 발생했습니다: " + e.message);
    } finally {
        hideLoading();
        window.isGlobalProcessing = false;
    }
}


// --- Suggestion UI ---
function renderSuggestions(suggestions) {
    const area = document.getElementById('suggestion-area');
    if (!area) return;
    area.innerHTML = '';

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '5px';
    container.id = 'sugg-container';

    suggestions.forEach((item) => {
        const row = createRow(item.main, item.sub, item.desc);
        container.appendChild(row);
    });

    area.appendChild(container);
}

function addManualRow() {
    let container = document.getElementById('sugg-container');
    if (!container) {
        const area = document.getElementById('suggestion-area');
        area.innerHTML = '';
        container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '5px';
        container.id = 'sugg-container';
        area.appendChild(container);
    }
    if (typeof PHONEMES !== 'undefined' && typeof POSITIONS !== 'undefined') {
        container.appendChild(createRow(PHONEMES[0], POSITIONS[0], '직접 추가'));
    }
}

function createRow(main, sub, desc) {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '5px';
    div.style.padding = '5px';
    div.style.background = '#f9f9f9';
    div.style.borderRadius = '4px';
    div.className = 'sugg-row';

    const pOptions = window.getPhonemeOptions ? window.getPhonemeOptions(main) : '';
    const posOptions = window.getPosOptions ? window.getPosOptions(sub) : '';

    div.innerHTML = `
<input type="checkbox" class="sugg-check" checked>
<select class="sugg-main" style="width: auto; padding: 5px; flex:1;">${pOptions}</select>
<select class="sugg-sub" style="width: auto; padding: 5px; flex:1;">${posOptions}</select>
<span style="color:#999; font-size:0.8rem; flex:1;">${desc || ''}</span>
`;

    const mainSelect = div.querySelector('.sugg-main');
    const subSelect = div.querySelector('.sugg-sub');

    const updateSubVisibility = () => {
        subSelect.style.display = mainSelect.value === 'ㅇ(모음)' ? 'none' : 'inline-block';
    };

    mainSelect.onchange = updateSubVisibility;
    updateSubVisibility();

    return div;
}

// --- Exports ---
window.analyzeName = analyzeName;
window.deconjugate = deconjugate;
window.renderSuggestions = renderSuggestions;
window.addManualRow = addManualRow;
