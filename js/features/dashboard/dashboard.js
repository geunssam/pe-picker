/* ============================================
   PE Picker - Dashboard (홈 대시보드)
   학급 정보 요약 / 모둠 표 / 온도계 / 배지 랭킹
   ============================================ */

import { Store } from '../../shared/store.js';
import { UI } from '../../shared/ui-utils.js';
import { Icons } from '../../shared/icons.js';
import { BADGE_TYPES, BADGE_KEYS } from '../badge/badge-config.js';
import './dashboard.css';

function init() {
  // 이벤트 바인딩 필요 시 추가
}

function onPageEnter() {
  const cls = Store.getSelectedClass();
  if (!cls) return;

  renderClassInfo(cls);
  renderTeamTable(cls);
  renderThermometer(cls);
  renderBadgeRanking(cls);
}

// === 섹션 1: 학급 정보 요약 ===
function renderClassInfo(cls) {
  const el = document.getElementById('dash-class-info');
  if (!el) return;

  const namedCount = cls.students.filter(s =>
    (typeof s === 'string' ? s : s.name || '').trim()
  ).length;
  const gc = cls.teamCount || cls.teams?.length || 0;
  const totalBadges = Store.getClassTotalBadges(cls.id);

  el.innerHTML = `
    <div class="dash-info-cards">
      <div class="dash-info-card">
        <div class="dash-info-icon dash-info-icon--student">
          ${Icons.users(22)}
        </div>
        <div class="dash-info-value">${namedCount}</div>
        <div class="dash-info-label">학생</div>
      </div>
      <div class="dash-info-card">
        <div class="dash-info-icon dash-info-icon--team">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        </div>
        <div class="dash-info-value">${gc}</div>
        <div class="dash-info-label">모둠</div>
      </div>
      <div class="dash-info-card">
        <div class="dash-info-icon dash-info-icon--badge">
          ${Icons.medal(22)}
        </div>
        <div class="dash-info-value">${totalBadges}</div>
        <div class="dash-info-label">배지</div>
      </div>
    </div>
  `;
}

// === 섹션 2: 모둠 표 ===
function renderTeamTable(cls) {
  const el = document.getElementById('dash-team-table');
  if (!el) return;

  const gc = cls.teamCount || cls.teams?.length || 0;
  const hasTeams = Array.isArray(cls.teams) && cls.teams.some(t => t && t.length > 0);

  if (!hasTeams) {
    el.innerHTML = `
      <div class="dash-section-header">
        <span class="dash-section-title">${Icons.users(16)} 모둠 현황</span>
      </div>
      <div class="dash-empty">
        <div class="dash-empty-icon">${Icons.users(28)}</div>
        <div>모둠이 아직 설정되지 않았습니다</div>
      </div>
    `;
    return;
  }

  let maxMembers = 0;
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
          cells += `<td class="leader-cell"><span class="leader-badge">${Icons.star(12)}</span>${UI.escapeHtml(name)}</td>`;
        } else {
          cells += `<td>${UI.escapeHtml(name)}</td>`;
        }
      } else {
        cells += '<td></td>';
      }
    }
    bodyRows += `<tr>${cells}</tr>`;
  }

  el.innerHTML = `
    <div class="dash-section-header">
      <span class="dash-section-title">${Icons.users(16)} 모둠 현황</span>
    </div>
    <div class="timetable-scroll">
      <table class="timetable settings-timetable">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

// === 섹션 3: 학급 온도계 ===
function renderThermometer(cls) {
  const el = document.getElementById('dash-thermometer');
  if (!el) return;

  const settings = Store.getThermostatSettings(cls.id);
  const totalBadges = Store.getClassTotalBadges(cls.id);
  const temp = Math.min(100, Math.round((totalBadges / settings.targetBadges) * 100));

  // 마일스톤 중 달성/미달성 구분
  const sorted = [...(settings.milestones || [])].sort((a, b) => a.temp - b.temp);
  const nextMilestone = sorted.find(ms => ms.temp > temp);

  // 온도에 따른 바 색상
  let barColor = 'var(--color-primary)';
  if (temp >= 80) barColor = 'var(--color-danger)';
  else if (temp >= 50) barColor = 'var(--color-warning-dark)';
  else if (temp >= 20) barColor = 'var(--color-success)';

  const milestoneHtml = sorted
    .map(ms => {
      const achieved = temp >= ms.temp;
      return `<div class="dash-ms-item${achieved ? ' achieved' : ''}">
        <span class="dash-ms-check">${achieved ? Icons.check(14) : ''}</span>
        <span class="dash-ms-temp">${ms.temp}°C</span>
        <span class="dash-ms-reward">${UI.escapeHtml(ms.reward)}</span>
      </div>`;
    })
    .join('');

  el.innerHTML = `
    <div class="dash-section-header">
      <span class="dash-section-title">${Icons.thermometer(16)} 학급 온도계</span>
      <span class="dash-thermo-temp">${temp}°C</span>
    </div>
    <div class="dash-thermo-bar-wrap">
      <div class="dash-thermo-bar">
        <div class="dash-thermo-fill" style="width: ${temp}%; background: ${barColor}"></div>
      </div>
      <div class="dash-thermo-label">${totalBadges} / ${settings.targetBadges}개</div>
    </div>
    ${nextMilestone ? `<div class="dash-thermo-next">다음 목표: <strong>${nextMilestone.temp}°C</strong> — ${UI.escapeHtml(nextMilestone.reward)}</div>` : ''}
    ${sorted.length > 0 ? `<div class="dash-ms-list">${milestoneHtml}</div>` : ''}
  `;
}

// === 섹션 4: 인성배지 랭킹 ===
function renderBadgeRanking(cls) {
  const el = document.getElementById('dash-badge-ranking');
  if (!el) return;

  const ranking = Store.getStudentRanking(cls.id, 5);

  // 배지 타입별 통계
  const counts = Store.getClassBadgeCounts(cls.id);
  const badgeSummary = BADGE_KEYS.filter(key => (counts[key] || 0) > 0)
    .map(key => {
      const badge = BADGE_TYPES[key];
      return `<span class="dash-badge-chip">
        <img src="${badge.image}" alt="${badge.name}" class="dash-badge-chip-img" />
        <span>${counts[key]}</span>
      </span>`;
    })
    .join('');

  if (ranking.length === 0) {
    el.innerHTML = `
      <div class="dash-section-header">
        <span class="dash-section-title">${Icons.trophy(16)} 배지 랭킹</span>
      </div>
      <div class="dash-empty">
        <div class="dash-empty-icon">${Icons.medal(28)}</div>
        <div>아직 배지가 없습니다</div>
      </div>
    `;
    return;
  }

  const medalClasses = ['dash-medal--gold', 'dash-medal--silver', 'dash-medal--bronze'];
  const rankingHtml = ranking
    .map((r, i) => {
      const rankDisplay =
        i < 3
          ? `<span class="dash-medal ${medalClasses[i]}">${i + 1}</span>`
          : `<span class="dash-rank-num">${i + 1}</span>`;
      return `<div class="dash-ranking-item">
        ${rankDisplay}
        <span class="dash-rank-name">${UI.escapeHtml(r.studentName)}</span>
        <span class="dash-rank-count">${r.count}개</span>
      </div>`;
    })
    .join('');

  el.innerHTML = `
    <div class="dash-section-header">
      <span class="dash-section-title">${Icons.trophy(16)} 배지 랭킹</span>
    </div>
    ${badgeSummary ? `<div class="dash-badge-chips">${badgeSummary}</div>` : ''}
    <div class="dash-ranking-list">${rankingHtml}</div>
  `;
}

export const DashboardManager = {
  init,
  onPageEnter,
};
