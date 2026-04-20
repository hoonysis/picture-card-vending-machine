// 페이지 방향 설정 (Popup 방식에서는 CSS로 직접 주입)
document.addEventListener('DOMContentLoaded', () => {
    // 기본 모드 설정 (UI 연동용)
    if (!document.body.className.match(/print-mode-\dx\d/)) {
        document.body.classList.add('print-mode-4x2');
    }
    console.log("Logic Print Loaded v1.0.7");
});

// === 팝업 인쇄 시스템 (Sandbox UI Integrated) ===
function printViaPopup(selectedOnly = false) {
    const basketGrid = document.getElementById('basket-grid');
    if (!basketGrid) {
        alert("인쇄할 내용을 찾을 수 없습니다.");
        return;
    }

    // 1. 데이터 수집 (sandbox의 realImages 로직)
    // 1. 데이터 수집 (sandbox의 realImages 로직)
    let cardData = [];
    // [LAYOUT SYNC] 메인 창의 버튼 상태에서 직접 감지 (더 정확함)
    let detectedLayout = '4x2'; // Default
    try {
        const selectedBtn = document.querySelector('.ps-option-btn.selected');
        if (selectedBtn && selectedBtn.id) {
            // id ex: "btn-7x4" -> "7x4"
            detectedLayout = selectedBtn.id.replace('btn-', '');
        }
    } catch (e) { console.warn("Layout detection failed", e); }

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

        // [DEBUG] 수집된 데이터 검증
        if (cardData.length === 0) {
            return window.showAlert ? window.showAlert("인쇄할 카드가 없습니다.<br>장바구니에 카드를 담아주세요.") : alert("인쇄할 카드가 없습니다.\n장바구니에 카드를 담아주세요.");
        }
    }

    // 2. 팝업 창 열기
    try {
        // ... (window.open logic)
        const width = screen.availWidth || 1200;
        const height = screen.availHeight || 900;
        const popup = window.open('', '_blank', `width=${width},height=${height},left=0,top=0,resizable=yes,scrollbars=yes`);

        if (!popup) {
            alert("팝업 차단을 해제해주세요.");
            return;
        }

        const activeStyleSheet = document.querySelector('link[href*="style.css"]')?.href || 'style.css?v=' + new Date().getTime();
        const printStyleSheet = new URL('css/print_styles_v2.css', window.location.href).href + '?v=' + new Date().getTime();
        const printMsg = selectedOnly ? "✅ 선택 인쇄 모드" : "🖨️ 전체 인쇄 모드";

        // [HTML Generation Helper]
        const getBtnClass = (key) => detectedLayout === key ? 'ps-option-btn selected' : 'ps-option-btn';

        popup.document.open(); // 명시적 open
        popup.document.write(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <title>인쇄 미리보기 및 설정</title>
            <meta charset="UTF-8">
            <base href="${window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1)}">
            <link rel="stylesheet" href="${printStyleSheet}">
            <style>
                body { margin: 0; padding: 0; height: 100vh; overflow: hidden; display: flex; background: #fdfdfd; user-select: none; }
                .print-preview-area { background: #525659 !important; }
                @media print {
                    .print-sidebar { display: none !important; }
                    .print-preview-area { display: block !important; background: white !important; padding: 0 !important; overflow: visible !important; }
                    .a4-page { margin: 0 !important; box-shadow: none !important; page-break-after: always; }
                    ::-webkit-scrollbar { display: none; }
                }
            </style>
        </head>
        <body>
            <aside class="print-sidebar">
                <div class="ps-sidebar-header">
                    <div class="ps-sidebar-title" style="font-size: 1.5rem; justify-content: center;">${printMsg}</div>
                </div>
                <div class="ps-sidebar-content">
                    <div class="ps-section" style="margin-bottom: 30px;">
                        <button class="btn-print-large" onclick="executePrint()"><span>🖨️ 인쇄 시작</span></button>
                        <div class="info-box" style="margin-top: 10px; font-size: 0.8rem; text-align: center;">미리보기 화면입니다.<br>실제 인쇄는 위 버튼을 누르세요.</div>
                    </div>
                    <div class="ps-section">
                        <label class="ps-label">가로형</label>
                        <div class="ps-options-grid">
                            <div class="${getBtnClass('2x1')}" onclick="setGrid('2x1')" id="btn-2x1">2칸 (특대)</div>
                            <div class="${getBtnClass('6card')}" onclick="setGrid('6card')" id="btn-6card">6칸 (대)</div>
                            <div class="${getBtnClass('4x2')}" onclick="setGrid('4x2')" id="btn-4x2">8칸 (기본)</div>
                            <div class="${getBtnClass('5x3')}" onclick="setGrid('5x3')" id="btn-5x3">15칸 (중)</div>
                            <div class="${getBtnClass('7x4')}" onclick="setGrid('7x4')" id="btn-7x4">28칸 (소)</div>
                            <div class="${getBtnClass('10x5')}" onclick="setGrid('10x5')" id="btn-10x5">50칸 (목록)</div>
                        </div>
                    </div>
                    <div class="ps-section">
                        <label class="ps-label">세로형</label>
                        <div class="ps-options-grid">
                            <div class="${getBtnClass('1x2')}" onclick="setGrid('1x2')" id="btn-1x2">2칸 (특대)</div>
                            <div class="${getBtnClass('2x2')}" onclick="setGrid('2x2')" id="btn-2x2">4칸 (대)</div>
                        </div>
                    </div>
                    <div class="ps-section">
                         <label class="ps-label">표시 옵션</label>
                         <div class="ps-toggles">
                            <label class="ps-checkbox-label"><input type="checkbox" id="chk-text" onchange="toggleOption('text')" checked> 글자 표시</label>
                            <label class="ps-checkbox-label"><input type="checkbox" id="chk-border" onchange="toggleOption('border')" checked> 테두리 표시</label>
                         </div>
                    </div>
                </div>
            </aside>

            <main class="print-preview-area" id="preview-area" style="align-items: flex-start;"></main>

            <script>
                // === INJECTED DATA ===
                let cardData = [];
                try {
                    cardData = ${JSON.stringify(cardData)};
                } catch(e) {
                    console.error("Popup: Data injection failed", e);
                }
                
                // === CONFIG (SYNCED) ===
                let currentLayout = '${detectedLayout}';
                let showText = true;
                let showBorder = true;

                const layoutSpecs = {
                    '2x1':  { rows: 1, cols: 2, perPage: 2,  class: 'layout-2x1', orientation: 'landscape' },
                    '6card':{ rows: 2, cols: 3, perPage: 6,  class: 'layout-3x2', orientation: 'landscape' },
                    '4x2':  { rows: 2, cols: 4, perPage: 8,  class: 'layout-4x2', orientation: 'landscape' },
                    '5x3':  { rows: 3, cols: 5, perPage: 15, class: 'layout-5x3', orientation: 'landscape' },
                    '7x4':  { rows: 4, cols: 7, perPage: 28, class: 'layout-7x4', orientation: 'landscape' },
                    '10x5': { rows: 5, cols: 10, perPage: 50,class: 'layout-10x5', orientation: 'landscape' },
                    '1x2':  { rows: 2, cols: 1, perPage: 2,  class: 'layout-1x2', orientation: 'portrait' },
                    '2x2':  { rows: 2, cols: 2, perPage: 4,  class: 'layout-2x2', orientation: 'portrait' }
                };

                // ... (Functions: renderPages, adjustScale, setGrid, toggleOption, applyOptions)
                // Redefined here to ensure scope availability
                
                function renderPages() {
                   // Simplified render logic for debug
                   const previewArea = document.getElementById('preview-area');
                   previewArea.innerHTML = ''; 
                   
                   if(!cardData.length) { previewArea.innerHTML = '<div style="padding:50px; color:white;">데이터 없음</div>'; return; }

                   const spec = layoutSpecs[currentLayout];
                   const itemsPerPage = spec.perPage;
                   const totalPages = Math.ceil(cardData.length / itemsPerPage);

                    // Page Style Injection
                    const existingStyle = document.getElementById('dynamic-page-style');
                    if (existingStyle) existingStyle.remove();
                    const style = document.createElement('style');
                    style.id = 'dynamic-page-style';
                    style.innerHTML = spec.orientation === 'portrait' ? '@page { size: A4 portrait; margin: 0; }' : '@page { size: A4 landscape; margin: 0; }';
                    document.head.appendChild(style);

                   for (let p = 0; p < totalPages; p++) {
                        const pageDiv = document.createElement('div');
                        pageDiv.className = 'a4-page ' + (spec.orientation === 'portrait' ? 'page-portrait' : '');
                        const gridDiv = document.createElement('div');
                        gridDiv.className = 'basket-grid-page ' + spec.class;
                        
                        const pageItems = cardData.slice(p * itemsPerPage, (p * itemsPerPage) + itemsPerPage);
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
                   setTimeout(adjustScale, 100);
                }

                function adjustScale() {
                    const previewArea = document.getElementById('preview-area');
                    const pages = document.querySelectorAll('.a4-page');
                    if (pages.length === 0) return;
                    const availableWidth = (previewArea.clientWidth || 800) - 80; 
                    const pageWidth = pages[0].offsetWidth || 1;
                    let scale = 1;
                    if (pageWidth > availableWidth) scale = availableWidth / pageWidth;
                    pages.forEach(page => {
                        page.style.transformOrigin = 'top left';
                        page.style.transform = 'scale(' + scale + ')';
                        const h = page.offsetHeight;
                        page.style.marginBottom = '-' + (h - (h * scale) - 30) + 'px';
                    });
                }

                function setGrid(l) { 
                    currentLayout = l; 
                    
                    // [UI UPDATE] Remove 'selected' from all buttons, add to current
                    document.querySelectorAll('.ps-option-btn').forEach(btn => btn.classList.remove('selected'));
                    const targetBtn = document.getElementById('btn-' + l);
                    if(targetBtn) targetBtn.classList.add('selected');

                    renderPages(); 
                }
                function toggleOption(t) { 
                    if(t==='text') showText = document.getElementById('chk-text').checked;
                    if(t==='border') showBorder = document.getElementById('chk-border').checked;
                    applyOptions();
                }
                function applyOptions() {
                    if(!showText) document.body.classList.add('hide-text'); else document.body.classList.remove('hide-text');
                    if(!showBorder) document.body.classList.add('hide-border'); else document.body.classList.remove('hide-border');
                }
                
                async function executePrint() {
                     // 1. Electron Secure Mode
                     // Check injected 'window.electron' (from main) or 'window.opener.electron'
                     const electronApp = window.electron || (window.opener && window.opener.electron);
                     
                     // [DEBUG]
                     // alert("Debug: Checking Electron... " + (electronApp ? "Found" : "Not Found"));

                     if (electronApp) { 
                        try {
                            const printers = await electronApp.getPrinters();
                            
                            if (!printers || printers.length === 0) {
                                alert("🖨️ 사용 가능한 물리 프린터가 없습니다.\\n(보안 정책상 PDF 저장은 차단됩니다.)");
                                return;
                            }

                            // 2. Select Printer UI
                            // Create a simple overlay to choose printer
                            if (document.getElementById('printer-selector')) document.getElementById('printer-selector').remove();

                            const overlay = document.createElement('div');
                            overlay.id = 'printer-selector';
                            overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; font-family:"Pretendard",sans-serif;';
                            
                            let buttonsHtml = '';
                            printers.forEach(p => {
                                // Highlight default
                                const isDefault = p.isDefault ? ' (기본)' : '';
                                const bg = p.isDefault ? '#3b82f6' : '#4b5563';
                                buttonsHtml += \`<button onclick="doSecurePrint('\${p.name}')" style="margin:5px; padding:15px 30px; font-size:1.2rem; background:\${bg}; color:white; border:none; border-radius:8px; cursor:pointer; width:300px;">🖨️ \${p.name}\${isDefault}</button>\`;
                            });

                            overlay.innerHTML = \`
                                <div style="background:#2b2b2b; padding:40px; border-radius:16px; text-align:center;">
                                    <h2 style="margin-top:0;">🖨️ 프린터 선택</h2>
                                    <p style="color:#ccc; margin-bottom:20px;">보안 인쇄를 위해 프린터를 선택해주세요.<br>(가상 프린터는 제외됩니다)</p>
                                    <div style="display:flex; flex-direction:column; max-height:400px; overflow-y:auto;">
                                        \${buttonsHtml}
                                    </div>
                                    <button onclick="document.getElementById('printer-selector').remove()" style="margin-top:20px; background:none; border:none; color:#999; cursor:pointer; text-decoration:underline;">취소</button>
                                </div>
                            \`;
                            document.body.appendChild(overlay);

                        } catch(e) { 
                            alert("프린터 목록을 불러올 수 없습니다: " + e.message); 
                        }
                     } else { 
                        // 2. Fallback (Web Mode) - System Dialog
                        window.print(); 
                     }
                }

                async function doSecurePrint(printerName) {
                    if(document.getElementById('printer-selector')) document.getElementById('printer-selector').remove();
                    try {
                        const electronApp = window.electron || (window.opener && window.opener.electron);
                        if(electronApp) {
                            await electronApp.print(printerName);
                        } else {
                            alert("보안 인쇄 모듈을 찾을 수 없습니다.");
                        }
                    } catch(e) {
                         alert("인쇄 전송 실패: " + e.message);
                    }
                }
                
                // Expose to global scope for button onclick
                window.executePrint = executePrint;
                window.doSecurePrint = doSecurePrint;

                window.addEventListener('resize', adjustScale);
                
                // START
                try {
                    renderPages();
                } catch(e) { alert("렌더링 실패: " + e.message); }

            </script>
        </body>
        </html>
        `);
        popup.document.close();
        // [SECURE BRIDGE] Inject Electron API into Popup
        if (window.electron) {
            console.log("Injecting electron bridge to popup...");
            popup.electron = window.electron;
        }

        popup.focus(); // Focus to ensure visibility

    } catch (e) {
        alert("메인: 팝업 처리 중 오류 발생!\n" + e.message);
        console.error(e);
    }
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

