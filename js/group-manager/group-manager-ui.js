/* ============================================
   PE Picker - Group Manager UI
   모둠뽑기 화면 렌더링
   ============================================ */

import { UI } from '../shared/ui-utils.js';

// === 모둠 카드 렌더링 (즉시) ===
function renderGroups(groups, animate = false) {
  const container = document.getElementById('gm-groups-container');
  if (!container) return;

  if (groups.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = groups.map(group => createGroupCardHTML(group)).join('');

  if (!animate) {
    // 즉시 표시
    container.querySelectorAll('.gm-team-card').forEach(card => {
      card.classList.add('revealed');
    });
    container.querySelectorAll('.gm-member-tag').forEach(tag => {
      tag.classList.add('revealed');
    });
  }
}

// === 애니메이션 렌더링 ===
async function renderGroupsWithAnimation(groups) {
  const container = document.getElementById('gm-groups-container');
  if (!container) return;

  container.innerHTML = groups.map(group => createGroupCardHTML(group)).join('');

  const cards = container.querySelectorAll('.gm-team-card');

  for (let i = 0; i < cards.length; i++) {
    await UI.sleep(120);
    cards[i].classList.add('revealed');

    // 멤버 태그 순차 표시
    const tags = cards[i].querySelectorAll('.gm-member-tag');
    for (let j = 0; j < tags.length; j++) {
      await UI.sleep(60);
      tags[j].classList.add('revealed');
    }
  }
}

// === 카드 HTML 생성 ===
function createGroupCardHTML(group) {
  const colorIdx = ((group.id - 1) % 8) + 1;
  const groupName = group.name || `${group.id}모둠`;
  const membersHTML = group.members
    .map(name => `<span class="gm-member-tag">${UI.escapeHtml(name)}</span>`)
    .join('');

  return `
    <div class="gm-team-card gm-color-${colorIdx}" data-group-id="${group.id}">
      <div class="gm-team-header">
        <span>${UI.escapeHtml(groupName)} (${group.members.length}명)</span>
        <button class="gm-badge-btn" onclick="GroupManager.openBadgeForGroup(${group.id})">🏅 배지</button>
      </div>
      <div class="gm-team-members">
        ${membersHTML}
      </div>
    </div>
  `;
}

export const GroupManagerUI = {
  renderGroups,
  renderGroupsWithAnimation,
};
