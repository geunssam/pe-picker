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
import badgeCollectionHtml from '../templates/pages/badge-collection.html?raw';

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
import badgeAwardHtml from '../templates/modals/badge-award.html?raw';
import consentHtml from '../templates/modals/consent.html?raw';

// ── Whistle FAB ──
import whistleFabHtml from '../templates/whistle-fab.html?raw';

// ── Timer FAB ──
import timerFabHtml from '../templates/timer-fab.html?raw';

// ── Right Toolbar ──
import rightToolbarHtml from '../templates/right-toolbar.html?raw';

// ── Left Drawer ──
import leftDrawerHtml from '../templates/left-drawer.html?raw';

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

  // 8. Footer — app-container 뒤에 삽입
  appContainer.insertAdjacentHTML('afterend', footerHtml);
}
