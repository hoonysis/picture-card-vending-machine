/* ==========================================================================
   Storage Module (storage.js)
   로컬 스토리지 데이터 접근, 전역 상태(State) 보관 및 복원
   ========================================================================== */

// Phase 3. 긍정 체크 상태 (LocalStorage)
let learnedState = {};

// Phase 1 Rev 2. 진단 폼 라디오버튼 응답 저장용
let assessmentState = {};

/**
 * 선택된 아동의 스토리지 데이터(단어 상태 및 진단 폼) 초기화 및 복원
 */
function initLearnedState() {
    if (!currentSelectedChildId) return;

    // 1. 단어 상태 복원
    const savedLearned = localStorage.getItem(`vocabTracker_learned_${currentSelectedChildId}`);
    if (savedLearned) {
        learnedState = JSON.parse(savedLearned);
    } else {
        learnedState = {};
    }

    // 2. 진단 폼 응답 상태 복원
    const savedAssessment = localStorage.getItem(`vocabTracker_assessment_${currentSelectedChildId}`);
    if (savedAssessment) {
        assessmentState = JSON.parse(savedAssessment);
    } else {
        assessmentState = {};
    }
}

/**
 * 단어 체킹 상태 강제 저장
 */
function saveLearnedState() {
    if (!currentSelectedChildId) return;
    localStorage.setItem(`vocabTracker_learned_${currentSelectedChildId}`, JSON.stringify(learnedState));
}

/**
 * 진단 폼 응답 상태 강제 저장
 */
function saveAssessmentState() {
    if (!currentSelectedChildId) return;
    localStorage.setItem(`vocabTracker_assessment_${currentSelectedChildId}`, JSON.stringify(assessmentState));
}
