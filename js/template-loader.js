/* ============================================
   Template Loader — Vite ?raw import로 HTML 조각 조립
   ============================================ */

// ── Navbar ──
import navbarHtml from '../templates/navbar.html?raw';

// ── Pages ──
import classSelectorHtml from '../templates/pages/class-selector.html?raw';
import tagGameHtml from '../templates/pages/tag-game.html?raw';
import groupManagerHtml from '../templates/pages/group-manager.html?raw';
import settingsHtml from '../templates/pages/settings.html?raw';
import wizardHtml from '../templates/pages/wizard.html?raw';

// ── Modals ──
import classRosterHtml from '../templates/modals/class-roster.html?raw';
import classTeamHtml from '../templates/modals/class-team.html?raw';
import classBulkHtml from '../templates/modals/class-bulk.html?raw';
import tagNumberHtml from '../templates/modals/tag-number.html?raw';
import tagGenderHtml from '../templates/modals/tag-gender.html?raw';
import manualInputHtml from '../templates/modals/manual-input.html?raw';
import gmNumberHtml from '../templates/modals/gm-number.html?raw';
import gmGenderHtml from '../templates/modals/gm-gender.html?raw';
import overflowHtml from '../templates/modals/overflow.html?raw';
import shortageHtml from '../templates/modals/shortage.html?raw';
import emptyStudentsHtml from '../templates/modals/empty-students.html?raw';

// ── Whistle FAB ──
import whistleFabHtml from '../templates/whistle-fab.html?raw';

/**
 * 모든 HTML 템플릿을 DOM에 삽입한다.
 * app.js init() 최상단에서 호출해야 getElementById가 정상 동작한다.
 *
 * 삽입 순서:
 *   1. navbar  → toast-container 바로 앞
 *   2. pages   → .app-container 내부
 *   3. modals  → .app-container 바로 뒤
 *   4. whistle → modals 뒤 (scripts 앞)
 */
export function mountTemplates() {
  // 1. Navbar — toast-container 앞에 삽입
  const toast = document.getElementById('toast-container');
  toast.insertAdjacentHTML('beforebegin', navbarHtml);

  // 2. Pages — .app-container 내부에 삽입
  const appContainer = document.querySelector('.app-container');
  appContainer.innerHTML =
    classSelectorHtml + tagGameHtml + groupManagerHtml + settingsHtml + wizardHtml;

  // 3. Modals — .app-container 바로 뒤에 삽입
  const modalsHtml =
    classRosterHtml +
    classTeamHtml +
    classBulkHtml +
    overflowHtml +
    shortageHtml +
    tagNumberHtml +
    tagGenderHtml +
    manualInputHtml +
    emptyStudentsHtml +
    gmNumberHtml +
    gmGenderHtml;
  appContainer.insertAdjacentHTML('afterend', modalsHtml);

  // 4. Whistle FAB — body 끝 (scripts 앞)
  const scriptTag = document.querySelector('script[src*="app.js"]');
  scriptTag.insertAdjacentHTML('beforebegin', whistleFabHtml);
}
