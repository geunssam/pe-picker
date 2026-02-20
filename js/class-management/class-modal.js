/**
 * 학급 모달 열기/닫기/저장 — Roster + Team 2분할
 */
import { state } from './state.js';
import { Store } from '../shared/store.js';
import { UI } from '../shared/ui-utils.js';
import { sanitizeGender, sortStudentsByNumber } from './helpers.js';
import {
  initializeRosterState,
  renderRosterEditor,
  initializeTeamState,
  ensureTeamCount,
  sanitizeTeamZones,
  renderTeamEditor,
} from './modal-editor.js';
import { closeBulkRegistrationModal } from './csv-import.js';
import { syncClassToFirestore } from './class-firestore.js';

// ========== Roster 모달 ==========

export function openRosterModal(classId, callback) {
  state.editingClassId = classId;
  state.rosterCallback = callback || null;

  const titleEl = document.getElementById('roster-modal-title');
  const nameInput = document.getElementById('class-name-input');

  if (classId) {
    const cls = Store.getClassById(classId);
    if (cls) {
      if (titleEl) titleEl.textContent = '학급 편집';
      if (nameInput) nameInput.value = cls.name;
      initializeRosterState(cls);
    }
  } else {
    if (titleEl) titleEl.textContent = '새 학급 추가';
    if (nameInput) nameInput.value = '';
    initializeRosterState(null);
  }

  renderRosterEditor();
  UI.showModal('class-roster-modal');
}

export function closeRosterModal() {
  UI.hideModal('class-roster-modal');

  state.editingClassId = null;
  closeBulkRegistrationModal();

  const csvFile = document.getElementById('class-csv-file');
  const saveBtn = document.getElementById('roster-modal-save');

  if (csvFile) csvFile.value = '';
  if (saveBtn) saveBtn.disabled = false;

  state.rosterStudents = [];
  state.bulkModalRows = [];

  const listEl = document.getElementById('roster-student-list');
  const previewEl = document.getElementById('roster-pill-preview');
  if (listEl) listEl.innerHTML = '';
  if (previewEl) previewEl.innerHTML = '';
}

export async function saveRoster() {
  const nameInput = document.getElementById('class-name-input');
  const className = nameInput?.value.trim();
  const saveBtn = document.getElementById('roster-modal-save');

  if (!className) {
    UI.showToast('학급 이름을 입력하세요', 'error');
    return;
  }

  const validStudents = state.rosterStudents
    .map(s => ({
      ...s,
      name: (s.name || '').trim(),
      number: parseInt(s.number, 10),
      gender: sanitizeGender(s.gender),
    }))
    .filter(s => s.name.length > 0)
    .sort(sortStudentsByNumber)
    .map((s, idx) => ({
      ...s,
      number: idx + 1,
      sportsAbility: s.sportsAbility || '',
      tags: Array.isArray(s.tags) ? s.tags : [],
      note: s.note || '',
    }));

  if (validStudents.length === 0) {
    UI.showToast('학생을 한 명 이상 입력하세요', 'error');
    return;
  }

  if (saveBtn) saveBtn.disabled = true;

  try {
    let targetClass = null;

    if (state.editingClassId) {
      // 기존 학급 수정 — team 데이터 보존
      const existing = Store.getClassById(state.editingClassId);
      targetClass = Store.updateClass(
        state.editingClassId,
        className,
        validStudents,
        existing?.teamNames || [],
        existing?.teams || [],
        existing?.teamCount || 6
      );
      UI.showToast(`${className} 수정 완료`, 'success');
    } else {
      // 새 학급 추가 — team 기본값
      targetClass = Store.addClass(className, validStudents, [], [], 6);
      UI.showToast(`${className} 추가 완료`, 'success');
    }

    if (targetClass) {
      syncClassToFirestore(targetClass).catch(err => {
        console.warn('[ClassModal] Firestore sync skipped:', err);
      });
    }

    const cb = state.rosterCallback;
    closeRosterModal();
    if (cb) cb();
  } catch (error) {
    console.error('학급 저장 실패:', error);
    UI.showToast('저장 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    if (saveBtn) saveBtn.disabled = false;
  }
}

// ========== Team 모달 ==========

export function openTeamModal(classId, callback) {
  state.editingClassId = classId;
  state.teamCallback = callback || null;

  const cls = Store.getClassById(classId);
  if (!cls) {
    UI.showToast('학급을 찾을 수 없습니다', 'error');
    return;
  }

  const titleEl = document.getElementById('team-modal-title');
  if (titleEl) titleEl.textContent = `${cls.name} - 모둠 편집`;

  const countInput = document.getElementById('team-modal-count');
  const teamCount = cls.teamCount || cls.teams?.length || 6;
  if (countInput) countInput.value = teamCount;

  // 저장 버튼 활성화 복원
  const saveBtn = document.getElementById('team-modal-save');
  if (saveBtn) saveBtn.disabled = false;

  initializeTeamState(cls);

  // 행 수 초기값: 학생수/모둠수 기반 + 기존 배치 중 최대값 반영
  const rowsInput = document.getElementById('team-modal-rows');
  if (rowsInput) {
    const totalStudents = state.teamStudents.length;
    let autoRows = Math.max(1, Math.ceil(totalStudents / teamCount));
    state.teamTeams.forEach(team => {
      if (team.length > autoRows) autoRows = team.length;
    });
    rowsInput.value = autoRows;
  }
  renderTeamEditor();
  UI.showModal('class-team-modal');
}

export function closeTeamModal() {
  UI.hideModal('class-team-modal');

  state.editingClassId = null;
  state.teamDraggedId = null;

  state.teamStudents = [];
  state.teamUnassigned = [];
  state.teamTeams = [];
  state.teamTeamNames = [];

  const poolEl = document.getElementById('team-unassigned-pool');
  const boardEl = document.getElementById('team-assign-board');
  if (poolEl) poolEl.innerHTML = '';
  if (boardEl) boardEl.innerHTML = '';
}

export async function saveTeams() {
  const saveBtn = document.getElementById('team-modal-save');
  const countInput = document.getElementById('team-modal-count');
  const teamCount = ensureTeamCount(parseInt(countInput?.value, 10) || 6);
  if (countInput) countInput.value = teamCount;

  sanitizeTeamZones();

  // 학생 이름 맵 (ID → name)
  const nameById = new Map(state.teamStudents.map(s => [s.id, s.name]));

  const finalTeams = state.teamTeams.slice(0, teamCount).map(group =>
    group.map(id => {
      if (!id) return null;
      return nameById.get(id) || null;
    })
  );

  const finalTeamNames = Array.from({ length: teamCount }, (_, idx) => {
    const raw = (state.teamTeamNames[idx] || '').trim();
    return raw || `${idx + 1}모둠`;
  });

  if (saveBtn) saveBtn.disabled = true;

  try {
    // 기존 name/students 보존
    const existing = Store.getClassById(state.editingClassId);
    if (!existing) {
      UI.showToast('학급을 찾을 수 없습니다', 'error');
      if (saveBtn) saveBtn.disabled = false;
      return;
    }

    // 학생별 team 필드 업데이트 (모둠 배정 반영)
    const studentTeamMap = new Map();
    finalTeams.forEach((members, teamIdx) => {
      const teamName = finalTeamNames[teamIdx] || `${teamIdx + 1}모둠`;
      members.forEach(memberName => {
        if (memberName) studentTeamMap.set(memberName, teamName);
      });
    });

    const updatedStudents = existing.students.map(s => {
      const name = typeof s === 'string' ? s : s.name;
      const teamName = studentTeamMap.get(name) || '';
      if (typeof s === 'string') return s;
      return { ...s, team: teamName };
    });

    const targetClass = Store.updateClass(
      state.editingClassId,
      existing.name,
      updatedStudents,
      finalTeamNames,
      finalTeams,
      teamCount
    );

    UI.showToast('모둠 편집 완료', 'success');

    if (targetClass) {
      syncClassToFirestore(targetClass).catch(err => {
        console.warn('[ClassModal] Firestore sync skipped:', err);
      });
    }

    const cb = state.teamCallback;
    closeTeamModal();
    if (cb) cb();
  } catch (error) {
    console.error('모둠 저장 실패:', error);
    UI.showToast('저장 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    if (saveBtn) saveBtn.disabled = false;
  }
}
