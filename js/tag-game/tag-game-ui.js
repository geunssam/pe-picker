/* ============================================
   PE Picker - Tag Game UI
   술래뽑기 화면 렌더링 (원본 display 함수 이식)
   ============================================ */

const TagGameUI = (() => {

  // === 결과 카드 렌더 (원본 displayResults) ===
  function renderResultCards(its, angels) {
    const container = document.getElementById('tag-result-container');
    if (!container) return;

    let html = '';

    if (its.length > 0) {
      html += `
        <div class="tag-result-card">
          <div class="result-role role-it">🏃 술래</div>
          <div class="result-names">
            ${its.map((name, i) =>
              `<span class="result-name name-it" style="animation-delay: ${i * 0.1}s">🏃‍♂️ ${UI.escapeHtml(name)}</span>`
            ).join('')}
          </div>
        </div>
      `;
    }

    if (angels.length > 0) {
      html += `
        <div class="tag-result-card">
          <div class="result-role role-angel">😇 천사</div>
          <div class="result-names">
            ${angels.map((name, i) =>
              `<span class="result-name name-angel" style="animation-delay: ${i * 0.1}s">😇 ${UI.escapeHtml(name)}</span>`
            ).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  // === 후보자 표시 (원본 showCollapsibleCandidates) ===
  function renderCandidates(type, candidates) {
    const containerId = type === 'it' ? 'tag-next-its' : 'tag-next-angels';
    const countId = type === 'it' ? 'tag-next-its-count' : 'tag-next-angels-count';
    const container = document.getElementById(containerId);
    const countEl = document.getElementById(countId);

    if (countEl) countEl.textContent = candidates.length;
    if (!container) return;

    if (candidates.length === 0) {
      container.innerHTML = `<span style="font-size: var(--font-size-xs); color: var(--text-tertiary);">모든 후보를 사용했습니다</span>`;
      return;
    }

    container.innerHTML = candidates.map(name =>
      `<span class="tag-candidate-tag type-${type}">${UI.escapeHtml(name)}</span>`
    ).join('');
  }

  // === 이력 표시 (원본 showCollapsibleHistory) ===
  function renderHistory(type, history) {
    const containerId = type === 'it' ? 'tag-history-its' : 'tag-history-angels';
    const countId = type === 'it' ? 'tag-history-its-count' : 'tag-history-angels-count';
    const container = document.getElementById(containerId);
    const countEl = document.getElementById(countId);

    if (countEl) countEl.textContent = history.length;
    if (!container) return;

    if (history.length === 0) {
      container.innerHTML = `<span style="font-size: var(--font-size-xs); color: var(--text-tertiary);">아직 이력이 없습니다</span>`;
      return;
    }

    container.innerHTML = history.map(name =>
      `<span class="tag-candidate-tag type-history">${UI.escapeHtml(name)}</span>`
    ).join('');
  }

  return { renderResultCards, renderCandidates, renderHistory };
})();
