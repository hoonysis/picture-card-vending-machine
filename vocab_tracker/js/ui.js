/* ==========================================================================
   UI Module (ui.js)
   데이터를 기반으로 순수 HTML 문자열 트리를 생성(렌더링)하는 뷰 역할
   ========================================================================== */

function createCardHTML(item) {
    const isLearned = learnedState[item.id] || false;
    const learnedClass = isLearned ? 'learned' : '';

    // 오른쪽 체크박스
    const checkSvg = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>`;

    return `
        <div class="tracker-card ${learnedClass}" onclick="toggleLearned(${item.id})" style="${isLearned ? 'border-color: #bbdefb; background-color: #f7fbff;' : ''}">
            <div class="print-checkbox" title="자발화 완료 여부 토글" style="${isLearned ? 'background:#1976d2; color:white; border-color:#1976d2;' : ''}">${checkSvg}</div>
            <div class="card-image-placeholder" style="height: 80px; background: #fdfdfd; display:flex; align-items:center; justify-content:center; border-bottom:1px solid #eee; transition: opacity 0.3s; ${isLearned ? 'opacity: 0.4;' : ''}">
                <span style="font-size: 2.5rem; opacity: 0.15;">🖼️</span>
            </div>
            <div class="card-name" style="transition: opacity 0.3s; ${isLearned ? 'opacity: 0.5; font-weight: 500;' : ''}">${item.name}</div>
        </div>
    `;
}

// 오직 하나의 섹션에 카테고리별로만 렌더링
function generateCategoryHTML(dataList) {
    if (dataList.length === 0) return '';

    // 카테고리별 그룹화 (순서 유지를 위해 Object 대신 Array 기반 맵핑 고려)
    const grouped = {};
    // 원래 지정된 순서 강제화
    const categoryOrder = ['사람/친족', '신체', '음식/먹기', '사물/장난감', '동물', '동작어', '상태/감각', '사회적 표현'];

    categoryOrder.forEach(cat => grouped[cat] = []);

    dataList.forEach(item => {
        if (grouped[item.category]) {
            grouped[item.category].push(item);
        } else {
            // 미분류 처리
            if (!grouped['기타']) grouped['기타'] = [];
            grouped['기타'].push(item);
        }
    });

    let innerHTML = '';
    for (const [category, items] of Object.entries(grouped)) {
        if (items.length === 0) continue; // 빈 카테고리는 건너뜀

        innerHTML += `
            <div class="category-group">
                <h3 class="category-title">▶ ${category} <span style="font-weight:normal; color:#aaa; font-size:13px; margin-left: 5px;">(${items.length})</span></h3>
                <div class="card-grid">
                    ${items.map(item => createCardHTML(item)).join('')}
                </div>
            </div>
        `;
    }

    return `
        <section class="priority-section">
            ${innerHTML}
        </section>
    `;
}

// ==========================================
// Phase 4. 반응형 달성률 차트 생성기 (순수 HTML/CSS)
// ==========================================
function generateChartHTML(dataList, title = "영역별 단어 습득률") {
    if (dataList.length === 0) return '';

    // 카테고리 고정 순서 (generateCategoryHTML과 동일)
    const categoryOrder = ['사람/친족', '신체', '음식/먹기', '사물/장난감', '동물', '동작어', '상태/감각', '사회적 표현'];
    const grouped = {};
    categoryOrder.forEach(cat => grouped[cat] = { total: 0, learned: 0 });
    grouped['기타'] = { total: 0, learned: 0 };

    let globalTotal = 0;
    let globalLearned = 0;

    dataList.forEach(item => {
        let cat = grouped[item.category] ? item.category : '기타';
        grouped[cat].total++;
        globalTotal++;
        if (learnedState[item.id]) {
            grouped[cat].learned++;
            globalLearned++;
        }
    });

    const globalPercent = globalTotal === 0 ? 0 : Math.round((globalLearned / globalTotal) * 100);

    let chartCols = '';
    for (const cat of [...categoryOrder, '기타']) {
        if (grouped[cat].total === 0) continue;

        const total = grouped[cat].total;
        const learned = grouped[cat].learned;
        const percent = Math.round((learned / total) * 100);

        // 레이아웃 깨짐 방지를 위해 긴 카테고리 이름의 '/'를 줄바꿈(<br>)으로 변경
        const catLabel = cat.replace('/', '<br>');

        chartCols += `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; flex: 1; max-width: 70px; height: 100%;">
                
                <!-- 상단 퍼센트 & 개수 텍스트 -->
                <div style="font-size: 13px; color: ${percent > 0 ? '#1976d2' : '#999'}; font-weight: 800; margin-bottom: 2px; text-align: center; line-height: 1.1;">
                    ${percent}%
                </div>
                <div style="font-size: 11px; color: #777; font-weight: 600; margin-bottom: 6px; text-align: center;">
                    (${learned}/${total})
                </div>

                <!-- 막대 그래프 트랙 (회색 배경) -->
                <div style="width: 32px; height: 130px; background: #f0f4f8; border-radius: 6px 6px 0 0; position: relative; overflow: hidden; border: 1px solid #e1e8ed; border-bottom: none;">
                    <!-- 실제 달성 막대 (파란색 채움) -->
                    <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: ${percent}%; background: #1976d2; border-radius: ${percent === 100 ? '5px 5px 0 0' : '0'}; transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                </div>

                <!-- 하단 X축 라벨 -->
                <div style="font-size: 12px; color: #555; text-align: center; margin-top: 10px; word-break: keep-all; line-height: 1.3; width: 100%; font-weight: 600;">
                    ${catLabel}
                </div>
            </div>
        `;
    }

    return `
        <div style="background: white; border-radius: 16px; padding: 25px 20px 20px; margin-bottom: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); border: 1px solid #eaeaea;">
            <h3 style="font-size: 1.15rem; color: #333; margin-bottom: 12px; text-align: center; font-weight: 800;">${title}</h3>
            
            <!-- 신규 추가된 연령별 총합(달성률) 요약 배지 -->
            <div style="text-align: center; font-size: 14px; color: #555; margin-bottom: 25px; font-weight: 600; display:flex; justify-content:center; align-items:center; gap: 8px;">
                <span style="background: #e3f2fd; color: #1976d2; padding: 4px 10px; border-radius: 12px; font-size: 13px;">전체 진행도</span>
                <span>총 ${globalTotal}개 중 <strong style="color: #1976d2; font-size: 15px;">${globalLearned}개</strong> (${globalPercent}%)</span>
            </div>

            <!-- 차트 컨테이너 -->
            <div style="display: flex; justify-content: space-around; align-items: flex-end; gap: 5px; height: 210px; padding-bottom: 10px; border-bottom: 2px solid #f0f4f8;">
                ${chartCols}
            </div>
        </div>
    `;
}

// ==========================================
// Phase 4. 초심자 온보딩 (안내) 배너 로직
// ==========================================
function generateOnboardingBannerHTML() {
    return `
        <div style="background: #fff8e1; border: 1px solid #ffe082; border-radius: 12px; padding: 15px 20px; margin-bottom: 25px; display: flex; align-items: center; box-shadow: 0 2px 8px rgba(255,193,7,0.1);">
            <div style="font-size: 14.5px; color: #555; line-height: 1.5; word-break: keep-all;">
                <span style="font-size: 18px; margin-right: 5px;">💡</span> 
                아이가 누가 시키거나 따라 말하지 않아도, <strong>스스로 먼저 말하는 단어</strong>를 체크해주세요.
            </div>
        </div>
    `;
}
