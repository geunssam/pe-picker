/**
 * 학급 선택 랜딩 페이지
 */
import { Store } from '../shared/store.js';
import { UI } from '../shared/ui-utils.js';
import { Icons } from '../shared/icons.js';
import { deleteClassFromFirestore } from './class-firestore.js';

export function renderLandingClassList() {
  const container = document.getElementById('landing-class-list');
  if (!container) return;

  const classes = Store.getClasses();

  if (classes.length === 0) {
    container.innerHTML = `
      <div class="landing-empty">
        <div class="landing-empty-icon">${Icons.book(32)}</div>
        <div>등록된 학급이 없습니다</div>
        <div style="margin-top: var(--space-xs);">아래 버튼으로 첫 학급을 만들어보세요!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = classes
    .map(cls => {
      const gc = cls.teamCount || cls.teams?.length || 6;
      return `
        <div class="landing-class-card" onclick="App.onClassSelected('${cls.id}')">
          <div class="landing-card-info">
            <div class="landing-card-name">${UI.escapeHtml(cls.name)}</div>
            <div class="landing-card-meta">
              <span>${Icons.user(14)} ${cls.students.length}명</span>
              <span>${Icons.users(14)} ${gc}모둠</span>
            </div>
          </div>
          <div class="landing-card-actions" onclick="event.stopPropagation();">
            <button class="btn btn-sm btn-secondary" onclick="ClassManager.openRosterModal('${cls.id}', ClassManager.renderLandingClassList)">편집</button>
            <button class="btn btn-sm btn-primary" onclick="ClassManager.openTeamModal('${cls.id}', ClassManager.renderLandingClassList)">모둠</button>
            <button class="btn btn-sm btn-danger" onclick="ClassManager.deleteClass('${cls.id}')">삭제</button>
          </div>
        </div>
      `;
    })
    .join('');
}

export async function deleteClass(id) {
  const cls = Store.getClassById(id);
  if (!cls) return;
  if (!confirm(`"${cls.name}"을(를) 삭제하시겠습니까?`)) return;

  const selectedWasDeleted = Store.getSelectedClassId() === id;

  if (selectedWasDeleted) {
    Store.clearSelectedClass();
  }

  Store.deleteClass(id);
  deleteClassFromFirestore(id).catch(error => {
    console.warn('[ClassManager] Firestore 클래스 삭제 동기화 실패:', error);
  });
  UI.showToast('학급 삭제 완료', 'success');
  renderLandingClassList();
  refreshAllSelects();
}

export function refreshAllSelects() {
  const select = document.getElementById('gm-class-name-select');
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

  if (current) select.value = current;
}
