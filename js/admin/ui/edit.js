// === 4. Edit Logic (edit.js) ===

window.updateEditCategoryOptions = function (selectedValue = null) {
    const mainSelect = document.getElementById('edit-part-speech');
    const subSelect = document.getElementById('edit-category');
    if (!mainSelect || !subSelect) return;

    const mainVal = mainSelect.value;
    subSelect.innerHTML = '';

    let subs = [];
    if (typeof LANGUAGE_THEMES !== 'undefined' && LANGUAGE_THEMES[mainVal]) {
        subs = LANGUAGE_THEMES[mainVal].filter(s => s !== '전체');
    }

    if (subs.length === 0) {
        const opt = document.createElement('option');
        opt.value = "";
        opt.text = "-";
        subSelect.appendChild(opt);
    } else {
        subs.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.text = s;
            subSelect.appendChild(opt);
        });
    }

    if (selectedValue) {
        subSelect.value = selectedValue;
    }
}

window.openEditModal = function (card) {
    currentEditCard = card;
    const modal = document.getElementById('edit-modal');
    if (modal) modal.style.display = 'flex';

    const img = document.getElementById('edit-preview-img');
    if (img) img.src = `${card.folder}/${card.image}`;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val || '';
    };

    setVal('edit-original-folder', card.folder);
    setVal('edit-original-image', card.image);
    setText('edit-name-display', card.name);

    let phonemeHTML = "";
    if (card.phoneme_list && card.phoneme_list.length > 0) {
        phonemeHTML = card.phoneme_list.map(p => `<div>${p.main} / ${p.sub}</div>`).join('');
    } else {
        phonemeHTML = `<div>${card.main} / ${card.sub}</div>`;
    }
    const pDisplay = document.getElementById('edit-phoneme-display');
    if (pDisplay) pDisplay.innerHTML = phonemeHTML;

    setVal('edit-name', card.name);
    setVal('edit-phoneme', card.main);
    setVal('edit-pos', card.sub);

    const pVal = card.part_of_speech || '미분류';
    setVal('edit-part-speech', pVal);

    updateEditCategoryOptions(card.language_category);

    // [NEW] Populate Keywords (Split to 3 tags)
    const keywords = (card.search_keywords || "").split(',').map(s => s.trim());
    setVal('edit-tag1', keywords[0]);
    setVal('edit-tag2', keywords[1]);
    setVal('edit-tag3', keywords[2]);
}

window.closeModal = function () {
    const modal = document.getElementById('edit-modal');
    if (modal) modal.style.display = 'none';
    currentEditCard = null;
}

window.saveEdit = async function () {
    if (!currentEditCard) return;

    showLoading();

    const payload = {
        original_folder: currentEditCard.folder,
        original_image: currentEditCard.image,
        original_main: currentEditCard.main,
        original_sub: currentEditCard.sub,
        name: null,
        main: null,
        sub: null,
        part_of_speech: document.getElementById('edit-part-speech').value,
        language_category: document.getElementById('edit-category').value,
        // [NEW] Join Keywords
        search_keywords: [
            document.getElementById('edit-tag1').value.trim(),
            document.getElementById('edit-tag2').value.trim(),
            document.getElementById('edit-tag3').value.trim()
        ].filter(Boolean).join(',')
    };

    try {
        const res = await fetch('/api/cards', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            closeModal();
            if (typeof selectedCards !== 'undefined') selectedCards.clear();
            if (window.loadCards) window.loadCards();
        } else {
            const data = await res.json();
            showAlert("수정 실패: " + (data.message || data.error || "Unknown"));
        }
    } catch (e) {
        showAlert("오류 발생");
    } finally {
        hideLoading();
    }
}

window.deleteCard = async function () {
    showConfirm("정말 삭제하시겠습니까?", async () => {
        showLoading();
        try {
            const res = await fetch('/api/cards', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folder: currentEditCard.folder,
                    image: currentEditCard.image,
                    main: currentEditCard.main,
                    sub: currentEditCard.sub,
                    name: currentEditCard.name
                })
            });
            if (res.ok) {
                closeModal();
                if (typeof selectedCards !== 'undefined') selectedCards.clear();
                if (typeof DATA_VERSION !== 'undefined') DATA_VERSION = Date.now();
                if (window.loadCards) window.loadCards();
            } else showAlert("삭제 실패");
        } catch (e) {
            showAlert("오류 발생");
        } finally {
            hideLoading();
        }
    });
}
