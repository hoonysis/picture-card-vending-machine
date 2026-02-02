// 페이지 방향 설정 (Popup 방식에서는 CSS로 직접 주입)
document.addEventListener('DOMContentLoaded', () => {
    // 기본 모드 설정 (UI 연동용)
    if (!document.body.className.match(/print-mode-\dx\d/)) {
        document.body.classList.add('print-mode-4x2');
    }
});

// === 팝업 인쇄 시스템 (Sandbox UI Integrated) ===
function printViaPopup(selectedOnly = false) {
    const basketGrid = document.getElementById('basket-grid');
    if (!basketGrid) {
        alert("인쇄할 내용을 찾을 수 없습니다.");
        return;
    }

    // 1. 데이터 수집 (sandbox의 realImages 로직)
    let cardData = [];
    if (selectedOnly) {
        const selectedCards = basketGrid.querySelectorAll('.card.in-basket.selected');
        if (selectedCards.length === 0) {
            return window.showAlert ? window.showAlert("선택된 카드가 없습니다.") : alert("선택된 카드가 없습니다.");
        }
        selectedCards.forEach(card => {
            const img = card.querySelector('.card-img').src;
            const name = card.querySelector('.card-name').innerText;
            cardData.push({ src: img, name: name });
        });
    } else {
        const allCards = basketGrid.querySelectorAll('.card.in-basket');
        allCards.forEach(card => {
            const img = card.querySelector('.card-img').src;
            const name = card.querySelector('.card-name').innerText;
            cardData.push({ src: img, name: name });
        });
        if (cardData.length === 0) {
            return window.showAlert ? window.showAlert("인쇄할 카드가 없습니다.<br>장바구니에 카드를 담아주세요.") : alert("인쇄할 카드가 없습니다.\n장바구니에 카드를 담아주세요.");
        }
    }

    // 2. 팝업 창 열기
    const width = screen.availWidth || 1200;
    const height = screen.availHeight || 900;
    const popup = window.open('', '_blank', `width=${width},height=${height},left=0,top=0,resizable=yes,scrollbars=yes`);
    if (!popup) {
        alert("팝업 차단을 해제해주세요.");
        return;
    }

    // 3. 스타일시트 경로 확보
    // 3. 스타일시트 및 리소스 경로 확보
    const activeStyleSheet = document.querySelector('link[href*="style.css"]')?.href || 'style.css?v=' + new Date().getTime();
    // 절대 경로로 변환하여 팝업에서도 확실하게 로드되도록 함
    const printStyleSheet = new URL('css/print_styles_v2.css', window.location.href).href + '?v=' + new Date().getTime();
    const printMsg = selectedOnly ? "✅ 선택 인쇄 모드" : "🖨️ 전체 인쇄 모드";

    // 4. HTML 구조 작성 (Sandbox 그대로 이식)
    // 주의: JS 로직도 팝업 내부에 주입해야 함.
    popup.document.write(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <title>인쇄 미리보기 및 설정</title>
            <meta charset="UTF-8">
        <head>
            <title>인쇄 미리보기 및 설정</title>
            <meta charset="UTF-8">
            <!-- Base Tag to resolve relative paths (images, etc.) -->
            <base href="${window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1)}">
            <!-- <link rel="stylesheet" href="${activeStyleSheet}"> --> <!-- Disabled to prevent conflict -->
            <link rel="stylesheet" href="${printStyleSheet}">
            <style>
                /* Popup Specific Overrides */
                body {
                    margin: 0;
                    padding: 0;
                    height: 100vh;
                    overflow: hidden; /* Sidebar scroll handles content */
                    display: flex; /* Sidebar layout */
                    background: #fdfdfd;
                    user-select: none; /* Text selection disable */
                }
                
                /* Force Preview Area Background */
                .print-preview-area {
                    background: #525659 !important;
                }
                
                @media print {
                    .print-sidebar { display: none !important; }
                    .print-preview-area { 
                        display: block !important; 
                        background: white !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }
                    .a4-page {
                        margin: 0 !important;
                        box-shadow: none !important;
                        page-break-after: always;
                    }
                    /* Hide scrollbars during print */
                    ::-webkit-scrollbar { display: none; }
                }
            </style>
            <script>
                // === SECURITY: Disable Right Click & DevTools ===
                document.addEventListener('contextmenu', event => event.preventDefault());
                document.addEventListener('keydown', function(e) {
                    if (
                        e.key === 'F12' || 
                        (e.ctrlKey && e.shiftKey && e.key === 'I') || 
                        (e.ctrlKey && e.shiftKey && e.key === 'J') || 
                        (e.ctrlKey && e.key === 'U')
                    ) {
                        e.preventDefault();
                    }
                });
            </script>
        </head>
        <body>
            <!-- 1. LEFT SIDEBAR -->
            <aside class="print-sidebar">
                <div class="ps-sidebar-header">
                    <div class="ps-sidebar-title" style="font-size: 1.5rem; justify-content: center;">${printMsg}</div>
                </div>
                
                <div class="ps-sidebar-content">
                    <!-- 0. Print Button (Top Access) -->
                    <div class="ps-section" style="margin-bottom: 30px;">
                        <button class="btn-print-large" onclick="executePrint()">
                            <span>🖨️ 인쇄 시작</span>
                        </button>
                        <div class="info-box" style="margin-top: 10px; font-size: 0.8rem; text-align: center;">
                            미리보기 화면입니다.<br>실제 인쇄는 위 버튼을 누르세요.
                        </div>
                    </div>

                    <!-- 1. Layout Selection -->
                    <div class="ps-section">
                        <label class="ps-label">가로형</label>
                        <div class="ps-options-grid">
                            <div class="ps-option-btn" onclick="setGrid('2x1')" id="btn-2x1">2칸 (특대)</div>
                            <div class="ps-option-btn" onclick="setGrid('6card')" id="btn-6card">6칸 (대)</div>
                            <div class="ps-option-btn selected" onclick="setGrid('4x2')" id="btn-4x2">8칸 (기본)</div>
                            <div class="ps-option-btn" onclick="setGrid('5x3')" id="btn-5x3">15칸 (중)</div>
                            <div class="ps-option-btn" onclick="setGrid('7x4')" id="btn-7x4">28칸 (소)</div>
                            <div class="ps-option-btn" onclick="setGrid('10x5')" id="btn-10x5">50칸 (목록)</div>
                        </div>
                    </div>

                    <div class="ps-section">
                        <label class="ps-label">세로형</label>
                        <div class="ps-options-grid">
                            <div class="ps-option-btn" onclick="setGrid('1x2')" id="btn-1x2">2칸 (특대)</div>
                            <div class="ps-option-btn" onclick="setGrid('2x2')" id="btn-2x2">4칸 (대)</div>
                        </div>
                    </div>

                    <!-- 2. Display Options -->
                    <div class="ps-section">
                        <label class="ps-label">표시 옵션</label>
                        <div class="ps-toggles">
                            <label class="ps-checkbox-label">
                                <input type="checkbox" id="chk-text" onchange="toggleOption('text')" checked>
                                 글자 표시
                            </label>
                            <label class="ps-checkbox-label">
                                <input type="checkbox" id="chk-border" onchange="toggleOption('border')" checked>
                                 테두리 표시
                            </label>
                        </div>
                    </div>
                </div>
            </aside>

            <!-- 2. RIGHT PREVIEW AREA -->
            <main class="print-preview-area" id="preview-area" style="align-items: flex-start;">
                <!-- Pages will be rendered here via JS -->
            </main>

            <script>
                // === INJECTED DATA ===
                const cardData = ${JSON.stringify(cardData)};
                // [DEBUG]
                console.log("Popup CardData:", cardData);
                
                // === CONFIG (Sandbox Logic) ===
                let currentLayout = '4x2';
                let showText = true;   // Reverted to Default ON
                let showBorder = true; // Reverted to Default ON

                const layoutSpecs = {
                    '2x1':  { rows: 1, cols: 2, perPage: 2,  class: 'layout-2x1', orientation: 'landscape' },
                    '6card':{ rows: 2, cols: 3, perPage: 6,  class: 'layout-3x2', orientation: 'landscape' }, // 3x2 renamed to 6card in UI but uses layout-3x2 css
                    '4x2':  { rows: 2, cols: 4, perPage: 8,  class: 'layout-4x2', orientation: 'landscape' },
                    '5x3':  { rows: 3, cols: 5, perPage: 15, class: 'layout-5x3', orientation: 'landscape' },
                    '7x4':  { rows: 4, cols: 7, perPage: 28, class: 'layout-7x4', orientation: 'landscape' },
                    '10x5': { rows: 5, cols: 10, perPage: 50,class: 'layout-10x5', orientation: 'landscape' },
                    '1x2':  { rows: 2, cols: 1, perPage: 2,  class: 'layout-1x2', orientation: 'portrait' },
                    '2x2':  { rows: 2, cols: 2, perPage: 4,  class: 'layout-2x2', orientation: 'portrait' }
                };

                function renderPages() {
                    const previewArea = document.getElementById('preview-area');
                    previewArea.innerHTML = ''; // Clear

                    if (!cardData || cardData.length === 0) {
                        previewArea.innerHTML = '<div style="color:#555; font-size:1.5rem; margin-top:50px;">인쇄할 카드가 없습니다.</div>';
                        return;
                    }

                    const spec = layoutSpecs[currentLayout];
                    const itemsPerPage = spec.perPage;
                    const totalPages = Math.ceil(cardData.length / itemsPerPage);

                    // CSS Injection for Page Orientation (Dynamic)
                    const existingStyle = document.getElementById('dynamic-page-style');
                    if (existingStyle) existingStyle.remove();
                    
                    const style = document.createElement('style');
                    style.id = 'dynamic-page-style';
                    if (spec.orientation === 'portrait') {
                        style.innerHTML = '@page { size: A4 portrait; margin: 0; }';
                    } else {
                        style.innerHTML = '@page { size: A4 landscape; margin: 0; }';
                    }
                    document.head.appendChild(style);


                    for (let p = 0; p < totalPages; p++) {
                        const pageDiv = document.createElement('div');
                        pageDiv.className = 'a4-page';
                        if (spec.orientation === 'portrait') pageDiv.classList.add('page-portrait');

                        const gridDiv = document.createElement('div');
                        gridDiv.className = 'basket-grid-page ' + spec.class;
                        
                        // Slice data for this page
                        const start = p * itemsPerPage;
                        const end = start + itemsPerPage;
                        const pageItems = cardData.slice(start, end);

                        pageItems.forEach(item => {
                            const card = document.createElement('div');
                            card.className = 'card in-basket';
                            
                            const img = document.createElement('img');
                            img.className = 'card-img';
                            img.src = item.src;
                            
                            const name = document.createElement('div');
                            name.className = 'card-name';
                            name.innerText = item.name;

                            card.appendChild(img);
                            card.appendChild(name);
                            gridDiv.appendChild(card);
                        });

                        pageDiv.appendChild(gridDiv);
                        previewArea.appendChild(pageDiv);
                    }
                    
                    applyOptions();
                    requestAnimationFrame(adjustScale);
                }

                function adjustScale() {
                    const previewArea = document.getElementById('preview-area');
                    const pages = document.querySelectorAll('.a4-page');
                    if (pages.length === 0) return;

                    // Always Fit to Screen Logic (User requested default behavior)
                    // Calculate Scale (Available width minus padding 80px)
                    const availableWidth = previewArea.clientWidth - 80; 
                    const pageWidth = pages[0].offsetWidth; 
                    
                    let scale = 1;
                    if (pageWidth > availableWidth) {
                        scale = availableWidth / pageWidth;
                    }

                    // Apply Scale
                    pages.forEach(page => {
                        page.style.transformOrigin = 'top left';
                        page.style.transform = 'scale(' + scale + ')';
                        
                        const originalHeight = page.offsetHeight;
                        const scaledHeight = originalHeight * scale;
                        const spaceSaved = originalHeight - scaledHeight;
                        page.style.marginBottom = '-' + (spaceSaved - 30) + 'px';
                    });
                }

                function setGrid(layout) {
                    currentLayout = layout;
                    // Update Buttons
                    document.querySelectorAll('.ps-option-btn').forEach(btn => btn.classList.remove('selected'));
                    const activeBtn = document.getElementById('btn-' + layout);
                    if(activeBtn) activeBtn.classList.add('selected');
                    
                    renderPages();
                }

                function toggleOption(type) {
                    if (type === 'text') {
                        showText = document.getElementById('chk-text').checked;
                    } else if (type === 'border') {
                        showBorder = document.getElementById('chk-border').checked;
                    }
                    applyOptions();
                }

                function applyOptions() {
                    const body = document.body;
                    if (!showText) body.classList.add('hide-text');
                    else body.classList.remove('hide-text');

                    if (!showBorder) body.classList.add('hide-border');
                    else body.classList.remove('hide-border');
                }

                function executePrint() {
                    window.print();
                }

                window.addEventListener('resize', adjustScale);

                // Initial Render (Wrapped in Try-Catch)
                try {
                    console.log("Starting renderPages...");
                    const pa = document.getElementById('preview-area');
                    if (!pa) alert("CRITICAL: preview-area element missing!");
                    
                    renderPages();
                    console.log("renderPages completed.");
                } catch (e) {
                    alert("렌더링 오류 발생: " + e.message);
                    console.error(e);
                }

            </script>
        </body>
        </html>
    `);

    popup.document.close();
    popup.focus();
}

// === MAIN UI HELPERS ===
// These are still needed if other parts of the app call them, though UI buttons are updated.
window.printAll = function () {
    printViaPopup(false);
};

window.printSelected = function () {
    printViaPopup(true);
};

// Legacy Functions (Safe to keep empty or redirect, but better to keep for compatibility if old UI lingers cached)
window.setLayout = function (mode) { console.log("Legacy setLayout called - handled in popup now"); };
window.toggleText = function (chk) { console.log("Legacy toggleText called"); };
window.toggleBorder = function (chk) { console.log("Legacy toggleBorder called"); };

// === Auto-Migration Logic (Keep existing) ===
(function () {
    if (!localStorage.getItem('unified_migration_done')) {
        try {
            const art = JSON.parse(localStorage.getItem('cardPresets_articulation') || "[]");
            const lang = JSON.parse(localStorage.getItem('cardPresets_language') || "[]");
            const unified = [...art, ...lang];
            if (unified.length > 0) {
                localStorage.setItem('cardPresets_unified', JSON.stringify(unified));
            }
            localStorage.setItem('unified_migration_done', 'true');
        } catch (e) { console.error("Migration failed", e); }
    }
})();

