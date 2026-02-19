/* ============================================
   PE Picker - App (라우터 + 초기화)
   ============================================ */

import { mountTemplates } from './template-loader.js';
import { Store } from './shared/store.js';
import { AuthManager } from './auth-manager.js';
import { FirestoreSync } from './firestore-sync.js';
import { ClassManager } from './class-management/index.js';
import { TagGame } from './tag-game/tag-game.js';
import { GroupManager } from './group-manager/group-manager.js';
import { WizardManager } from './wizard.js';
import { Whistle } from './shared/whistle.js';
import { QuickTimer } from './shared/quick-timer.js';
import { Toolbar } from './shared/toolbar.js';
import { BadgeManager } from './badge-manager/badge-manager.js';
import { BadgeCollectionUI } from './badge-manager/badge-collection-ui.js';

const ROUTES = {
  wizard: { label: '학급 설정', requiresClass: false },
  'class-selector': { label: '학급 선택', requiresClass: false },
  'tag-game': { label: '술래뽑기', requiresClass: true },
  'group-manager': { label: '모둠뽑기', requiresClass: true },
  'badge-collection': { label: '배지도감', requiresClass: true },
  settings: { label: '설정', requiresClass: true },
};

const DEFAULT_ROUTE = 'class-selector';
const DEFAULT_INNER_ROUTE = 'tag-game';

let currentRoute = null;
let isBootstrapped = false;

function init() {
  mountTemplates();
  Store.migrateFromLegacy();
  AuthManager.init(onAuthStateChanged);
  window.addEventListener('pet-data-updated', onStoreDataUpdated);
}

function onStoreDataUpdated() {
  if (currentRoute === 'class-selector') {
    ClassManager.renderLandingClassList();
  } else if (currentRoute === 'settings') {
    ClassManager.onSettingsPageEnter();
  } else if (currentRoute === 'tag-game') {
    TagGame.onPageEnter();
  } else if (currentRoute === 'group-manager') {
    GroupManager.onPageEnter();
  } else if (currentRoute === 'badge-collection') {
    BadgeCollectionUI.onPageEnter();
  }

  // 내비게이션 바 학급 이름 갱신
  const cls = Store.getSelectedClass();
  const nameEl = document.getElementById('navbar-class-name');
  if (nameEl && cls) {
    nameEl.textContent = cls.name;
  }
}

function onAuthStateChanged() {
  const user = AuthManager.getCurrentUser();
  if (!user) {
    if (!isLoginPage()) {
      window.location.replace('login.html');
    }
    return;
  }

  bootstrapAfterAuth();
}

function isLoginPage() {
  return (
    window.location.pathname.endsWith('/login.html') ||
    window.location.pathname.endsWith('login.html')
  );
}

async function bootstrapAfterAuth() {
  if (isBootstrapped) return;
  isBootstrapped = true;

  try {
    await FirestoreSync.init();
  } catch (error) {
    console.warn('[App] Firestore sync failed:', error);
  }

  hideStartupSplash();

  // 프로필 이름 + 이미지 세팅
  const user = AuthManager.getCurrentUser();
  const profileNameEl = document.getElementById('navbar-profile-name');
  const profileImg = document.getElementById('navbar-profile-img');

  if (profileNameEl) {
    const teacher = Store.getTeacherProfile();
    const teacherName = teacher?.teacherName;
    // 위저드 이름이 없거나 기본값이면 구글 프로필명 사용
    const name =
      teacherName && teacherName !== '체육 선생님' ? teacherName : user?.displayName || '';
    profileNameEl.textContent = name;
  }

  if (profileImg && user?.photoURL) {
    profileImg.src = user.photoURL;
    profileImg.style.display = '';
  }

  window.addEventListener('hashchange', handleRouteChange);

  document.querySelectorAll('.navbar-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const route = btn.dataset.route;
      if (route) navigateTo(route);
    });
  });

  const logoutBtn = document.getElementById('landing-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        FirestoreSync.stop();
        Store.clearAllData();
        await AuthManager.signOut();
        window.location.replace('login.html');
      } catch (error) {
        console.warn('[App] 로그아웃 실패:', error);
      }
    });
  }

  const hash = window.location.hash.replace('#', '');
  const selectedClass = Store.getSelectedClass();
  const hasClassData = Store.getClasses().length > 0 || Store.isTeacherOnboarded();

  ClassManager.init();
  TagGame.init();
  GroupManager.init();
  BadgeManager.init();
  BadgeCollectionUI.init();
  Whistle.init();
  QuickTimer.init();
  Toolbar.init();

  if (!hasClassData) {
    activateRoute('wizard');
    return;
  }

  // hasClassData가 true면 #wizard 해시는 무시 (login-main.js에서 넘어온 hash)
  const safeHash = hash === 'wizard' ? DEFAULT_ROUTE : hash;
  if (safeHash && ROUTES[safeHash]) {
    if (ROUTES[safeHash].requiresClass && !selectedClass) {
      activateRoute(DEFAULT_ROUTE);
    } else {
      activateRoute(safeHash);
    }
  } else if (selectedClass) {
    activateRoute(DEFAULT_INNER_ROUTE);
  } else {
    activateRoute(DEFAULT_ROUTE);
  }
}

function hideStartupSplash() {
  const splash = document.getElementById('startup-splash');
  if (!splash) return;

  requestAnimationFrame(() => {
    splash.classList.add('startup-splash--hidden');
  });

  setTimeout(() => {
    splash.remove();
  }, 600);
}

function navigateTo(route) {
  if (!ROUTES[route]) route = DEFAULT_ROUTE;

  if (ROUTES[route].requiresClass && !Store.getSelectedClass()) {
    route = DEFAULT_ROUTE;
  }

  activateRoute(route);
}

function handleRouteChange() {
  const route = window.location.hash.replace('#', '') || DEFAULT_ROUTE;
  if (route === currentRoute) return;
  activateRoute(route);
}

function activateRoute(route) {
  if (!ROUTES[route]) route = DEFAULT_ROUTE;

  if (ROUTES[route].requiresClass && !Store.getSelectedClass()) {
    route = DEFAULT_ROUTE;
  }

  currentRoute = route;

  if (window.location.hash !== '#' + route) {
    window.location.hash = route;
  }

  const navbar = document.getElementById('top-navbar');
  const container = document.querySelector('.app-container');

  if (route === 'wizard' || route === 'class-selector') {
    if (navbar) navbar.style.display = 'none';
    if (container) container.classList.add('no-navbar');
    Toolbar.hide();
    if (route === 'class-selector') {
      ClassManager.renderLandingClassList();
    }

    if (route === 'wizard') {
      WizardManager.init();
    }
  } else {
    if (navbar) navbar.style.display = '';
    if (container) container.classList.remove('no-navbar');
    Toolbar.show();

    const cls = Store.getSelectedClass();
    const nameEl = document.getElementById('navbar-class-name');
    if (nameEl && cls) {
      nameEl.textContent = cls.name;
    }
  }

  document.querySelectorAll('.page-view').forEach(page => {
    page.classList.remove('active');
  });
  const targetPage = document.getElementById(`page-${route}`);
  if (targetPage) {
    targetPage.classList.add('active');
  }

  document.querySelectorAll('.navbar-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.route === route);
  });

  // 드로어 네비 활성 탭 동기화
  Toolbar.syncActiveTab(route);

  if (route === 'tag-game') {
    TagGame.onPageEnter();
  } else if (route === 'group-manager') {
    GroupManager.onPageEnter();
  } else if (route === 'badge-collection') {
    BadgeCollectionUI.onPageEnter();
  } else if (route === 'settings') {
    ClassManager.onSettingsPageEnter();
  }
}

function onClassSelected(classId) {
  Store.setSelectedClassId(classId);
  syncSelectedClassToCloud(classId);
  navigateTo(DEFAULT_INNER_ROUTE);
}

function goBackToLanding() {
  Store.clearSelectedClass();
  syncSelectedClassToCloud(null);
  navigateTo(DEFAULT_ROUTE);
}

function getCurrentRoute() {
  return currentRoute;
}

async function syncSelectedClassToCloud(classId) {
  try {
    await FirestoreSync.setSelectedClass(classId);
  } catch (error) {
    console.warn('[App] selectedClass sync failed:', error);
  }
}

window.App = {
  init,
  navigateTo,
  getCurrentRoute,
  onClassSelected,
  goBackToLanding,
};
window.ClassManager = ClassManager;
window.TagGame = TagGame;
window.GroupManager = GroupManager;
window.WizardManager = WizardManager;
window.BadgeManager = BadgeManager;

window.App.init();
