/* ============================================
   PE Picker - App (라우터 + 초기화)
   해시 기반 SPA 라우터 v2
   랜딩(학급 선택) → 학급 내부(술래뽑기/모둠뽑기/학급관리)
   ============================================ */

const App = (() => {
  const ROUTES = {
    'class-selector': { label: '학급 선택', icon: '🏠', requiresClass: false },
    'tag-game':       { label: '술래뽑기',  icon: '🎯', requiresClass: true },
    'group-manager':  { label: '모둠뽑기',  icon: '👥', requiresClass: true },
    'settings':       { label: '설정',      icon: '⚙️', requiresClass: true },
  };

  const DEFAULT_ROUTE = 'class-selector';
  const DEFAULT_INNER_ROUTE = 'tag-game';

  let currentRoute = null;

  function init() {
    // 인증 체크 (AuthManager가 정의되어 있으면)
    if (typeof AuthManager !== 'undefined') {
      AuthManager.init();

      // 로그인되지 않았으면 로그인 페이지로
      if (!AuthManager.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
      }
    }

    // 레거시 데이터 마이그레이션
    Store.migrateFromLegacy();

    // 온보딩 체크 (로컬/Google 모두 적용, 단 기존 학급이 있으면 스킵)
    const classes = Store.getClasses();
    if (classes.length === 0 && !Store.isTeacherOnboarded()) {
      window.location.href = 'wizard.html';
      return;
    }

    // 라우트 이벤트
    window.addEventListener('hashchange', handleRouteChange);

    // Dock 버튼 이벤트
    document.querySelectorAll('.navbar-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const route = btn.dataset.route;
        if (route) navigateTo(route);
      });
    });

    // 뒤로가기 버튼
    const backBtn = document.getElementById('navbar-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', goBackToLanding);
    }

    // 로그아웃 버튼
    const logoutBtn = document.getElementById('navbar-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('로그아웃 하시겠습니까?')) {
          if (typeof AuthManager !== 'undefined') {
            AuthManager.logout();
          } else {
            goBackToLanding();
          }
        }
      });
    }

    // 초기 라우트 결정
    const hash = window.location.hash.replace('#', '');
    const selectedClass = Store.getSelectedClass();

    if (hash && ROUTES[hash]) {
      // 해시가 있으면 그 라우트로
      if (ROUTES[hash].requiresClass && !selectedClass) {
        // 학급이 필요한데 선택 안 됨 → 랜딩으로
        activateRoute(DEFAULT_ROUTE);
      } else {
        activateRoute(hash);
      }
    } else if (selectedClass) {
      // 해시 없지만 학급이 선택되어 있으면 → 술래뽑기로
      activateRoute(DEFAULT_INNER_ROUTE);
    } else {
      // 아무것도 없으면 랜딩
      activateRoute(DEFAULT_ROUTE);
    }

    // 각 모듈 초기화
    if (typeof ClassManager !== 'undefined') ClassManager.init();
    if (typeof TagGame !== 'undefined') TagGame.init();
    if (typeof GroupManager !== 'undefined') GroupManager.init();
  }

  function navigateTo(route) {
    if (!ROUTES[route]) route = DEFAULT_ROUTE;

    // 라우트 가드: 학급 필요한 페이지인데 미선택
    if (ROUTES[route].requiresClass && !Store.getSelectedClass()) {
      route = DEFAULT_ROUTE;
    }

    window.location.hash = route;
  }

  function handleRouteChange() {
    const route = window.location.hash.replace('#', '') || DEFAULT_ROUTE;
    if (route === currentRoute) return;
    activateRoute(route);
  }

  function activateRoute(route) {
    if (!ROUTES[route]) route = DEFAULT_ROUTE;

    // 라우트 가드
    if (ROUTES[route].requiresClass && !Store.getSelectedClass()) {
      route = DEFAULT_ROUTE;
    }

    currentRoute = route;

    // 해시 동기화
    if (window.location.hash !== '#' + route) {
      window.location.hash = route;
    }

    const navbar = document.getElementById('top-navbar');
    const container = document.querySelector('.app-container');

    if (route === 'class-selector') {
      // 랜딩: 네비바 숨기기
      if (navbar) navbar.style.display = 'none';
      if (container) container.classList.add('no-navbar');

      // 랜딩 페이지 렌더링
      if (typeof ClassManager !== 'undefined') {
        ClassManager.renderLandingClassList();
      }
    } else {
      // 학급 내부: 네비바 표시 + 학급명 세팅
      if (navbar) navbar.style.display = '';
      if (container) container.classList.remove('no-navbar');

      const cls = Store.getSelectedClass();
      const nameEl = document.getElementById('navbar-class-name');
      if (nameEl && cls) {
        nameEl.textContent = cls.name;
      }
    }

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
    } else if (route === 'settings' && typeof ClassManager !== 'undefined') {
      ClassManager.onSettingsPageEnter();
    }
  }

  function onClassSelected(classId) {
    Store.setSelectedClassId(classId);
    navigateTo(DEFAULT_INNER_ROUTE);
  }

  function goBackToLanding() {
    Store.clearSelectedClass();
    navigateTo(DEFAULT_ROUTE);
  }

  function getCurrentRoute() {
    return currentRoute;
  }

  return { init, navigateTo, getCurrentRoute, onClassSelected, goBackToLanding };
})();

// DOM Ready
document.addEventListener('DOMContentLoaded', () => App.init());
