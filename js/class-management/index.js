/**
 * ClassManager Facade
 * 기존 API를 유지하면서 분리된 모듈들을 통합
 */
import { state } from './state.js';
import { Store } from '../shared/store.js';
import { normalizeStudentName } from './helpers.js';
import {
  addStudentCard,
  handleModalInput,
  handleModalClick,
  onGroupCountChange,
} from './modal-editor.js';
import {
  handleCSVImport,
  downloadCSVTemplate,
  importFromGoogleSheets,
  openBulkRegistrationModal,
  closeBulkRegistrationModal,
  applyBulkRegistrationModal,
  addBulkModalRow,
  removeBulkModalRow,
  handleBulkModalInput,
} from './csv-import.js';
import { openModal, closeModal, saveClass } from './class-modal.js';
import { renderLandingClassList, deleteClass, refreshAllSelects } from './landing-page.js';
import {
  onSettingsPageEnter,
  renderSettingsStudentList,
  loadDefaultGroupNames,
  addDefaultGroupName,
  removeDefaultGroupName,
  saveDefaultGroupNamesHandler,
} from './settings-page.js';

function init() {
  if (state.initialized) return;
  state.initialized = true;

  const closeBtn = document.getElementById('class-modal-close');
  const cancelBtn = document.getElementById('class-modal-cancel');
  const saveBtn = document.getElementById('class-modal-save');
  const csvBtn = document.getElementById('class-csv-import');
  const csvFile = document.getElementById('class-csv-file');
  const csvDownloadBtn = document.getElementById('class-csv-download');
  const googleSheetsBtn = document.getElementById('class-google-sheets-import');
  const openBulkModalBtn = document.getElementById('class-open-bulk-modal');
  const bulkModalCloseBtn = document.getElementById('class-bulk-modal-close');
  const bulkModalCancelBtn = document.getElementById('class-bulk-modal-cancel');
  const bulkModalApplyBtn = document.getElementById('class-bulk-modal-apply');
  const bulkRowAddBtn = document.getElementById('class-bulk-row-add');
  const bulkRowRemoveBtn = document.getElementById('class-bulk-row-remove');
  const addStudentBtn = document.getElementById('class-add-student-card');

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (saveBtn) saveBtn.addEventListener('click', saveClass);
  if (csvBtn) csvBtn.addEventListener('click', () => csvFile?.click());
  if (csvFile) csvFile.addEventListener('change', handleCSVImport);
  if (csvDownloadBtn) csvDownloadBtn.addEventListener('click', downloadCSVTemplate);
  if (googleSheetsBtn) googleSheetsBtn.addEventListener('click', importFromGoogleSheets);
  if (openBulkModalBtn) openBulkModalBtn.addEventListener('click', openBulkRegistrationModal);
  if (bulkModalCloseBtn) bulkModalCloseBtn.addEventListener('click', closeBulkRegistrationModal);
  if (bulkModalCancelBtn) bulkModalCancelBtn.addEventListener('click', closeBulkRegistrationModal);
  if (bulkModalApplyBtn) bulkModalApplyBtn.addEventListener('click', applyBulkRegistrationModal);
  if (bulkRowAddBtn) bulkRowAddBtn.addEventListener('click', addBulkModalRow);
  if (bulkRowRemoveBtn) bulkRowRemoveBtn.addEventListener('click', removeBulkModalRow);
  if (addStudentBtn) addStudentBtn.addEventListener('click', addStudentCard);

  const groupCountInput = document.getElementById('class-group-count');
  if (groupCountInput) {
    groupCountInput.addEventListener('change', onGroupCountChange);
  }

  const modalEl = document.getElementById('class-modal');
  if (modalEl) {
    modalEl.addEventListener('input', handleModalInput);
    modalEl.addEventListener('change', handleModalInput);
    modalEl.addEventListener('click', handleModalClick);
  }

  const bulkModalEl = document.getElementById('class-bulk-modal');
  if (bulkModalEl) {
    bulkModalEl.addEventListener('input', handleBulkModalInput);
    bulkModalEl.addEventListener('change', handleBulkModalInput);
  }

  const saveDefaultBtn = document.getElementById('save-default-group-names');
  if (saveDefaultBtn) saveDefaultBtn.addEventListener('click', saveDefaultGroupNamesHandler);

  const addDefaultBtn = document.getElementById('default-group-add');
  if (addDefaultBtn) addDefaultBtn.addEventListener('click', addDefaultGroupName);

  const removeDefaultBtn = document.getElementById('default-group-remove');
  if (removeDefaultBtn) removeDefaultBtn.addEventListener('click', removeDefaultGroupName);

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

  const editBtn = document.getElementById('settings-add-class');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      const cls = Store.getSelectedClass();
      if (!cls) return;

      openModal(cls.id, () => {
        onSettingsPageEnter();
        const nameEl = document.getElementById('navbar-class-name');
        const updatedCls = Store.getSelectedClass();
        if (nameEl && updatedCls) nameEl.textContent = updatedCls.name;
      });
    });
  }

  const landingAddBtn = document.getElementById('landing-add-class');
  if (landingAddBtn) {
    landingAddBtn.addEventListener('click', () => {
      openModal(null, () => {
        renderLandingClassList();
      });
    });
  }

  loadDefaultGroupNames();
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
  openModal,
  closeModal,
  refreshAllSelects,
  renderLandingClassList,
  deleteClass,
  onSettingsPageEnter,
  renderSettingsStudentList,
  downloadCSVTemplate,
  importFromGoogleSheets,
};
