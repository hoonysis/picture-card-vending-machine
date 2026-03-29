// ============================================
// Upload - Card Submit (POST /api/upload)
// ============================================

async function uploadCard(isConfirmed = false) {
    if (window.isGlobalProcessing) return;

    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (!file) return showAlert("이미지를 선택해주세요.");

    const analysisName = document.getElementById('input-name').value;
    let displayName = document.getElementById('input-display-name').value;

    if (!analysisName) return showAlert("단어 이름을 입력해주세요.");
    if (!displayName) displayName = analysisName;

    // Language Data
    const selectedLang = document.querySelector('input[name="language_selection"]:checked');
    if (!selectedLang) {
        return showAlert("⚠️ 언어 범주 선택 필수\n\n오른쪽 '언어 분류 선택' 영역에서\n단어에 맞는 카테고리를 반드시 체크해야 합니다.");
    }

    const posVal = selectedLang.dataset.theme;
    const catVal = selectedLang.dataset.sub;
    const pronVal = document.getElementById('input-pronunciation').value;

    const rows = document.querySelectorAll('.sugg-row');
    const registrations = [];

    rows.forEach(row => {
        const checkbox = row.querySelector('.sugg-check');
        if (checkbox && checkbox.checked) {
            const mainVal = row.querySelector('.sugg-main').value;
            let subVal = row.querySelector('.sugg-sub').value;
            if (mainVal === 'ㅇ(모음)') subVal = '';

            registrations.push({
                main: mainVal,
                sub: subVal,
                part_of_speech: posVal,
                language_category: catVal,
                pronunciation: pronVal,
                search_keywords: [
                    document.getElementById('input-tag1') ? document.getElementById('input-tag1').value.trim() : "",
                    document.getElementById('input-tag2') ? document.getElementById('input-tag2').value.trim() : "",
                    document.getElementById('input-tag3') ? document.getElementById('input-tag3').value.trim() : ""
                ].filter(Boolean).join(',')
            });
        }
    });

    if (registrations.length === 0) {
        return showAlert("⚠️ 조음 분석 정보 필수\n\n좌측 '조음 분석' 영역에서 분석을 실행하거나,\n[+ 직접 추가하기]를 통해 음소 정보를 입력해야 합니다.");
    }

    // Validation Passed: NOW set the lock
    window.isGlobalProcessing = true;

    const formData = new FormData();

    // Prevent Double Click
    const saveAllBtn = document.querySelector('.btn-save-all') || document.querySelector('button[onclick*="uploadCard"]');
    let originalBtnText = "";

    if (saveAllBtn) {
        if (saveAllBtn.disabled) return;
        saveAllBtn.disabled = true;
        saveAllBtn.style.backgroundColor = '#ccc';
        saveAllBtn.style.cursor = 'not-allowed';
        originalBtnText = saveAllBtn.innerText;
        saveAllBtn.innerText = '저장 중...';
    }

    // Cleanup Old File if needed
    if (typeof allCards !== 'undefined') {
        const oldCard = allCards.find(c => c.name === analysisName);
        if (oldCard) {
            try {
                await fetch('/api/cards', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        folder: oldCard.folder,
                        image: oldCard.image,
                        main: oldCard.main,
                        sub: oldCard.sub,
                        name: oldCard.name
                    })
                });
            } catch (e) { console.warn("Old file delete failed", e); }
        }
    }

    // Unique Filename
    const timestamp = Date.now();
    const lastDot = file.name.lastIndexOf('.');
    const ext = lastDot !== -1 ? file.name.substring(lastDot) : '';
    const finalFilename = `${analysisName}_${timestamp}${ext}`;

    formData.append('file', file, finalFilename);
    formData.append('name', displayName);
    formData.append('registrations', JSON.stringify(registrations));
    formData.append('confirmed', 'true');

    // Search Keywords
    if (window.tempKeywords) {
        formData.append('search_keywords', window.tempKeywords);
    } else {
        const t1 = document.getElementById('input-tag1') ? document.getElementById('input-tag1').value.trim() : "";
        const t2 = document.getElementById('input-tag2') ? document.getElementById('input-tag2').value.trim() : "";
        const t3 = document.getElementById('input-tag3') ? document.getElementById('input-tag3').value.trim() : "";
        const joined = [t1, t2, t3].filter(Boolean).join(',');
        formData.append('search_keywords', joined || deconjugate(analysisName));
    }

    showLoading(isRelayMode ? `💾 저장 중... (대기: ${uploadQueue.length})` : "💾 저장 중...");

    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            fileInput.value = '';
            const intPreview = document.getElementById('interceptor-preview');
            if (intPreview) intPreview.style.display = 'none';
            document.getElementById('input-name').value = '';
            document.getElementById('input-display-name').value = '';
            document.getElementById('input-pronunciation').value = '';

            document.querySelectorAll('input[name="language_selection"]').forEach(r => {
                r.checked = false;
                if (r.onchange) r.onchange();
            });

            const suggArea = document.getElementById('suggestion-area');
            if (suggArea) {
                suggArea.innerHTML = '<p style="color:#999; margin:0; text-align:center; padding-top: 30px; font-size:0.85rem;">단어 이름을 입력하고 분석을 눌러주세요.</p>';
            }

            const dropZone = document.getElementById('drop-zone');
            if (dropZone) dropZone.classList.remove('dragover');

            if (!isRelayMode && window.loadCards) window.loadCards();

            if (isRelayMode) {
                setTimeout(() => processNextInQueue(), 100);
            }
        } else {
            showAlert("오류 발생: " + data.error);
        }
    } catch (e) {
        console.error(e);
        showAlert("업로드 실패: " + e.message);
    } finally {
        hideLoading();

        if (saveAllBtn) {
            saveAllBtn.disabled = false;
            saveAllBtn.style.backgroundColor = '';
            saveAllBtn.style.cursor = 'pointer';
            if (originalBtnText) saveAllBtn.innerText = originalBtnText;
        }
        window.isGlobalProcessing = false;
    }
}

// --- Exports ---
window.uploadCard = uploadCard;
