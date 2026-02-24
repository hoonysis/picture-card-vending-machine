/* ==========================================================================
   Dashboard Logic (dashboard.js)
   로컬 스토리지 기반 아동 정보 관리, 생년월일 개월수 계산, 초기 진입 렌더링
   ========================================================================== */

// 전역 상태 (추후 서버 연동 시 API 교체 포인트)
let childList = [];
let editingChildId = null; // 현재 수정 중인 아동 ID (null이면 신규 등록)
let currentSelectedChildId = null; // 현재 선택되어 진행 중인 아동 ID
let currentSelectedChildMonths = 0; // 선택된 아동의 계산된 개월수

/**
 * [유틸리티] 생년월일 텍스트를 입력받아 현재 날짜 기준 만 개월수를 반환
 * @param {string} birthDateStr 'YYYY-MM-DD' 포맷
 * @returns {number} 만 개월수
 */
function calculateMonths(birthDateStr) {
    const birthDate = new Date(birthDateStr);
    const today = new Date();

    let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
    months -= birthDate.getMonth();
    months += today.getMonth();

    // 만약 이번 달의 생일 날짜가 아직 안 지났다면 1개월 차감
    if (today.getDate() < birthDate.getDate()) {
        months--;
    }

    return months <= 0 ? 0 : months;
}

/**
 * 로컬 스토리지에서 아동 데이터 로드
 */
function loadChildData() {
    const savedData = localStorage.getItem('vocabTracker_children');
    if (savedData) {
        childList = JSON.parse(savedData);
    } else {
        childList = []; // 데이터가 없으면 빈 배열
    }
}

/**
 * 로컬 스토리지에 아동 데이터 저장
 */
function saveChildData() {
    localStorage.setItem('vocabTracker_children', JSON.stringify(childList));
}



/**
 * 새 아동 추가 모달 제어
 * (모달이 fetch로 비동기 삽입되므로, 전역 변수가 아닌 함수 실행 시점에 동적으로 요소를 찾습니다)
 */
let selectedGender = 'male'; // 기본값

function openAddModal() {
    // 폼 초기화
    const titleEl = document.getElementById('modalTitle');
    if (titleEl) titleEl.textContent = "신규 아이 등록";
    const childNameInput = document.getElementById('childName');
    if (childNameInput) childNameInput.value = '';
    selectedGender = 'male';
    updateGenderUI();

    // 신규 모드
    editingChildId = null;

    // 모달창 닫기 이벤트(배경 클릭) 등에서 열려있던 케밥 메뉴가 있다면 모두 닫기
    closeAllOptions();
    document.getElementById('addModal').style.display = 'flex';
}

function openEditModal(event, childId) {
    event.stopPropagation(); // 단어장 진입 방지
    closeAllOptions(); // 툴팁 닫기

    const child = childList.find(c => c.id === childId);
    if (!child) return;

    //수정 모드 활성화
    editingChildId = childId;
    const titleEl = document.getElementById('modalTitle');
    if (titleEl) titleEl.textContent = "아이 정보 수정";

    // 데이터 폼에 채우기
    const childNameInput = document.getElementById('childName');
    if (childNameInput) childNameInput.value = child.name;
    selectedGender = child.gender;
    updateGenderUI();

    const [y, m, d] = child.birthDate.split('-');
    const birthYear = document.getElementById('birthYear');
    const birthMonth = document.getElementById('birthMonth');
    const birthDay = document.getElementById('birthDay');

    if (birthYear) birthYear.value = parseInt(y);
    if (birthMonth) birthMonth.value = parseInt(m);
    if (birthDay) birthDay.value = parseInt(d);

    document.getElementById('addModal').style.display = 'flex';
}

function closeAddModal() {
    document.getElementById('addModal').style.display = 'none';
}

function setGender(gender) {
    selectedGender = gender;
    updateGenderUI();
}

function updateGenderUI() {
    const maleBtn = document.getElementById('btnMale');
    const femaleBtn = document.getElementById('btnFemale');

    if (selectedGender === 'male') {
        maleBtn.classList.add('active');
        femaleBtn.classList.remove('active');
    } else {
        femaleBtn.classList.add('active');
        maleBtn.classList.remove('active');
    }
}

/**
 * 새 아동 저장 처리 (등록 버튼 클릭 시)
 */
function submitNewChild() {
    const childNameInput = document.getElementById('childName');
    const birthYear = document.getElementById('birthYear');
    const birthMonth = document.getElementById('birthMonth');
    const birthDay = document.getElementById('birthDay');

    if (!childNameInput || !birthYear || !birthMonth || !birthDay) return;

    const name = childNameInput.value.trim();
    const year = birthYear.value;
    const month = birthMonth.value.padStart(2, '0');
    const day = birthDay.value.padStart(2, '0');

    if (!name) {
        showAlertModal("아이 이름을 입력해주세요.");
        childNameInput.focus();
        return;
    }

    const birthDateStr = `${year}-${month}-${day}`;
    // 유효한 날짜인지 검증 (간단히 2월 30일 등 방지)
    const testDate = new Date(birthDateStr);
    if (isNaN(testDate.getTime())) {
        showAlertModal("올바르지 않은 생년월일입니다.");
        return;
    }

    if (editingChildId) {
        // [수정 모드] 기존 데이터 덮어쓰기
        const idx = childList.findIndex(c => c.id === editingChildId);
        if (idx !== -1) {
            childList[idx].name = name;
            childList[idx].birthDate = birthDateStr;
            childList[idx].gender = selectedGender;
            // createdAt은 유지
        }
    } else {
        // [신규 등록 모드]
        const newId = 'child_' + Date.now() + Math.floor(Math.random() * 1000);
        const newChild = {
            id: newId,
            name: name,
            birthDate: birthDateStr,
            gender: selectedGender,
            createdAt: new Date().toISOString()
        };
        childList.push(newChild);
    }

    saveChildData();
    closeAddModal();
    renderDashboardProfiles(childList); // 타일 다시 그리기
}

/**
 * 아이 삭제 처리 (커스텀 모달 띄우기)
 */
let pendingDeleteId = null; // 삭제 대기 중인 아이 ID

function deleteChild(event, childId) {
    event.stopPropagation(); // 카드 클릭 동작 막기
    closeAllOptions();

    const child = childList.find(c => c.id === childId);
    if (!child) return;

    // 삭제 대기 ID 세팅
    pendingDeleteId = childId;

    // 모달 메시지 및 UI 세팅
    document.getElementById('confirmMessage').innerHTML =
        `<strong>'${child.name}'</strong>의 모든 데이터를 삭제하시겠습니까?`;

    // 모달 띄우기
    document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal() {
    pendingDeleteId = null;
    if (typeof pendingReset !== 'undefined') pendingReset = false; // app.js의 초기화 변수도 리셋
    document.getElementById('confirmModal').style.display = 'none';
}

// ==========================================
// 공용 Confirm Modal 실행 컨트롤러 (전역 함수)
// ==========================================
function executeConfirmAction() {
    // 1. 단어 초기화 모드일 때 (app.js 상탯값)
    if (typeof pendingReset !== 'undefined' && pendingReset && currentSelectedChildId) {
        const currentData = dummyData.filter(d => d.age === currentAgeTab);
        currentData.forEach(d => {
            if (learnedState[d.id]) {
                delete learnedState[d.id];
            }
        });
        saveLearnedState();
        renderApp();
        pendingReset = false;
        closeConfirmModal();
    }
    // 2. 대문 프로필 삭제 모드일 때 (dashboard.js 상탯값)
    else if (typeof pendingDeleteId !== 'undefined' && pendingDeleteId) {
        childList = childList.filter(c => c.id !== pendingDeleteId);

        // TODO: 추후 파이썬애니웨어 연동 시 이 아이의 단어장 데이터도 함께 지우는 로직 필요
        saveChildData();
        renderDashboardProfiles(childList);

        pendingDeleteId = null;
        closeConfirmModal();
    }
}

/**
 * 특정 카드의 옵션 툴팁(수정/삭제) 노출 온오프
 */
function toggleProfileOptions(event, childId) {
    event.stopPropagation(); // 모바일 및 카드 진입 클릭 방지
    const targetMenu = document.getElementById(`options-${childId}`);

    // 이미 켜진 게 있으면 닫고(자신 제외), 자기를 토글
    const isShowing = targetMenu.classList.contains('show');
    closeAllOptions();

    if (!isShowing) {
        targetMenu.classList.add('show');
    }
}

/**
 * 열려있는 모든 옵션 툴팁 닫기
 */
function closeAllOptions() {
    document.querySelectorAll('.profile-options').forEach(el => {
        el.classList.remove('show');
    });
}

/**
 * 앱 진입 (프로필 타일 클릭) -> 단어장(안의 진단 설문지) 화면으로 초기 진입
 */
function goToAssessment(childId) {
    // 1. 선택한 아이 정보 찾기
    const child = childList.find(c => c.id === childId);
    if (!child) return;

    const months = calculateMonths(child.birthDate);
    currentSelectedChildId = childId;
    currentSelectedChildMonths = months;

    // 2. 대문 숨기고 바로 단어장(tracker-view) 화면 표시
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('tracker-view').style.display = 'flex'; // 메인 앱 껍데기 노출

    // 3. 단어장 상단 헤더 UI 업데이트 (현재 학생 정보)
    document.getElementById('currentStudentName').textContent = `${child.name} (${currentSelectedChildMonths}개월)`;

    // 4. 설문지 화면의 아동 이름 업데이트
    const assessmentNameEl = document.getElementById('assessmentChildName');
    if (assessmentNameEl) assessmentNameEl.textContent = `${child.name}`;

    // 5. 사이드바 신규 진단 탭으로 자동 활성화 (새로운 구조 적용)
    if (typeof selectTab === 'function') {
        selectTab('발달 체크 및 리포트');
    }

    // 6. app.js에 정의된 '초기 진단 모드 진입' 로직 호출 (상태 로컬스토리지 복구 포함)
    // 참고: selectTab 내부에서 이미 prepareAssessmentMode()를 호출하므로 중복 호출 방지를 위해 주석 처리
    // if (typeof prepareAssessmentMode === 'function') {
    //     prepareAssessmentMode();
    // }
}

// (기존 독립 뷰 관련 화면 전환 함수들은 내부 컴포넌트 토글 방식으로 변경됨에 따라 app.js 쪽으로 이관 혹은 병합되었습니다)

/**
 * 언제 어디서든 '🏠 홈' 버튼 클릭 시 대문으로 빠져나오기
 */
function goToDashboard() {
    document.getElementById('tracker-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'flex'; // block에서 flex로 원상복귀 (가운데 정렬 버그 수정)

    // 글로벌 하단 플로팅 바 감추기 (버그 픽스 - 정확한 ID 매칭)
    const floatingBar = document.getElementById('floating-bar');
    if (floatingBar) {
        floatingBar.style.bottom = '-100px';
    }

    currentSelectedChildId = null;
    currentSelectedChildMonths = 0;
}

// ----------------------------------------------------
// 초기화 및 드롭다운 연도/월/일 생성
// ----------------------------------------------------
function populateDateDropdowns() {
    const currentYear = new Date().getFullYear();
    // 연도: 현재로부터 10년 전까지만 (더 이전은 타겟 연령 초과)
    let yearHtml = '';
    for (let i = currentYear; i >= currentYear - 10; i--) {
        yearHtml += `<option value="${i}">${i}년</option>`;
    }
    document.getElementById('birthYear').innerHTML = yearHtml;

    let monthHtml = '';
    for (let i = 1; i <= 12; i++) {
        monthHtml += `<option value="${i}">${i}월</option>`;
    }
    document.getElementById('birthMonth').innerHTML = monthHtml;

    let dayHtml = '';
    for (let i = 1; i <= 31; i++) {
        dayHtml += `<option value="${i}">${i}일</option>`;
    }
    document.getElementById('birthDay').innerHTML = dayHtml;
}

// ==========================================
// Init App: index.html에서 모든 컴포넌트를 불러온 직후 호출됨
// ==========================================
function initDashboardApp() {
    // UI 컴포넌트 요소가 다 로딩된 후 날짜 채우고 데이터 가져와 렌더링
    populateDateDropdowns();
    loadChildData();
    renderDashboardProfiles(childList);

    // 빈 공간(바탕) 누르면 온갖 옵션창, 모달 닫기
    window.addEventListener('click', (e) => {
        // 옵션 툴팁 영역 바깥을 누르면 닫히도록
        if (!e.target.closest('.btn-kebab') && !e.target.closest('.profile-options')) {
            closeAllOptions();
        }

        // 모달 바깥 배경 누르면 닫기
        const addModalEl = document.getElementById('addModal');
        if (addModalEl && e.target === addModalEl) {
            closeAddModal();
        }

        // 삭제 경고 모달 바깥 누르면 닫기
        const confirmModalEl = document.getElementById('confirmModal');
        if (confirmModalEl && e.target === confirmModalEl) {
            closeConfirmModal();
        }
    });
}
