/**
 * 학급 모달 편집기 — Roster / Team 모달 분리
 * Roster: 학생 입력 행 CRUD + 알약 미리보기
 * Team: 미배정 풀 + 모둠별 드래그앤드롭
 */
import { state } from './state.js';
import { Store } from '../../shared/store.js';
import { UI } from '../../shared/ui-utils.js';
import {
  normalizeStudentName,
  sortStudentsByNumber,
  createModalStudent,
  getStudentLabel,
} from './helpers.js';

// ========== 공유: 알약 카드 HTML 생성 ==========

function renderPillCardHTML(student, options = {}) {
  if (!student) return '';
  const genderClass =
    student.gender === 'male'
      ? ' gender-male'
      : student.gender === 'female'
        ? ' gender-female'
        : '';
  const draggable = options.draggable ? ' draggable="true"' : '';
  const displayName = student.name ? UI.escapeHtml(student.name) : `${student.number}번`;
  return `<div class="tag-student-card${genderClass}"${draggable}
              data-student-id="${UI.escapeHtml(student.id)}">
            <span>${student.number}. ${displayName}</span>
          </div>`;
}

// ========== Roster 모달 ==========

const ROSTER_TOUCH_DRAG_THRESHOLD = 10;

let rosterDraggedId = null;
let rosterDropTargetId = null;
let rosterDropPosition = 'after';
let rosterSuppressClickUntil = 0;

const rosterTouchState = {
  startX: 0,
  startY: 0,
  studentId: null,
  card: null,
  isDragging: false,
};

function setRosterClickSuppressed(durationMs = 300) {
  rosterSuppressClickUntil = Date.now() + durationMs;
}

function isRosterClickSuppressed() {
  return Date.now() < rosterSuppressClickUntil;
}

function renumberRosterStudentsByCurrentOrder(students = state.rosterStudents) {
  return students.map((student, index) => ({
    ...student,
    number: index + 1,
  }));
}

function clearRosterDropIndicator() {
  const activeCard = document.querySelector(
    '#roster-registered-pills .tag-student-card.roster-drop-before, #roster-registered-pills .tag-student-card.roster-drop-after'
  );
  if (activeCard) {
    activeCard.classList.remove('roster-drop-before', 'roster-drop-after');
  }

  rosterDropTargetId = null;
  rosterDropPosition = 'after';
}

function clearRosterDraggingStyles() {
  document
    .querySelectorAll('#roster-registered-pills .tag-student-card.is-dragging')
    .forEach(card => card.classList.remove('is-dragging'));
}

function updateRosterDropIndicator(card, position) {
  if (!card) {
    clearRosterDropIndicator();
    return;
  }

  const nextTargetId = card.dataset.studentId || null;
  const nextPosition = position === 'before' ? 'before' : 'after';
  const currentCard = document.querySelector(
    '#roster-registered-pills .tag-student-card.roster-drop-before, #roster-registered-pills .tag-student-card.roster-drop-after'
  );

  if (currentCard && currentCard !== card) {
    currentCard.classList.remove('roster-drop-before', 'roster-drop-after');
  }

  card.classList.remove('roster-drop-before', 'roster-drop-after');
  card.classList.add(nextPosition === 'before' ? 'roster-drop-before' : 'roster-drop-after');

  rosterDropTargetId = nextTargetId;
  rosterDropPosition = nextPosition;
}

function getRosterDropPosition(card, clientX) {
  const rect = card.getBoundingClientRect();
  return clientX < rect.left + rect.width / 2 ? 'before' : 'after';
}

function moveRosterStudent(studentId, targetStudentId, position = 'after') {
  if (!studentId || !targetStudentId || studentId === targetStudentId) return false;

  const ordered = [...state.rosterStudents];
  const sourceIndex = ordered.findIndex(student => student.id === studentId);
  if (sourceIndex === -1) return false;

  const [movedStudent] = ordered.splice(sourceIndex, 1);
  const targetIndex = ordered.findIndex(student => student.id === targetStudentId);
  if (targetIndex === -1) return false;

  const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
  ordered.splice(insertIndex, 0, movedStudent);

  state.rosterStudents = renumberRosterStudentsByCurrentOrder(ordered);
  renderRosterEditor();
  return true;
}

function finalizeRosterDrop(studentId, targetStudentId, position = 'after') {
  const moved = moveRosterStudent(studentId, targetStudentId, position);
  clearRosterDropIndicator();
  clearRosterDraggingStyles();
  rosterDraggedId = null;

  if (moved) {
    setRosterClickSuppressed();
  }
}

function cleanupRosterTouchDrag() {
  clearRosterDropIndicator();
  clearRosterDraggingStyles();
  rosterDraggedId = null;
  rosterTouchState.studentId = null;
  rosterTouchState.card = null;
  rosterTouchState.isDragging = false;
}

export function getRosterStudentById(studentId) {
  return state.rosterStudents.find(s => s.id === studentId) || null;
}

export function initializeRosterState(cls) {
  state.rosterStudents = [];
  state.rosterEditingStudentId = null;
  state.pendingTransfers = [];

  if (!cls) return;

  const source = Array.isArray(cls.students) ? cls.students : [];
  if (source.length > 0) {
    state.rosterStudents = source.map((s, idx) => createModalStudent(s, idx + 1));
  } else if (Array.isArray(cls.teams)) {
    const flat = [];
    cls.teams.forEach(group => {
      if (!Array.isArray(group)) return;
      group.forEach(member => {
        const name = normalizeStudentName(member);
        if (name) flat.push({ name });
      });
    });
    state.rosterStudents = flat.map((s, idx) => createModalStudent(s, idx + 1));
  }

  state.rosterStudents.sort(sortStudentsByNumber);
  state.rosterStudents.forEach((s, idx) => {
    if (!s.number || s.number < 1) s.number = idx + 1;
  });
}

export function normalizeRosterNumbers() {
  state.rosterStudents = [...state.rosterStudents].sort(sortStudentsByNumber);
}

function getNextRosterNumber() {
  const named = state.rosterStudents.filter(student => student.name.trim());
  return named.length > 0 ? Math.max(...named.map(student => student.number)) + 1 : 1;
}

function focusRosterNameInput() {
  setTimeout(() => {
    const input = document.querySelector('#roster-student-list .roster-add-name');
    if (input) {
      input.focus();
      input.select?.();
    }
  }, 0);
}

function getRosterFormValues() {
  const formEl = document.querySelector('#roster-student-list .roster-add-card');
  if (!formEl) return null;

  const numberInput = formEl.querySelector('.roster-form-number');
  const nameInput = formEl.querySelector('.roster-add-name');
  const activeGenderBtn = formEl.querySelector(
    '.roster-gender-btn.active-male, .roster-gender-btn.active-female'
  );

  return {
    number: parseInt(numberInput?.value, 10) || 0,
    name: nameInput?.value?.trim() || '',
    gender: activeGenderBtn?.dataset.gender || '',
  };
}

function validateRosterForm(values, excludeStudentId = null) {
  if (!values?.name) {
    focusRosterNameInput();
    return false;
  }

  if (!Number.isFinite(values.number) || values.number < 1) {
    UI.showToast('번호는 1 이상으로 입력해주세요', 'error');
    document.querySelector('#roster-student-list .roster-form-number')?.focus();
    return false;
  }

  const duplicated = state.rosterStudents.find(
    student => student.id !== excludeStudentId && parseInt(student.number, 10) === values.number
  );
  if (duplicated) {
    UI.showToast(`${values.number}번은 이미 등록되어 있습니다`, 'error');
    document.querySelector('#roster-student-list .roster-form-number')?.focus();
    return false;
  }

  return true;
}

function cancelRosterEditing() {
  state.rosterEditingStudentId = null;
  renderRosterEditor();
  focusRosterNameInput();
}

function startRosterEditing(studentId) {
  if (!getRosterStudentById(studentId)) return;
  state.rosterEditingStudentId = studentId;
  renderRosterEditor();
  focusRosterNameInput();
}

export function addStudentRow() {
  const values = getRosterFormValues();
  if (!validateRosterForm(values)) return;

  const student = createModalStudent(
    {
      name: values.name,
      number: values.number,
      gender: values.gender,
    },
    values.number
  );

  state.rosterStudents.push(student);
  state.rosterEditingStudentId = null;
  normalizeRosterNumbers();
  renderRosterEditor();
  focusRosterNameInput();
}

function updateStudentRow(studentId) {
  const target = getRosterStudentById(studentId);
  if (!target) return;

  const values = getRosterFormValues();
  if (!validateRosterForm(values, studentId)) return;

  state.rosterStudents = state.rosterStudents.map(student =>
    student.id === studentId
      ? {
          ...student,
          name: values.name,
          number: values.number,
          gender: values.gender,
        }
      : student
  );

  state.rosterEditingStudentId = null;
  normalizeRosterNumbers();
  renderRosterEditor();
  focusRosterNameInput();
}

export function removeStudentRow(studentId) {
  const student = state.rosterStudents.find(s => s.id === studentId);

  // 배지가 있는 학생 → 전출 대기열에 추가
  if (student && state.editingClassId) {
    const badges = Store.getBadgeLogsByStudent(state.editingClassId, studentId);
    console.debug(
      '[Transfer] removeStudentRow:',
      student.name,
      `classId=${state.editingClassId}`,
      `studentId=${studentId}`,
      `badges=${badges.length}`
    );
    if (badges.length > 0) {
      state.pendingTransfers.push({ ...student });
      UI.showToast(`배지 ${badges.length}개 — ${student.name} 저장 시 전출 처리됩니다`, 'warning', {
        center: true,
        duration: 4000,
      });
    }
  }

  state.rosterStudents = state.rosterStudents.filter(s => s.id !== studentId);
  if (state.rosterEditingStudentId === studentId) {
    state.rosterEditingStudentId = null;
  }
  normalizeRosterNumbers();
  renderRosterEditor();
}

function renderRegisteredPills() {
  const pillsEl = document.getElementById('roster-registered-pills');
  if (!pillsEl) return;

  const named = state.rosterStudents.filter(s => s.name.trim());
  if (named.length === 0) {
    pillsEl.innerHTML = '';
    return;
  }

  pillsEl.innerHTML = named
    .map(s => {
      const genderClass =
        s.gender === 'male' ? ' gender-male' : s.gender === 'female' ? ' gender-female' : '';
      const editingClass = state.rosterEditingStudentId === s.id ? ' is-editing' : '';
      return `<div class="tag-student-card${genderClass}${editingClass}" data-student-id="${UI.escapeHtml(s.id)}" draggable="true" title="드래그로 순서 변경, 클릭으로 수정">
          <span>${s.number}. ${UI.escapeHtml(s.name)}</span>
          <button type="button" class="roster-pill-remove" data-student-id="${UI.escapeHtml(s.id)}">✕</button>
        </div>`;
    })
    .join('');
}

function renderEmptyInputCard() {
  const listEl = document.getElementById('roster-student-list');
  if (!listEl) return;

  const editingStudent = state.rosterEditingStudentId
    ? getRosterStudentById(state.rosterEditingStudentId)
    : null;
  const isEditing = Boolean(editingStudent);
  const student = editingStudent || { number: getNextRosterNumber(), name: '', gender: '' };
  const maleActive = student.gender === 'male' ? ' active-male' : '';
  const femaleActive = student.gender === 'female' ? ' active-female' : '';
  const submitLabel = isEditing ? '수정' : '+ 추가';
  const cancelButton = isEditing
    ? '<button type="button" class="btn roster-add-cancel">취소</button>'
    : '';
  const helperText = isEditing
    ? '학생 정보를 수정한 뒤 저장하세요'
    : '등록된 학생 카드를 누르면 수정, 드래그하면 번호 순서를 바꿀 수 있습니다';

  listEl.innerHTML = `<div class="roster-add-card${isEditing ? ' is-editing' : ''}" data-student-id="${UI.escapeHtml(isEditing ? student.id : 'new')}">
      <input type="number" class="roster-form-number input" min="1" max="999"
             value="${student.number || getNextRosterNumber()}" aria-label="학생 번호">
      <input type="text" class="roster-add-name" maxlength="20"
             value="${UI.escapeHtml(student.name || '')}" placeholder="이름">
      <div class="roster-add-gender">
        <button type="button" class="roster-gender-btn${maleActive}" data-gender="male">남</button>
        <button type="button" class="roster-gender-btn${femaleActive}" data-gender="female">여</button>
      </div>
      <div class="roster-form-actions">
        ${cancelButton}
        <button type="button" class="roster-add-btn" id="roster-add-row">${submitLabel}</button>
      </div>
    </div>
    <div class="roster-form-hint">${helperText}</div>`;
}

export function renderRosterInputList() {
  renderRegisteredPills();
  renderEmptyInputCard();
}

export function renderRosterPillPreview() {
  // 미리보기 섹션 제거됨 — renderRegisteredPills()에 통합
}

export function renderRosterEditor() {
  renderRosterInputList();
}

export function handleRosterInput(_event) {
  // 빈 입력 카드 — 실시간 반영 불필요 (Enter로 추가)
}

export function handleRosterKeydown(event) {
  if (event.key === 'Enter') {
    const target = event.target;
    if (
      target.classList.contains('roster-add-name') ||
      target.classList.contains('roster-form-number')
    ) {
      event.preventDefault();
      if (state.rosterEditingStudentId) updateStudentRow(state.rosterEditingStudentId);
      else addStudentRow();
    }
    return;
  }

  if (event.key === 'Escape' && state.rosterEditingStudentId) {
    event.preventDefault();
    cancelRosterEditing();
  }
}

export function handleRosterClick(event) {
  const target = event.target;

  // 추가 버튼
  const addBtn = target.closest('.roster-add-btn');
  if (addBtn) {
    if (state.rosterEditingStudentId) updateStudentRow(state.rosterEditingStudentId);
    else addStudentRow();
    return;
  }

  const cancelBtn = target.closest('.roster-add-cancel');
  if (cancelBtn) {
    cancelRosterEditing();
    return;
  }

  // 등록된 pill 삭제 버튼
  const pillRemove = target.closest('.roster-pill-remove');
  if (pillRemove) {
    const studentId = pillRemove.dataset.studentId;
    if (studentId) removeStudentRow(studentId);
    return;
  }

  const registeredCard = target.closest('#roster-registered-pills .tag-student-card');
  if (registeredCard) {
    if (isRosterClickSuppressed()) return;
    const studentId = registeredCard.dataset.studentId;
    if (studentId) startRosterEditing(studentId);
    return;
  }

  // 성별 토글 버튼 (빈 입력 카드용)
  const genderBtn = target.closest('.roster-gender-btn');
  if (genderBtn) {
    const row = genderBtn.closest('.roster-add-card');
    if (!row) return;

    const clickedGender = genderBtn.dataset.gender;

    // 토글 UI 업데이트
    row.querySelectorAll('.roster-gender-btn').forEach(btn => {
      btn.classList.remove('active-male', 'active-female');
    });

    if (genderBtn.classList.contains(`active-${clickedGender}`)) {
      // 이미 활성화 → 해제
    } else {
      const cls = clickedGender === 'male' ? 'active-male' : 'active-female';
      genderBtn.classList.add(cls);
    }
  }
}

export function applyImportedStudents(importedRows) {
  let autoNumber = 0;
  const nextStudents = importedRows
    .map(row => {
      const normalized = typeof row === 'string' ? { name: row, number: 0, gender: '' } : row;
      autoNumber++;
      const student = createModalStudent(normalized, autoNumber);
      if (!student.name) return null;
      return student;
    })
    .filter(Boolean)
    .sort(sortStudentsByNumber);

  if (nextStudents.length === 0) {
    UI.showToast('학생을 찾을 수 없습니다', 'error');
    return 0;
  }

  state.rosterStudents = nextStudents;
  state.rosterEditingStudentId = null;
  renderRosterEditor();
  focusRosterNameInput();

  return nextStudents.length;
}

export function handleRosterDragStart(event) {
  const card = event.target.closest('#roster-registered-pills .tag-student-card[draggable]');
  if (!card || event.target.closest('.roster-pill-remove')) return;

  rosterDraggedId = card.dataset.studentId || null;
  if (!rosterDraggedId) return;

  card.classList.add('is-dragging');
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', rosterDraggedId);
  }
}

export function handleRosterDragOver(event) {
  if (!rosterDraggedId) return;

  const card = event.target.closest('#roster-registered-pills .tag-student-card[draggable]');
  const pillsEl = event.target.closest('#roster-registered-pills');
  if (!pillsEl) return;

  event.preventDefault();

  if (!card || card.dataset.studentId === rosterDraggedId) {
    const lastCard = pillsEl.querySelector('.tag-student-card[draggable]:last-child');
    if (lastCard && lastCard.dataset.studentId !== rosterDraggedId) {
      updateRosterDropIndicator(lastCard, 'after');
    } else {
      clearRosterDropIndicator();
    }
    return;
  }

  updateRosterDropIndicator(card, getRosterDropPosition(card, event.clientX));
}

export function handleRosterDrop(event) {
  if (!rosterDraggedId) return;

  event.preventDefault();

  const card = event.target.closest('#roster-registered-pills .tag-student-card[draggable]');
  const pillsEl = event.target.closest('#roster-registered-pills');
  if (!pillsEl) {
    clearRosterDropIndicator();
    clearRosterDraggingStyles();
    rosterDraggedId = null;
    return;
  }

  const targetStudentId =
    rosterDropTargetId ||
    card?.dataset.studentId ||
    pillsEl.querySelector('.tag-student-card[draggable]:last-child')?.dataset.studentId;
  if (!targetStudentId) {
    clearRosterDropIndicator();
    clearRosterDraggingStyles();
    rosterDraggedId = null;
    return;
  }

  const position = rosterDropTargetId || card ? rosterDropPosition : 'after';

  finalizeRosterDrop(rosterDraggedId, targetStudentId, position);
}

export function handleRosterDragEnd() {
  clearRosterDropIndicator();
  clearRosterDraggingStyles();
  rosterDraggedId = null;
}

export function handleRosterTouchStart(event) {
  const card = event.target.closest('#roster-registered-pills .tag-student-card[draggable]');
  if (!card || event.target.closest('.roster-pill-remove')) return;

  const touch = event.touches?.[0];
  if (!touch) return;

  rosterTouchState.startX = touch.clientX;
  rosterTouchState.startY = touch.clientY;
  rosterTouchState.studentId = card.dataset.studentId || null;
  rosterTouchState.card = card;
  rosterTouchState.isDragging = false;
}

export function handleRosterTouchMove(event) {
  if (!rosterTouchState.studentId || !rosterTouchState.card) return;

  const touch = event.touches?.[0];
  if (!touch) return;

  const deltaX = touch.clientX - rosterTouchState.startX;
  const deltaY = touch.clientY - rosterTouchState.startY;
  const movedEnough =
    Math.abs(deltaX) > ROSTER_TOUCH_DRAG_THRESHOLD ||
    Math.abs(deltaY) > ROSTER_TOUCH_DRAG_THRESHOLD;

  if (!rosterTouchState.isDragging && !movedEnough) return;

  if (!rosterTouchState.isDragging) {
    rosterTouchState.isDragging = true;
    rosterDraggedId = rosterTouchState.studentId;
    rosterTouchState.card.classList.add('is-dragging');
    setRosterClickSuppressed();
  }

  event.preventDefault();

  const currentCard = rosterTouchState.card;
  currentCard.style.visibility = 'hidden';
  const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
  currentCard.style.visibility = '';

  const targetCard = elemBelow?.closest?.('#roster-registered-pills .tag-student-card[draggable]');
  if (!targetCard || targetCard.dataset.studentId === rosterDraggedId) {
    const pillsEl = document.getElementById('roster-registered-pills');
    const lastCard = pillsEl?.querySelector('.tag-student-card[draggable]:last-child');
    if (lastCard && lastCard.dataset.studentId !== rosterDraggedId) {
      updateRosterDropIndicator(lastCard, 'after');
    } else {
      clearRosterDropIndicator();
    }
    return;
  }

  updateRosterDropIndicator(targetCard, getRosterDropPosition(targetCard, touch.clientX));
}

export function handleRosterTouchEnd() {
  if (
    rosterTouchState.isDragging &&
    rosterDraggedId &&
    rosterDropTargetId &&
    rosterDropTargetId !== rosterDraggedId
  ) {
    finalizeRosterDrop(rosterDraggedId, rosterDropTargetId, rosterDropPosition);
    rosterTouchState.studentId = null;
    rosterTouchState.card = null;
    rosterTouchState.isDragging = false;
  } else {
    cleanupRosterTouchDrag();
  }
}

export function handleRosterTouchCancel() {
  cleanupRosterTouchDrag();
}

// ========== Team 모달 ==========

function getTeamStudentById(studentId) {
  return state.teamStudents.find(s => s.id === studentId) || null;
}

function removeStudentFromAllTeamZones(studentId) {
  state.teamUnassigned = state.teamUnassigned.filter(id => id !== studentId);
  // 자리(슬롯)를 null로 유지하여 좌표 보존
  state.teamTeams = state.teamTeams.map(group => group.map(id => (id === studentId ? null : id)));
}

export function sanitizeTeamZones() {
  const existingIds = new Set(state.teamStudents.map(s => s.id));
  const used = new Set();

  // null 슬롯(빈 자리) 보존, 유효하지 않은 ID만 null로 전환
  state.teamTeams = state.teamTeams.map(group =>
    group.map(id => {
      if (id === null) return null;
      if (!existingIds.has(id) || used.has(id)) return null;
      used.add(id);
      return id;
    })
  );

  const nextUnassigned = [];
  state.teamUnassigned.forEach(id => {
    if (!existingIds.has(id) || used.has(id)) return;
    used.add(id);
    nextUnassigned.push(id);
  });

  state.teamStudents.forEach(s => {
    if (used.has(s.id)) return;
    used.add(s.id);
    nextUnassigned.push(s.id);
  });

  state.teamUnassigned = nextUnassigned;
}

export function ensureTeamCount(teamCount) {
  const count = Math.max(2, Math.min(8, parseInt(teamCount, 10) || 6));
  const defaultNames = Store.getDefaultTeamNames();

  if (state.teamTeams.length > count) {
    const removed = state.teamTeams.slice(count);
    state.teamTeams = state.teamTeams.slice(0, count);
    state.teamUnassigned = [...state.teamUnassigned, ...removed.flat().filter(Boolean)];
  } else {
    while (state.teamTeams.length < count) {
      state.teamTeams.push([]);
    }
  }

  if (state.teamTeamNames.length > count) {
    state.teamTeamNames = state.teamTeamNames.slice(0, count);
  } else {
    while (state.teamTeamNames.length < count) {
      const idx = state.teamTeamNames.length;
      state.teamTeamNames.push(defaultNames[idx] || `${idx + 1}모둠`);
    }
  }

  sanitizeTeamZones();
  return count;
}

export function initializeTeamState(cls) {
  state.teamStudents = [];
  state.teamUnassigned = [];
  state.teamTeams = [];
  state.teamTeamNames = [];
  state.teamActiveGroup = null;

  if (!cls) return;

  // 학생 목록 로드 (읽기 전용 사본)
  const source = Array.isArray(cls.students) ? cls.students : [];
  state.teamStudents = source.map((s, idx) => createModalStudent(s, idx + 1));
  state.teamStudents.sort(sortStudentsByNumber);

  const teamCount = cls.teamCount || cls.teams?.length || 6;
  const count = ensureTeamCount(teamCount);
  const defaultNames = Store.getDefaultTeamNames();

  for (let i = 0; i < count; i++) {
    state.teamTeamNames[i] = (cls.teamNames?.[i] || defaultNames[i] || `${i + 1}모둠`).trim();
  }

  // 기존 team 배정 복원
  const usedIds = new Set();

  if (Array.isArray(cls.teams) && cls.teams.length > 0) {
    for (let teamIdx = 0; teamIdx < count; teamIdx++) {
      const teamMembers = Array.isArray(cls.teams[teamIdx]) ? cls.teams[teamIdx] : [];

      for (let slotIdx = 0; slotIdx < teamMembers.length; slotIdx++) {
        const member = teamMembers[slotIdx];
        if (!member) {
          // null 슬롯(빈 자리) 보존
          state.teamTeams[teamIdx].push(null);
          continue;
        }
        const memberLabel = normalizeStudentName(member) || String(member).trim();
        if (!memberLabel) {
          state.teamTeams[teamIdx].push(null);
          continue;
        }
        // 1차: 이름으로 매칭
        let matched = state.teamStudents.find(
          s => !usedIds.has(s.id) && s.name && s.name === memberLabel
        );
        // 2차: 번호 문자열로 매칭 (이름 없는 학생용)
        if (!matched) {
          matched = state.teamStudents.find(
            s => !usedIds.has(s.id) && String(s.number) === memberLabel
          );
        }
        // 3차: getStudentLabel 전체 매칭
        if (!matched) {
          matched = state.teamStudents.find(
            s => !usedIds.has(s.id) && getStudentLabel(s) === memberLabel
          );
        }
        if (matched) {
          state.teamTeams[teamIdx].push(matched.id);
          usedIds.add(matched.id);
        } else {
          state.teamTeams[teamIdx].push(null);
        }
      }
    }
  }

  // 나머지 → 미배정
  state.teamStudents.forEach(s => {
    if (usedIds.has(s.id)) return;
    state.teamUnassigned.push(s.id);
  });

  sanitizeTeamZones();
}

export function renderTeamNameInputs() {
  const container = document.getElementById('team-name-inputs');
  if (!container) return;

  const count = state.teamTeamNames.length;
  container.style.gridTemplateColumns = `repeat(${count}, 1fr)`;

  container.innerHTML = state.teamTeamNames
    .map(
      (name, idx) =>
        `<input type="text" class="cm-team-name-input" data-group-index="${idx}"
                maxlength="10" value="${UI.escapeHtml(name)}" placeholder="${idx + 1}모둠">`
    )
    .join('');
}

export function renderTeamUnassignedPool() {
  const poolEl = document.getElementById('team-unassigned-pool');
  if (!poolEl) return;

  poolEl.innerHTML = state.teamUnassigned
    .map(id => renderPillCardHTML(getTeamStudentById(id), { draggable: true }))
    .join('');
}

export function renderTeamColumns() {
  const boardEl = document.getElementById('team-assign-board');
  if (!boardEl) return;

  const teamCount = state.teamTeams.length;

  // 행 수: 스텝퍼 값 우선, 없으면 자동 계산
  let maxMembers = 0;
  state.teamTeams.forEach(team => {
    if (team.length > maxMembers) maxMembers = team.length;
  });
  const rowsInput = document.getElementById('team-modal-rows');
  const totalRows = rowsInput
    ? Math.max(1, parseInt(rowsInput.value, 10) || 4)
    : Math.max(maxMembers + 2, 4);

  // 헤더 (모둠이름 + 인원수, null 제외) — 탭 배정용 클릭 영역
  let headerCells = '';
  for (let i = 0; i < teamCount; i++) {
    const name = state.teamTeamNames[i] || `${i + 1}모둠`;
    const count = state.teamTeams[i].filter(Boolean).length;
    const activeClass = state.teamActiveGroup === i ? ' tm-active-group' : '';
    headerCells += `<th class="tm-group-header${activeClass}" data-group-index="${i}">${UI.escapeHtml(name)}<br><span class="team-sheet-count">${count}명</span></th>`;
  }

  // 본문 (행 = 자리, 열 = 모둠)
  let bodyRows = '';
  for (let row = 0; row < totalRows; row++) {
    let cells = '';
    for (let col = 0; col < teamCount; col++) {
      const studentId = state.teamTeams[col][row];
      const student = studentId ? getTeamStudentById(studentId) : null;

      if (student) {
        cells += `<td class="tm-drop-zone" data-zone-type="group" data-group-index="${col}" data-row-index="${row}">
            ${renderPillCardHTML(student, { draggable: true })}
            <button class="team-cell-remove" data-student-id="${student.id}" title="미배정으로 이동">✕</button>
          </td>`;
      } else {
        cells += `<td class="tm-drop-zone" data-zone-type="group" data-group-index="${col}" data-row-index="${row}">
            <div class="team-sheet-empty-cell"></div>
          </td>`;
      }
    }
    bodyRows += `<tr>${cells}</tr>`;
  }

  boardEl.innerHTML = `
    <div class="team-sheet-wrap">
      <table class="team-sheet">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

export function renderTeamEditor() {
  renderTeamNameInputs();
  refreshTeamBoard();
}

// ========== Team 드래그앤드롭 ==========

// 현재 하이라이트된 드롭존 캐시 (매 프레임 querySelectorAll 방지)
let highlightedZone = null;

function clearTeamDropHighlights() {
  if (highlightedZone) {
    highlightedZone.classList.remove('tm-drop-over');
    highlightedZone = null;
  }
}

function highlightDropZone(zone) {
  if (zone === highlightedZone) return;
  clearTeamDropHighlights();
  if (zone) {
    zone.classList.add('tm-drop-over');
    highlightedZone = zone;
  }
}

function onTeamCardDragStart(event) {
  const card = event.currentTarget;
  state.teamDraggedId = card.dataset.studentId;
  card.classList.add('is-dragging');
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', state.teamDraggedId);
  }
}

function onTeamCardDragEnd(event) {
  event.currentTarget.classList.remove('is-dragging');
  state.teamDraggedId = null;
  clearTeamDropHighlights();
}

function moveStudentToTeamZone(studentId, zoneType, groupIndex, rowIndex) {
  if (!studentId) return;
  removeStudentFromAllTeamZones(studentId);
  if (
    zoneType === 'group' &&
    Number.isInteger(groupIndex) &&
    groupIndex >= 0 &&
    groupIndex < state.teamTeams.length
  ) {
    const team = state.teamTeams[groupIndex];
    if (Number.isInteger(rowIndex) && rowIndex >= 0) {
      while (team.length <= rowIndex) team.push(null);
      const existing = team[rowIndex];
      if (existing && existing !== studentId) {
        state.teamUnassigned.push(existing);
      }
      team[rowIndex] = studentId;
    } else {
      const emptyIdx = team.indexOf(null);
      if (emptyIdx >= 0) {
        team[emptyIdx] = studentId;
      } else {
        team.push(studentId);
      }
    }
  } else {
    state.teamUnassigned.push(studentId);
  }
  sanitizeTeamZones();
}

/** 드롭 대상 element를 분석하여 학생을 해당 zone으로 이동 */
function dropOnElement(element, studentId) {
  if (!element || !studentId) return;
  const dropZone = element.closest('.tm-drop-zone');
  const poolZone = element.closest('.team-unassigned-pool');
  if (dropZone) {
    const gi = parseInt(dropZone.dataset.groupIndex, 10);
    const ri = parseInt(dropZone.dataset.rowIndex, 10);
    moveStudentToTeamZone(
      studentId,
      dropZone.dataset.zoneType,
      Number.isFinite(gi) ? gi : null,
      Number.isFinite(ri) ? ri : null
    );
  } else if (poolZone) {
    moveStudentToTeamZone(studentId, 'unassigned', null, null);
  }
}

/** 미배정 풀 + 모둠표 + 이벤트 바인딩 일괄 갱신 */
function refreshTeamBoard() {
  renderTeamUnassignedPool();
  renderTeamColumns();
  bindTeamDragAndDrop();
}

function onTeamDropZoneDragOver(event) {
  event.preventDefault();
  highlightDropZone(event.currentTarget);
}

function onTeamDropZoneDragLeave(event) {
  if (highlightedZone === event.currentTarget) clearTeamDropHighlights();
}

function onTeamDropZoneDrop(event) {
  event.preventDefault();
  const droppedId = state.teamDraggedId || event.dataTransfer?.getData('text/plain');
  dropOnElement(event.currentTarget, droppedId);
  state.teamDraggedId = null;
  clearTeamDropHighlights();
  refreshTeamBoard();
}

// ========== 터치 드래그 상태 ==========
const TOUCH_DRAG_THRESHOLD = 10;
const touchState = {
  startX: 0,
  startY: 0,
  card: null,
  studentId: null,
  isDragging: false,
  ghost: null,
  suppressClick: false,
};

function cleanupTouchDrag() {
  if (touchState.ghost) {
    touchState.ghost.remove();
    touchState.ghost = null;
  }
  if (touchState.card) {
    touchState.card.classList.remove('is-dragging');
  }
  clearTeamDropHighlights();
  touchState.card = null;
  touchState.studentId = null;
  touchState.isDragging = false;
}

function onTeamTouchStart(e) {
  const card = e.target.closest('.tag-student-card[draggable]');
  if (!card) return;
  const studentId = card.dataset.studentId;
  if (!studentId) return;

  const touch = e.touches[0];
  touchState.startX = touch.clientX;
  touchState.startY = touch.clientY;
  touchState.card = card;
  touchState.studentId = studentId;
  touchState.isDragging = false;
  touchState.suppressClick = false;
}

function onTeamTouchMove(e) {
  if (!touchState.card) return;
  const touch = e.touches[0];

  if (!touchState.isDragging) {
    const dx = Math.abs(touch.clientX - touchState.startX);
    const dy = Math.abs(touch.clientY - touchState.startY);
    if (dx < TOUCH_DRAG_THRESHOLD && dy < TOUCH_DRAG_THRESHOLD) return;

    touchState.isDragging = true;
    touchState.suppressClick = true;
    touchState.card.classList.add('is-dragging');

    const ghost = touchState.card.cloneNode(true);
    ghost.classList.add('touch-drag-ghost');
    const rect = touchState.card.getBoundingClientRect();
    ghost.style.width = rect.width + 'px';
    ghost.style.left = rect.left + 'px';
    ghost.style.top = rect.top + 'px';
    document.body.appendChild(ghost);
    touchState.ghost = ghost;
  }

  e.preventDefault();

  if (touchState.ghost) {
    const gw = touchState.ghost.offsetWidth / 2;
    const gh = touchState.ghost.offsetHeight / 2;
    touchState.ghost.style.left = touch.clientX - gw + 'px';
    touchState.ghost.style.top = touch.clientY - gh + 'px';
  }

  const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
  const zone = elemBelow
    ? elemBelow.closest('.tm-drop-zone') || elemBelow.closest('.team-unassigned-pool')
    : null;
  highlightDropZone(zone);
}

function onTeamTouchEnd(e) {
  if (!touchState.card) return;

  if (!touchState.isDragging) {
    touchState.card = null;
    touchState.studentId = null;
    return;
  }

  const touch = e.changedTouches[0];
  const droppedId = touchState.studentId;
  cleanupTouchDrag();

  const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
  dropOnElement(elemBelow, droppedId);

  state.teamDraggedId = null;
  refreshTeamBoard();
}

function onTeamTouchCancel() {
  if (!touchState.card) return;
  cleanupTouchDrag();
  touchState.suppressClick = false;
  state.teamDraggedId = null;
}

function bindTeamDragAndDrop() {
  const modal = document.getElementById('class-team-modal');
  if (!modal) return;

  // HTML5 드래그 (데스크톱) — 카드/zone은 innerHTML로 재생성되므로 누적 없음
  modal.querySelectorAll('.tag-student-card[draggable]').forEach(card => {
    card.addEventListener('dragstart', onTeamCardDragStart);
    card.addEventListener('dragend', onTeamCardDragEnd);
  });

  modal.querySelectorAll('.tm-drop-zone, .team-unassigned-pool').forEach(zone => {
    zone.addEventListener('dragover', onTeamDropZoneDragOver);
    zone.addEventListener('dragleave', onTeamDropZoneDragLeave);
    zone.addEventListener('drop', onTeamDropZoneDrop);
  });

  // 터치 드래그 (iPad/모바일) — 모달 레벨 이벤트 위임, 한 번만 등록
  if (!modal._touchBound) {
    modal.addEventListener('touchstart', onTeamTouchStart, { passive: true });
    modal.addEventListener('touchmove', onTeamTouchMove, { passive: false });
    modal.addEventListener('touchend', onTeamTouchEnd);
    modal.addEventListener('touchcancel', onTeamTouchCancel);
    modal._touchBound = true;
  }

  // 셀 제거(✕) 버튼 핸들러
  modal.querySelectorAll('.team-cell-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const studentId = btn.dataset.studentId;
      if (studentId) {
        moveStudentToTeamZone(studentId, 'unassigned', null, null);
        refreshTeamBoard();
      }
    });
  });

  // 탭 배정: 모둠 헤더 클릭 → 활성 모둠 토글
  modal.querySelectorAll('.tm-group-header').forEach(th => {
    th.addEventListener('click', () => {
      const idx = parseInt(th.dataset.groupIndex, 10);
      if (!Number.isFinite(idx)) return;
      state.teamActiveGroup = state.teamActiveGroup === idx ? null : idx;
      modal.querySelectorAll('.tm-group-header').forEach(h => {
        h.classList.toggle(
          'tm-active-group',
          parseInt(h.dataset.groupIndex, 10) === state.teamActiveGroup
        );
      });
    });
  });

  // 탭 배정: 미배정 풀 학생 카드 클릭 → 활성 모둠에 배정
  const poolEl = document.getElementById('team-unassigned-pool');
  if (poolEl) {
    poolEl.querySelectorAll('.tag-student-card').forEach(card => {
      card.addEventListener('click', async e => {
        e.stopPropagation();
        if (touchState.suppressClick) return;
        if (state.teamActiveGroup == null) return;
        const studentId = card.dataset.studentId;
        if (!studentId) return;

        const rowsInput = document.getElementById('team-modal-rows');
        const maxRows = rowsInput ? Math.max(1, parseInt(rowsInput.value, 10) || 4) : 4;
        const team = state.teamTeams[state.teamActiveGroup];
        const visibleSlots = team.slice(0, maxRows);
        const hasEmptySlot = visibleSlots.includes(null) || visibleSlots.length < maxRows;

        if (!hasEmptySlot) {
          const groupName =
            state.teamTeamNames[state.teamActiveGroup] || `${state.teamActiveGroup + 1}모둠`;
          const ok = await UI.showConfirm(
            `${groupName}의 모둠당 인원(${maxRows}명)을 초과합니다.\n모둠당 인원 수를 늘리시겠습니까?`,
            { confirmText: '늘리기', cancelText: '취소' }
          );
          if (!ok) return;
          if (rowsInput) rowsInput.value = maxRows + 1;
        }

        moveStudentToTeamZone(studentId, 'group', state.teamActiveGroup, null);
        refreshTeamBoard();
      });
    });
  }

  // 탭 배정: 모둠표(보드) 안 학생 카드 클릭 → 미배정으로 복귀
  const boardEl = document.getElementById('team-assign-board');
  if (boardEl) {
    boardEl.querySelectorAll('.tag-student-card').forEach(card => {
      card.addEventListener('click', e => {
        e.stopPropagation();
        if (touchState.suppressClick) return;
        const studentId = card.dataset.studentId;
        if (!studentId) return;
        moveStudentToTeamZone(studentId, 'unassigned', null, null);
        refreshTeamBoard();
      });
    });
  }
}

// ========== Team 초기화 ==========

export async function resetTeamAssignments() {
  const ok = await UI.showConfirm(
    '모든 모둠 배정을 초기화하시겠습니까?\n학생들이 미배정 상태로 돌아갑니다.',
    { confirmText: '초기화', cancelText: '취소' }
  );
  if (!ok) return;

  // 모든 학생 → 미배정 풀로 이동
  state.teamTeams = state.teamTeams.map(() => []);
  state.teamUnassigned = state.teamStudents.map(s => s.id);
  state.teamActiveGroup = null;

  renderTeamEditor();
  UI.showToast('모둠 배정이 초기화되었습니다', 'info');
}

// ========== Team 입력 핸들러 ==========

export function handleTeamInput(event) {
  const target = event.target;

  if (target.classList.contains('cm-team-name-input')) {
    const teamIdx = parseInt(target.dataset.groupIndex, 10);
    if (Number.isFinite(teamIdx) && teamIdx >= 0 && teamIdx < state.teamTeamNames.length) {
      state.teamTeamNames[teamIdx] = target.value;
    }
  }
}

export function onTeamRowsChange() {
  const rowsInput = document.getElementById('team-modal-rows');
  if (!rowsInput) return;
  const rows = Math.max(1, Math.min(12, parseInt(rowsInput.value, 10) || 4));
  rowsInput.value = rows;

  // 각 모둠에서 rows를 초과하는 학생 → 미배정으로 이동
  state.teamTeams.forEach(team => {
    while (team.length > rows) {
      const removed = team.pop();
      if (removed) state.teamUnassigned.push(removed);
    }
  });

  renderTeamEditor();
}

export function onTeamCountChange() {
  const countInput = document.getElementById('team-modal-count');
  if (!countInput) return;
  const count = ensureTeamCount(countInput.value);
  countInput.value = count;

  // 행 수 자동 재계산
  const rowsInput = document.getElementById('team-modal-rows');
  if (rowsInput) {
    const totalStudents = state.teamStudents.length;
    const autoRows = Math.max(1, Math.ceil(totalStudents / count));
    rowsInput.value = autoRows;
  }

  renderTeamEditor();
}
