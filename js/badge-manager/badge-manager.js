/* ============================================
   PE Picker - Badge Manager
   통합 뱃지 부여 모달 로직
   ============================================ */

import { Store } from '../shared/store.js';
import { UI } from '../shared/ui-utils.js';
import { BADGE_TYPES, BADGE_KEYS } from './badge-config.js';

let selectedStudentIds = new Set();
let selectedBadgeTypes = new Set();
let allStudents = []; // [{id, name}]
let groups = []; // 모둠 데이터 (모둠 모드용)
let currentContext = 'badge-collection'; // 호출 맥락

function init() {
  // 모드 탭
  document
    .getElementById('badge-mode-individual')
    ?.addEventListener('click', () => setMode('individual'));
  document.getElementById('badge-mode-group')?.addEventListener('click', () => setMode('group'));

  // 전체 선택/해제
  document.getElementById('badge-select-all')?.addEventListener('click', selectAll);
  document.getElementById('badge-deselect-all')?.addEventListener('click', deselectAll);

  // 닫기/취소/확인
  document.getElementById('badge-award-close')?.addEventListener('click', closeModal);
  document.getElementById('badge-award-cancel')?.addEventListener('click', closeModal);
  document.getElementById('badge-award-confirm')?.addEventListener('click', confirmAward);

  // 뱃지 타입 그리드 렌더
  renderBadgeTypeGrid();
}

/**
 * 뱃지 부여 모달 열기
 * @param {Object} options
 * @param {'individual'|'group'} options.mode - 초기 모드
 * @param {Array<string>} [options.preselectedStudentIds] - 미리 선택할 학생 ID
 * @param {Array} [options.groups] - 모둠 데이터 (모둠 모드용)
 * @param {number} [options.activeGroupId] - 활성 모둠 ID
 * @param {string} [options.context] - 호출 맥락
 */
function openModal(options = {}) {
  const cls = Store.getSelectedClass();
  if (!cls) {
    UI.showToast('선택된 학급이 없습니다', 'error');
    return;
  }

  const students = cls.students || [];
  if (students.length === 0) {
    UI.showToast('학급에 학생이 없습니다', 'error');
    return;
  }

  allStudents = students.map(s => ({ id: s.id, name: s.name }));
  groups = options.groups || [];
  currentContext = options.context || 'badge-collection';

  // 상태 초기화
  selectedStudentIds.clear();
  selectedBadgeTypes.clear();

  // 미리 선택할 학생
  if (options.preselectedStudentIds) {
    options.preselectedStudentIds.forEach(id => selectedStudentIds.add(id));
  }

  // 모드 설정
  setMode(options.mode || 'individual', options.activeGroupId);

  updateSummary();
  UI.showModal('badge-award-modal');
}

function closeModal() {
  UI.hideModal('badge-award-modal');
}

function setMode(mode, activeGroupId) {
  // 탭 활성 표시
  document
    .getElementById('badge-mode-individual')
    ?.classList.toggle('active', mode === 'individual');
  document.getElementById('badge-mode-group')?.classList.toggle('active', mode === 'group');

  // 모둠 탭 표시/숨기기
  const groupTabsEl = document.getElementById('badge-group-tabs');
  if (groupTabsEl) {
    groupTabsEl.style.display = mode === 'group' ? '' : 'none';
  }

  if (mode === 'group' && groups.length > 0) {
    renderGroupTabs(activeGroupId);
  } else {
    renderStudentGrid(allStudents);
  }

  updateSelectedCount();
}

function renderGroupTabs(activeGroupId) {
  const container = document.getElementById('badge-group-tabs');
  if (!container) return;

  container.innerHTML = groups
    .map(g => {
      const isActive = activeGroupId ? g.id === activeGroupId : g.id === groups[0]?.id;
      return `<button class="badge-group-tab${isActive ? ' active' : ''}" data-group-id="${g.id}">${UI.escapeHtml(g.name || `${g.id}모둠`)}</button>`;
    })
    .join('');

  // 이벤트
  container.querySelectorAll('.badge-group-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.badge-group-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onGroupTabClick(parseInt(btn.dataset.groupId));
    });
  });

  // 초기 모둠 학생 표시
  const firstActiveId = activeGroupId || groups[0]?.id;
  if (firstActiveId) {
    onGroupTabClick(firstActiveId);
  }
}

function onGroupTabClick(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;

  // 모둠 멤버 이름에서 학생 매칭
  const cls = Store.getSelectedClass();
  if (!cls) return;

  const memberNames = group.members.map(m => {
    // ⭐ 리더 마크 제거
    return typeof m === 'string' ? m.replace(/^⭐\s*/, '') : m;
  });

  const groupStudents = [];
  for (const name of memberNames) {
    const student = cls.students.find(s => s.name === name);
    if (student) {
      groupStudents.push({ id: student.id, name: student.name });
    }
  }

  // 해당 모둠원 전체 선택
  selectedStudentIds.clear();
  groupStudents.forEach(s => selectedStudentIds.add(s.id));

  renderStudentGrid(groupStudents);
  updateSelectedCount();
  updateSummary();
}

function renderStudentGrid(students) {
  const grid = document.getElementById('badge-student-grid');
  if (!grid) return;

  grid.innerHTML = students
    .map(s => {
      const isSelected = selectedStudentIds.has(s.id);
      return `<button class="badge-student-chip${isSelected ? ' selected' : ''}" data-student-id="${s.id}">${UI.escapeHtml(s.name)}</button>`;
    })
    .join('');

  // 이벤트
  grid.querySelectorAll('.badge-student-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.studentId;
      if (selectedStudentIds.has(id)) {
        selectedStudentIds.delete(id);
        chip.classList.remove('selected');
      } else {
        selectedStudentIds.add(id);
        chip.classList.add('selected');
      }
      updateSelectedCount();
      updateSummary();
    });
  });
}

function renderBadgeTypeGrid() {
  const grid = document.getElementById('badge-type-grid');
  if (!grid) return;

  grid.innerHTML = BADGE_KEYS.map(key => {
    const badge = BADGE_TYPES[key];
    return `<button class="badge-type-chip" data-badge="${key}">
      <img class="badge-img" src="${badge.image}" alt="${badge.name}" />
      <span class="badge-name">${badge.name}</span>
    </button>`;
  }).join('');

  // 이벤트
  grid.querySelectorAll('.badge-type-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.badge;
      if (selectedBadgeTypes.has(key)) {
        selectedBadgeTypes.delete(key);
        chip.classList.remove('selected');
      } else {
        selectedBadgeTypes.add(key);
        chip.classList.add('selected');
      }
      updateSummary();
    });
  });
}

function selectAll() {
  const chips = document.querySelectorAll('#badge-student-grid .badge-student-chip');
  chips.forEach(chip => {
    const id = chip.dataset.studentId;
    selectedStudentIds.add(id);
    chip.classList.add('selected');
  });
  updateSelectedCount();
  updateSummary();
}

function deselectAll() {
  const chips = document.querySelectorAll('#badge-student-grid .badge-student-chip');
  chips.forEach(chip => {
    const id = chip.dataset.studentId;
    selectedStudentIds.delete(id);
    chip.classList.remove('selected');
  });
  updateSelectedCount();
  updateSummary();
}

function updateSelectedCount() {
  const el = document.getElementById('badge-selected-count');
  if (el) el.textContent = `${selectedStudentIds.size}명 선택`;
}

function updateSummary() {
  const summaryEl = document.getElementById('badge-summary');
  const textEl = document.getElementById('badge-summary-text');
  const confirmBtn = document.getElementById('badge-award-confirm');
  const studentCount = selectedStudentIds.size;
  const badgeCount = selectedBadgeTypes.size;
  const totalBadges = studentCount * badgeCount;
  const totalXp = totalBadges * 10;

  if (totalBadges > 0) {
    if (summaryEl) summaryEl.style.display = '';
    if (textEl)
      textEl.textContent = `${studentCount}명 × ${badgeCount}개 = ${totalBadges}개 뱃지 (+${totalXp} XP)`;
    if (confirmBtn) confirmBtn.disabled = false;
  } else {
    if (summaryEl) summaryEl.style.display = 'none';
    if (confirmBtn) confirmBtn.disabled = true;
  }
}

function confirmAward() {
  const cls = Store.getSelectedClass();
  if (!cls) return;

  const students = allStudents.filter(s => selectedStudentIds.has(s.id));
  const badgeTypes = Array.from(selectedBadgeTypes);

  if (students.length === 0 || badgeTypes.length === 0) {
    UI.showToast('학생과 뱃지를 선택해주세요', 'error');
    return;
  }

  const count = Store.addBadgeRecords(cls.id, students, badgeTypes, currentContext);

  // 뱃지 이름 목록
  const badgeNames = badgeTypes.map(k => BADGE_TYPES[k].emoji + BADGE_TYPES[k].name).join(', ');
  UI.showToast(`🏅 ${count}개 뱃지 부여 완료! (${badgeNames})`, 'success');

  closeModal();

  // 뱃지도감 갱신 이벤트
  window.dispatchEvent(new CustomEvent('badge-updated'));
}

export const BadgeManager = {
  init,
  openModal,
  closeModal,
};
