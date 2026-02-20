/**
 * 학급 모달 편집기 — Roster / Team 모달 분리
 * Roster: 학생 입력 행 CRUD + 알약 미리보기
 * Team: 미배정 풀 + 모둠별 드래그앤드롭
 */
import { state } from './state.js';
import { Store } from '../shared/store.js';
import { UI } from '../shared/ui-utils.js';
import { normalizeStudentName, sortStudentsByNumber, createModalStudent } from './helpers.js';

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
  return `<div class="tag-student-card${genderClass}"${draggable}
              data-student-id="${UI.escapeHtml(student.id)}">
            <span>${student.number}. ${UI.escapeHtml(student.name)}</span>
          </div>`;
}

// ========== Roster 모달 ==========

export function getRosterStudentById(studentId) {
  return state.rosterStudents.find(s => s.id === studentId) || null;
}

export function initializeRosterState(cls) {
  state.rosterStudents = [];

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
  state.rosterStudents = [...state.rosterStudents]
    .sort(sortStudentsByNumber)
    .map((s, idx) => ({ ...s, number: idx + 1 }));
}

export function addStudentRow() {
  // 현재 빈 입력 카드에서 값 읽기
  const nameInput = document.querySelector('#roster-student-list .roster-add-name');
  const genderBtns = document.querySelectorAll('#roster-student-list .roster-gender-btn');
  const name = nameInput?.value?.trim() || '';

  if (!name) {
    nameInput?.focus();
    return;
  }

  let gender = '';
  genderBtns.forEach(btn => {
    if (btn.classList.contains('active-male')) gender = 'male';
    if (btn.classList.contains('active-female')) gender = 'female';
  });

  const student = createModalStudent(
    { name, number: state.rosterStudents.length + 1, gender },
    state.rosterStudents.length + 1
  );
  state.rosterStudents.push(student);
  normalizeRosterNumbers();
  renderRosterEditor();

  // 새 빈 카드에 포커스
  setTimeout(() => {
    const input = document.querySelector('#roster-student-list .roster-add-name');
    if (input) {
      input.value = '';
      input.focus();
    }
  }, 0);
}

export function removeStudentRow(studentId) {
  state.rosterStudents = state.rosterStudents.filter(s => s.id !== studentId);
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
      return `<div class="tag-student-card${genderClass}" data-student-id="${UI.escapeHtml(s.id)}">
          <span>${s.number}. ${UI.escapeHtml(s.name)}</span>
          <button type="button" class="roster-pill-remove" data-student-id="${UI.escapeHtml(s.id)}">✕</button>
        </div>`;
    })
    .join('');
}

function renderEmptyInputCard() {
  const listEl = document.getElementById('roster-student-list');
  if (!listEl) return;

  const nextNumber = state.rosterStudents.length + 1;
  listEl.innerHTML = `<div class="roster-add-card" data-student-id="new">
      <span class="roster-add-number">${nextNumber}</span>
      <input type="text" class="roster-add-name" maxlength="20"
             value="" placeholder="이름">
      <div class="roster-add-gender">
        <button type="button" class="roster-gender-btn" data-gender="male">남</button>
        <button type="button" class="roster-gender-btn" data-gender="female">여</button>
      </div>
      <button type="button" class="roster-add-btn" id="roster-add-row">+ 추가</button>
    </div>`;
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
    if (target.classList.contains('roster-add-name')) {
      event.preventDefault();
      addStudentRow();
    }
  }
}

export function handleRosterClick(event) {
  const target = event.target;

  // 추가 버튼
  const addBtn = target.closest('.roster-add-btn');
  if (addBtn) {
    addStudentRow();
    return;
  }

  // 등록된 pill 삭제 버튼
  const pillRemove = target.closest('.roster-pill-remove');
  if (pillRemove) {
    const studentId = pillRemove.dataset.studentId;
    if (studentId) removeStudentRow(studentId);
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
  const nextStudents = importedRows
    .map((row, idx) => {
      const normalized = typeof row === 'string' ? { name: row, number: idx + 1, gender: '' } : row;
      const student = createModalStudent(normalized, idx + 1);
      if (!student.name) return null;
      return student;
    })
    .filter(Boolean)
    .sort(sortStudentsByNumber)
    .map((s, idx) => ({ ...s, number: idx + 1 }));

  if (nextStudents.length === 0) {
    UI.showToast('학생을 찾을 수 없습니다', 'error');
    return 0;
  }

  state.rosterStudents = nextStudents;
  renderRosterEditor();

  return nextStudents.length;
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
        const memberName = normalizeStudentName(member);
        if (!memberName) {
          state.teamTeams[teamIdx].push(null);
          continue;
        }
        const matched = state.teamStudents.find(s => !usedIds.has(s.id) && s.name === memberName);
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

  // 헤더 (모둠이름 + 인원수, null 제외)
  let headerCells = '';
  for (let i = 0; i < teamCount; i++) {
    const name = state.teamTeamNames[i] || `${i + 1}모둠`;
    const count = state.teamTeams[i].filter(Boolean).length;
    headerCells += `<th>${UI.escapeHtml(name)}<br><span class="team-sheet-count">${count}명</span></th>`;
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
  renderTeamUnassignedPool();
  renderTeamColumns();
  bindTeamDragAndDrop();
}

// ========== Team 드래그앤드롭 ==========

function clearTeamDropHighlights() {
  document
    .querySelectorAll(
      '#class-team-modal .tm-drop-zone.tm-drop-over, #class-team-modal .team-unassigned-pool.tm-drop-over'
    )
    .forEach(zone => zone.classList.remove('tm-drop-over'));
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
      // 배열 확장 (빈 자리를 null로 채움)
      while (team.length <= rowIndex) team.push(null);
      // 기존 학생이 있으면 미배정으로 이동
      const existing = team[rowIndex];
      if (existing && existing !== studentId) {
        state.teamUnassigned.push(existing);
      }
      // 정확한 좌표에 배치
      team[rowIndex] = studentId;
    } else {
      // rowIndex 없으면 첫 번째 빈 슬롯 또는 끝에 추가
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

function onTeamDropZoneDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add('tm-drop-over');
}

function onTeamDropZoneDragLeave(event) {
  event.currentTarget.classList.remove('tm-drop-over');
}

function onTeamDropZoneDrop(event) {
  event.preventDefault();
  const zone = event.currentTarget;
  const zoneType = zone.dataset.zoneType;
  const groupIndexRaw = parseInt(zone.dataset.groupIndex, 10);
  const groupIndex = Number.isFinite(groupIndexRaw) ? groupIndexRaw : null;
  const rowIndexRaw = parseInt(zone.dataset.rowIndex, 10);
  const rowIndex = Number.isFinite(rowIndexRaw) ? rowIndexRaw : null;
  const droppedId = state.teamDraggedId || event.dataTransfer?.getData('text/plain');
  moveStudentToTeamZone(droppedId, zoneType, groupIndex, rowIndex);
  state.teamDraggedId = null;
  clearTeamDropHighlights();
  renderTeamUnassignedPool();
  renderTeamColumns();
  bindTeamDragAndDrop();
}

function bindTeamDragAndDrop() {
  const modal = document.getElementById('class-team-modal');
  if (!modal) return;

  modal.querySelectorAll('.tag-student-card[draggable]').forEach(card => {
    card.addEventListener('dragstart', onTeamCardDragStart);
    card.addEventListener('dragend', onTeamCardDragEnd);
  });

  modal.querySelectorAll('.tm-drop-zone, .team-unassigned-pool').forEach(zone => {
    zone.addEventListener('dragover', onTeamDropZoneDragOver);
    zone.addEventListener('dragleave', onTeamDropZoneDragLeave);
    zone.addEventListener('drop', onTeamDropZoneDrop);
  });

  // 셀 제거(✕) 버튼 핸들러
  modal.querySelectorAll('.team-cell-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const studentId = btn.dataset.studentId;
      if (studentId) {
        moveStudentToTeamZone(studentId, 'unassigned', null, null);
        renderTeamUnassignedPool();
        renderTeamColumns();
        bindTeamDragAndDrop();
      }
    });
  });
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
