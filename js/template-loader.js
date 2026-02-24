/* ============================================
   Template Loader — Vite ?raw import로 HTML 조각 조립
   ============================================ */

// ── Navbar ──
import navbarHtml from '../templates/navbar.html?raw';

// ── Pages ──
import dashboardHtml from './features/dashboard/dashboard.html?raw';
import classSelectorHtml from './features/class/class-selector.html?raw';
import tagGameHtml from './features/tag-game/tag-game.html?raw';
import groupManagerHtml from './features/group-manager/group-manager.html?raw';
import settingsHtml from './features/class/settings.html?raw';
import wizardHtml from './features/wizard/wizard.html?raw';
import badgeCollectionHtml from './features/badge/badge-collection.html?raw';

// ── Modals ──
import classRosterHtml from './features/class/class-roster-modal.html?raw';
import classTeamHtml from './features/class/class-team-modal.html?raw';
import classBulkHtml from './features/class/class-bulk-modal.html?raw';
import tagNumberHtml from './features/tag-game/tag-number-modal.html?raw';
import tagGenderHtml from './features/tag-game/tag-gender-modal.html?raw';
import manualInputHtml from './features/tag-game/manual-input-modal.html?raw';
import gmNumberHtml from './features/group-manager/gm-number-modal.html?raw';
import gmGenderHtml from './features/group-manager/gm-gender-modal.html?raw';
import overflowHtml from './features/group-manager/overflow-modal.html?raw';
import shortageHtml from './features/group-manager/shortage-modal.html?raw';
import emptyStudentsHtml from './features/class/empty-students-modal.html?raw';
import badgeAwardHtml from './features/badge/badge-award-modal.html?raw';
import consentHtml from './features/auth/consent-modal.html?raw';

// ── Whistle FAB ──
import whistleFabHtml from './features/tools/whistle-fab.html?raw';

// ── Timer FAB ──
import timerFabHtml from './features/tools/timer-fab.html?raw';

// ── Right Toolbar ──
import rightToolbarHtml from './features/tools/right-toolbar.html?raw';

// ── Left Drawer ──
import leftDrawerHtml from './features/tools/left-drawer.html?raw';

// ── Footer ──
import footerHtml from '../templates/footer.html?raw';

// ── Assets (Vite가 해시 경로로 변환) ──
import logoUrl from '../assets/logo.png';

/** raw HTML 내 에셋 경로를 Vite 빌드 경로로 치환 */
function resolveAssets(html) {
  return html.replaceAll('assets/logo.png', logoUrl);
}

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
  toast.insertAdjacentHTML('beforebegin', resolveAssets(navbarHtml));

  // 2. Pages — .app-container 내부에 삽입
  const appContainer = document.querySelector('.app-container');
  appContainer.innerHTML = resolveAssets(
    dashboardHtml +
      classSelectorHtml +
      tagGameHtml +
      groupManagerHtml +
      badgeCollectionHtml +
      settingsHtml +
      wizardHtml
  );

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
    gmGenderHtml +
    badgeAwardHtml +
    consentHtml;
  appContainer.insertAdjacentHTML('afterend', modalsHtml);

  // 4. Whistle Panel — body 끝에 삽입
  document.body.insertAdjacentHTML('beforeend', whistleFabHtml);

  // 5. Timer Panel — body 끝에 삽입
  document.body.insertAdjacentHTML('beforeend', timerFabHtml);

  // 6. Right Toolbar — body 끝에 삽입
  document.body.insertAdjacentHTML('beforeend', rightToolbarHtml);

  // 7. Left Drawer + Overlay — body 끝에 삽입
  document.body.insertAdjacentHTML('beforeend', resolveAssets(leftDrawerHtml));

  // 8. Footer — app-container 안쪽 끝에 삽입
  appContainer.insertAdjacentHTML('beforeend', footerHtml);
}
