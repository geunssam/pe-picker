/**
 * 설정 페이지 UI
 */
import { Store } from '../shared/store.js';
import { UI } from '../shared/ui-utils.js';

export function onSettingsPageEnter() {
  const cls = Store.getSelectedClass();

  // 교사 이름 입력 필드
  const nameInput = document.getElementById('settings-teacher-name');
  if (nameInput) {
    const profile = Store.getTeacherProfile();
    nameInput.value = profile?.teacherName || '';
    // 중복 리스너 방지
    if (!nameInput._bound) {
      nameInput._bound = true;
      nameInput.addEventListener('change', () => {
        const newName = nameInput.value.trim();
        const p = Store.getTeacherProfile() || {};
        Store.saveTeacherProfile({ ...p, teacherName: newName });
        const el = document.getElementById('navbar-profile-name');
        if (el) el.textContent = newName;
        UI.showToast('이름이 변경되었습니다', 'success');
      });
    }
  }

  const infoContainer = document.getElementById('settings-current-class');
  if (infoContainer && cls) {
    const gc = cls.teamCount || cls.teams?.length || 6;
    infoContainer.innerHTML = `
      <div class="class-info-header">
        <div class="class-info-icon-wrap class-info-icon--name">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
        <div class="class-info-name">${UI.escapeHtml(cls.name)}</div>
      </div>
      <div class="class-info-stats">
        <div class="class-info-stat">
          <div class="class-info-icon-wrap class-info-icon--student">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="class-info-stat-value">${cls.students.length}</div>
          <div class="class-info-stat-label">학생</div>
        </div>
        <div class="class-info-stat">
          <div class="class-info-icon-wrap class-info-icon--team">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </div>
          <div class="class-info-stat-value">${gc}</div>
          <div class="class-info-stat-label">모둠</div>
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
