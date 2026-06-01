
// === Interactive Mission Guide (Action-Based Tutorial) ===

function initTutorial() {
    if (typeof driver === 'undefined') {
        console.warn('Driver.js not loaded');
        return;
    }

    const driverObj = window.driver.js.driver;
    let tour;

    // Safety Lock Backups (Prevent Accidental Deletion during Tour)
    let originalClearBasket = null;
    let originalDeleteSelected = null;
    let originalShowAlert = null;

    // === Cleanup Crew (Zombie Killer) ===
    window.tutorialCleanups = [];
    const registerCleanup = (fn) => window.tutorialCleanups.push(fn);

    const runCleanup = () => {
        if (window.tutorialCleanups.length > 0) {
            window.tutorialCleanups.forEach(fn => { try { fn(); } catch (e) { console.warn(e); } });
            window.tutorialCleanups = [];
        }
    };

    // Force Inject Styles
    let style = document.getElementById('tutorial-styles');
    if (!style) {
        style = document.createElement('style');
        style.id = 'tutorial-styles';
        style.innerHTML = `
            /* Use existing CSS from tutorial.css mostly, but ensure overrides here */
            .driver-popover {
                border: 4px solid #ff5722 !important;
                border-radius: 15px !important;
                background: white !important;
                color: #333 !important;
            }
            .driver-popover-footer {
                display: flex !important;
                justify-content: flex-end !important;
                margin-top: 15px !important;
            }
            .driver-popover-next-btn {
                display: inline-block !important;
                background-color: #2196F3 !important;
                color: white !important;
                border: none !important;
                padding: 10px 24px !important;
                border-radius: 8px !important;
                font-weight: bold !important;
            }
            .driver-popover-prev-btn {
                display: none !important; /* Single flow */
            }
        `;
        document.head.appendChild(style);
    }

    // === PASSIVE STEPS SETUP ===
    const steps = [
        // 1. Intro
        {
            element: '.tab-bar',
            popover: {
                title: '👋 반가워요!',
                description: '한그루에는 <b>[언어 자판기]</b>와 <b>[조음 자판기]</b>가 있습니다.<br>원하는 탭을 눌러서 전환할 수 있습니다.',
                popoverClass: 'fixed-tutorial-popup'
            }
        },
        // 2. Sidebar Menu (New)
        {
            element: '#sidebar',
            popover: {
                title: '📁 카테고리 메뉴',
                description: '<b>[언어 자판기]</b>는 주제별로,<br><b>[조음 자판기]</b>는 소리별로 정리되어 있습니다.',
                popoverClass: 'fixed-tutorial-popup'
            }
        },
        // 2. Search
        {
            element: '.global-search-container',
            popover: {
                title: '🔍 검색 기능',
                description: '원하는 그림을 여기서 바로 찾을 수 있습니다.<br>초성(ㄱ), 글자(가), 단어(가방) 모두 가능합니다.',
                popoverClass: 'fixed-tutorial-popup'
            }
        },
        // 3. Inventory
        {
            element: '.inventory-grid',
            popover: {
                title: '👆 그림 담기',
                description: '마음에 드는 그림을 클릭하면<br>장바구니에 담깁니다.',
                popoverClass: 'fixed-tutorial-popup'
            }
        },
        // 4. Add All
        {
            element: '#add-all-btn',
            popover: {
                title: '⬇️ 몽땅 담기',
                description: '목록에 있는 그림을 한 번에 다 담고 싶을 땐<br>이 <b>[모두 담기]</b> 버튼을 사용하세요.',
                popoverClass: 'fixed-tutorial-popup'
            }
        },
        // 5. Menu Open (Simulated)
        {
            element: '.basket-section', // General area first
            popover: {
                title: '⋮ 숨겨진 메뉴',
                description: '담긴 그림 오른쪽 위에 있는 <b>점 3개 버튼</b>을 누르면<br>다양한 기능을 사용할 수 있습니다.',
                popoverClass: 'fixed-tutorial-popup'
            },
            onHighlightStarted: () => {
                // Determine a target card to show off
                let card = document.querySelector('.card.in-basket');
                // If no card, try to add one for demo? Or just skip specific highlight
                if (!card) {
                    // Just stay on basket section
                } else {
                    const btn = card.querySelector('.card-menu-btn');
                    if (btn) {
                        // Visual Cue: Border around the button
                        btn.style.border = "3px solid #ff5722";
                        btn.style.borderRadius = "50%";
                        registerCleanup(() => {
                            btn.style.border = "";
                            btn.style.borderRadius = "";
                        });
                    }
                }
            }
        },
        // 6. Capture Copy (Simulated Open)
        {
            element: '#custom-context-menu',
            popover: {
                title: '📸 캡처 복사',
                description: '<b>[캡처 복사]</b>를 누르면 배경 없는 이미지가 복사됩니다.<br>PPT나 캔바에 붙여넣기 좋습니다.',
                popoverClass: 'fixed-tutorial-popup'
            },
            onHighlightStarted: () => {
                // 1. Force Open Menu for demo
                // We need a target to align it to.
                let card = document.querySelector('.card.in-basket');
                if (card) {
                    const btn = card.querySelector('.card-menu-btn');
                    if (btn) {
                        // Simulate opening functionality
                        // Use existing logic_ui function if possible?
                        // Or just force display block at a specific position
                        const rect = btn.getBoundingClientRect();

                        // Fake items
                        if (typeof renderCtxMenu === 'function') {
                            // Reuse logic_ui.js logic
                            const menuItems = [
                                { text: '🔍 크게 보기', action: 'zoom' },
                                { text: '📸 캡처 복사', action: 'copy_image' }
                            ];
                            renderCtxMenu(menuItems, rect.left, rect.bottom + 5);
                        } else {
                            // Fallback if renderCtxMenu not globally accessible
                            const ctxMenu = document.getElementById('custom-context-menu');
                            ctxMenu.style.display = 'block';
                            ctxMenu.style.left = (rect.left) + 'px';
                            ctxMenu.style.top = (rect.bottom + 5) + 'px';
                        }

                        // Highlight the Capture Item
                        setTimeout(() => {
                            const ctxMenu = document.getElementById('custom-context-menu');
                            const items = ctxMenu.querySelectorAll('.ctx-menu-item');
                            items.forEach(item => {
                                if (item.innerText.includes('캡처 복사') || item.innerText.includes('Capture')) {
                                    item.style.backgroundColor = "#ffebee";
                                    item.style.border = "2px solid #ff5722";
                                }
                            });

                            // [FIX] Force Driver.js to re-calculate position now that menu is visible
                            // This fixes the "Tiny Box at Top-Left" bug
                            if (tour && tour.refresh) {
                                tour.refresh();
                            }
                        }, 50);

                        registerCleanup(() => {
                            // Close menu when step ends
                            document.getElementById('custom-context-menu').style.display = 'none';
                        });
                    }
                }
            }
        },

        // 8. Print (Final)
        {
            element: '.print-controls',
            popover: {
                title: '🖨️ 인쇄하기',
                description: '<b>[선택 인쇄]</b> 또는 <b>[전체 인쇄]</b> 버튼을 누르면 인쇄 화면이 열립니다.<br>원하는 대로 설정을 바꿔가며 인쇄해보세요!<br><br><b>수고하셨습니다! 그림카드 자판기를 사용해보세요!</b>',
                popoverClass: 'fixed-tutorial-popup',
                onNextClick: () => tour.destroy() // Custom Finish Action
            }
        }
    ];

    tour = window.driver.js.driver({
        showProgress: true,
        allowClose: false, // [FIX] Prevent closing by clicking outside
        animate: false, // Prevents scroll jitter
        steps: steps,
        showButtons: ['next', 'close'],
        // ... (rest of config)
        nextBtnText: '다음 >',
        prevBtnText: '이전', // Hidden via CSS usually
        doneBtnText: '완료',
        onPopoverRendered: (popover) => {
            // Apply Fixed Position logic (CSS handling mostly)
            const wrapper = popover.wrapper;
            if (wrapper) {
                // JS Loop for style enforcement restored per user request
                const enforceStyles = () => {
                    if (!document.body.contains(wrapper)) return;

                    wrapper.style.setProperty('position', 'fixed', 'important');
                    wrapper.style.setProperty('top', '50%', 'important');
                    wrapper.style.setProperty('right', '5%', 'important');
                    wrapper.style.setProperty('left', 'auto', 'important');
                    wrapper.style.setProperty('transform', 'translateY(-50%)', 'important');
                    wrapper.style.setProperty('z-index', '1000000000', 'important');

                    // Dark Mode
                    wrapper.style.setProperty('background-color', '#1a1a1a', 'important');
                    wrapper.style.setProperty('color', '#ffffff', 'important');
                    wrapper.style.setProperty('border', '3px solid #FFD700', 'important');

                    requestAnimationFrame(enforceStyles);
                };
                requestAnimationFrame(enforceStyles);

                // Fix Text Colors
                const title = wrapper.querySelector('.driver-popover-title');
                if (title) title.style.setProperty('color', '#FFD700', 'important');

                const desc = wrapper.querySelector('.driver-popover-description');
                if (desc) desc.style.setProperty('color', '#eee', 'important');

                // Show Next Button Always
                // [NUCLEAR FIX] Manually Inject Next Button
                // Driver.js rendering is unreliable, so we force-create the button.
                let footer = wrapper.querySelector('.driver-popover-footer');
                if (!footer) {
                    footer = document.createElement('div');
                    footer.className = 'driver-popover-footer';
                    footer.style.cssText = 'display: flex !important; justify-content: flex-end !important; margin-top: 15px !important;';
                    wrapper.appendChild(footer);
                }

                // Clear existing just in case
                footer.innerHTML = '';

                const nextBtn = document.createElement('button');
                const isLastStep = !tour.hasNextStep();
                nextBtn.innerText = isLastStep ? '완료' : '다음 >';

                nextBtn.style.cssText = `
                    display: inline-block !important;
                    background-color: #2196F3 !important;
                    color: white !important;
                    border: none !important;
                    padding: 10px 24px !important;
                    border-radius: 8px !important;
                    font-size: 15px !important;
                    font-weight: bold !important;
                    cursor: pointer !important;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
                `;

                nextBtn.onclick = () => {
                    if (isLastStep) {
                        tour.destroy();
                    } else {
                        tour.moveNext();
                    }
                };

                footer.appendChild(nextBtn);

                // [CLOSE BUTTON INJECTION]
                // Force inject X button to Top-Right
                let closeBtn = wrapper.querySelector('.tutorial-close-btn');
                if (!closeBtn) {
                    closeBtn = document.createElement('button');
                    closeBtn.className = 'tutorial-close-btn';
                    closeBtn.innerHTML = '&times;';
                    closeBtn.title = '가이드 종료';
                    closeBtn.onclick = () => {
                        tour.destroy();
                    };
                    wrapper.appendChild(closeBtn);
                }
            }
        },
        onDestroyed: () => {
            document.body.classList.remove('tutorial-active');
            window.currentTutorialTour = null;

            // Restore Locks
            if (originalClearBasket) window.clearBasket = originalClearBasket;
            if (originalDeleteSelected) window.deleteSelected = originalDeleteSelected;
            if (originalShowAlert) window.showAlert = originalShowAlert;

            // Cleanup visuals
            runCleanup();
            document.getElementById('custom-context-menu').style.display = 'none';
        }
    });

    window.currentTutorialTour = tour;

    const btn = document.getElementById('tutorial-btn');
    if (btn) {
        btn.onclick = () => {
            const startTour = () => {
                // [AUTO-CLEAR] Empty basket for clean tutorial start
                const basketGrid = document.getElementById('basket-grid');
                if (basketGrid) {
                    basketGrid.querySelectorAll('.card.in-basket').forEach(c => c.remove());
                    // Optionally remove empty-msg if present, though logic_basket checks it usually.
                }

                if (window.tutorialCleanups.length > 0) runCleanup();
                document.body.classList.add('tutorial-active');

                // Safety Locks
                if (!originalClearBasket) originalClearBasket = window.clearBasket;
                if (!originalDeleteSelected) originalDeleteSelected = window.deleteSelected;
                if (!originalShowAlert) originalShowAlert = window.showAlert;

                window.clearBasket = () => console.log('Tutorial Block');
                window.deleteSelected = () => console.log('Tutorial Block');

                // [GLASS WALL & EVENT BLOCKER] 
                // 1. Visual Shield
                const glassWall = document.createElement('div');
                glassWall.id = 'tutorial-glass-wall';
                glassWall.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    z-index: 999999999; /* Just below Popover (1B) */
                    background: transparent;
                    cursor: default;
                `;
                document.body.appendChild(glassWall);

                // 2. Event Interceptor (The "Black Hole")
                // Driver.js brings elements to top z-index. We must CAPTURE events before they reach elements.
                const blockEvent = (e) => {
                    // Allow interaction ONLY with the Tutorial Popover (and its buttons)
                    if (e.target.closest('.driver-popover')) return;

                    // Block everything else
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    e.preventDefault();
                };

                const eventTypes = ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'pointerdown'];
                eventTypes.forEach(type => {
                    window.addEventListener(type, blockEvent, { capture: true });
                });

                registerCleanup(() => {
                    const gw = document.getElementById('tutorial-glass-wall');
                    if (gw) gw.remove();

                    eventTypes.forEach(type => {
                        window.removeEventListener(type, blockEvent, { capture: true });
                    });
                });

                // Ensure we have at least 1 card for demo
                // Ensure we have at least 1 card for demo
                const grid = document.getElementById('basket-grid');
                if (grid.querySelectorAll('.card.in-basket').length === 0) {
                    // [AUTO-SETUP] Add dummy card so we have something to click
                    if (window.addToBasket) {
                        window.addToBasket('assets/icon_192.png', '예시 그림'); // Use app icon or placeholder

                        // Register cleanup to remove this dummy card if it's the only one? 
                        // Or just leave it? User might want to keep it.
                        // Actually, better to leave it so they can try "Clear All" later themselves,
                        // OR clean it up if they want "pristine" state.
                        // Let's mark it and clean it up.
                        const addedCard = grid.lastElementChild;
                        if (addedCard) {
                            addedCard.classList.add('tutorial-dummy');
                            registerCleanup(() => {
                                if (addedCard && addedCard.parentElement) addedCard.remove();
                            });
                        }
                    }
                }

                tour.drive();
            };

            // Simple Check
            startTour();
        };
    }
}


// [Global ESC Handler for Tutorial]
document.addEventListener('keydown', (e) => {
    // 1. Tutorial Driver
    if ((e.key === 'Escape' || e.key === 'Esc') && window.currentTutorialTour) {
        console.log('ESC pressed: Destroying Tutorial');
        window.currentTutorialTour.destroy();
    }
    // 2. Welcome Popup
    if ((e.key === 'Escape' || e.key === 'Esc') && document.getElementById('welcome-overlay')) {
        if (window.closeWelcomePopup) window.closeWelcomePopup();
    }
});

// === Welcome Popup Logic (Unchanged) ===
function initWelcomePopup() {
    // ...
    if (document.getElementById('beta-gate-overlay')) return;
    if (localStorage.getItem('tutorial_hide_welcome') === 'true') return;

    const styleId = 'welcome-popup-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            #welcome-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex; justify-content: center; align-items: center;
                z-index: 99999;
                animation: fadeIn 0.3s ease-out;
            }
            #welcome-box {
                background: white;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                max-width: 500px;
                width: 90%;
            }
            .welcome-title { font-size: 2rem; margin-bottom: 15px; font-weight: bold; }
            .welcome-btn {
                background: #4CAF50; color: white; border: none; padding: 15px 30px;
                font-size: 1.2rem; border-radius: 50px; cursor: pointer; margin-bottom: 20px;
            }
        `;
        document.head.appendChild(style);
    }

    const overlay = document.createElement('div');
    overlay.id = 'welcome-overlay';
    overlay.innerHTML = `
        <div id="welcome-box">
            <button style="position:absolute; top:15px; right:15px; border:none; background:none; font-size:1.5rem; cursor:pointer;" onclick="closeWelcomePopup()">×</button>
            <div class="welcome-title">🎉 환영합니다!</div>
            <div style="margin-bottom:30px; line-height:1.6; color:#555;">처음 오셨으면<br><b>자판기 사용방법 가이드</b>를 확인해보세요!</div>
            <button class="welcome-btn" onclick="startWelcomeTour()">📖 가이드 시작하기</button>
            <div style="border-top:1px solid #eee; padding-top:15px;">
                <label><input type="checkbox" id="welcome-hide-chk"> 더 이상 보지 않기</label>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    window.startWelcomeTour = function () {
        closeWelcomePopup(true);
        const btn = document.getElementById('tutorial-btn');
        if (btn) btn.click();
    };

    window.closeWelcomePopup = function (isStart) {
        const chk = document.getElementById('welcome-hide-chk');
        if (chk && chk.checked) localStorage.setItem('tutorial_hide_welcome', 'true');
        overlay.remove();
    };
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initTutorial, 500);
    // 첫 방문 환영 팝업 자동 표시 비활성화 (요청). 가이드는 헤더의 가이드 버튼으로 계속 사용 가능.
    // setTimeout(initWelcomePopup, 1000);
});
