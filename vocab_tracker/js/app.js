/* ==========================================================================
   App Logic (app.js)
   단어장 렌더링, 상태 관리, 이벤트 핸들링 주축 모듈
   ========================================================================== */


// UI 상태 관리
let currentAgeTab = '1세 초반';


function toggleLearned(id) {
    if (!currentSelectedChildId) {
        showAlertModal("아동 정보가 없습니다!");
        return;
    }
    learnedState[id] = !learnedState[id];
    saveLearnedState();
    renderApp();
}

let pendingReset = false; // 초기화 대기 상태 플래그

/**
 * 현재 보고 있는 탭(연령)의 체크된 단어들을 한 번에 모두 초기화하는 함수
 */
function resetCurrentTab() {
    if (!currentSelectedChildId) {
        showAlertModal("아동 정보가 없습니다!");
        return;
    }

    const currentData = dummyData.filter(d => d.age === currentAgeTab);
    const hasLearned = currentData.some(d => learnedState[d.id]);

    if (!hasLearned) {
        showAlertModal("현재 탭에는 초기화할 단어가 없습니다.");
        return;
    }

    // 커스텀 모달 호출 로직 추가 (브라우저 기본 confirm 제거)
    pendingReset = true;
    document.getElementById('confirmMessage').innerHTML =
        `정말 <strong>'${currentAgeTab}'</strong> 탭의 모든 체크 기록을 초기화하시겠습니까?<br>이 작업은 되돌릴 수 없습니다.`;

    document.getElementById('confirmModal').style.display = 'flex';
}

// ==========================================
// Phase 1 (Rev 2). 진단 폼 플로우 제어
// ==========================================
/**
 * 단어장 초기 진입 시: 그리드를 숨기고 진단 설문 폼을 최우선 노출
 */
function prepareAssessmentMode() {
    // 0. 로컬 스토리지 데이터 로드 (핵심: 진단 폼 저장 내역 복원)
    initLearnedState();

    document.getElementById('grid-container').style.display = 'none';
    document.getElementById('report-container').style.display = 'none';
    document.getElementById('assessment-container').style.display = 'block';

    // 플로팅 바 숨김 강제 처리
    const floatingBar = document.getElementById('floating-bar');
    if (floatingBar) floatingBar.style.bottom = '-100px';

    // 저장된 과거 응답이 있다면 라디오 버튼에 체크 (복원)
    const radios = document.querySelectorAll('#assessment-container input[type="radio"]');
    radios.forEach(radio => radio.checked = false); // 초기화

    if (Object.keys(assessmentState).length > 0) {
        for (const [qName, val] of Object.entries(assessmentState)) {
            const targetRadio = document.querySelector(`input[name="${qName}"][value="${val}"]`);
            if (targetRadio) targetRadio.checked = true;
        }
        // 저장된 응답이 있다는 것은 이미 검사를 1회 이상 완료했다는 뜻이므로 리포트 컨테이너도 함께 살려둠
        document.getElementById('report-container').style.display = 'block';
    }

    // 진입과 동시에 리포트 하단 버튼 문구 동적 적용 (결과 확인 전에도 노출)
    const btnGoToTracker = document.getElementById('btnGoToTracker');
    if (btnGoToTracker) {
        btnGoToTracker.textContent = `${getTargetTabLabel(currentSelectedChildMonths)} 단어트이기로 바로가기`;
    }
}

/**
 * 진단 설문 '결과 확인하기' 버튼 제출 시 -> AI 리포트 아래로 슬라이드 노출
 */
function submitAssessment() {
    // 1. 폼 응답 수집
    const radios = document.querySelectorAll('#assessment-container input[type="radio"]:checked');
    assessmentState = {};
    radios.forEach(r => {
        assessmentState[r.name] = r.value;
    });

    // 아무것도 입력안했다면 기본 안내
    if (Object.keys(assessmentState).length === 0) {
        showAlertModal("문항을 체크해주세요!");
        return;
    }

    // 2. 상태 저장
    saveAssessmentState();

    // 3. 버튼 동적 문구 변경 (현재 아동 연령에 맞는 탭 이름 적용)
    const btnGoToTracker = document.getElementById('btnGoToTracker');
    if (btnGoToTracker) {
        btnGoToTracker.textContent = `${getTargetTabLabel(currentSelectedChildMonths)} 단어트이기로 바로가기`;
    }

    // 4. 폼 아래에 리포트 컨테이너 부드럽게 노출 (임시 DOM 토글)
    const reportContainer = document.getElementById('report-container');
    reportContainer.style.display = 'block';

    // 필요 시 자동 스크롤 다운
    setTimeout(() => {
        reportContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

/**
 * 리포트 확인 후 '[N개월] 단어트이기 훈련으로 바로가기' 클릭 시 (그리드 노출)
 */
function startTrackerGrid() {
    // 진단 리포트 화면을 벗어나 해당 아동의 실제 개월 수(생활 연령)에 맞는 단어장 탭으로 자동 라우팅
    if (typeof autoSetAgeTab === 'function') {
        autoSetAgeTab(currentSelectedChildMonths);
    } else {
        // Fallback
        document.getElementById('assessment-container').style.display = 'none';
        document.getElementById('report-container').style.display = 'none';
        const gridContainer = document.getElementById('grid-container');
        if (gridContainer) gridContainer.style.display = 'block';
        renderApp();
    }
}

// 하단 플로팅 바 (타겟 추출 버튼) 상태 갱신 함수
function updateFloatingBar(currentDataCount) {
    const floatingBar = document.getElementById('floating-bar');
    const learnedCountEl = document.getElementById('learnedCount');
    if (!floatingBar || !learnedCountEl) return;

    // 현재 화면에 렌더링된 카테고리에 한해서 체크된 개수 합산
    const currentData = dummyData.filter(d => d.age === currentAgeTab);
    const learnedInThisTab = currentData.filter(d => learnedState[d.id]).length;

    learnedCountEl.textContent = `${learnedInThisTab} / ${currentDataCount || currentData.length}`;

    // 단어장 그리드 영역이 명시적으로 켜져있고 어휘가 존재할 때만 플로팅 바 노출
    const gridContainer = document.getElementById('grid-container');
    if (gridContainer && gridContainer.style.display === 'block' && currentData.length > 0) {
        floatingBar.style.bottom = '30px';
    } else {
        floatingBar.style.bottom = '-100px';
    }
}

// ==========================================
// Phase 3. 3단계 우선순위 타겟 추출 알고리즘
// ==========================================
function extractTargetWords() {
    const currentData = dummyData.filter(d => d.age === currentAgeTab);

    // 1. 모르는(체크안된) 단어만 필터링
    const unknownWords = currentData.filter(item => !learnedState[item.id]);

    if (unknownWords.length === 0) {
        showAlertModal("현재 탭의 모든 단어를 자발화할 수 있습니다!<br>대단해요!", "✨ 훌륭해요!");
        return;
    }

    // 2. 임상 기반 1,2,3순위 정렬 및 같은 순위 내 랜덤 셔플
    unknownWords.sort((a, b) => {
        if (a.priority !== b.priority) {
            return a.priority - b.priority; // 오름차순 (1순위가 가장 위로)
        }
        return Math.random() - 0.5; // 같은 순위면 랜덤
    });

    // 3. 상위 10개 추출
    const targets = unknownWords.slice(0, 10);
    showExtractionModal(targets);
}

function showExtractionModal(targets) {
    const container = document.getElementById('extractedWordsContainer');
    if (!container) return;

    let html = '';
    targets.forEach(item => {
        // 순위별 예쁜 뱃지 디자인
        let badgeColor = item.priority === 1 ? '#e91e63' : (item.priority === 2 ? '#ff9800' : '#4caf50');
        html += `
            <div style="background: white; padding: 10px 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #eee; display:flex; flex-direction:column; align-items:center; min-width: 80px;">
                <span style="font-size: 11px; font-weight: bold; background: ${badgeColor}; color: white; padding: 2px 6px; border-radius: 10px; margin-bottom: 5px;">${item.priority}순위</span>
                <span style="font-size: 16px; font-weight: bold; color: #333;">${item.name}</span>
            </div>
        `;
    });

    container.innerHTML = html;
    document.getElementById('extractionModal').style.display = 'flex';
}

function closeExtractionModal() {
    document.getElementById('extractionModal').style.display = 'none';
}

const ageOrder = [
    '1세 초반', '1세 후반', '2세', '3세', '4세', '5세', '6세',
    '누가 무엇을 먹어요', '누가 무엇을 마셔요', '누가 무엇을 입어요',
    '누가 무엇을 신어요', '누가 무엇을 봐요', '누가 무엇을 타요',
    '누가 무엇을 닦아요', '누가 무엇을 그려요', '누가 무엇을 만들어요',
    '누가 무엇을 사요', '누가 어디에 가요', '누가 어디에서 자요'
];

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    renderApp();
});


function toggleMenu(headerEl) {
    const section = headerEl.parentElement;
    section.classList.toggle('open');
    headerEl.classList.toggle('open');
}

function selectTab(tabName) {
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    const selectedItem = document.querySelector(`.menu-item[data-age="${tabName}"]`);
    if (selectedItem) selectedItem.classList.add('active');

    currentAgeTab = tabName;

    const assessmentContainer = document.getElementById('assessment-container');
    const reportContainer = document.getElementById('report-container');
    const gridContainer = document.getElementById('grid-container');
    const statsContainer = document.getElementById('stats-container');
    const floatingBar = document.getElementById('floating-bar');

    // 화면 초기화 (모두 숨김)
    if (assessmentContainer) assessmentContainer.style.display = 'none';
    if (reportContainer) reportContainer.style.display = 'none';
    if (gridContainer) gridContainer.style.display = 'none';
    if (statsContainer) statsContainer.style.display = 'none';
    if (floatingBar) floatingBar.style.bottom = '-100px';

    // 탭별 라우팅 처리
    if (tabName === '발달 체크 및 리포트') {
        if (typeof prepareAssessmentMode === 'function') {
            prepareAssessmentMode();
        }
    } else if (tabName === '성장 차트 모아보기') {
        if (statsContainer) {
            statsContainer.style.display = 'block';
            renderStatsCharts();
        }
    } else {
        // 일반 그림카드 (단어/문장) 탭
        if (gridContainer) gridContainer.style.display = 'block';
        renderApp();
    }
}

function setupEventListeners() {
    // 차후 필요한 전역 이벤트 리스너 추가 공간
}

/**
 * 개월 수에 따른 연령 탭 전체 이름 반환 (예: '2세 (24~36개월)')
 */
function getTargetTabLabel(months) {
    if (months < 18) return '1세 초반 (12~18개월)';
    if (months < 24) return '1세 후반 (18~24개월)';
    if (months < 36) return '2세 (24~36개월)';
    if (months < 48) return '3세 (36~48개월)';
    if (months < 60) return '4세 (48~60개월)';
    if (months < 72) return '5세 (60~72개월)';
    return '6세 (72~84개월)';
}

/**
 * 개월 수를 받아 기획서의 매칭 공식에 따라 탭을 자동 설정(Focus)합니다.
 * 진단 리포트에서 단어장 화면으로 넘어올 때 호출됩니다.
 */
function autoSetAgeTab(months) {
    let targetTab = '1세 초반';

    if (months < 18) targetTab = '1세 초반';
    else if (months < 24) targetTab = '1세 후반';
    else if (months < 36) targetTab = '2세';
    else if (months < 48) targetTab = '3세';
    else if (months < 60) targetTab = '4세';
    else if (months < 72) targetTab = '5세';
    else targetTab = '6세';

    // 시각적 탭 선택 연동
    selectTab(targetTab);
}



function renderApp() {
    const gridContainer = document.getElementById('grid-container');
    if (!gridContainer) return;

    let finalHTML = '';

    // 현재 연령 어휘 렌더링
    const currentData = dummyData.filter(d => d.age === currentAgeTab);

    if (currentData.length === 0) {
        finalHTML += `<div class="empty-state">해당 탭의 어휘 데이터가 없습니다.</div>`;
    } else {
        // [수정됨] 상단 영역별 차트는 '성장 차트 모아보기' 전용 뷰로 분리되어 제거됨.
        // 1. 온보딩 가이드 배너 (초심자 안내용)
        finalHTML += generateOnboardingBannerHTML();
        // 2. 단어 목록 그리드 렌더링
        finalHTML += generateCategoryHTML(currentData);
    }

    gridContainer.innerHTML = finalHTML;

    // 플로팅 바 카운트 업데이트
    updateFloatingBar(currentData.length);
}

// ==========================================
// 신규: 전체 연령 성장 차트 연속 렌더링기
// ==========================================
function renderStatsCharts() {
    const statsContent = document.getElementById('stats-content');
    if (!statsContent) return;

    // 사이드바 타이틀과 동일하게 개월수 명시를 위한 매핑
    const targetAges = [
        { id: '1세 초반', label: '1세 초반 (12~18개월)' },
        { id: '1세 후반', label: '1세 후반 (18~24개월)' },
        { id: '2세', label: '2세 (24~36개월)' },
        { id: '3세', label: '3세 (36~48개월)' },
        { id: '4세', label: '4세 (48~60개월)' },
        { id: '5세', label: '5세 (60~72개월)' },
        { id: '6세', label: '6세 (72~84개월)' }
    ];
    let html = '';

    targetAges.forEach(target => {
        const ageData = dummyData.filter(d => d.age === target.id);
        if (ageData.length > 0) {
            // 차트 타이틀을 해당 연령명과 개월수로 동적으로 덮어씌움
            html += generateChartHTML(ageData, `▶ ${target.label} 단어 발달 현황`);
        }
    });

    if (html === '') {
        html = `<div class="empty-state" style="text-align:center; padding: 40px; color:#777;">아직 데이터가 존재하지 않습니다.</div>`;
    }

    statsContent.innerHTML = html;
}

// ==========================================
// 공용 Alert Modal 컨트롤러
// ==========================================
function showAlertModal(message, title = "알림") {
    const alertTitleEl = document.getElementById('alertTitle');
    const alertMessageEl = document.getElementById('alertMessage');
    const alertModalEl = document.getElementById('alertModal');

    if (alertTitleEl) alertTitleEl.textContent = title;
    if (alertMessageEl) alertMessageEl.innerHTML = message;
    if (alertModalEl) alertModalEl.style.display = 'flex';
}

function closeAlertModal() {
    const alertModalEl = document.getElementById('alertModal');
    if (alertModalEl) alertModalEl.style.display = 'none';
}
