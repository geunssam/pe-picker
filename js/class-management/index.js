/**
 * ClassManager Facade
 * 기존 API를 유지하면서 분리된 모듈들을 통합
 */
import { state } from './state.js';
import { Store } from '../shared/store.js';
import { normalizeStudentName } from './helpers.js';
import {
  handleRosterInput,
  handleRosterClick,
  handleRosterKeydown,
  handleTeamInput,
  onTeamCountChange,
} from './modal-editor.js';
import {
  handleCSVImport,
  downloadCSVTemplate,
  openBulkRegistrationModal,
  closeBulkRegistrationModal,
  applyBulkRegistrationModal,
  addBulkModalRow,
  removeBulkModalRow,
  handleBulkModalInput,
  handleBulkModalClick,
} from './csv-import.js';
import {
  openRosterModal,
  closeRosterModal,
  saveRoster,
  openTeamModal,
  closeTeamModal,
  saveTeams,
} from './class-modal.js';
import { renderLandingClassList, deleteClass, refreshAllSelects } from './landing-page.js';
import {
  onSettingsPageEnter,
  renderSettingsStudentList,
  renderSettingsTeamTable,
} from './settings-page.js';

function init() {
  if (state.initialized) return;
  state.initialized = true;

  // === Roster 모달 바인딩 ===
  const rosterCloseBtn = document.getElementById('roster-modal-close');
  const rosterCancelBtn = document.getElementById('roster-modal-cancel');
  const rosterSaveBtn = document.getElementById('roster-modal-save');
  const csvBtn = document.getElementById('class-csv-import');
  const csvFile = document.getElementById('class-csv-file');
  const csvDownloadBtn = document.getElementById('class-csv-download');
  const openBulkModalBtn = document.getElementById('class-open-bulk-modal');

  if (rosterCloseBtn) rosterCloseBtn.addEventListener('click', closeRosterModal);
  if (rosterCancelBtn) rosterCancelBtn.addEventListener('click', closeRosterModal);
  if (rosterSaveBtn) rosterSaveBtn.addEventListener('click', saveRoster);
  if (csvBtn) csvBtn.addEventListener('click', () => csvFile?.click());
  if (csvFile) csvFile.addEventListener('change', handleCSVImport);
  if (csvDownloadBtn) csvDownloadBtn.addEventListener('click', downloadCSVTemplate);
  if (openBulkModalBtn) openBulkModalBtn.addEventListener('click', openBulkRegistrationModal);

  const rosterModalEl = document.getElementById('class-roster-modal');
  if (rosterModalEl) {
    rosterModalEl.addEventListener('input', handleRosterInput);
    rosterModalEl.addEventListener('click', handleRosterClick);
    rosterModalEl.addEventListener('keydown', handleRosterKeydown);
  }

  // === Team 모달 바인딩 ===
  const teamCloseBtn = document.getElementById('team-modal-close');
  const teamCancelBtn = document.getElementById('team-modal-cancel');
  const teamSaveBtn = document.getElementById('team-modal-save');
  const teamCountInput = document.getElementById('team-modal-count');

  if (teamCloseBtn) teamCloseBtn.addEventListener('click', closeTeamModal);
  if (teamCancelBtn) teamCancelBtn.addEventListener('click', closeTeamModal);
  if (teamSaveBtn) teamSaveBtn.addEventListener('click', saveTeams);
  if (teamCountInput) teamCountInput.addEventListener('change', onTeamCountChange);

  const teamModalEl = document.getElementById('class-team-modal');
  if (teamModalEl) {
    teamModalEl.addEventListener('input', handleTeamInput);
    teamModalEl.addEventListener('change', handleTeamInput);
  }

  // === 일괄등록 모달 바인딩 ===
  const bulkModalCloseBtn = document.getElementById('class-bulk-modal-close');
  const bulkModalCancelBtn = document.getElementById('class-bulk-modal-cancel');
  const bulkModalApplyBtn = document.getElementById('class-bulk-modal-apply');
  const bulkRowAddBtn = document.getElementById('class-bulk-row-add');
  const bulkRowRemoveBtn = document.getElementById('class-bulk-row-remove');

  if (bulkModalCloseBtn) bulkModalCloseBtn.addEventListener('click', closeBulkRegistrationModal);
  if (bulkModalCancelBtn) bulkModalCancelBtn.addEventListener('click', closeBulkRegistrationModal);
  if (bulkModalApplyBtn) bulkModalApplyBtn.addEventListener('click', applyBulkRegistrationModal);
  if (bulkRowAddBtn) bulkRowAddBtn.addEventListener('click', addBulkModalRow);
  if (bulkRowRemoveBtn) bulkRowRemoveBtn.addEventListener('click', removeBulkModalRow);

  const bulkModalEl = document.getElementById('class-bulk-modal');
  if (bulkModalEl) {
    bulkModalEl.addEventListener('input', handleBulkModalInput);
    bulkModalEl.addEventListener('click', handleBulkModalClick);
  }

  // === 설정 페이지 바인딩 ===
  const resetBtn = document.getElementById('settings-reset-data');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('모든 데이터를 초기화하시겠습니까?\n학급, 기록 등이 모두 삭제됩니다.')) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('pet_')) keysToRemove.push(key);
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        location.reload();
      }
    });
  }

  // === 설정 페이지 편집 버튼 → roster 모달 ===
  const editBtn = document.getElementById('settings-add-class');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      const cls = Store.getSelectedClass();
      if (!cls) return;

      openRosterModal(cls.id, () => {
        onSettingsPageEnter();
        const nameEl = document.getElementById('navbar-class-name');
        const updatedCls = Store.getSelectedClass();
        if (nameEl && updatedCls) nameEl.textContent = updatedCls.name;
      });
    });
  }

  // === 설정 페이지 모둠 편집 버튼 → team 모달 ===
  const editTeamBtn = document.getElementById('settings-edit-team');
  if (editTeamBtn) {
    editTeamBtn.addEventListener('click', () => {
      const cls = Store.getSelectedClass();
      if (!cls) return;

      openTeamModal(cls.id, () => {
        onSettingsPageEnter();
      });
    });
  }

  // === 랜딩 페이지 새 학급 추가 ===
  const landingAddBtn = document.getElementById('landing-add-class');
  if (landingAddBtn) {
    landingAddBtn.addEventListener('click', () => {
      openRosterModal(null, () => {
        renderLandingClassList();
      });
    });
  }
}

function populateSelect(selectId, selectedId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const classes = Store.getClasses();
  const current = select.value;

  select.innerHTML = '<option value="">학급 선택...</option>';
  classes.forEach(cls => {
    const option = document.createElement('option');
    option.value = cls.id;
    option.textContent = `${cls.name} (${cls.students.length}명)`;
    select.appendChild(option);
  });

  if (selectedId) select.value = selectedId;
  else if (current) select.value = current;
}

function getStudentNames(classId) {
  const cls = Store.getClassById(classId);
  if (!cls || !Array.isArray(cls.students)) return [];
  return cls.students.map(student => normalizeStudentName(student)).filter(Boolean);
}

export const ClassManager = {
  init,
  populateSelect,
  getStudentNames,
  openRosterModal,
  closeRosterModal,
  openTeamModal,
  closeTeamModal,
  refreshAllSelects,
  renderLandingClassList,
  deleteClass,
  onSettingsPageEnter,
  renderSettingsStudentList,
  renderSettingsTeamTable,
  downloadCSVTemplate,
};
