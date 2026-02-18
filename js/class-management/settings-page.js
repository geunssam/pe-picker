/**
 * 설정 페이지 UI
 */
import { Store } from '../shared/store.js';
import { UI } from '../shared/ui-utils.js';

export function onSettingsPageEnter() {
  const cls = Store.getSelectedClass();

  const infoContainer = document.getElementById('settings-current-class');
  if (infoContainer && cls) {
    const gc = cls.teamCount || cls.teams?.length || 6;
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
  renderSettingsTeamTable();
}

export function renderSettingsStudentList() {
  const container = document.getElementById('settings-class-list');
  if (!container) return;

  const cls = Store.getSelectedClass();
  if (!cls || !Array.isArray(cls.students) || cls.students.length === 0) {
    container.innerHTML = `
      <div class="settings-student-grid">
        <div class="settings-student-empty">
          <div class="settings-student-empty-icon">📝</div>
          <div>학생을 등록해주세요</div>
          <div style="margin-top: var(--space-xs); font-size: var(--font-size-xs);">
            위의 편집 버튼을 눌러 학생을 추가할 수 있습니다
          </div>
        </div>
      </div>
    `;
    return;
  }

  const cards = cls.students.map(s => {
    const name = typeof s === 'string' ? s : s.name || '';
    const number = typeof s === 'object' ? s.number || '' : '';
    const gender = typeof s === 'object' ? s.gender || '' : '';
    const genderClass =
      gender === 'male' ? ' gender-male' : gender === 'female' ? ' gender-female' : '';
    return `<div class="tag-student-card${genderClass}">
      <span>${number ? number + '. ' : ''}${UI.escapeHtml(name)}</span>
    </div>`;
  });

  container.innerHTML = `
    <div class="settings-student-grid">${cards.join('')}</div>
  `;
}

export function renderSettingsTeamTable() {
  const container = document.getElementById('settings-team-list');
  if (!container) return;

  const cls = Store.getSelectedClass();
  if (!cls) {
    container.innerHTML =
      '<div style="text-align:center;color:var(--text-tertiary);padding:var(--space-lg);font-size:var(--font-size-sm);">학급 정보가 없습니다</div>';
    return;
  }

  const gc = cls.teamCount || cls.teams?.length || 6;
  const hasTeams = Array.isArray(cls.teams) && cls.teams.some(t => t && t.length > 0);

  if (!hasTeams) {
    container.innerHTML = `
      <div style="text-align:center;color:var(--text-tertiary);padding:var(--space-xl);font-size:var(--font-size-sm);">
        <div style="font-size:36px;margin-bottom:var(--space-sm);opacity:0.5;">👥</div>
        <div>모둠이 아직 설정되지 않았습니다</div>
        <div style="margin-top:var(--space-xs);font-size:var(--font-size-xs);">
          모둠 편집 버튼을 눌러 학생을 모둠에 배정하세요
        </div>
      </div>
    `;
    return;
  }

  let maxMembers = 3;
  for (let i = 0; i < gc; i++) {
    const len = cls.teams[i] ? cls.teams[i].length : 0;
    if (len > maxMembers) maxMembers = len;
  }

  let headerCells = '';
  for (let i = 0; i < gc; i++) {
    const teamName = (cls.teamNames && cls.teamNames[i]) || `${i + 1}모둠`;
    headerCells += `<th>${UI.escapeHtml(teamName)}</th>`;
  }

  let bodyRows = '';
  for (let row = 0; row < maxMembers; row++) {
    let cells = '';
    for (let col = 0; col < gc; col++) {
      const members = (cls.teams && cls.teams[col]) || [];
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
