/* ============================================
   PE Picker - Group Manager Logic
   모둠뽑기 핵심 로직
   ============================================ */

import { Store } from '../shared/store.js';
import { UI } from '../shared/ui-utils.js';
import { Sound } from '../shared/sound.js';
import { GroupManagerUI } from './group-manager-ui.js';
import { TimerModule } from '../shared/timer.js';

let currentGroups = [];
let currentPhase = 1; // 1=설정, 2=결과
let pendingPickData = null; // 부족 모달 콜백용

// 타이머
let timer = null;
let timerSeconds = 180;
let timerVisible = false;

function init() {
  // 학생 카드 생성 3버튼
  document.getElementById('gm-gen-by-number')?.addEventListener('click', openNumberModal);
  document.getElementById('gm-gen-by-gender')?.addEventListener('click', openGenderModal);
  document.getElementById('gm-gen-by-class')?.addEventListener('click', openClassSelectModal);

  // 번호순 모달
  document
    .getElementById('gm-number-modal-close')
    ?.addEventListener('click', () => UI.hideModal('gm-number-modal'));
  document
    .getElementById('gm-number-modal-cancel')
    ?.addEventListener('click', () => UI.hideModal('gm-number-modal'));
  document.getElementById('gm-number-modal-confirm')?.addEventListener('click', confirmNumberInput);

  // 성별 구분 모달
  document
    .getElementById('gm-gender-modal-close')
    ?.addEventListener('click', () => UI.hideModal('gm-gender-modal'));
  document
    .getElementById('gm-gender-modal-cancel')
    ?.addEventListener('click', () => UI.hideModal('gm-gender-modal'));
  document.getElementById('gm-gender-modal-confirm')?.addEventListener('click', confirmGenderInput);

  // 모둠 구성 방식 라디오 버튼 이벤트
  document.getElementById('gm-mode-random')?.addEventListener('change', function () {
    if (this.checked) {
      document.getElementById('gm-use-fixed-teams').checked = false;
      document.getElementById('gm-fixed-mode-info').style.display = 'none';
    }
  });

  document.getElementById('gm-mode-fixed')?.addEventListener('change', function () {
    if (this.checked) {
      document.getElementById('gm-use-fixed-teams').checked = true;
      document.getElementById('gm-fixed-mode-info').style.display = 'block';
    }
  });

  // 모둠 이름 방식 변경
  document.getElementById('gm-naming-mode')?.addEventListener('change', handleNamingModeChange);
  document
    .getElementById('gm-class-name-select')
    ?.addEventListener('change', handleClassNameSelectChange);

  // 모둠 설정 변경 시 정보 갱신
  ['gm-group-size', 'gm-group-count'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateCalcInfo);
  });

  // 뽑기 버튼
  const pickBtn = document.getElementById('gm-pick-btn');
  if (pickBtn) pickBtn.addEventListener('click', pickGroups);

  // 학생 부족 모달 버튼
  document.getElementById('shortage-proceed')?.addEventListener('click', onShortageProceed);
  document.getElementById('shortage-alt')?.addEventListener('click', onShortageAlt);
  document.getElementById('shortage-cancel')?.addEventListener('click', () => {
    UI.hideModal('shortage-modal');
    pendingPickData = null;
  });
  document.getElementById('shortage-modal-close')?.addEventListener('click', () => {
    UI.hideModal('shortage-modal');
    pendingPickData = null;
  });

  // 남는 학생 확인 모달 버튼
  document.getElementById('overflow-confirm')?.addEventListener('click', onOverflowConfirm);
  document.getElementById('overflow-cancel')?.addEventListener('click', () => {
    UI.hideModal('overflow-modal');
    pendingPickData = null;
  });
  document.getElementById('overflow-modal-close')?.addEventListener('click', () => {
    UI.hideModal('overflow-modal');
    pendingPickData = null;
  });

  // Phase 1 보조 버튼 (결과로 돌아가기, 초기화)
  document.getElementById('gm-back-to-result-btn')?.addEventListener('click', backToResult);
  document.getElementById('gm-reset-from-settings-btn')?.addEventListener('click', resetGame);

  // Phase 2 액션 버튼
  document.getElementById('gm-pick-again-btn')?.addEventListener('click', pickAgain);
  document.getElementById('gm-back-to-setup-btn')?.addEventListener('click', backToSetup);
  document.getElementById('gm-reset-btn')?.addEventListener('click', resetGame);
  document.getElementById('gm-timer-toggle-btn')?.addEventListener('click', toggleTimerSection);

  // 타이머
  initTimer();

  // 기존 모둠 복원
  const saved = Store.getCurrentTeams();
  if (saved.length > 0) {
    currentGroups = saved;
    currentPhase = 2;
  }
}

function onPageEnter() {
  // 선택된 학급에서 학생 자동 로딩 (카드가 비어있을 때만)
  const container = document.getElementById('gm-student-cards');
  if (container && container.children.length === 0) {
    autoLoadFromSelectedClass();
  }
  updateCalcInfo();
  updateGmUI();
  populateClassNameSelect();
}

function autoLoadFromSelectedClass() {
  const cls = Store.getSelectedClass();
  if (!cls) {
    showStudentCardsWrapper();
    return;
  }
  const students = window.ClassManager.getStudents(cls.id);
  if (students.length === 0) {
    showStudentCardsWrapper();
    return;
  }

  const container = document.getElementById('gm-student-cards');
  if (!container) return;
  container.innerHTML = '';
  students.forEach(s => createStudentCard(container, s.name, false, s.gender));
  document.getElementById('gm-student-count').value = students.length;
  showStudentCardsWrapper();
}

// === Phase UI 전환 ===
function updateGmUI() {
  const phase1 = document.getElementById('gm-phase1');
  const resultSection = document.getElementById('gm-result-section');
  const timerSection = document.getElementById('gm-timer-section');
  const phase2Actions = document.getElementById('gm-phase2-actions');

  // 모두 숨기기
  if (phase1) phase1.style.display = 'none';
  if (resultSection) resultSection.style.display = 'none';
  if (timerSection) timerSection.style.display = 'none';
  if (phase2Actions) phase2Actions.style.display = 'none';

  if (currentPhase === 1) {
    if (phase1) phase1.style.display = '';
    updatePhase1Buttons();
  } else if (currentPhase === 2) {
    if (resultSection) resultSection.style.display = '';
    if (phase2Actions) phase2Actions.style.display = '';
    if (timerVisible && timerSection) timerSection.style.display = '';
    GroupManagerUI.renderGroups(currentGroups, false);
  }
}

function backToSetup() {
  currentPhase = 1;
  updateGmUI();
}

function backToResult() {
  if (currentGroups.length > 0) {
    currentPhase = 2;
    updateGmUI();
  }
}

function updatePhase1Buttons() {
  const backBtn = document.getElementById('gm-back-to-result-btn');
  const resetBtn = document.getElementById('gm-reset-from-settings-btn');
  const hasResults = currentGroups.length > 0;
  if (backBtn) backBtn.style.display = hasResults ? '' : 'none';
  if (resetBtn) resetBtn.style.display = hasResults ? '' : 'none';
}

function pickAgain() {
  pickGroups();
}

function resetGame() {
  currentGroups = [];
  currentPhase = 1;
  timerVisible = false;

  // 타이머 리셋
  if (timer) {
    timer.reset(timerSeconds);
    timer = null;
  }
  updateTimerDisplay(timerSeconds);
  const startBtn = document.getElementById('gm-timer-start');
  const pauseBtn = document.getElementById('gm-timer-pause');
  if (startBtn) startBtn.style.display = '';
  if (pauseBtn) pauseBtn.style.display = 'none';

  // 저장 초기화
  Store.saveCurrentTeams([]);

  // 결과 영역 비우기
  const container = document.getElementById('gm-groups-container');
  if (container) container.innerHTML = '';

  updateGmUI();
  UI.showToast('초기화 완료!', 'success');
}

function toggleTimerSection() {
  timerVisible = !timerVisible;
  const timerSection = document.getElementById('gm-timer-section');
  if (timerSection) timerSection.style.display = timerVisible ? '' : 'none';
}

// === 카드에서 참가자 추출 ===
function getParticipantsFromCards() {
  const cards = document.querySelectorAll('#gm-student-cards .tag-student-card:not(.excluded)');
  return Array.from(cards).map(card => card.querySelector('span').textContent);
}

function createStudentCard(container, name, isExcluded = false, gender = null) {
  const card = document.createElement('div');
  let cls = 'tag-student-card';
  if (isExcluded) cls += ' excluded';
  if (gender === 'male') cls += ' gender-male';
  if (gender === 'female') cls += ' gender-female';
  card.className = cls;
  card.innerHTML = `<span>${name}</span><button class="tag-card-remove" onclick="GroupManager.toggleStudentCard(this)">×</button>`;
  container.appendChild(card);
}

// 학생 카드 생성 후 wrapper 표시
function showStudentCardsWrapper() {
  const wrapper = document.getElementById('gm-student-cards-wrapper');
  const emptyMsg = document.getElementById('gm-no-students-message');
  const hasCards = document.querySelectorAll('#gm-student-cards .tag-student-card').length > 0;
  if (wrapper) wrapper.style.display = hasCards ? '' : 'none';
  if (emptyMsg) emptyMsg.style.display = hasCards ? 'none' : '';
}

function toggleStudentCard(button) {
  const card = button.closest('.tag-student-card');
  if (!card) return;
  const isExcluded = card.classList.contains('excluded');
  if (isExcluded) {
    card.classList.remove('excluded');
    button.textContent = '×';
  } else {
    card.classList.add('excluded');
    button.textContent = '✓';
  }
  updateCalcInfo();
}

// === 번호순 모달 ===
function openNumberModal() {
  // 추가 범위 행 제거, 첫 행만 리셋
  const rangesContainer = document.getElementById('gm-number-ranges');
  if (rangesContainer) {
    const rows = rangesContainer.querySelectorAll('.number-range-row');
    rows.forEach((row, idx) => {
      if (idx > 0) row.remove();
    });
    const firstRow = rangesContainer.querySelector('.number-range-row');
    if (firstRow) {
      const startInput = firstRow.querySelector('.range-start');
      const endInput = firstRow.querySelector('.range-end');
      if (startInput) startInput.value = 1;
      if (endInput) endInput.value = 20;
    }
  }
  UI.showModal('gm-number-modal');
}

function confirmNumberInput() {
  const rangesContainer = document.getElementById('gm-number-ranges');
  if (!rangesContainer) return;

  const rows = rangesContainer.querySelectorAll('.number-range-row');
  const ranges = [];

  for (const row of rows) {
    const start = parseInt(row.querySelector('.range-start')?.value);
    const end = parseInt(row.querySelector('.range-end')?.value);
    if (isNaN(start) || isNaN(end)) continue;
    if (start > end || start < 1) {
      UI.showToast('번호 범위를 확인해주세요! (시작 ≤ 끝)', 'error');
      return;
    }
    ranges.push({ start, end });
  }

  if (ranges.length === 0) {
    UI.showToast('번호 범위를 입력해주세요!', 'error');
    return;
  }

  const container = document.getElementById('gm-student-cards');
  if (!container) return;
  container.innerHTML = '';

  let count = 0;
  const labels = [];
  for (const { start, end } of ranges) {
    for (let i = start; i <= end; i++) {
      createStudentCard(container, `${i}번`);
      count++;
    }
    labels.push(`${start}~${end}번`);
  }

  document.getElementById('gm-student-count').value = count;
  UI.hideModal('gm-number-modal');
  updateCalcInfo();
  showStudentCardsWrapper();
  UI.showToast(`${count}명 카드 생성 완료 (${labels.join(', ')})`, 'success');
}

// 번호 범위 행 추가 (최대 5개)
function addNumberRange(prefix) {
  const container = document.getElementById(`${prefix}-number-ranges`);
  if (!container) return;
  const rows = container.querySelectorAll('.number-range-row');
  if (rows.length >= 5) {
    UI.showToast('최대 5개 범위까지 추가할 수 있습니다', 'error');
    return;
  }
  const row = document.createElement('div');
  row.className = 'number-range-row';
  row.style.cssText =
    'display: flex; gap: var(--space-md); align-items: center; margin-bottom: var(--space-sm)';
  row.innerHTML = `
    <div style="flex: 1">
      <label style="font-size: var(--font-size-xs); color: var(--text-tertiary)">시작 번호</label>
      <input class="input range-start" type="number" value="1" min="1" max="99" style="margin-top: var(--space-xs)" />
    </div>
    <div style="flex: 1">
      <label style="font-size: var(--font-size-xs); color: var(--text-tertiary)">끝 번호</label>
      <input class="input range-end" type="number" value="20" min="1" max="99" style="margin-top: var(--space-xs)" />
    </div>
    <button type="button" class="btn-icon" style="width: 28px; height: 28px; border: none; background: var(--bg-danger, rgba(245,124,124,0.15)); color: var(--color-danger, #e74c3c); border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; margin-top: 16px" onclick="GroupManager.removeNumberRange(this)">✕</button>
  `;
  container.appendChild(row);
}

// 번호 범위 행 삭제
function removeNumberRange(btn) {
  const row = btn.closest('.number-range-row');
  if (row) row.remove();
}

// === 성별 구분 모달 ===
function openGenderModal() {
  UI.showModal('gm-gender-modal');
}

function confirmGenderInput() {
  const maleStart = parseInt(document.getElementById('gm-gender-male-start')?.value) || 0;
  const maleEnd = parseInt(document.getElementById('gm-gender-male-end')?.value) || 0;
  const femaleStart = parseInt(document.getElementById('gm-gender-female-start')?.value) || 0;
  const femaleEnd = parseInt(document.getElementById('gm-gender-female-end')?.value) || 0;
  const container = document.getElementById('gm-student-cards');
  if (!container) return;
  container.innerHTML = '';
  let count = 0;
  if (maleStart > 0 && maleEnd >= maleStart) {
    for (let i = maleStart; i <= maleEnd; i++) {
      createStudentCard(container, `${i}번`, false, 'male');
      count++;
    }
  }
  if (femaleStart > 0 && femaleEnd >= femaleStart) {
    for (let i = femaleStart; i <= femaleEnd; i++) {
      createStudentCard(container, `${i}번`, false, 'female');
      count++;
    }
  }
  if (count === 0) {
    UI.showToast('번호 범위를 확인해주세요!', 'error');
    return;
  }
  document.getElementById('gm-student-count').value = count;
  UI.hideModal('gm-gender-modal');
  updateCalcInfo();
  showStudentCardsWrapper();
  UI.showToast(`${count}명 카드 생성 완료`, 'success');
}

// === 학급 불러오기 (선택된 학급에서 즉시 로드) ===
function openClassSelectModal() {
  const cls = Store.getSelectedClass();
  if (!cls) {
    UI.showToast('선택된 학급이 없습니다', 'error');
    return;
  }
  const students = window.ClassManager.getStudents(cls.id);

  const container = document.getElementById('gm-student-cards');
  if (!container) return;

  if (students.length === 0) {
    container.innerHTML = '';
    showStudentCardsWrapper();
    UI.showModal('empty-students-modal');
    return;
  }

  container.innerHTML = '';
  students.forEach(s => createStudentCard(container, s.name, false, s.gender));
  document.getElementById('gm-student-count').value = students.length;
  updateCalcInfo();
  showStudentCardsWrapper();
  UI.showToast(`${students.length}명 불러오기 완료`, 'success');
}

// === 계산 정보 업데이트 ===
function updateCalcInfo() {
  const calcEl = document.getElementById('gm-calc-info');
  const participants = getParticipantsFromCards();
  const total = participants.length;
  const groupSize = parseInt(document.getElementById('gm-group-size')?.value) || 4;
  const groupCount = parseInt(document.getElementById('gm-group-count')?.value) || 5;
  const needed = groupSize * groupCount;

  if (!calcEl) return;
  if (total === 0) {
    calcEl.innerHTML = '👆 위의 버튼으로 학생을 먼저 설정하세요';
    calcEl.style.background = 'rgba(124, 158, 245, 0.05)';
    calcEl.style.color = 'var(--text-tertiary)';
    return;
  }
  const diff = total - needed;
  if (diff === 0) {
    calcEl.innerHTML = `${total}명 → ${groupCount}모둠 × ${groupSize}명 = <span class="count">${needed}</span>명 (딱 맞음!)`;
    calcEl.style.background = 'rgba(124, 224, 163, 0.1)';
  } else if (diff > 0) {
    calcEl.innerHTML = `${total}명 → ${groupCount}모둠 × ${groupSize}명 = ${needed}명, <span style="color: var(--color-secondary-dark); font-weight: 700;">${diff}명 남음</span>`;
    calcEl.style.background = 'rgba(245, 166, 124, 0.1)';
  } else {
    calcEl.innerHTML = `${total}명 → ${groupCount}모둠 × ${groupSize}명 = ${needed}명, <span style="color: var(--color-danger); font-weight: 700;">${Math.abs(diff)}명 부족</span>`;
    calcEl.style.background = 'rgba(245, 124, 124, 0.1)';
  }
}

// === 모둠 뽑기 ===
async function pickGroups() {
  const students = getParticipantsFromCards();
  if (students.length < 2) {
    UI.showToast('학생 카드를 먼저 생성하세요 (2명 이상)', 'error');
    return;
  }

  const groupSize = parseInt(document.getElementById('gm-group-size')?.value) || 4;
  const groupCount = parseInt(document.getElementById('gm-group-count')?.value) || 5;
  const needed = groupSize * groupCount;

  // 고정 모둠 사용 여부 확인
  const namingMode = document.getElementById('gm-naming-mode')?.value;
  const isFixedGroups =
    namingMode === 'class' && document.getElementById('gm-use-fixed-teams')?.checked;

  if (isFixedGroups) {
    // 고정 모둠 모드: 인원수 체크(부족/남음) 무시하고 바로 실행
    // (각 모둠별 인원이 다를 수 있으므로)
    await executeGroupPick(students, groupSize, groupCount);
    return;
  }

  if (students.length < groupCount) {
    UI.showToast(`학생 수(${students.length}명)가 모둠 수(${groupCount})보다 적습니다`, 'error');
    return;
  }

  // 학생 부족 → 확인 모달
  if (needed > students.length) {
    openShortageModal(students, groupSize, groupCount);
    return;
  }

  // 남는 학생 → 확인 모달
  const remainCount = students.length - needed;
  if (remainCount > 0) {
    openOverflowModal(students, groupSize, groupCount, remainCount);
    return;
  }

  await executeGroupPick(students, groupSize, groupCount);
}

// === 학생 부족 모달 ===
function openShortageModal(students, groupSize, groupCount) {
  const needed = groupSize * groupCount;
  const shortage = needed - students.length;

  const messageEl = document.getElementById('shortage-message');
  const proceedBtn = document.getElementById('shortage-proceed');
  const altBtn = document.getElementById('shortage-alt');

  if (messageEl) {
    messageEl.innerHTML = `
        현재 학생: <strong>${students.length}명</strong><br>
        필요 인원: <strong>${needed}명</strong> (${groupCount}모둠 × ${groupSize}명)<br>
        <span style="color: var(--color-danger); font-weight: 700;">${shortage}명 부족</span>
      `;
  }

  // 옵션 1: 모둠당 인원 줄이기
  const newSize = Math.floor(students.length / groupCount);
  if (proceedBtn && newSize >= 2) {
    proceedBtn.textContent = `모둠당 ${newSize}명으로 조정 (${groupCount}모둠 유지)`;
    proceedBtn.style.display = '';
  } else if (proceedBtn) {
    proceedBtn.style.display = 'none';
  }

  // 옵션 2: 모둠 개수 줄이기
  const newCount = Math.floor(students.length / groupSize);
  if (altBtn && newCount >= 1) {
    altBtn.textContent = `${newCount}모둠으로 조정 (${groupSize}명 유지)`;
    altBtn.style.display = '';
  } else if (altBtn) {
    altBtn.style.display = 'none';
  }

  pendingPickData = { students, groupSize, groupCount, newSize, newCount };
  UI.showModal('shortage-modal');
}

function onShortageProceed() {
  if (!pendingPickData) return;
  const { students, groupCount, newSize } = pendingPickData;
  UI.hideModal('shortage-modal');
  pendingPickData = null;
  executeGroupPick(students, newSize, groupCount);
}

function onShortageAlt() {
  if (!pendingPickData) return;
  const { students, groupSize, newCount } = pendingPickData;
  UI.hideModal('shortage-modal');
  pendingPickData = null;
  executeGroupPick(students, groupSize, newCount);
}

// === 남는 학생 모달 ===
function openOverflowModal(students, groupSize, groupCount, remainCount) {
  const messageEl = document.getElementById('overflow-message');
  if (messageEl) {
    messageEl.innerHTML = `
        총 <strong>${students.length}명</strong> 중 <strong>${groupSize * groupCount}명</strong>만 배치되고
        <span style="color: var(--color-warning); font-weight: 700;">${remainCount}명이 남습니다.</span><br><br>
        계속 진행하시겠습니까?
      `;
  }

  pendingPickData = { students, groupSize, groupCount };
  UI.showModal('overflow-modal');
}

function onOverflowConfirm() {
  if (!pendingPickData) return;
  const { students, groupSize, groupCount } = pendingPickData;
  UI.hideModal('overflow-modal');
  pendingPickData = null;
  executeGroupPick(students, groupSize, groupCount);
}

// === 모둠 구성 실행 ===
async function executeGroupPick(students, groupSize, groupCount) {
  UI.showPickingOverlay('🎲', '모둠을 구성하는 중...');
  Sound.playClick();
  await UI.sleep(1200);

  // 고정 모둠 모드 확인
  const namingMode = document.getElementById('gm-naming-mode')?.value;
  const isFixedGroups =
    namingMode === 'class' && document.getElementById('gm-use-fixed-teams')?.checked;
  const classId =
    document.getElementById('gm-class-name-select')?.value || Store.getSelectedClassId();
  const cls = Store.getClassById(classId);

  // 모둠 이름 가져오기
  const groupNames = getGroupNames(groupCount); // 내부에서 랜덤 이름 처리됨

  currentGroups = [];

  if (isFixedGroups && cls && cls.teams) {
    // === 고정 모둠 로직 ===
    const studentSet = new Set(students);
    const shuffleOrder = document.getElementById('gm-fixed-shuffle-order')?.checked;
    const shuffleMembers = document.getElementById('gm-fixed-shuffle-members')?.checked;

    const fixedGroups = [];
    for (let i = 0; i < groupCount; i++) {
      const savedMembers = cls.teams[i] || [];
      const activeMembers = savedMembers
        .filter(m => {
          const name = typeof m === 'string' ? m : m.name;
          return studentSet.has(name);
        })
        .map(m => (typeof m === 'string' ? m : m.name));

      // 모둠 내 순서 셔플 (리더 ⭐ 고정, 나머지만 셔플)
      let formattedMembers;
      if (shuffleMembers && activeMembers.length > 1) {
        const [leader, ...rest] = activeMembers;
        formattedMembers = [`⭐ ${leader}`, ...UI.shuffleArray(rest)];
      } else {
        formattedMembers = activeMembers.map((name, idx) => (idx === 0 ? `⭐ ${name}` : name));
      }

      fixedGroups.push({
        name: groupNames[i] || `${i + 1}모둠`,
        members: formattedMembers,
      });
    }

    // 모둠 순서 셔플 (체크 시에만)
    const finalGroups = shuffleOrder ? UI.shuffleArray(fixedGroups) : fixedGroups;

    finalGroups.forEach((group, idx) => {
      currentGroups.push({
        id: idx + 1,
        name: group.name,
        members: group.members,
      });
    });
  } else {
    // === 기존 랜덤 섞기 로직 ===
    const shuffled = UI.shuffleArray(students);

    // 모둠 구성 (정원만큼)
    for (let i = 0; i < groupCount; i++) {
      const start = i * groupSize;
      currentGroups.push({
        id: i + 1,
        name: groupNames[i] || `${i + 1}모둠`,
        members: shuffled.slice(start, start + groupSize),
      });
    }

    // 남는 학생 → 랜덤 모둠에 분배
    const remaining = shuffled.slice(groupCount * groupSize);
    if (remaining.length > 0) {
      const randomIndices = UI.shuffleArray([...Array(groupCount).keys()]);
      remaining.forEach((name, i) => {
        currentGroups[randomIndices[i % groupCount]].members.push(name);
      });
    }
  }

  UI.hidePickingOverlay();
  Sound.playPick();

  // 설정 카드의 분/초에서 타이머 시간 읽기
  const setMin = parseInt(document.getElementById('gm-timer-min')?.value) || 0;
  const setSec = parseInt(document.getElementById('gm-timer-sec')?.value) || 0;
  const totalSec = setMin * 60 + setSec;
  if (totalSec > 0) {
    timerSeconds = totalSec;
    if (timer) timer.reset(timerSeconds);
    updateTimerDisplay(timerSeconds);
    // 프리셋 활성 표시 해제 (커스텀 시간이므로)
    document.querySelectorAll('.gm-timer-preset').forEach(b => b.classList.remove('active'));
  }

  currentPhase = 2;
  timerVisible = totalSec > 0; // 시간이 설정된 경우만 타이머 표시

  // 결과 화면 타이틀 업데이트 (랜덤/고정 모드 표시)
  const resultTitle = document.querySelector('#gm-result-section .section-title');
  if (resultTitle) {
    if (!isFixedGroups) {
      resultTitle.textContent = '🎯 랜덤 모둠 뽑기 결과 (🔀 섞음)';
    } else {
      const so = document.getElementById('gm-fixed-shuffle-order')?.checked;
      const sm = document.getElementById('gm-fixed-shuffle-members')?.checked;
      if (so && sm) {
        resultTitle.textContent = '🎯 고정 모둠 뽑기 결과 (🔀 순서+멤버 섞음)';
      } else if (so) {
        resultTitle.textContent = '🎯 고정 모둠 순서 뽑기 결과 (🔀 순서 섞음)';
      } else if (sm) {
        resultTitle.textContent = '🎯 고정 모둠 내 순서 뽑기 결과 (🔀 멤버 섞음)';
      } else {
        resultTitle.textContent = '🎯 고정 모둠 구성 결과 (📌 고정)';
      }
    }
  }

  updateGmUI();

  await GroupManagerUI.renderGroupsWithAnimation(currentGroups);
  Store.saveCurrentTeams(currentGroups);

  if (!isFixedGroups) {
    // 랜덤 모드일 때만 안내 (고정 모둠은 항상 불균형할 수 있음)
    const totalCapacity = groupCount * groupSize;
    if (totalCapacity < students.length) {
      UI.showToast(`모둠 구성 완료! (${students.length - totalCapacity}명 자동 분배)`, 'success');
    } else {
      UI.showToast('모둠 구성 완료!', 'success');
    }
  } else {
    const so = document.getElementById('gm-fixed-shuffle-order')?.checked;
    const sm = document.getElementById('gm-fixed-shuffle-members')?.checked;
    if (so && sm) {
      UI.showToast('고정 모둠 뽑기 완료! (순서+멤버 섞음)', 'success');
    } else if (so) {
      UI.showToast('고정 모둠 순서 뽑기 완료!', 'success');
    } else if (sm) {
      UI.showToast('고정 모둠 내 순서 뽑기 완료! (멤버 섞음)', 'success');
    } else {
      UI.showToast('고정 모둠 구성 완료! (고정)', 'success');
    }
  }
}

// === 배지 모달 호출 ===
function openBadgeForGroup(groupId) {
  const group = currentGroups.find(g => g.id === groupId);
  if (!group) return;

  window.BadgeManager.openModal({
    mode: 'group',
    groups: currentGroups,
    activeGroupId: groupId,
    context: 'group-manager',
  });
}

// === 타이머 ===
function initTimer() {
  // 프리셋
  document.querySelectorAll('.gm-timer-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const seconds = parseInt(btn.dataset.seconds);
      timerSeconds = seconds;
      document.querySelectorAll('.gm-timer-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (timer) timer.reset(seconds);
      updateTimerDisplay(seconds);
    });
  });

  // 시작/일시정지/리셋
  document.getElementById('gm-timer-start')?.addEventListener('click', startTimer);
  document.getElementById('gm-timer-pause')?.addEventListener('click', pauseTimer);
  document.getElementById('gm-timer-reset')?.addEventListener('click', resetTimer);
  // 전체화면 타이머
  document.getElementById('gm-timer-fullscreen')?.addEventListener('click', enterGmFullscreen);
  document.getElementById('gm-timer-fs-close')?.addEventListener('click', exitGmFullscreen);
  document.getElementById('gm-timer-fs-toggle')?.addEventListener('click', toggleFsTimer);
  document.getElementById('gm-timer-fs-end')?.addEventListener('click', endGmTimer);

  // 초기 타이머 표시
  updateTimerDisplay(timerSeconds);
}

function startTimer() {
  if (!timer) {
    timer = new TimerModule.Timer({
      seconds: timerSeconds,
      onTick: remaining => {
        updateTimerDisplay(remaining);
      },
      onWarning: () => Sound.playWarning(),
      onComplete: () => {
        Sound.playEnd();
        updateTimerDisplay(0);
        document.getElementById('gm-timer-start').style.display = '';
        document.getElementById('gm-timer-pause').style.display = 'none';
        UI.showToast('타이머 종료!', 'success');
        // 전체화면이면 2초 후 자동 닫기
        if (gmFullscreen) {
          const fsToggle = document.getElementById('gm-timer-fs-toggle');
          if (fsToggle) fsToggle.textContent = '▶️ 시작';
          setTimeout(exitGmFullscreen, 2000);
        }
      },
      warningAt: 10,
    });
  }
  timer.start();
  document.getElementById('gm-timer-start').style.display = 'none';
  document.getElementById('gm-timer-pause').style.display = '';
}

function pauseTimer() {
  if (timer) timer.pause();
  document.getElementById('gm-timer-start').style.display = '';
  document.getElementById('gm-timer-pause').style.display = 'none';
}

function resetTimer() {
  if (timer) {
    timer.reset(timerSeconds);
  }
  updateTimerDisplay(timerSeconds);
  document.getElementById('gm-timer-start').style.display = '';
  document.getElementById('gm-timer-pause').style.display = 'none';
  const display = document.getElementById('gm-timer-display');
  if (display) display.classList.remove('warning');
}

function updateTimerDisplay(seconds) {
  const display = document.getElementById('gm-timer-display');
  if (display) {
    display.textContent = UI.formatTime(seconds);
    display.classList.toggle('warning', seconds <= 10 && seconds > 0);
  }
  // 전체화면 디스플레이도 동기화
  const fsDisplay = document.getElementById('gm-fs-timer-display');
  if (fsDisplay) {
    fsDisplay.textContent = UI.formatTime(seconds);
    fsDisplay.classList.remove('timer-normal', 'timer-warning', 'timer-danger');
    if (seconds > 30) fsDisplay.classList.add('timer-normal');
    else if (seconds > 10) fsDisplay.classList.add('timer-warning');
    else fsDisplay.classList.add('timer-danger');
  }
}

let gmFullscreen = false;

function enterGmFullscreen() {
  const el = document.getElementById('gm-timer-phase');
  if (!el) return;

  // 현재 남은 시간 동기화
  const remaining = timer ? timer.remainingSeconds : timerSeconds;
  updateTimerDisplay(remaining);

  // 전체화면 표시 + timer-fullscreen 클래스 (술래뽑기와 동일)
  el.style.display = '';
  el.classList.add('timer-fullscreen');
  document.body.style.overflow = 'hidden';
  gmFullscreen = true;

  // 전체화면 토글 버튼 상태
  const fsToggle = document.getElementById('gm-timer-fs-toggle');
  if (fsToggle) {
    fsToggle.textContent = timer?.isRunning ? '⏸️ 일시정지' : '▶️ 시작';
  }

  // 타이머가 안 돌고 있으면 자동 시작
  if (!timer || !timer.isRunning) {
    startTimer();
    if (fsToggle) fsToggle.textContent = '⏸️ 일시정지';
  }
}

function exitGmFullscreen() {
  const el = document.getElementById('gm-timer-phase');
  if (el) {
    el.classList.remove('timer-fullscreen');
    el.style.display = 'none';
  }
  document.body.style.overflow = '';
  gmFullscreen = false;
}

function toggleFsTimer() {
  const fsToggle = document.getElementById('gm-timer-fs-toggle');
  if (timer?.isRunning) {
    pauseTimer();
    if (fsToggle) fsToggle.textContent = '▶️ 시작';
  } else {
    startTimer();
    if (fsToggle) fsToggle.textContent = '⏸️ 일시정지';
  }
}

function endGmTimer() {
  if (timer) {
    timer.reset(timerSeconds);
  }
  updateTimerDisplay(timerSeconds);
  document.getElementById('gm-timer-start').style.display = '';
  document.getElementById('gm-timer-pause').style.display = 'none';
  const display = document.getElementById('gm-timer-display');
  if (display) display.classList.remove('warning');
  exitGmFullscreen();
}

// === 모둠 이름 관련 함수 ===
function populateClassNameSelect() {
  const select = document.getElementById('gm-class-name-select');
  if (!select) return;

  const classes = Store.getClasses();
  select.innerHTML = '<option value="">학급 선택...</option>';
  classes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

function handleNamingModeChange(e) {
  const mode = e.target.value;
  const classContainer = document.getElementById('gm-class-name-select-container');
  const customContainer = document.getElementById('gm-custom-names-container');

  if (mode === 'class') {
    classContainer.style.display = 'flex';
    customContainer.style.display = 'none';

    // 고정 모둠 라디오 버튼 상태 확인
    const isFixed = document.getElementById('gm-mode-fixed')?.checked;
    if (isFixed) {
      document.getElementById('gm-use-fixed-teams').checked = true;
      document.getElementById('gm-fixed-mode-info').style.display = 'block';
    }
  } else {
    classContainer.style.display = 'none';
    customContainer.style.display = 'none';

    if (mode === 'custom') {
      customContainer.style.display = 'flex';
    }

    // 학급 설정이 아닐 때는 고정 모둠 모드 해제
    document.getElementById('gm-use-fixed-teams').checked = false;
    document.getElementById('gm-mode-random').checked = true;
    document.getElementById('gm-fixed-mode-info').style.display = 'none';
  }
}

function handleClassNameSelectChange(e) {
  const classId = e.target.value;
  if (!classId) return;

  const cls = Store.getClassById(classId);
  if (!cls || !cls.teamNames) return;

  // 커스텀 입력 필드에 학급 모둠 이름 채우기
  const inputs = document.querySelectorAll('.gm-custom-name');
  inputs.forEach((input, idx) => {
    input.value = cls.teamNames[idx] || '';
  });
}

function getGroupNames(count) {
  const mode = document.getElementById('gm-naming-mode')?.value || 'number';

  if (mode === 'number') {
    // 숫자순
    return Array.from({ length: count }, (_, i) => `${i + 1}모둠`);
  } else if (mode === 'class') {
    // 학급 설정 이름 — 드롭다운 또는 선택된 학급에서
    const classId =
      document.getElementById('gm-class-name-select')?.value || Store.getSelectedClassId();
    const isRandom = document.getElementById('gm-random-names')?.checked;

    if (classId) {
      const cls = Store.getClassById(classId);
      if (cls && cls.teamNames) {
        let availableNames = [...cls.teamNames];

        if (isRandom) {
          // 랜덤 섞기
          availableNames = UI.shuffleArray(availableNames);
        }

        return availableNames.slice(0, count);
      }
    }
    // 학급이 선택되지 않았으면 기본값
    let defaultNames = Store.getDefaultTeamNames();
    if (isRandom) {
      defaultNames = UI.shuffleArray(defaultNames);
    }
    return defaultNames.slice(0, count);
  } else if (mode === 'custom') {
    // 즉석 커스텀
    const inputs = document.querySelectorAll('.gm-custom-name');
    const names = [];
    for (let i = 0; i < count && i < inputs.length; i++) {
      const name = inputs[i].value.trim();
      names.push(name || `${i + 1}모둠`);
    }
    return names;
  }

  // 기본값
  return Array.from({ length: count }, (_, i) => `${i + 1}모둠`);
}

export const GroupManager = {
  init,
  onPageEnter,
  pickGroups,
  pickAgain,
  openBadgeForGroup,
  toggleStudentCard,
  addNumberRange,
  removeNumberRange,
  currentGroups: () => currentGroups,
  backToSetup,
  resetGame,
};
