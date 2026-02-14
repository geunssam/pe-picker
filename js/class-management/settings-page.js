/**
 * 설정 페이지 UI + 기본 모둠이름 관리
 */
import { Store } from '../shared/store.js';
import { UI } from '../shared/ui-utils.js';

export function onSettingsPageEnter() {
  const cls = Store.getSelectedClass();

  const infoContainer = document.getElementById('settings-current-class');
  if (infoContainer && cls) {
    const gc = cls.groupCount || cls.groups?.length || 6;
    infoContainer.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-lg); text-align: center;">
        <div>
          <div style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-bottom: var(--space-xs);">학급명</div>
          <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-primary);">${UI.escapeHtml(cls.name)}</div>
        </div>
        <div>
          <div style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-bottom: var(--space-xs);">학생 수</div>
          <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-primary);">👤 ${cls.students.length}명</div>
        </div>
        <div>
          <div style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-bottom: var(--space-xs);">모둠 수</div>
          <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-secondary);">👥 ${gc}모둠</div>
        </div>
      </div>
    `;
  }

  renderSettingsStudentList();
  loadDefaultGroupNames();
}

export function renderSettingsStudentList() {
  const container = document.getElementById('settings-class-list');
  if (!container) return;

  const cls = Store.getSelectedClass();
  if (!cls) {
    container.innerHTML =
      '<div style="text-align: center; color: var(--text-tertiary); padding: var(--space-lg); font-size: var(--font-size-sm);">학급 정보가 없습니다</div>';
    return;
  }

  const gc = cls.groupCount || cls.groups?.length || 6;

  const minRows = 6;
  let maxMembers = minRows;
  for (let i = 0; i < gc; i++) {
    const len = cls.groups && cls.groups[i] ? cls.groups[i].length : 0;
    if (len > maxMembers) maxMembers = len;
  }

  let headerCells = '';
  for (let i = 0; i < gc; i++) {
    const groupName = (cls.groupNames && cls.groupNames[i]) || `${i + 1}모둠`;
    headerCells += `<th>${UI.escapeHtml(groupName)}</th>`;
  }

  let bodyRows = '';
  for (let row = 0; row < maxMembers; row++) {
    let cells = '';
    for (let col = 0; col < gc; col++) {
      const members = (cls.groups && cls.groups[col]) || [];
      const member = members[row];
      if (member) {
        const name = typeof member === 'string' ? member : member.name;
        if (row === 0) {
          cells += `<td class="leader-cell"><span class="leader-badge">⭐</span>${UI.escapeHtml(name)}</td>`;
        } else {
          cells += `<td>${UI.escapeHtml(name)}</td>`;
        }
      } else {
        cells += '<td></td>';
      }
    }
    bodyRows += `<tr>${cells}</tr>`;
  }

  container.innerHTML = `
    <div class="timetable-scroll">
      <table class="timetable settings-timetable">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

export function loadDefaultGroupNames() {
  const container = document.getElementById('default-group-names-list');
  if (!container) return;

  const names = Store.getDefaultGroupNames();
  container.innerHTML = '';

  names.forEach((name, index) => {
    createPillInput(container, name, index);
  });
}

function createPillInput(container, value, index) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'pill-input';
  input.maxLength = 10;
  input.placeholder = `${index + 1}모둠`;
  input.value = value || '';
  input.dataset.idx = index;
  input.addEventListener('click', () => {
    input.classList.toggle('selected');
  });
  container.appendChild(input);
}

export function addDefaultGroupName() {
  const container = document.getElementById('default-group-names-list');
  if (!container) return;

  const current = container.querySelectorAll('.pill-input').length;
  if (current >= 8) {
    UI.showToast('최대 8개까지 추가할 수 있습니다', 'error');
    return;
  }

  createPillInput(container, '', current);
  container.lastElementChild?.focus();
}

export function removeDefaultGroupName() {
  const container = document.getElementById('default-group-names-list');
  if (!container) return;

  const selected = container.querySelectorAll('.pill-input.selected');
  if (selected.length === 0) {
    UI.showToast('삭제할 모둠을 먼저 선택하세요', 'info');
    return;
  }

  const total = container.querySelectorAll('.pill-input').length;
  if (total - selected.length < 2) {
    UI.showToast('최소 2개는 유지해야 합니다', 'error');
    return;
  }

  selected.forEach(el => el.remove());
}

export function saveDefaultGroupNamesHandler() {
  const container = document.getElementById('default-group-names-list');
  if (!container) return;

  const inputs = container.querySelectorAll('.pill-input');
  const names = [];

  inputs.forEach((input, index) => {
    const value = input.value.trim();
    names.push(value || `${index + 1}모둠`);
  });

  if (names.length === 0) {
    UI.showToast('최소 1개 이상의 모둠 이름을 입력하세요', 'error');
    return;
  }

  Store.saveDefaultGroupNames(names);
  UI.showToast('기본 모둠 이름 저장 완료', 'success');
}
