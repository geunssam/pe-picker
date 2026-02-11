/* ============================================
   PE Picker - App (라우터 + 초기화)
   해시 기반 SPA 라우터
   ============================================ */

const App = (() => {
  const ROUTES = {
    'tag-game': { label: '술래뽑기', icon: '🎯' },
    'group-manager': { label: '모둠뽑기', icon: '👥' },
    'settings': { label: '설정', icon: '⚙️' },
  };

  const DEFAULT_ROUTE = 'tag-game';

  let currentRoute = null;

  function init() {
    // 레거시 데이터 마이그레이션
    Store.migrateFromLegacy();

    // 라우트 이벤트
    window.addEventListener('hashchange', handleRouteChange);

    // Dock 버튼 이벤트
    document.querySelectorAll('.navbar-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const route = btn.dataset.route;
        if (route) navigateTo(route);
      });
    });

    // 초기 라우트 (직접 활성화 — 해시가 동일하면 hashchange가 안 발생하므로)
    const hash = window.location.hash.replace('#', '') || DEFAULT_ROUTE;
    activateRoute(hash);

    // 각 모듈 초기화
    if (typeof ClassManager !== 'undefined') ClassManager.init();
    if (typeof TagGame !== 'undefined') TagGame.init();
    if (typeof GroupManager !== 'undefined') GroupManager.init();
  }

  function navigateTo(route) {
    if (!ROUTES[route]) route = DEFAULT_ROUTE;
    window.location.hash = route;
  }

  function handleRouteChange() {
    const route = window.location.hash.replace('#', '') || DEFAULT_ROUTE;
    if (route === currentRoute) return;
    activateRoute(route);
  }

  function activateRoute(route) {
    if (!ROUTES[route]) route = DEFAULT_ROUTE;
    currentRoute = route;

    // 페이지 전환
    document.querySelectorAll('.page-view').forEach(page => {
      page.classList.remove('active');
    });
    const targetPage = document.getElementById(`page-${route}`);
    if (targetPage) {
      targetPage.classList.add('active');
    }

    // Dock 활성 상태
    document.querySelectorAll('.navbar-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.route === route);
    });

    // 페이지 진입 콜백
    if (route === 'tag-game' && typeof TagGame !== 'undefined') {
      TagGame.onPageEnter();
    } else if (route === 'group-manager' && typeof GroupManager !== 'undefined') {
      GroupManager.onPageEnter();
    }
  }

  function getCurrentRoute() {
    return currentRoute;
  }

  return { init, navigateTo, getCurrentRoute };
})();

// DOM Ready
document.addEventListener('DOMContentLoaded', () => App.init());
