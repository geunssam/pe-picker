/**
 * 학급 모달 편집기 - 학생 카드 CRUD + 렌더링 + 드래그앤드롭
 */
import { state } from './state.js';
import { Store } from '../shared/store.js';
import { UI } from '../shared/ui-utils.js';
import {
  sanitizeGender,
  normalizeStudentName,
  sortStudentsByNumber,
  createModalStudent,
} from './helpers.js';

// ===== 학생 상태 조회/조작 =====

export function getStudentById(studentId) {
  return state.modalStudents.find(student => student.id === studentId) || null;
}

export function removeStudentFromAllZones(studentId) {
  state.modalUnassigned = state.modalUnassigned.filter(id => id !== studentId);
  state.modalTeams = state.modalTeams.map(group => group.filter(id => id !== studentId));
}

export function sanitizeModalZones() {
  const existingIds = new Set(state.modalStudents.map(student => student.id));
  const used = new Set();

  state.modalTeams = state.modalTeams.map(group => {
    const next = [];
    group.forEach(studentId => {
      if (!existingIds.has(studentId)) return;
      if (used.has(studentId)) return;
      used.add(studentId);
      next.push(studentId);
    });
    return next;
  });

  const nextUnassigned = [];
  state.modalUnassigned.forEach(studentId => {
    if (!existingIds.has(studentId)) return;
    if (used.has(studentId)) return;
    used.add(studentId);
    nextUnassigned.push(studentId);
  });

  state.modalStudents.forEach(student => {
    if (used.has(student.id)) return;
    used.add(student.id);
    nextUnassigned.push(student.id);
  });

  state.modalUnassigned = nextUnassigned;
}

export function ensureModalTeamCount(teamCount) {
  const count = Math.max(2, Math.min(8, parseInt(teamCount, 10) || 6));
  const defaultNames = Store.getDefaultTeamNames();

  if (state.modalTeams.length > count) {
    const removedTeams = state.modalTeams.slice(count);
    const movedToUnassigned = removedTeams.flat();
    state.modalTeams = state.modalTeams.slice(0, count);
    state.modalUnassigned = [...state.modalUnassigned, ...movedToUnassigned];
  } else {
    while (state.modalTeams.length < count) {
      state.modalTeams.push([]);
    }
  }

  if (state.modalTeamNames.length > count) {
    state.modalTeamNames = state.modalTeamNames.slice(0, count);
  } else {
    while (state.modalTeamNames.length < count) {
      const idx = state.modalTeamNames.length;
      state.modalTeamNames.push(defaultNames[idx] || `${idx + 1}모둠`);
    }
  }

  sanitizeModalZones();
  return count;
}

export function initializeModalState(cls, teamCount) {
  state.modalStudents = [];
  state.modalUnassigned = [];
  state.modalTeams = [];
  state.modalTeamNames = [];

  const count = ensureModalTeamCount(teamCount);
  const defaultNames = Store.getDefaultTeamNames();

  for (let i = 0; i < count; i++) {
    state.modalTeamNames[i] = (cls?.teamNames?.[i] || defaultNames[i] || `${i + 1}모둠`).trim();
  }

  if (!cls) return;

  const sourceStudents = Array.isArray(cls.students) ? cls.students : [];

  if (sourceStudents.length > 0) {
    state.modalStudents = sourceStudents.map((student, idx) =>
      createModalStudent(student, idx + 1)
    );
  } else if (Array.isArray(cls.teams)) {
    const flattened = [];
    cls.teams.forEach(group => {
      if (!Array.isArray(group)) return;
      group.forEach(member => {
        const name = normalizeStudentName(member);
        if (!name) return;
        flattened.push({ name });
      });
    });
    state.modalStudents = flattened.map((student, idx) => createModalStudent(student, idx + 1));
  }

  if (state.modalStudents.length === 0) return;

  state.modalStudents.sort(sortStudentsByNumber);
  state.modalStudents.forEach((student, idx) => {
    if (!student.number || student.number < 1) student.number = idx + 1;
  });

  const usedIds = new Set();

  if (Array.isArray(cls.teams) && cls.teams.length > 0) {
    for (let teamIdx = 0; teamIdx < count; teamIdx++) {
      const teamMembers = Array.isArray(cls.teams[teamIdx]) ? cls.teams[teamIdx] : [];

      teamMembers.forEach(member => {
        const memberName = normalizeStudentName(member);
        if (!memberName) return;

        const matched = state.modalStudents.find(
          student => !usedIds.has(student.id) && student.name === memberName
        );
        if (matched) {
          state.modalTeams[teamIdx].push(matched.id);
          usedIds.add(matched.id);
          return;
        }

        const fallback = createModalStudent({ name: memberName }, state.modalStudents.length + 1);
        state.modalStudents.push(fallback);
        state.modalTeams[teamIdx].push(fallback.id);
        usedIds.add(fallback.id);
      });
    }
  }

  state.modalStudents.forEach(student => {
    if (usedIds.has(student.id)) return;
    state.modalUnassigned.push(student.id);
  });

  sanitizeModalZones();
}

export function normalizeStudentNumbers() {
  state.modalStudents = [...state.modalStudents].sort(sortStudentsByNumber).map((student, idx) => ({
    ...student,
    number: idx + 1,
  }));
}

export function addStudentCard() {
  const student = createModalStudent(
    { name: '', number: state.modalStudents.length + 1, gender: '' },
    state.modalStudents.length + 1
  );
  state.modalStudents.push(student);
  state.modalUnassigned.push(student.id);

  normalizeStudentNumbers();
  sanitizeModalZones();
  renderModalEditor();

  setTimeout(() => {
    const nameInput = document.querySelector(
      `.cm-student-card[data-student-id="${student.id}"] .cm-name-input`
    );
    nameInput?.focus();
  }, 0);
}

export function removeStudent(studentId) {
  state.modalStudents = state.modalStudents.filter(student => student.id !== studentId);
  removeStudentFromAllZones(studentId);
  normalizeStudentNumbers();
  sanitizeModalZones();
  renderModalEditor();
}

export function getGroupIndexByStudentName(groups, studentName) {
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].includes(studentName)) return i;
  }
  return -1;
}

export function applyImportedStudents(importedRows) {
  const nextStudents = importedRows
    .map((row, idx) => {
      const normalized = typeof row === 'string' ? { name: row, number: idx + 1, gender: '' } : row;
      const student = createModalStudent(normalized, idx + 1);
      if (!student.name) return null;
      return student;
    })
    .filter(Boolean)
    .sort(sortStudentsByNumber)
    .map((student, idx) => ({ ...student, number: idx + 1 }));

  if (nextStudents.length === 0) {
    UI.showToast('학생을 찾을 수 없습니다', 'error');
    return 0;
  }

  state.modalStudents = nextStudents;
  state.modalUnassigned = state.modalStudents.map(student => student.id);

  const teamCountInput = document.getElementById('class-team-count');
  const teamCount = ensureModalTeamCount(parseInt(teamCountInput?.value, 10) || 6);
  if (teamCountInput) teamCountInput.value = teamCount;

  state.modalTeams = Array.from({ length: teamCount }, () => []);

  sanitizeModalZones();
  renderModalEditor();

  return nextStudents.length;
}

// ===== 렌더링 =====

export function renderStudentCardHTML(student) {
  if (!student) return '';

  const selectedMale = student.gender === 'male' ? 'selected' : '';
  const selectedFemale = student.gender === 'female' ? 'selected' : '';
  const selectedUnknown =
    student.gender !== 'male' && student.gender !== 'female' ? 'selected' : '';

  return `
    <div class="cm-student-card" draggable="true" data-student-id="${UI.escapeHtml(student.id)}">
      <div class="cm-card-top">
        <span class="cm-card-drag" title="드래그하여 이동">⋮⋮</span>
        <button type="button" class="cm-remove-student-btn" data-student-id="${UI.escapeHtml(student.id)}" title="학생 삭제">✕</button>
      </div>
      <div class="cm-card-fields">
        <div class="cm-card-field">
          <span>번호</span>
          <span class="cm-student-no">${UI.escapeHtml(student.number || 0)}번</span>
        </div>
        <label class="cm-card-field">
          <span>이름</span>
          <input type="text" class="cm-name-input" maxlength="20" value="${UI.escapeHtml(student.name)}" placeholder="이름">
        </label>
        <label class="cm-card-field">
          <span>성별</span>
          <select class="cm-gender-select">
            <option value="" ${selectedUnknown}>-</option>
            <option value="male" ${selectedMale}>남</option>
            <option value="female" ${selectedFemale}>여</option>
          </select>
        </label>
      </div>
    </div>
  `;
}

export function renderRosterSection() {
  const rosterEl = document.getElementById('class-student-roster');
  const countEl = document.getElementById('class-roster-count');
  if (!rosterEl) return;

  const cardsHTML = state.modalUnassigned
    .map(studentId => renderStudentCardHTML(getStudentById(studentId)))
    .join('');

  rosterEl.innerHTML =
    cardsHTML ||
    `<div class="cm-empty-zone">
      미배정 학생이 없습니다. 모둠 카드도 여기로 드래그하면 다시 명렬표로 돌아옵니다.
    </div>`;

  if (countEl) countEl.textContent = `${state.modalUnassigned.length}명`;
}

export function renderTeamSection() {
  const boardEl = document.getElementById('class-team-assign-board');
  if (!boardEl) return;

  const columnsHTML = state.modalTeams
    .map((teamStudentIds, teamIdx) => {
      const teamName = state.modalTeamNames[teamIdx] || `${teamIdx + 1}모둠`;
      const cardsHTML = teamStudentIds
        .map(studentId => renderStudentCardHTML(getStudentById(studentId)))
        .join('');

      return `
        <div class="cm-team-column">
          <div class="cm-team-header">
            <input type="text" class="cm-team-name-input" data-group-index="${teamIdx}" maxlength="10" value="${UI.escapeHtml(teamName)}" placeholder="${teamIdx + 1}모둠">
            <span class="cm-team-count">${teamStudentIds.length}명</span>
          </div>
          <div class="cm-team-list cm-drop-zone" data-zone-type="group" data-group-index="${teamIdx}">
            ${cardsHTML || '<div class="cm-empty-zone">여기에 학생 카드를 드래그하세요</div>'}
          </div>
        </div>
      `;
    })
    .join('');

  boardEl.innerHTML = columnsHTML;
}

// ===== 드래그 앤 드롭 =====

function clearDropHighlights() {
  document.querySelectorAll('.cm-drop-zone.cm-drop-over').forEach(zone => {
    zone.classList.remove('cm-drop-over');
  });
}

function onCardDragStart(event) {
  const card = event.currentTarget;
  state.draggedStudentId = card.dataset.studentId;
  card.classList.add('is-dragging');
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', state.draggedStudentId);
  }
}

function onCardDragEnd(event) {
  event.currentTarget.classList.remove('is-dragging');
  state.draggedStudentId = null;
  clearDropHighlights();
}

function moveStudentToZone(studentId, zoneType, groupIndex) {
  if (!studentId) return;
  removeStudentFromAllZones(studentId);
  if (
    zoneType === 'group' &&
    Number.isInteger(groupIndex) &&
    groupIndex >= 0 &&
    groupIndex < state.modalTeams.length
  ) {
    state.modalTeams[groupIndex].push(studentId);
  } else {
    state.modalUnassigned.push(studentId);
  }
  sanitizeModalZones();
}

function onDropZoneDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add('cm-drop-over');
}

function onDropZoneDragLeave(event) {
  event.currentTarget.classList.remove('cm-drop-over');
}

function onDropZoneDrop(event) {
  event.preventDefault();
  const zone = event.currentTarget;
  const zoneType = zone.dataset.zoneType;
  const groupIndexRaw = parseInt(zone.dataset.groupIndex, 10);
  const groupIndex = Number.isFinite(groupIndexRaw) ? groupIndexRaw : null;
  const droppedId = state.draggedStudentId || event.dataTransfer?.getData('text/plain');
  moveStudentToZone(droppedId, zoneType, groupIndex);
  state.draggedStudentId = null;
  clearDropHighlights();
  renderModalEditor();
}

function bindDragAndDrop() {
  document.querySelectorAll('.cm-student-card').forEach(card => {
    card.addEventListener('dragstart', onCardDragStart);
    card.addEventListener('dragend', onCardDragEnd);
  });
  document.querySelectorAll('.cm-drop-zone').forEach(zone => {
    zone.addEventListener('dragover', onDropZoneDragOver);
    zone.addEventListener('dragleave', onDropZoneDragLeave);
    zone.addEventListener('drop', onDropZoneDrop);
  });
}

export function renderModalEditor() {
  renderRosterSection();
  renderTeamSection();
  bindDragAndDrop();
}

// ===== 입력 핸들러 =====

export function handleModalInput(event) {
  const target = event.target;
  const card = target.closest('.cm-student-card');

  if (target.classList.contains('cm-team-name-input')) {
    const teamIdx = parseInt(target.dataset.groupIndex, 10);
    if (Number.isFinite(teamIdx) && teamIdx >= 0 && teamIdx < state.modalTeamNames.length) {
      state.modalTeamNames[teamIdx] = target.value;
    }
    return;
  }

  if (!card) return;

  const studentId = card.dataset.studentId;
  const student = getStudentById(studentId);
  if (!student) return;

  if (target.classList.contains('cm-name-input')) {
    student.name = target.value;
    return;
  }

  if (target.classList.contains('cm-gender-select')) {
    student.gender = sanitizeGender(target.value);
  }
}

export function handleModalClick(event) {
  const removeBtn = event.target.closest('.cm-remove-student-btn');
  if (!removeBtn) return;
  const studentId = removeBtn.dataset.studentId;
  if (!studentId) return;
  removeStudent(studentId);
}

export function onTeamCountChange() {
  const teamCountInput = document.getElementById('class-team-count');
  if (!teamCountInput) return;
  const count = ensureModalTeamCount(teamCountInput.value);
  teamCountInput.value = count;
  renderModalEditor();
}
