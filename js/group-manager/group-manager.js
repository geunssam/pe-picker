/* ============================================
   PE Picker - Group Manager Logic
   모둠뽑기 핵심 로직
   ============================================ */

const GroupManager = (() => {
  let currentGroups = [];
  let currentPhase = 1;  // 1=설정, 2=결과
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
    document.getElementById('gm-number-modal-close')?.addEventListener('click', () => UI.hideModal('gm-number-modal'));
    document.getElementById('gm-number-modal-cancel')?.addEventListener('click', () => UI.hideModal('gm-number-modal'));
    document.getElementById('gm-number-modal-confirm')?.addEventListener('click', confirmNumberInput);

    // 성별 구분 모달
    document.getElementById('gm-gender-modal-close')?.addEventListener('click', () => UI.hideModal('gm-gender-modal'));
    document.getElementById('gm-gender-modal-cancel')?.addEventListener('click', () => UI.hideModal('gm-gender-modal'));
    document.getElementById('gm-gender-modal-confirm')?.addEventListener('click', confirmGenderInput);

    // 학급 불러오기 모달
    document.getElementById('gm-class-modal-close')?.addEventListener('click', () => UI.hideModal('gm-class-select-modal'));
    document.getElementById('gm-class-modal-cancel')?.addEventListener('click', () => UI.hideModal('gm-class-select-modal'));
    document.getElementById('gm-class-modal-confirm')?.addEventListener('click', confirmClassSelect);

    // 모둠 이름 방식 변경
    document.getElementById('gm-naming-mode')?.addEventListener('change', handleNamingModeChange);
    document.getElementById('gm-class-name-select')?.addEventListener('change', handleClassNameSelectChange);

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

    // Phase 2 액션 버튼
    document.getElementById('gm-pick-again-btn')?.addEventListener('click', pickAgain);
    document.getElementById('gm-back-to-setup-btn')?.addEventListener('click', backToSetup);
    document.getElementById('gm-reset-btn')?.addEventListener('click', resetGame);
    document.getElementById('gm-timer-toggle-btn')?.addEventListener('click', toggleTimerSection);

    // 타이머
    initTimer();

    // 기존 모둠 복원
    const saved = Store.getCurrentGroups();
    if (saved.length > 0) {
      currentGroups = saved;
      currentPhase = 2;
    }
  }

  function onPageEnter() {
    updateCalcInfo();
    updateGmUI();
    populateClassNameSelect();
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
    Store.saveCurrentGroups([]);

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
    const el = document.getElementById('gm-number-start');
    if (el) el.value = 1;
    const endEl = document.getElementById('gm-number-end');
    if (endEl) endEl.value = 20;
    UI.showModal('gm-number-modal');
  }

  function confirmNumberInput() {
    const start = parseInt(document.getElementById('gm-number-start')?.value) || 1;
    const end = parseInt(document.getElementById('gm-number-end')?.value) || 20;
    if (start > end || start < 1) { UI.showToast('번호 범위를 확인해주세요!', 'error'); return; }
    const container = document.getElementById('gm-student-cards');
    if (!container) return;
    container.innerHTML = '';
    const count = end - start + 1;
    for (let i = start; i <= end; i++) { createStudentCard(container, `${i}번`); }
    document.getElementById('gm-student-count').value = count;
    UI.hideModal('gm-number-modal');
    updateCalcInfo();
    UI.showToast(`${count}명 카드 생성 완료 (${start}번~${end}번)`, 'success');
  }

  // === 성별 구분 모달 ===
  function openGenderModal() { UI.showModal('gm-gender-modal'); }

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
      for (let i = maleStart; i <= maleEnd; i++) { createStudentCard(container, `${i}번`, false, 'male'); count++; }
    }
    if (femaleStart > 0 && femaleEnd >= femaleStart) {
      for (let i = femaleStart; i <= femaleEnd; i++) { createStudentCard(container, `${i}번`, false, 'female'); count++; }
    }
    if (count === 0) { UI.showToast('번호 범위를 확인해주세요!', 'error'); return; }
    document.getElementById('gm-student-count').value = count;
    UI.hideModal('gm-gender-modal');
    updateCalcInfo();
    UI.showToast(`${count}명 카드 생성 완료`, 'success');
  }

  // === 학급 불러오기 모달 ===
  function openClassSelectModal() {
    ClassManager.populateSelect('gm-class-modal-select');
    UI.showModal('gm-class-select-modal');
  }

  function confirmClassSelect() {
    const classId = document.getElementById('gm-class-modal-select')?.value;
    if (!classId) { UI.showToast('학급을 선택하세요', 'error'); return; }
    const students = ClassManager.getStudentNames(classId);
    if (students.length === 0) { UI.showToast('학생이 없습니다', 'error'); return; }
    const container = document.getElementById('gm-student-cards');
    container.innerHTML = '';
    students.forEach(name => createStudentCard(container, name));
    document.getElementById('gm-student-count').value = students.length;
    UI.hideModal('gm-class-select-modal');
    updateCalcInfo();
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
      calcEl.innerHTML = '학생 카드를 먼저 생성하세요';
      calcEl.style.background = '';
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
    const total = students.length;
    const needed = groupSize * groupCount;
    const shortage = needed - total;
    const altGroupCount = Math.floor(total / groupSize);

    pendingPickData = { students, groupSize, groupCount, altGroupCount };

    const msgEl = document.getElementById('shortage-message');
    if (msgEl) {
      msgEl.textContent = `${total}명을 ${groupSize}명×${groupCount}모둠으로 나누려면 ${needed}명이 필요합니다 (${shortage}명 부족). 그래도 진행하시겠습니까?`;
    }

    // "그래도 N모둠으로 진행" 버튼
    const proceedBtn = document.getElementById('shortage-proceed');
    if (proceedBtn) {
      const base = Math.floor(total / groupCount);
      const rem = total % groupCount;
      proceedBtn.textContent = rem > 0
        ? `그래도 ${groupCount}모둠으로 진행 (${base}~${base + 1}명씩)`
        : `그래도 ${groupCount}모둠으로 진행 (${base}명씩)`;
    }

    // 대안 버튼
    const altBtn = document.getElementById('shortage-alt');
    if (altBtn) {
      if (altGroupCount >= 1) {
        const altRemaining = total - (altGroupCount * groupSize);
        let text = `${altGroupCount}모둠으로 줄여서 진행`;
        if (altRemaining > 0) text += ` (${altRemaining}명 자동 분배)`;
        altBtn.textContent = text;
        altBtn.style.display = '';
      } else {
        altBtn.style.display = 'none';
      }
    }

    UI.showModal('shortage-modal');
  }

  async function onShortageProceed() {
    if (!pendingPickData) return;
    const { students, groupCount } = pendingPickData;
    const effectiveSize = Math.floor(students.length / groupCount);
    pendingPickData = null;
    UI.hideModal('shortage-modal');
    await executeGroupPick(students, effectiveSize, groupCount);
  }

  async function onShortageAlt() {
    if (!pendingPickData) return;
    const { students, groupSize, altGroupCount } = pendingPickData;
    pendingPickData = null;
    UI.hideModal('shortage-modal');
    await executeGroupPick(students, groupSize, altGroupCount);
  }

  // === 남는 학생 확인 모달 ===
  function openOverflowModal(students, groupSize, groupCount, remainCount) {
    pendingPickData = { students, groupSize, groupCount };

    const msgEl = document.getElementById('overflow-message');
    if (msgEl) {
      msgEl.textContent = `남는 ${remainCount}명은 랜덤으로 모둠에 분배됩니다!`;
    }

    UI.showModal('overflow-modal');
  }

  async function onOverflowConfirm() {
    if (!pendingPickData) return;
    const { students, groupSize, groupCount } = pendingPickData;
    pendingPickData = null;
    UI.hideModal('overflow-modal');
    await executeGroupPick(students, groupSize, groupCount);
  }

  // === 모둠 구성 실행 ===
  async function executeGroupPick(students, groupSize, groupCount) {
    UI.showPickingOverlay('🎲', '모둠을 구성하는 중...');
    Sound.playClick();
    await UI.sleep(1200);

    const shuffled = UI.shuffleArray(students);

    // 모둠 이름 가져오기
    const groupNames = getGroupNames(groupCount);

    // 모둠 구성 (정원만큼)
    currentGroups = [];
    for (let i = 0; i < groupCount; i++) {
      const start = i * groupSize;
      currentGroups.push({
        id: i + 1,
        name: groupNames[i] || `${i + 1}모둠`,
        members: shuffled.slice(start, start + groupSize),
        cookies: 0,
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

    UI.hidePickingOverlay();
    Sound.playPick();

    currentPhase = 2;
    timerVisible = false;
    updateGmUI();

    await GroupManagerUI.renderGroupsWithAnimation(currentGroups);
    Store.saveCurrentGroups(currentGroups);

    if (remaining.length > 0) {
      UI.showToast(`모둠 구성 완료! (${remaining.length}명 자동 분배)`, 'success');
    } else {
      UI.showToast('모둠 구성 완료!', 'success');
    }
  }

  // === 쿠키 관리 ===
  function addCookie(groupId) {
    const group = currentGroups.find(g => g.id === groupId);
    if (!group) return;
    group.cookies++;
    GroupManagerUI.updateCookieDisplay(groupId, group.cookies);
    Store.saveCurrentGroups(currentGroups);
  }

  function removeCookie(groupId) {
    const group = currentGroups.find(g => g.id === groupId);
    if (!group || group.cookies <= 0) return;
    group.cookies--;
    GroupManagerUI.updateCookieDisplay(groupId, group.cookies);
    Store.saveCurrentGroups(currentGroups);
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
    document.getElementById('gm-timer-fullscreen')?.addEventListener('click', () => {
      const remaining = timer ? timer.remainingSeconds : timerSeconds;
      TimerModule.openFullscreen(remaining);
    });

    // 초기 타이머 표시
    updateTimerDisplay(timerSeconds);
  }

  function showTimerSection() {
    const section = document.getElementById('gm-timer-section');
    if (section) section.style.display = '';
  }

  function startTimer() {
    if (!timer) {
      timer = new TimerModule.Timer({
        seconds: timerSeconds,
        onTick: (remaining) => {
          updateTimerDisplay(remaining);
        },
        onWarning: () => Sound.playWarning(),
        onComplete: () => {
          Sound.playEnd();
          updateTimerDisplay(0);
          document.getElementById('gm-timer-start').style.display = '';
          document.getElementById('gm-timer-pause').style.display = 'none';
          UI.showToast('타이머 종료!', 'success');
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
      classContainer.style.display = '';
      customContainer.style.display = 'none';
    } else if (mode === 'custom') {
      classContainer.style.display = 'none';
      customContainer.style.display = '';
    } else {
      classContainer.style.display = 'none';
      customContainer.style.display = 'none';
    }
  }

  function handleClassNameSelectChange(e) {
    const classId = e.target.value;
    if (!classId) return;

    const cls = Store.getClassById(classId);
    if (!cls || !cls.groupNames) return;

    // 커스텀 입력 필드에 학급 모둠 이름 채우기
    const inputs = document.querySelectorAll('.gm-custom-name');
    inputs.forEach((input, idx) => {
      input.value = cls.groupNames[idx] || '';
    });
  }

  function getGroupNames(count) {
    const mode = document.getElementById('gm-naming-mode')?.value || 'number';

    if (mode === 'number') {
      // 숫자순
      return Array.from({ length: count }, (_, i) => `${i + 1}모둠`);
    } else if (mode === 'class') {
      // 학급 설정 이름
      const classId = document.getElementById('gm-class-name-select')?.value;
      if (classId) {
        const cls = Store.getClassById(classId);
        if (cls && cls.groupNames) {
          return cls.groupNames.slice(0, count);
        }
      }
      // 학급이 선택되지 않았으면 기본값
      return ['하나', '믿음', '우정', '희망', '협력', '사랑'].slice(0, count);
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

  return {
    init,
    onPageEnter,
    pickGroups,
    addCookie,
    removeCookie,
    toggleStudentCard,
    currentGroups: () => currentGroups,
    backToSetup,
    resetGame,
  };
})();
