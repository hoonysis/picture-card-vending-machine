(function () {
    // === Smart Gate Logic (Persistent Access) ===
    const STORAGE_KEY = 'hangru_gate_pass';
    const CUSTOM_USERS_KEY = 'hangru_gate_custom_users';

    const params = new URLSearchParams(window.location.search);
    const forceGate = params.get('gate') === '1';
    const urlUser = params.get('user');

    // 1. 기본 명단 (예비용)
    // 평소 대문/관리 목록은 서버(/api/users)에서 온다. 이 배열은 두 용도로만 쓴다.
    //  (a) 서버를 못 읽을 때 대문이 비지 않도록 하는 fallback,
    //  (b) 관리 모달의 "기본 12명 등록" 버튼이 서버에 1회 등록할 대상 명단.
    const VIP_MEMBERS = [
        "고미희", "김민아", "민슬비", "박주희",
        "박효진", "유지민", "이기훈", "이소희",
        "이혜란", "이효민", "장주영", "조나현"
    ];

    // 2. [Check URL]
    if (forceGate) {
        localStorage.removeItem(STORAGE_KEY);
        console.log(`🔒 [Smart Gate] Launcher gate requested. Showing gate.`);
    }
    else if (urlUser) {
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

        #gate-settings-btn {
            position: absolute; top: 20px; right: 20px;
            background: none; border: none; cursor: pointer;
            font-size: 1.5rem; color: #ccc; padding: 5px; transition: all 0.3s;
        }
        #gate-settings-btn:hover { color: #888; transform: rotate(90deg); }

        /* === Admin: PIN + 사용자 관리 모달 === */
        #gate-admin-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(20, 24, 28, 0.45);
            backdrop-filter: blur(6px);
            z-index: 100000;
            display: none; justify-content: center; align-items: center;
            font-family: 'Pretendard', sans-serif;
        }
        #gate-admin-box {
            background: white; width: 460px; max-width: 92%;
            border-radius: 24px;
            box-shadow: 0 30px 80px rgba(0,0,0,0.25);
            padding: 36px 32px; text-align: center;
            animation: gateFadeIn 0.3s ease-out forwards;
            position: relative;
        }
        .admin-close {
            position: absolute; top: 16px; right: 18px;
            background: none; border: none; cursor: pointer;
            font-size: 1.6rem; color: #ccc; line-height: 1;
        }
        .admin-close:hover { color: #888; }
        .admin-title { font-size: 1.5rem; font-weight: 800; color: #222; margin: 0 0 8px; }
        .admin-sub { font-size: 1rem; color: #888; margin-bottom: 22px; }

        .admin-input {
            width: 100%; box-sizing: border-box;
            padding: 12px 16px; border: 2px solid #eee;
            border-radius: 12px; font-size: 1rem; outline: none;
            transition: border-color 0.2s;
        }
        .admin-input:focus { border-color: #2196F3; }
        .admin-primary-btn {
            background: #2196F3; color: white; border: none;
            padding: 12px 22px; border-radius: 12px;
            font-weight: bold; cursor: pointer; transition: background 0.2s;
        }
        .admin-primary-btn:hover { background: #1e88e5; }
        .admin-error { color: #e53935; font-size: 0.9rem; margin-top: 12px; min-height: 1.1em; }

        .admin-add-row { display: flex; gap: 8px; margin-bottom: 18px; }
        .admin-add-row .admin-input { flex: 1; }

        #admin-user-list {
            text-align: left; max-height: 320px; overflow-y: auto;
            border-top: 1px solid #f0f0f0;
        }
        .admin-user-row {
            display: flex; align-items: center; justify-content: space-between;
            padding: 12px 4px; border-bottom: 1px solid #f3f3f3;
        }
        .admin-user-name { font-size: 1.05rem; color: #333; font-weight: 600; }
        .admin-row-actions { display: flex; gap: 6px; }
        .admin-mini-btn {
            border: 1px solid #ddd; background: #fafafa; color: #555;
            padding: 6px 12px; border-radius: 8px; font-size: 0.85rem;
            cursor: pointer; transition: all 0.15s;
        }
        .admin-mini-btn:hover { background: #f0f0f0; }
        .admin-mini-btn.danger { color: #e53935; border-color: #f1c5c3; }
        .admin-mini-btn.danger:hover { background: #fdecea; }
        .admin-empty { color: #aaa; text-align: center; padding: 28px 0; font-size: 0.95rem; }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'beta-gate-overlay';
    overlay.innerHTML = `
        <div id="beta-gate-box">
            <button id="gate-settings-btn" title="사용자 관리">⚙️</button>
            <h1 class="gate-title">🌱 한그루 그림카드 자판기</h1>
            <p class="gate-desc">이름을 클릭하면 바로 입장합니다.</p>
            <div id="member-grid"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Admin overlay (PIN 잠금 → 사용자 관리)
    const adminOverlay = document.createElement('div');
    adminOverlay.id = 'gate-admin-overlay';
    adminOverlay.innerHTML = `
        <div id="gate-admin-box">
            <button class="admin-close" id="admin-close-btn" title="닫기">&times;</button>

            <div id="admin-pin-view">
                <h2 class="admin-title">🔒 사용자 관리</h2>
                <p class="admin-sub">관리자 PIN을 입력하세요.</p>
                <div style="display:flex; gap:8px;">
                    <input type="password" id="admin-pin-input" class="admin-input" placeholder="PIN" autocomplete="off">
                    <button id="admin-pin-submit" class="admin-primary-btn">확인</button>
                </div>
                <div class="admin-error" id="admin-pin-error"></div>
            </div>

            <div id="admin-manage-view" style="display:none;">
                <h2 class="admin-title">사용자 관리</h2>
                <p class="admin-sub">대문에 보일 사용자를 추가·수정·삭제합니다.</p>
                <div class="admin-add-row">
                    <input type="text" id="admin-add-input" class="admin-input" placeholder="새 사용자 이름">
                    <button id="admin-add-btn" class="admin-primary-btn">추가</button>
                </div>
                <div id="admin-seed-row" style="display:none; margin-bottom:14px;">
                    <button id="admin-seed-btn" class="admin-mini-btn" style="width:100%; padding:10px;">기본 12명 목록에 등록</button>
                </div>
                <div class="admin-error" id="admin-manage-error"></div>
                <div id="admin-user-list"></div>
            </div>
        </div>
    `;
    document.body.appendChild(adminOverlay);

    // Helpers
    function getStoredUsers() {
        try { return JSON.parse(localStorage.getItem(CUSTOM_USERS_KEY) || '[]'); } catch { return []; }
    }

    // MAIN RENDER FUNCTION (대문 이름 버튼 그리드)
    async function renderGrid() {
        const grid = document.getElementById('member-grid');
        grid.innerHTML = 'loading...';

        const allNames = new Set();

        // API Fetch (주 출처)
        let serverOk = false;
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const serverUsers = await res.json();
                serverUsers.forEach(name => allNames.add(name));
                serverOk = true;
            }
        } catch (e) { console.warn("Gate: API fetch failed", e); }

        // 서버를 못 읽었을 때만 기본 명단을 예비로 채워 대문이 비지 않게 한다.
        if (!serverOk) VIP_MEMBERS.forEach(name => allNames.add(name));

        // Local Fetch (Legacy support)
        getStoredUsers().forEach(name => allNames.add(name));

        grid.innerHTML = ''; // Clear loading

        const sortedNames = Array.from(allNames).sort((a, b) => a.localeCompare(b, 'ko'));
        sortedNames.forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'member-btn';
            btn.innerText = name;
            btn.onclick = () => window.location.href = `?user=${encodeURIComponent(name)}`;
            grid.appendChild(btn);
        });
    }

    renderGrid();

    // ===== Admin Flow =====
    const settingsBtn = document.getElementById('gate-settings-btn');
    const adminCloseBtn = document.getElementById('admin-close-btn');
    const pinView = document.getElementById('admin-pin-view');
    const manageView = document.getElementById('admin-manage-view');
    const pinInput = document.getElementById('admin-pin-input');
    const pinSubmit = document.getElementById('admin-pin-submit');
    const pinError = document.getElementById('admin-pin-error');
    const addInput = document.getElementById('admin-add-input');
    const addBtn = document.getElementById('admin-add-btn');
    const manageError = document.getElementById('admin-manage-error');
    const userList = document.getElementById('admin-user-list');
    const seedRow = document.getElementById('admin-seed-row');
    const seedBtn = document.getElementById('admin-seed-btn');

    function openAdmin() {
        pinView.style.display = 'block';
        manageView.style.display = 'none';
        pinInput.value = '';
        pinError.innerText = '';
        manageError.innerText = '';
        adminOverlay.style.display = 'flex';
        setTimeout(() => pinInput.focus(), 100);
    }
    function closeAdmin() { adminOverlay.style.display = 'none'; }

    settingsBtn.onclick = openAdmin;
    adminCloseBtn.onclick = closeAdmin;
    adminOverlay.onclick = (e) => { if (e.target === adminOverlay) closeAdmin(); };

    // PIN 검증 → 관리 뷰 전환
    async function verifyPin() {
        const pin = pinInput.value.trim();
        if (!pin) return;
        pinError.innerText = '';
        pinSubmit.innerText = '확인 중...';
        try {
            const res = await fetch('/api/admin/verify_pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });
            if (res.ok) {
                pinView.style.display = 'none';
                manageView.style.display = 'block';
                loadAdminUsers();
            } else {
                pinError.innerText = 'PIN이 올바르지 않습니다.';
            }
        } catch (e) {
            pinError.innerText = '서버 연결에 실패했습니다.';
        } finally {
            pinSubmit.innerText = '확인';
        }
    }
    pinSubmit.onclick = verifyPin;
    pinInput.onkeypress = (e) => { if (e.key === 'Enter') verifyPin(); };

    // 관리 목록 로드 (서버 사용자에서 VIP 제외)
    async function loadAdminUsers() {
        userList.innerHTML = '<div class="admin-empty">불러오는 중...</div>';
        let users = [];
        try {
            const res = await fetch('/api/users');
            if (res.ok) users = await res.json();
        } catch (e) { /* below */ }

        const managed = users.slice().sort((a, b) => a.localeCompare(b, 'ko'));

        // 기본 12명 중 아직 서버에 없는 사람이 있으면 "등록" 버튼을 노출.
        const missingCore = VIP_MEMBERS.filter(n => !users.includes(n));
        if (missingCore.length > 0) {
            seedBtn.innerText = `기본 12명 중 ${missingCore.length}명 목록에 등록`;
            seedRow.style.display = 'block';
        } else {
            seedRow.style.display = 'none';
        }

        userList.innerHTML = '';
        if (managed.length === 0) {
            userList.innerHTML = '<div class="admin-empty">관리할 사용자가 없습니다.</div>';
            return;
        }
        managed.forEach(name => {
            const row = document.createElement('div');
            row.className = 'admin-user-row';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'admin-user-name';
            nameSpan.innerText = name;
            const actions = document.createElement('div');
            actions.className = 'admin-row-actions';
            const editBtn = document.createElement('button');
            editBtn.className = 'admin-mini-btn';
            editBtn.innerText = '수정';
            editBtn.onclick = () => renameUser(name);
            const delBtn = document.createElement('button');
            delBtn.className = 'admin-mini-btn danger';
            delBtn.innerText = '삭제';
            delBtn.onclick = () => deleteUser(name);
            actions.appendChild(editBtn);
            actions.appendChild(delBtn);
            row.appendChild(nameSpan);
            row.appendChild(actions);
            userList.appendChild(row);
        });
    }

    // 추가
    async function addUser() {
        const name = addInput.value.trim();
        if (!name) return;
        manageError.innerText = '';
        try {
            const res = await fetch('/api/register_user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                addInput.value = '';
                await loadAdminUsers();
                renderGrid();
            } else {
                manageError.innerText = data.error || '추가에 실패했습니다.';
            }
        } catch (e) {
            manageError.innerText = '서버 연결에 실패했습니다.';
        }
    }
    addBtn.onclick = addUser;
    addInput.onkeypress = (e) => { if (e.key === 'Enter') addUser(); };

    // 기본 12명 일괄 등록 (서버에 없는 사람만 register) — 운영/로컬에서 1회용
    async function seedCoreUsers() {
        manageError.innerText = '';
        seedBtn.disabled = true;
        const prev = seedBtn.innerText;
        seedBtn.innerText = '등록 중...';
        try {
            let users = [];
            try {
                const res = await fetch('/api/users');
                if (res.ok) users = await res.json();
            } catch (e) { /* ignore */ }
            const missing = VIP_MEMBERS.filter(n => !users.includes(n));
            for (const name of missing) {
                await fetch('/api/register_user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
            }
            await loadAdminUsers();
            renderGrid();
        } catch (e) {
            manageError.innerText = '등록 중 오류가 발생했습니다.';
            seedBtn.innerText = prev;
        } finally {
            seedBtn.disabled = false;
        }
    }
    seedBtn.onclick = seedCoreUsers;

    // 수정 (이름 변경)
    async function renameUser(oldName) {
        const newName = (prompt(`"${oldName}" 의 새 이름을 입력하세요.`, oldName) || '').trim();
        if (!newName || newName === oldName) return;
        manageError.innerText = '';
        try {
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_name: oldName, new_name: newName })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                await loadAdminUsers();
                renderGrid();
            } else {
                manageError.innerText = data.error || '수정에 실패했습니다.';
            }
        } catch (e) {
            manageError.innerText = '서버 연결에 실패했습니다.';
        }
    }

    // 삭제 (백업 후 그림·저장소까지 제거)
    async function deleteUser(name) {
        const ok = confirm(`"${name}" 사용자를 삭제합니다.\n이 사용자가 올린 그림과 저장소도 함께 삭제됩니다.\n(삭제 전 백업은 남습니다.)\n\n계속할까요?`);
        if (!ok) return;
        manageError.innerText = '';
        try {
            const res = await fetch('/api/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                await loadAdminUsers();
                renderGrid();
            } else {
                manageError.innerText = data.error || '삭제에 실패했습니다.';
            }
        } catch (e) {
            manageError.innerText = '서버 연결에 실패했습니다.';
        }
    }

})();
