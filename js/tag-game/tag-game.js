/* ============================================
   PE Picker - Tag Game Logic
   원본 game.js + mobile-ui.js 로직 충실 이식
   3 Phase: 설정(1) → 결과(2) → 타이머(3)
   ============================================ */

import { Store } from '../shared/store.js';
import { UI } from '../shared/ui-utils.js';
import { Sound } from '../shared/sound.js';
import { IosUtils } from '../shared/ios-utils.js';
import { TagGameUI } from './tag-game-ui.js';
import { Icons } from '../shared/icons.js';

// --- 게임 상태 (원본 동일) ---
let currentPhase = 1;
let currentRound = 0;
let participants = [];
let selectedIts = []; // 현재 라운드 술래
let selectedAngels = []; // 현재 라운드 천사
let availableForIt = []; // 술래 후보 풀
let availableForAngel = []; // 천사 후보 풀
let gameSettings = {
  studentCount: 20,
  itCount: 1,
  angelCount: 0,
  timerSeconds: 30,
  excludePrevious: false,
};
let gameState = 'ready'; // ready, picking, picked, timer

// 타이머 상태
let timer = null;
let timeLeft = 0;
let isTimerRunning = false;
let isFullscreen = false;

// ========== 초기화 ==========
function init() {
  loadFromStorage();
  setupEventListeners();
  updateUI();
  // 초기 wrapper 상태 설정
  showStudentCardsWrapper();
}

function onPageEnter() {
  // 선택된 학급에서 학생 자동 로딩 (카드가 비어있을 때만)
  const container = $('tag-student-cards');
  if (container && container.children.length === 0) {
    autoLoadFromSelectedClass();
  }
  // 초기 wrapper 상태 설정
  showStudentCardsWrapper();
}

function autoLoadFromSelectedClass() {
  const cls = Store.getSelectedClass();
  if (!cls) {
    showStudentCardsWrapper();
    return;
  }
  const students = window.ClassManager.getStudents(cls.id);

  const container = $('tag-student-cards');
  if (!container) return;

  if (students.length === 0) {
    container.innerHTML = '';
    showStudentCardsWrapper();
    return;
  }

  container.innerHTML = '';
  students.forEach(s => createStudentCard(container, s.name, false, s.gender));
  $('tag-student-count').value = students.length;
  gameSettings.studentCount = students.length;
  showStudentCardsWrapper();
}

// ========== 이벤트 리스너 ==========
function setupEventListeners() {
  // 게임 시작 버튼
  $('tag-start-btn')?.addEventListener('click', startGame);

  // 다시 뽑기
  $('tag-pick-again-btn')?.addEventListener('click', pickAgain);

  // 설정만 수정
  $('tag-modify-btn')?.addEventListener('click', showSettings);

  // 결과로 돌아가기
  $('tag-back-to-result-btn')?.addEventListener('click', backToResultFromSettings);

  // 새 게임
  $('tag-new-game-btn')?.addEventListener('click', startNewGame);
  $('tag-reset-from-settings-btn')?.addEventListener('click', startNewGame);
  // 학생 카드 생성 3버튼
  $('tag-gen-by-number')?.addEventListener('click', openNumberModal);
  $('tag-gen-by-gender')?.addEventListener('click', openGenderModal);
  $('tag-gen-by-class')?.addEventListener('click', openClassSelectModal);

  // 번호순 생성 모달
  $('tag-number-modal-close')?.addEventListener('click', () => UI.hideModal('tag-number-modal'));
  $('tag-number-modal-cancel')?.addEventListener('click', () => UI.hideModal('tag-number-modal'));
  $('tag-number-modal-confirm')?.addEventListener('click', confirmNumberInput);

  // 성별 구분 모달
  $('tag-gender-modal-close')?.addEventListener('click', () => UI.hideModal('tag-gender-modal'));
  $('tag-gender-modal-cancel')?.addEventListener('click', () => UI.hideModal('tag-gender-modal'));
  $('tag-gender-modal-confirm')?.addEventListener('click', confirmGenderInput);

  // 수동 입력 모달
  $('manual-input-close')?.addEventListener('click', () => UI.hideModal('manual-input-modal'));
  $('manual-input-cancel')?.addEventListener('click', () => UI.hideModal('manual-input-modal'));
  $('manual-input-confirm')?.addEventListener('click', confirmManualInput);

  // 빈 학생 안내 모달
  $('empty-students-confirm')?.addEventListener('click', () => {
    UI.hideModal('empty-students-modal');
    window.App.navigateTo('settings');
  });

  // Phase 2 타이머 시작 버튼
  $('tag-timer-start-btn')?.addEventListener('click', startTimerGame);

  // 타이머 Phase 버튼들
  $('tag-timer-pause')?.addEventListener('click', toggleTimer);
  $('tag-timer-fullscreen-toggle')?.addEventListener('click', toggleFullscreen);
  $('tag-timer-end')?.addEventListener('click', endTimer);

  // 배지 부여 버튼
  $('tag-badge-btn')?.addEventListener('click', openBadgeModal);

  // 폴딩 토글
  document.querySelectorAll('.tag-collapse-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const content = document.getElementById(targetId);
      if (content) {
        const isOpen = content.style.display !== 'none';
        content.style.display = isOpen ? 'none' : 'flex';
        btn.classList.toggle('open', !isOpen);
      }
    });
  });

  // 설정 입력 변경 감지
  [
    'tag-student-count',
    'tag-it-count',
    'tag-angel-count',
    'tag-timer-min',
    'tag-timer-sec',
  ].forEach(id => {
    $(id)?.addEventListener('change', syncSettingsFromForm);
  });
  $('tag-exclude-prev')?.addEventListener('change', syncSettingsFromForm);
}

function $(id) {
  return document.getElementById(id);
}

// ========== 설정 폼 ↔ 상태 동기화 ==========
function syncSettingsFromForm() {
  gameSettings.studentCount = parseInt($('tag-student-count')?.value) || 20;
  gameSettings.itCount = parseInt($('tag-it-count')?.value) || 1;
  gameSettings.angelCount = parseInt($('tag-angel-count')?.value) || 0;
  const min = parseInt($('tag-timer-min')?.value) || 0;
  const sec = parseInt($('tag-timer-sec')?.value) || 0;
  gameSettings.timerSeconds = min * 60 + sec;
  gameSettings.excludePrevious = $('tag-exclude-prev')?.checked || false;
}

function updateSettingsForm() {
  if ($('tag-student-count')) $('tag-student-count').value = gameSettings.studentCount;
  if ($('tag-it-count')) $('tag-it-count').value = gameSettings.itCount;
  if ($('tag-angel-count')) $('tag-angel-count').value = gameSettings.angelCount;
  const min = Math.floor((gameSettings.timerSeconds || 30) / 60);
  const sec = (gameSettings.timerSeconds || 30) % 60;
  if ($('tag-timer-min')) $('tag-timer-min').value = min;
  if ($('tag-timer-sec')) $('tag-timer-sec').value = sec;
  if ($('tag-exclude-prev')) $('tag-exclude-prev').checked = gameSettings.excludePrevious || false;
}

// ========== 학생 카드 생성 (3버튼 방식) ==========

// 버튼 1: 번호순 생성 모달
function openNumberModal() {
  // 추가 범위 행 제거, 첫 행만 리셋
  const rangesContainer = $('tag-number-ranges');
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
      if (endInput) endInput.value = parseInt($('tag-student-count')?.value) || 20;
    }
  }
  UI.showModal('tag-number-modal');
}

function confirmNumberInput() {
  const rangesContainer = $('tag-number-ranges');
  if (!rangesContainer) return;

  const rows = rangesContainer.querySelectorAll('.number-range-row');
  const ranges = [];

  for (const row of rows) {
    const start = parseInt(row.querySelector('.range-start')?.value);
    const end = parseInt(row.querySelector('.range-end')?.value);
    if (isNaN(start) || isNaN(end)) continue; // 빈 행 무시
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

  const container = $('tag-student-cards');
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

  $('tag-student-count').value = count;
  gameSettings.studentCount = count;
  showStudentCardsWrapper();
  UI.hideModal('tag-number-modal');
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
    <button type="button" class="btn-icon" style="width: 28px; height: 28px; border: none; background: var(--bg-danger, rgba(245,124,124,0.15)); color: var(--color-danger, #e74c3c); border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; margin-top: 16px" onclick="TagGame.removeNumberRange(this)">✕</button>
  `;
  container.appendChild(row);
}

// 번호 범위 행 삭제
function removeNumberRange(btn) {
  const row = btn.closest('.number-range-row');
  if (row) row.remove();
}

// 버튼 2: 성별 구분 모달
function openGenderModal() {
  UI.showModal('tag-gender-modal');
}

function confirmGenderInput() {
  const maleStart = parseInt($('tag-gender-male-start')?.value) || 0;
  const maleEnd = parseInt($('tag-gender-male-end')?.value) || 0;
  const femaleStart = parseInt($('tag-gender-female-start')?.value) || 0;
  const femaleEnd = parseInt($('tag-gender-female-end')?.value) || 0;

  const container = $('tag-student-cards');
  if (!container) return;
  container.innerHTML = '';

  let count = 0;
  // 남학생 카드 생성
  if (maleStart > 0 && maleEnd >= maleStart) {
    for (let i = maleStart; i <= maleEnd; i++) {
      createStudentCard(container, `${i}번`, false, 'male');
      count++;
    }
  }
  // 여학생 카드 생성
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

  $('tag-student-count').value = count;
  gameSettings.studentCount = count;
  UI.hideModal('tag-gender-modal');
  UI.showToast(
    `${count}명 카드 생성 완료 (남 ${maleEnd - maleStart + 1}명, 여 ${femaleEnd - femaleStart + 1}명)`,
    'success'
  );
  showStudentCardsWrapper();
}

// 버튼 3: 학급 불러오기 (선택된 학급에서 즉시 로드)
function openClassSelectModal() {
  const cls = Store.getSelectedClass();
  if (!cls) {
    UI.showToast('선택된 학급이 없습니다', 'error');
    return;
  }
  const students = window.ClassManager.getStudents(cls.id);

  const container = $('tag-student-cards');
  if (!container) return;

  if (students.length === 0) {
    container.innerHTML = '';
    showStudentCardsWrapper();
    UI.showModal('empty-students-modal');
    return;
  }

  container.innerHTML = '';
  students.forEach(s => createStudentCard(container, s.name, false, s.gender));
  $('tag-student-count').value = students.length;
  gameSettings.studentCount = students.length;
  UI.showToast(`${students.length}명 불러오기 완료`, 'success');
  showStudentCardsWrapper();
}

// 수동 입력 확인 (기존 유지)
function confirmManualInput() {
  const text = $('manual-input-text')?.value?.trim();
  if (!text) {
    UI.showToast('학생을 입력해주세요!', 'error');
    return;
  }
  const students = text
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(s => s);
  if (students.length === 0) {
    UI.showToast('학생을 입력해주세요!', 'error');
    return;
  }

  const container = $('tag-student-cards');
  container.innerHTML = '';
  students.forEach(name => createStudentCard(container, name));
  $('tag-student-count').value = students.length;
  gameSettings.studentCount = students.length;
  UI.hideModal('manual-input-modal');
  UI.showToast(`${students.length}명 카드 생성 완료`, 'success');
  showStudentCardsWrapper();
}

function createStudentCard(container, name, isExcluded = false, gender = null) {
  const card = document.createElement('div');
  let cls = 'tag-student-card';
  if (isExcluded) cls += ' excluded';
  if (gender === 'male') cls += ' gender-male';
  if (gender === 'female') cls += ' gender-female';
  card.className = cls;
  card.innerHTML = `<span>${UI.escapeHtml(name)}</span><button class="tag-card-remove" onclick="TagGame.toggleStudentCard(this)">×</button>`;
  container.appendChild(card);
}

// 학생 카드 생성 후 wrapper 표시
function showStudentCardsWrapper() {
  const wrapper = $('tag-student-cards-wrapper');
  const message = $('tag-no-students-message');
  const cardsContainer = $('tag-student-cards');

  if (cardsContainer && cardsContainer.children.length > 0) {
    if (wrapper) wrapper.style.display = 'block';
    if (message) message.style.display = 'none';
  } else {
    if (wrapper) wrapper.style.display = 'none';
    if (message) message.style.display = 'block';
  }
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
  IosUtils.haptic('light');
}

// 카드에서 참가자 추출
function getParticipantsFromCards() {
  const cards = document.querySelectorAll('#tag-student-cards .tag-student-card:not(.excluded)');
  return Array.from(cards).map(card => card.querySelector('span').textContent);
}

// ========== 게임 시작 (원본 startGame 로직) ==========
function startGame() {
  syncSettingsFromForm();

  // Phase 1: 카드에서 참가자 가져오기
  const fromCards = getParticipantsFromCards();
  if (fromCards.length > 0) {
    participants = fromCards;
  } else {
    // 카드가 없으면 수동 입력 안내
    UI.showToast('먼저 학생 카드를 생성하세요!', 'error');
    return;
  }

  if (gameSettings.itCount === 0 && gameSettings.angelCount === 0) {
    UI.showToast('술래 수를 설정해주세요!', 'error');
    return;
  }

  if (gameSettings.itCount + gameSettings.angelCount > participants.length) {
    UI.showToast('참가자보다 술래+천사가 많습니다!', 'error');
    return;
  }

  // 풀 초기화
  availableForIt = [...participants];
  availableForAngel = [...participants];
  currentRound = 0;

  // 첫 뽑기
  gameState = 'picking';
  pickParticipants();
  IosUtils.haptic('success');
}

// ========== 핵심 뽑기 로직 (_pickGroup - 원본 동일) ==========
function _pickGroup(count, availablePool, fullPlayerList) {
  let pickedGroup = [];
  const shuffledAvailable = UI.shuffleArray(availablePool);

  // 1) available에서 먼저
  const newPicks = shuffledAvailable.slice(0, count);
  pickedGroup.push(...newPicks);

  // 2) 부족하면 전체에서 보충
  const needed = count - pickedGroup.length;
  if (needed > 0) {
    const replenishmentPool = fullPlayerList.filter(p => !pickedGroup.includes(p));
    const shuffledReplenish = UI.shuffleArray(replenishmentPool);
    pickedGroup.push(...shuffledReplenish.slice(0, needed));
  }

  return { finalGroup: pickedGroup, newPicks };
}

function pickParticipants() {
  currentRound++;

  // "중복 제외" 옵션이 꺼져 있으면 매 라운드마다 풀 리셋
  if (!gameSettings.excludePrevious && currentRound > 1) {
    availableForIt = [...participants];
    availableForAngel = [...participants];
  }

  // 술래 뽑기
  const itResult = _pickGroup(gameSettings.itCount, availableForIt, participants);
  selectedIts = itResult.finalGroup;

  // "중복 제외" 옵션이 켜져 있으면 뽑힌 사람 제거
  if (gameSettings.excludePrevious) {
    availableForIt = availableForIt.filter(p => !itResult.newPicks.includes(p));
  }

  // 천사 뽑기 (술래와 중복 방지)
  if (gameSettings.angelCount > 0) {
    const angelCandidatePool = availableForAngel.filter(p => !selectedIts.includes(p));
    const fullAngelPlayerList = participants.filter(p => !selectedIts.includes(p));

    if (fullAngelPlayerList.length < gameSettings.angelCount) {
      UI.showToast('천사를 뽑기에 인원이 부족합니다!', 'error');
      currentRound--;
      return;
    }

    const angelResult = _pickGroup(
      gameSettings.angelCount,
      angelCandidatePool,
      fullAngelPlayerList
    );
    selectedAngels = angelResult.finalGroup;

    // "중복 제외" 옵션이 켜져 있으면 뽑힌 사람 제거
    if (gameSettings.excludePrevious) {
      availableForAngel = availableForAngel.filter(p => !angelResult.newPicks.includes(p));
    }
  } else {
    selectedAngels = [];
  }

  gameState = 'picked';
  currentPhase = 2;
  updateUI();
  saveToStorage();
  checkExhaustion();
}

function checkExhaustion() {
  const itDone = availableForIt.length === 0;
  const angelDone = availableForAngel.length === 0;
  if (
    (itDone && angelDone && gameSettings.angelCount > 0) ||
    (itDone && gameSettings.angelCount === 0)
  ) {
    // 모든 후보 소진
    setTimeout(() => {
      UI.showToast('모든 역할의 후보가 소진되었습니다!', 'success');
    }, 500);
  }
}

// ========== 다시 뽑기 ==========
function pickAgain() {
  pickParticipants();
  IosUtils.haptic('medium');
}

// ========== 타이머 게임 (Phase 3 - 원본 동일) ==========
function startTimerGame() {
  syncSettingsFromForm();
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  timeLeft = gameSettings.timerSeconds;
  currentPhase = 3;
  gameState = 'timer';
  updateUI();
  enterFullscreen();
  isTimerRunning = true;
  updateTimerDisplay();
  runTimer();
}

function runTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (timeLeft <= 0) {
    showTimeUp();
    return;
  }

  timer = setInterval(() => {
    if (!isTimerRunning) {
      clearInterval(timer);
      timer = null;
      return;
    }
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timer);
      timer = null;
      isTimerRunning = false;
      showTimeUp();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const display = $('tag-timer-display');
  if (!display) return;
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  display.classList.remove('timer-normal', 'timer-warning', 'timer-danger');
  if (timeLeft <= 10) {
    display.classList.add('timer-danger');
    if (timeLeft > 0) Sound.playBeep();
  } else if (timeLeft <= 30) {
    display.classList.add('timer-warning');
  } else {
    display.classList.add('timer-normal');
  }
}

function toggleTimer() {
  if (isTimerRunning) {
    pauseTimer();
  } else {
    resumeTimer();
  }
}

function pauseTimer() {
  isTimerRunning = false;
  $('tag-timer-pause').innerHTML = `${Icons.play(14)} 재시작`;
}

function resumeTimer() {
  isTimerRunning = true;
  $('tag-timer-pause').innerHTML = `${Icons.pause(14)} 일시정지`;
  runTimer();
}

function showTimeUp() {
  const display = $('tag-timer-display');
  if (display) {
    display.textContent = '00:00';
    display.className = 'tag-timer-display timer-danger';
  }
  Sound.playEndAlarm();
  setTimeout(() => {
    Sound.stopEndAlarm();
    exitFullscreen();
    backToResult();
  }, 5500);
}

function enterFullscreen() {
  const el = $('tag-timer-phase');
  if (el) el.classList.add('timer-fullscreen');
  document.body.style.overflow = 'hidden';
  isFullscreen = true;
  const btn = $('tag-timer-fullscreen-toggle');
  if (btn) btn.textContent = '축소';
}

function exitFullscreen() {
  const el = $('tag-timer-phase');
  if (el) el.classList.remove('timer-fullscreen');
  document.body.style.overflow = '';
  isFullscreen = false;
  const btn = $('tag-timer-fullscreen-toggle');
  if (btn) btn.textContent = '전체화면';
}

function toggleFullscreen() {
  if (isFullscreen) {
    exitFullscreen();
  } else {
    enterFullscreen();
  }
}

// ========== 배지 ==========
function openBadgeModal() {
  const cls = Store.getSelectedClass();
  if (!cls) return;

  // 술래 + 천사를 미리 선택
  const preselectedIds = [];
  const allNames = [...selectedIts, ...selectedAngels];
  for (const name of allNames) {
    const student = cls.students.find(s => s.name === name);
    if (student) preselectedIds.push(student.id);
  }

  window.BadgeManager.openModal({
    mode: 'individual',
    preselectedStudentIds: preselectedIds,
    context: 'tag-game',
  });
}

// ========== 화면 전환 ==========
function showSettings() {
  currentPhase = 1;
  updateUI();
  updateSettingsForm();
}

function backToResult() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  isTimerRunning = false;
  exitFullscreen();
  currentPhase = 2;
  updateUI();
}

function endTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  isTimerRunning = false;
  exitFullscreen();
  currentPhase = 2;
  updateUI();
}

function backToSetup() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  isTimerRunning = false;
  exitFullscreen();
  currentPhase = 1;
  currentRound = 0;
  availableForIt = [];
  availableForAngel = [];
  updateUI();
}

function backToResultFromSettings() {
  if (selectedIts.length > 0 || selectedAngels.length > 0) {
    syncSettingsFromForm();
    currentPhase = 2;
    updateUI();
    UI.showToast('설정이 완료되었습니다!', 'success');
  } else {
    UI.showToast('먼저 술래를 뽑아주세요!', 'error');
  }
}

function startNewGame() {
  if (currentRound > 0 && !confirm('정말로 새 게임을 시작하시겠습니까? 모든 이력이 초기화됩니다.'))
    return;
  currentPhase = 1;
  currentRound = 0;
  participants = [];
  selectedIts = [];
  selectedAngels = [];
  availableForIt = [];
  availableForAngel = [];
  gameState = 'ready';
  updateUI();
  saveToStorage();
  UI.showToast('새 게임이 시작되었습니다!', 'success');
}

// ========== UI 업데이트 (원본 updateUI + updatePhaseUI) ==========
function updateUI() {
  const phase1 = $('tag-phase1');
  const phase1Actions = $('tag-phase1-actions');
  const resultSection = $('tag-result-section');
  const phase2Content = $('tag-phase2-content');
  const phase2Actions = $('tag-phase2-actions');
  const timerPhase = $('tag-timer-phase');
  const roundDisplay = $('tag-round-display');
  const settingsBtn = $('tag-settings-btn');
  const saveBtn = $('tag-save-btn');
  const badgeBtn = $('tag-badge-btn');

  // 모든 숨기기
  if (phase1) phase1.style.display = 'none';
  if (phase1Actions) phase1Actions.style.display = 'none';
  if (resultSection) resultSection.style.display = 'none';
  if (phase2Content) phase2Content.style.display = 'none';
  if (phase2Actions) phase2Actions.style.display = 'none';
  if (timerPhase) timerPhase.style.display = 'none';
  if (roundDisplay) roundDisplay.style.display = 'none';
  if (settingsBtn) settingsBtn.style.display = 'none';
  if (saveBtn) saveBtn.style.display = 'none';
  if (badgeBtn) badgeBtn.style.display = 'none';

  if (currentPhase === 1) {
    if (phase1) phase1.style.display = '';
    if (phase1Actions) phase1Actions.style.display = '';
    if (saveBtn) saveBtn.style.display = '';
    updateSettingsForm();
    updatePhase1Buttons();
  } else if (currentPhase === 2) {
    if (resultSection) resultSection.style.display = '';
    if (phase2Content) phase2Content.style.display = '';
    if (phase2Actions) phase2Actions.style.display = '';
    if (roundDisplay) {
      roundDisplay.style.display = '';
      roundDisplay.textContent = `ROUND ${currentRound}`;
    }
    if (settingsBtn) settingsBtn.style.display = '';
    if (badgeBtn) badgeBtn.style.display = '';

    // 결과 렌더
    TagGameUI.renderResultCards(selectedIts, selectedAngels);
    TagGameUI.renderCandidates('it', availableForIt);
    TagGameUI.renderCandidates('angel', availableForAngel);
    // 이력 누적
    TagGameUI.renderHistory('it', getAllSelectedIts());
    TagGameUI.renderHistory('angel', getAllSelectedAngels());
  } else if (currentPhase === 3) {
    if (resultSection) resultSection.style.display = '';
    if (roundDisplay) {
      roundDisplay.style.display = '';
      roundDisplay.textContent = `ROUND ${currentRound}`;
    }
    if (timerPhase) timerPhase.style.display = '';
    if (settingsBtn) settingsBtn.style.display = '';
  }
}

function updatePhase1Buttons() {
  const backToResultBtn = $('tag-back-to-result-btn');
  const resetBtn = $('tag-reset-from-settings-btn');
  const hasResults = selectedIts.length > 0 || selectedAngels.length > 0;
  if (backToResultBtn) {
    backToResultBtn.style.display = hasResults ? '' : 'none';
  }
  if (resetBtn) {
    resetBtn.style.display = hasResults ? '' : 'none';
  }
}

// 이력 누적용 (뽑기를 여러 번 할 때 전체 이력)
// 원본은 selectedIts에 "현재 라운드" 것만 넣고 이력은 별도 관리하지 않았음
// 여기서는 Store에 누적 저장
function getAllSelectedIts() {
  const data = Store.getTagGameData();
  return data?.allItsHistory || [];
}
function getAllSelectedAngels() {
  const data = Store.getTagGameData();
  return data?.allAngelsHistory || [];
}

// ========== 저장/복원 ==========
function saveToStorage() {
  // 이력 누적
  let allIts = getAllSelectedIts();
  let allAngels = getAllSelectedAngels();
  // 현재 라운드의 것이 이미 추가되었는지 확인
  // 간단히: 최신 상태 전체 저장
  Store.saveTagGameData({
    currentPhase,
    currentRound,
    participants,
    selectedIts,
    selectedAngels,
    availableForIt,
    availableForAngel,
    gameSettings,
    gameState,
    allItsHistory: [...new Set([...allIts, ...selectedIts])],
    allAngelsHistory: [...new Set([...allAngels, ...selectedAngels])],
  });
}

function loadFromStorage() {
  const data = Store.getTagGameData();
  if (!data) return;
  currentPhase = data.currentPhase || 1;
  currentRound = data.currentRound || 0;
  participants = data.participants || [];
  selectedIts = data.selectedIts || [];
  selectedAngels = data.selectedAngels || [];
  availableForIt = data.availableForIt || [];
  availableForAngel = data.availableForAngel || [];
  gameSettings = { ...gameSettings, ...(data.gameSettings || {}) };
  gameState = data.gameState || 'ready';
}

export const TagGame = {
  init,
  onPageEnter,
  toggleStudentCard,
  addNumberRange,
  removeNumberRange,
};
