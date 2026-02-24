/* ==========================================================================
   Profile UI Module (profile_ui.js)
   대문 화면(Dashboard)의 아동 프로필 타일 및 관련 UI 컴포넌트 렌더링 전담
   ========================================================================== */

/**
 * 넷플릭스 스타일 아동 프로필 타일들을 렌더링
 * @param {Array} childList - 등록된 아동 데이터 배열
 */
function renderDashboardProfiles(childList) {
    const gridContainer = document.getElementById('profileGrid');
    if (!gridContainer) return; // 요소가 없으면 실행 중지

    let html = '';

    // 1. 등록된 아동 렌더링
    childList.forEach(child => {
        const months = calculateMonths(child.birthDate);
        const genderClass = child.gender === 'female' ? 'female' : 'male';

        // 케밥 메뉴(점 3개) 버튼과 드롭다운 툴팁 구조
        html += `
            <div class="profile-card ${genderClass}" onclick="goToAssessment('${child.id}')">
                <button class="btn-kebab" onclick="toggleProfileOptions(event, '${child.id}')">⋮</button>
                <div class="profile-options" id="options-${child.id}">
                    <button class="option-btn" onclick="openEditModal(event, '${child.id}')">✏️ 수정</button>
                    <button class="option-btn delete" onclick="deleteChild(event, '${child.id}')">🗑️ 삭제</button>
                </div>
                <div class="profile-avatar">${child.name}</div>
                <div class="profile-meta">${months}개월</div>
            </div>
        `;
    });

    // 2. 새로운 아동 등록 버튼 (항상 마지막에 노출)
    html += `
        <div class="profile-card add-new" onclick="openAddModal()">
            <div class="profile-avatar"><span style="font-size:3rem; margin-bottom: 5px;">+</span><span style="font-size:1.1rem; font-weight:normal;">새 아이 추가</span></div>
            <div class="profile-meta">프로필 생성</div>
        </div>
    `;

    gridContainer.innerHTML = html;
}
