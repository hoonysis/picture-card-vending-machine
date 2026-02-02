(function () {
    // === Smart Gate Logic (Persistent Access) ===
    const STORAGE_KEY = 'hangru_gate_pass';
    const CUSTOM_USERS_KEY = 'hangru_gate_custom_users';

    const params = new URLSearchParams(window.location.search);
    const urlUser = params.get('user');

    // 1. VIP List (Hardcoded)
    const VIP_MEMBERS = [
        "고미희", "김민아", "민슬비", "박주희",
        "박효진", "유지민", "이기훈", "이소희",
        "이혜란", "이효민", "장주영", "조나현"
    ];

    // 2. [Check URL]
    if (urlUser) {
        if (urlUser === 'guest') {
            console.log(`🔒 [Smart Gate] Guest link detected. Showing gate.`);
        }
        else {
            if (!urlUser.startsWith('beta_')) {
                localStorage.setItem(STORAGE_KEY, urlUser);
            }
            console.log(`✅ [Smart Gate] Authorized access: ${urlUser}`);
            return;
        }
    } else {
        const savedUser = localStorage.getItem(STORAGE_KEY);
        if (savedUser) {
            console.log(`✅ [Smart Gate] Welcome back, ${savedUser}! (Auto-login)`);
            return;
        }
    }

    // Build UI
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes gateFadeIn {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        #beta-gate-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(240, 244, 248, 0.95);
            backdrop-filter: blur(15px);
            z-index: 99999;
            display: flex; justify-content: center; align-items: center;
            font-family: 'Pretendard', sans-serif;
        }
        #beta-gate-box {
            background: white; width: 600px; max-width: 95%; 
            border-radius: 30px;
            box-shadow: 0 30px 80px rgba(0,0,0,0.12), 0 10px 30px rgba(0,0,0,0.08);
            padding: 50px 40px; text-align: center;
            animation: gateFadeIn 0.5s ease-out forwards;
            position: relative;
        }
        .gate-title { 
            font-size: 2.2rem; 
            font-weight: 800; color: #222; margin: 0 0 15px; 
            letter-spacing: -0.02em;
        }
        .gate-desc { 
            font-size: 1.2rem; color: #666; margin-bottom: 40px; 
            font-weight: 500;
        }
        
        #member-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr); 
            gap: 12px;
            margin-bottom: 20px;
            max-height: 400px; overflow-y: auto;
            padding-right: 5px;
        }
        .member-btn {
            background: #fff; border: 2px solid #eee;
            padding: 15px 0; border-radius: 16px;
            font-size: 1.1rem; color: #444; font-weight: 600;
            cursor: pointer; transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
            position: relative;
        }
        .member-btn:hover {
            border-color: #2196F3; color: #2196F3;
            background: #e3f2fd;
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(33, 150, 243, 0.2);
        }
        .member-btn.custom-user {
            border-style: dashed; border-color: #ddd;
        }
        .member-btn.server-user {
            /* Server users conform to standard style */
        }

        #manual-input-section {
            margin-top: 30px; padding-top: 20px;
            border-top: 2px dashed #eee;
            display: none; 
            animation: gateFadeIn 0.3s ease-out;
        }
        .gate-input-wrapper { display: flex; gap: 10px; }
        .gate-input {
            flex: 1; padding: 12px 16px; border: 2px solid #eee;
            border-radius: 12px; font-size: 1rem; outline: none; transition: border-color 0.2s;
        }
        .gate-input:focus { border-color: #2196F3; }
        .gate-submit-btn {
            background: #444; color: white; border: none;
            padding: 0 20px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: background 0.2s;
        }
        .gate-submit-btn:hover { background: #222; }

        #gate-settings-btn {
            position: absolute; top: 20px; right: 20px;
            background: none; border: none; cursor: pointer;
            font-size: 1.5rem; color: #ccc; padding: 5px; transition: all 0.3s;
        }
        #gate-settings-btn:hover { color: #888; transform: rotate(90deg); }
        
        .section-label {
            display: block; text-align: left; 
            font-size: 0.9rem; color: #999; font-weight: bold; margin-bottom: 10px;
        }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'beta-gate-overlay';
    overlay.innerHTML = `
        <div id="beta-gate-box">
            <button id="gate-settings-btn" title="수동 입력">⚙️</button>
            <h1 class="gate-title">🌱 한그루 그림카드 자판기</h1>
            <p class="gate-desc">이름을 클릭하면 바로 입장합니다.</p>
            <div id="member-grid"></div>
            <div id="manual-input-section">
                <span class="section-label">직접 입력하여 입장하기</span>
                <div class="gate-input-wrapper">
                    <input type="text" id="manual-name-input" class="gate-input" placeholder="성함을 입력하세요">
                    <button id="manual-submit-btn" class="gate-submit-btn">확인</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Helpers
    function getStoredUsers() {
        try { return JSON.parse(localStorage.getItem(CUSTOM_USERS_KEY) || '[]'); } catch { return []; }
    }

    // Core Enter Logic: Register -> Redirect
    async function enterExample(name) {
        if (!name) return;
        window.location.href = `?user=${encodeURIComponent(name)}`;
    }

    async function registerAndEnter(name) {
        if (!name) return;

        // 1. Optimistic Redirect (if VIP)
        if (VIP_MEMBERS.includes(name)) {
            window.location.href = `?user=${encodeURIComponent(name)}`;
            return;
        }

        // 2. Server Registration (For Global Sync)
        const btn = document.getElementById('manual-submit-btn');
        if (btn) btn.innerText = "등록 중...";

        try {
            await fetch('/api/register_user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name })
            });
            // Even if fail (already exists), we proceed
        } catch (e) { console.warn("Gate: Register failed", e); }

        // 3. Local Cache (Backup)
        let users = getStoredUsers();
        if (!users.includes(name)) {
            users.push(name);
            localStorage.setItem(CUSTOM_USERS_KEY, JSON.stringify(users));
        }

        window.location.href = `?user=${encodeURIComponent(name)}`;
    }


    // MAIN RENDER FUNCTION
    async function renderGrid() {
        const grid = document.getElementById('member-grid');
        grid.innerHTML = 'loading...';

        const allNames = new Set();
        VIP_MEMBERS.forEach(name => allNames.add(name));

        // API Fetch
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const serverUsers = await res.json();
                serverUsers.forEach(name => allNames.add(name));
            }
        } catch (e) { console.warn("Gate: API fetch failed", e); }

        // Local Fetch (Legacy support)
        getStoredUsers().forEach(name => allNames.add(name));

        grid.innerHTML = ''; // Clear loading

        const sortedNames = Array.from(allNames).sort((a, b) => a.localeCompare(b, 'ko'));
        sortedNames.forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'member-btn';
            btn.innerText = name;

            // On Click
            btn.onclick = () => window.location.href = `?user=${encodeURIComponent(name)}`; // Simple redirect for existing

            grid.appendChild(btn);
        });
    }

    renderGrid();

    // Event Bindings
    const settingsBtn = document.getElementById('gate-settings-btn');
    const manualSection = document.getElementById('manual-input-section');
    settingsBtn.onclick = () => {
        if (manualSection.style.display === 'block') {
            manualSection.style.display = 'none';
            settingsBtn.style.color = '#ccc';
        } else {
            manualSection.style.display = 'block';
            settingsBtn.style.color = '#444';
            setTimeout(() => document.getElementById('manual-name-input').focus(), 100);
        }
    };

    // Manual Input -> Register API
    const manualInput = document.getElementById('manual-name-input');
    const manualBtn = document.getElementById('manual-submit-btn');

    const handleSubmit = () => registerAndEnter(manualInput.value.trim());

    manualBtn.onclick = handleSubmit;
    manualInput.onkeypress = (e) => { if (e.key === 'Enter') handleSubmit(); };

})();
