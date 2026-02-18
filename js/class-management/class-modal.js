/**
 * 학급 모달 열기/닫기/저장
 */
import { state } from './state.js';
import { Store } from '../shared/store.js';
import { UI } from '../shared/ui-utils.js';
import { sanitizeGender, sortStudentsByNumber } from './helpers.js';
import {
  initializeModalState,
  ensureModalTeamCount,
  sanitizeModalZones,
  renderModalEditor,
} from './modal-editor.js';
import { closeBulkRegistrationModal } from './csv-import.js';
import { syncClassToFirestore } from './class-firestore.js';

export function openModal(classId, callback) {
  state.editingClassId = classId;
  state.onSaveCallback = callback || null;

  const titleEl = document.getElementById('class-modal-title');
  const nameInput = document.getElementById('class-name-input');
  const teamCountInput = document.getElementById('class-team-count');
  const legacyInput = document.getElementById('class-students-input');

  if (legacyInput) legacyInput.style.display = 'none';

  if (classId) {
    const cls = Store.getClassById(classId);
    if (cls) {
      titleEl.textContent = '학급 편집';
      nameInput.value = cls.name;

      const count = cls.teamCount || cls.teams?.length || 6;
      if (teamCountInput) teamCountInput.value = ensureModalTeamCount(count);

      initializeModalState(cls, count);
    }
  } else {
    titleEl.textContent = '새 학급 추가';
    nameInput.value = '';

    const count = ensureModalTeamCount(6);
    if (teamCountInput) teamCountInput.value = count;

    initializeModalState(null, count);
  }

  renderModalEditor();
  UI.showModal('class-modal');
}

export function closeModal() {
  UI.hideModal('class-modal');

  state.editingClassId = null;
  state.draggedStudentId = null;
  closeBulkRegistrationModal();

  const csvFile = document.getElementById('class-csv-file');
  const saveBtn = document.getElementById('class-modal-save');

  if (csvFile) csvFile.value = '';
  if (saveBtn) saveBtn.disabled = false;

  state.modalStudents = [];
  state.modalUnassigned = [];
  state.modalTeams = [];
  state.modalTeamNames = [];
  state.bulkModalRows = [];

  const rosterEl = document.getElementById('class-student-roster');
  const boardEl = document.getElementById('class-team-assign-board');
  if (rosterEl) rosterEl.innerHTML = '';
  if (boardEl) boardEl.innerHTML = '';
}

export async function saveClass() {
  const nameInput = document.getElementById('class-name-input');
  const className = nameInput?.value.trim();
  const saveBtn = document.getElementById('class-modal-save');
  const teamCountInput = document.getElementById('class-team-count');

  if (!className) {
    UI.showToast('학급 이름을 입력하세요', 'error');
    return;
  }

  const teamCount = ensureModalTeamCount(parseInt(teamCountInput?.value, 10) || 6);
  if (teamCountInput) teamCountInput.value = teamCount;

  sanitizeModalZones();

  const validStudents = state.modalStudents
    .map(student => ({
      ...student,
      name: (student.name || '').trim(),
      number: parseInt(student.number, 10),
      gender: sanitizeGender(student.gender),
    }))
    .filter(student => student.name.length > 0)
    .sort(sortStudentsByNumber)
    .map((student, idx) => ({
      ...student,
      number: idx + 1,
      sportsAbility: student.sportsAbility || '',
      tags: Array.isArray(student.tags) ? student.tags : [],
      note: student.note || '',
    }));

  if (validStudents.length === 0) {
    UI.showToast('학생을 한 명 이상 입력하세요', 'error');
    return;
  }

  const validIdSet = new Set(validStudents.map(student => student.id));
  const nameById = new Map(validStudents.map(student => [student.id, student.name]));

  const finalTeams = state.modalTeams.slice(0, teamCount).map(group =>
    group
      .filter(studentId => validIdSet.has(studentId))
      .map(studentId => nameById.get(studentId))
      .filter(Boolean)
  );

  const finalTeamNames = Array.from({ length: teamCount }, (_, idx) => {
    const raw = (state.modalTeamNames[idx] || '').trim();
    return raw || `${idx + 1}모둠`;
  });

  if (saveBtn) saveBtn.disabled = true;

  try {
    let targetClass = null;

    if (state.editingClassId) {
      targetClass = Store.updateClass(
        state.editingClassId,
        className,
        validStudents,
        finalTeamNames,
        finalTeams,
        teamCount
      );
      UI.showToast(`${className} 수정 완료`, 'success');
    } else {
      const created = Store.addClass(
        className,
        validStudents,
        finalTeamNames,
        finalTeams,
        teamCount
      );
      targetClass = created;
      UI.showToast(`${className} 추가 완료`, 'success');
    }

    if (targetClass) {
      syncClassToFirestore(targetClass).catch(error => {
        console.warn('[ClassModal] Firestore sync skipped:', error);
      });
    }

    closeModal();
    if (state.onSaveCallback) state.onSaveCallback();
  } catch (error) {
    console.error('❌ 학급 저장 실패:', error);
    UI.showToast('저장 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    if (saveBtn) saveBtn.disabled = false;
  }
}
