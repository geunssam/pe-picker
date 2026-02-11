/* ============================================
   PE Picker - Group Manager UI
   모둠뽑기 화면 렌더링
   ============================================ */

const GroupManagerUI = (() => {

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
      container.querySelectorAll('.gm-group-card').forEach(card => {
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

    const cards = container.querySelectorAll('.gm-group-card');

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
    const membersHTML = group.members.map(name =>
      `<span class="gm-member-tag">${name}</span>`
    ).join('');

    return `
      <div class="gm-group-card gm-color-${colorIdx}" data-group-id="${group.id}">
        <div class="gm-group-header">
          <span>${group.id}모둠 (${group.members.length}명)</span>
          <div class="gm-cookie-area">
            <button class="gm-cookie-btn" onclick="GroupManager.removeCookie(${group.id})">−</button>
            <span class="gm-cookie-count" id="gm-cookie-${group.id}">🍪 ${group.cookies || 0}</span>
            <button class="gm-cookie-btn" onclick="GroupManager.addCookie(${group.id})">+</button>
          </div>
        </div>
        <div class="gm-group-members">
          ${membersHTML}
        </div>
      </div>
    `;
  }

  // === 쿠키 디스플레이 업데이트 ===
  function updateCookieDisplay(groupId, count) {
    const el = document.getElementById(`gm-cookie-${groupId}`);
    if (el) {
      el.textContent = `🍪 ${count}`;
      el.classList.add('anim-cookie-bounce');
      setTimeout(() => el.classList.remove('anim-cookie-bounce'), 300);
    }
  }

  return {
    renderGroups,
    renderGroupsWithAnimation,
    updateCookieDisplay,
  };
})();
