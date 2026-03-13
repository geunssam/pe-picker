/**
 * ClassManager Facade
 * 기존 API를 유지하면서 분리된 모듈들을 통합
 */
import { state } from './state.js';
import { Store } from '../../shared/store.js';
import { UI } from '../../shared/ui-utils.js';
import { AuthManager } from '../auth/auth-manager.js';
import { FirestoreSync } from '../../infra/firestore-sync.js';
import { normalizeStudentName, sortStudentsByNumber } from './helpers.js';
import {
  handleRosterInput,
  handleRosterClick,
  handleRosterKeydown,
  handleRosterDragStart,
  handleRosterDragOver,
  handleRosterDrop,
  handleRosterDragEnd,
  handleRosterTouchStart,
  handleRosterTouchMove,
  handleRosterTouchEnd,
  handleRosterTouchCancel,
  handleTeamInput,
  onTeamCountChange,
  onTeamRowsChange,
  resetTeamAssignments,
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
  generateGenderRangeRows,
  applyReconciliation,
  closeReconcileModal,
  handleReconcileModalClick,
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
    rosterModalEl.addEventListener('dragstart', handleRosterDragStart);
    rosterModalEl.addEventListener('dragover', handleRosterDragOver);
    rosterModalEl.addEventListener('drop', handleRosterDrop);
    rosterModalEl.addEventListener('dragend', handleRosterDragEnd);
    rosterModalEl.addEventListener('touchstart', handleRosterTouchStart, { passive: true });
    rosterModalEl.addEventListener('touchmove', handleRosterTouchMove, { passive: false });
    rosterModalEl.addEventListener('touchend', handleRosterTouchEnd);
    rosterModalEl.addEventListener('touchcancel', handleRosterTouchCancel);
  }

  // === Team 모달 바인딩 ===
  const teamCloseBtn = document.getElementById('team-modal-close');
  const teamCancelBtn = document.getElementById('team-modal-cancel');
  const teamSaveBtn = document.getElementById('team-modal-save');
  const teamCountInput = document.getElementById('team-modal-count');

  const teamResetBtn = document.getElementById('team-modal-reset');

  if (teamCloseBtn) teamCloseBtn.addEventListener('click', closeTeamModal);
  if (teamCancelBtn) teamCancelBtn.addEventListener('click', closeTeamModal);
  if (teamSaveBtn) teamSaveBtn.addEventListener('click', saveTeams);
  if (teamResetBtn) teamResetBtn.addEventListener('click', resetTeamAssignments);
  if (teamCountInput) teamCountInput.addEventListener('change', onTeamCountChange);

  const teamRowsInput = document.getElementById('team-modal-rows');
  if (teamRowsInput) teamRowsInput.addEventListener('change', onTeamRowsChange);

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

  const bulkGenderGenerateBtn = document.getElementById('bulk-gender-generate');

  if (bulkModalCloseBtn) bulkModalCloseBtn.addEventListener('click', closeBulkRegistrationModal);
  if (bulkModalCancelBtn) bulkModalCancelBtn.addEventListener('click', closeBulkRegistrationModal);
  if (bulkModalApplyBtn) bulkModalApplyBtn.addEventListener('click', applyBulkRegistrationModal);
  if (bulkRowAddBtn) bulkRowAddBtn.addEventListener('click', addBulkModalRow);
  if (bulkRowRemoveBtn) bulkRowRemoveBtn.addEventListener('click', removeBulkModalRow);
  if (bulkGenderGenerateBtn)
    bulkGenderGenerateBtn.addEventListener('click', generateGenderRangeRows);

  const bulkModalEl = document.getElementById('class-bulk-modal');
  if (bulkModalEl) {
    bulkModalEl.addEventListener('input', handleBulkModalInput);
    bulkModalEl.addEventListener('click', handleBulkModalClick);
  }

  // === CSV 매칭 모달 바인딩 ===
  const reconcileCloseBtn = document.getElementById('csv-reconcile-modal-close');
  const reconcileCancelBtn = document.getElementById('csv-reconcile-modal-cancel');
  const reconcileApplyBtn = document.getElementById('csv-reconcile-modal-apply');

  if (reconcileCloseBtn) reconcileCloseBtn.addEventListener('click', closeReconcileModal);
  if (reconcileCancelBtn) reconcileCancelBtn.addEventListener('click', closeReconcileModal);
  if (reconcileApplyBtn) reconcileApplyBtn.addEventListener('click', applyReconciliation);

  const reconcileModalEl = document.getElementById('csv-reconcile-modal');
  if (reconcileModalEl) {
    reconcileModalEl.addEventListener('click', handleReconcileModalClick);
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

  // === 회원 탈퇴 버튼 ===
  const deleteAccountBtn = document.getElementById('settings-delete-account');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async () => {
      if (!AuthManager.isAuthenticated()) {
        UI.showToast('로그인 상태에서만 탈퇴할 수 있습니다', 'error');
        return;
      }

      const first = await UI.showConfirm('정말 탈퇴하시겠습니까?', {
        confirmText: '탈퇴',
        danger: true,
      });
      if (!first) return;

      const second = await UI.showConfirm('모든 데이터가 삭제됩니다.\n되돌릴 수 없습니다.', {
        confirmText: '영구 삭제',
        danger: true,
      });
      if (!second) return;

      try {
        deleteAccountBtn.disabled = true;
        deleteAccountBtn.textContent = '처리 중...';

        const userId = AuthManager.getCurrentUser()?.uid;

        // 1. Firestore 데이터 삭제
        if (userId) {
          await FirestoreSync.deleteAllUserData(userId);
        }

        // 2. localStorage 초기화
        Store.clearAllData();
        localStorage.removeItem('pet_current_uid');

        // 3. Auth 상태 리스너 제거 (삭제 후 자동 리다이렉트 방지)
        AuthManager.destroy();

        // 4. Firebase Auth 계정 삭제
        await AuthManager.deleteAuthAccount();

        // 5. 완료 알림 → 확인 시 로그인 페이지로 이동
        await new Promise(resolve => {
          const overlay = document.createElement('div');
          overlay.className = 'modal-overlay';
          overlay.innerHTML = `
            <div class="modal-alert">
              <div class="modal-alert-body">
                <div class="modal-alert-message">탈퇴 및 데이터 삭제가 완료되었습니다!</div>
                <div class="confirm-btn-row">
                  <button class="btn-confirm-ok">확인</button>
                </div>
              </div>
            </div>
          `;
          document.body.appendChild(overlay);
          requestAnimationFrame(() => overlay.classList.add('show'));
          overlay.querySelector('.btn-confirm-ok').addEventListener('click', resolve);
        });

        window.location.replace('login.html');
      } catch (error) {
        console.error('[Settings] 회원 탈퇴 실패:', error);
        UI.showToast('탈퇴 처리 중 오류가 발생했습니다', 'error');
        deleteAccountBtn.disabled = false;
        deleteAccountBtn.textContent = '탈퇴하기';
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
    const named = cls.students.filter(s =>
      (typeof s === 'string' ? s : s.name || '').trim()
    ).length;
    const option = document.createElement('option');
    option.value = cls.id;
    option.textContent = `${cls.name} (${named}명)`;
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

function getStudents(classId) {
  const cls = Store.getClassById(classId);
  if (!cls || !Array.isArray(cls.students)) return [];
  return [...cls.students]
    .sort(sortStudentsByNumber)
    .map(s => {
      const name = normalizeStudentName(s);
      if (!name) return null;
      return {
        name,
        gender: (s && typeof s === 'object' && s.gender) || '',
        team: (s && typeof s === 'object' && s.team) || '',
      };
    })
    .filter(Boolean);
}

export const ClassManager = {
  init,
  populateSelect,
  getStudentNames,
  getStudents,
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
