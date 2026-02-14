/**
 * 학급 선택 랜딩 페이지
 */
import { Store } from '../shared/store.js';
import { UI } from '../shared/ui-utils.js';
import { deleteClassFromFirestore } from './class-firestore.js';

export function renderLandingClassList() {
  const container = document.getElementById('landing-class-list');
  if (!container) return;

  const classes = Store.getClasses();

  if (classes.length === 0) {
    container.innerHTML = `
      <div class="landing-empty">
        <div class="landing-empty-icon">📚</div>
        <div>등록된 학급이 없습니다</div>
        <div style="margin-top: var(--space-xs);">아래 버튼으로 첫 학급을 만들어보세요!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = classes
    .map(cls => {
      const gc = cls.groupCount || cls.groups?.length || 6;
      return `
        <div class="landing-class-card" onclick="App.onClassSelected('${cls.id}')">
          <div class="landing-card-info">
            <div class="landing-card-name">${UI.escapeHtml(cls.name)}</div>
            <div class="landing-card-meta">
              <span>👤 ${cls.students.length}명</span>
              <span>👥 ${gc}모둠</span>
            </div>
          </div>
          <div class="landing-card-actions" onclick="event.stopPropagation();">
            <button class="btn btn-sm btn-secondary" onclick="ClassManager.openModal('${cls.id}', ClassManager.renderLandingClassList)">편집</button>
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

  try {
    await deleteClassFromFirestore(id, selectedWasDeleted);
  } catch (error) {
    console.error('❌ Firestore 학급 삭제 실패:', error);
    UI.showToast('클라우드 삭제에 실패했습니다. 다시 시도해주세요.', 'error');
    return;
  }

  if (selectedWasDeleted) {
    Store.clearSelectedClass();
  }

  Store.deleteClass(id);
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
