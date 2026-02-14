/* ============================================
   PE Picker - App (라우터 + 초기화)
   해시 기반 SPA 라우터 v2
   랜딩(학급 선택) → 학급 내부(술래뽑기/모둠뽑기/학급관리)
   ============================================ */

import { Store } from './shared/store.js';
import { AuthManager } from './auth-manager.js';
import { FirebaseConfig } from './firebase-config.js';
import { FirestoreSync } from './firestore-sync.js';
import { ClassManager } from './shared/class-manager.js';
import { TagGame } from './tag-game/tag-game.js';
import { GroupManager } from './group-manager/group-manager.js';
import { WizardManager } from './wizard.js';

const ROUTES = {
  wizard: { label: '학급 설정', icon: '🎯', requiresClass: false },
  'class-selector': { label: '학급 선택', icon: '🏠', requiresClass: false },
  'tag-game': { label: '술래뽑기', icon: '🎯', requiresClass: true },
  'group-manager': { label: '모둠뽑기', icon: '👥', requiresClass: true },
  settings: { label: '설정', icon: '⚙️', requiresClass: true },
};

const DEFAULT_ROUTE = 'class-selector';
const DEFAULT_INNER_ROUTE = 'tag-game';

let currentRoute = null;

async function init() {
  // 인증 체크
  AuthManager.init();

  // onAuthStateChanged() 콜백이 완료될 때까지 대기 (100ms)
  await new Promise(resolve => setTimeout(resolve, 100));

  // 로그인되지 않았으면 로그인 페이지로
  if (!AuthManager.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  // 레거시 데이터 마이그레이션
  Store.migrateFromLegacy();

  // Google 로그인인 경우 Firestore 데이터 로드
  const user = AuthManager.getCurrentUser();
  if (user && user.mode === 'google') {
    try {
      // 데이터 로드 완료 대기
      const userData = await loadUserDataFromFirestore(user.uid);

      // userData가 null이면 신규/지연 상태로 보고 wizard로 진입
      if (userData === null) {
        console.warn('⚠️ Firestore 사용자 데이터가 없어 wizard로 이동합니다.');
        window.location.hash = '#wizard';
        activateRoute('wizard');
        return;
      }

      // 데이터 로드 완료 후 초기화 계속
      continueInit(userData);

      // 온보딩 완료 사용자만 실시간 동기화 시작 (wizard 진행 중 간섭 방지)
      if (userData.isOnboarded === true) {
        console.log('🔄 실시간 동기화 활성화 준비');
        FirestoreSync.start(user.uid);
      }
    } catch (error) {
      console.error('❌ Firestore 데이터 로드 실패:', error);
      // 실패 시 wizard로 이동
      App.navigateTo('wizard');
    }
    return;
  }

  continueInit(null);
}

function continueInit(userData) {
  // 온보딩 체크
  const user = AuthManager.getCurrentUser();
  const isGoogleMode = user && user.mode === 'google';

  if (isGoogleMode && userData) {
    // Google 로그인: 이미 로드된 userData의 isOnboarded 플래그 확인 (중복 조회 방지)
    if (!userData.isOnboarded) {
      console.log('📝 온보딩 미완료 → wizard로 이동');
      window.location.hash = '#wizard';
      activateRoute('wizard');
      return;
    }

    console.log('✅ 온보딩 완료 확인');
  } else if (!isGoogleMode) {
    // 로컬 모드: localStorage의 온보딩 상태 확인 (기존 학급이 있으면 스킵)
    const classes = Store.getClasses();
    if (classes.length === 0 && !Store.isTeacherOnboarded()) {
      activateRoute('wizard');
      return;
    }
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
        AuthManager.logout();
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
  ClassManager.init();
  TagGame.init();
  GroupManager.init();
}

function navigateTo(route) {
  if (!ROUTES[route]) route = DEFAULT_ROUTE;

  // 라우트 가드: 학급 필요한 페이지인데 미선택
  if (ROUTES[route].requiresClass && !Store.getSelectedClass()) {
    route = DEFAULT_ROUTE;
  }

  // 이벤트 리스너가 아직 등록되지 않은 초기 상태에서도 즉시 라우팅되도록 보장
  activateRoute(route);
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

  if (route === 'wizard' || route === 'class-selector') {
    // wizard 또는 랜딩: 네비바 숨기기
    if (navbar) navbar.style.display = 'none';
    if (container) container.classList.add('no-navbar');

    // 랜딩 페이지 렌더링
    if (route === 'class-selector') {
      ClassManager.renderLandingClassList();
    }

    // wizard 페이지 진입 시 초기화
    if (route === 'wizard') {
      WizardManager.init();
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
  if (route === 'tag-game') {
    TagGame.onPageEnter();
  } else if (route === 'group-manager') {
    GroupManager.onPageEnter();
  } else if (route === 'settings') {
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

async function loadUserDataFromFirestore(uid) {
  try {
    const db = FirebaseConfig.getFirestore();
    if (!db) {
      console.warn('Firestore가 초기화되지 않았습니다.');
      return null;
    }

    console.log('Firestore에서 데이터 로드 중...');

    // 타임아웃 헬퍼 (10초)
    const withTimeout = (promise, ms = 10000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
      ]);
    };

    // 온보딩 판정용 users 문서는 서버 우선 조회, 실패 시 캐시 fallback
    const getUserDocPreferServer = async () => {
      try {
        return await withTimeout(db.collection('users').doc(uid).get({ source: 'server' }));
      } catch (serverError) {
        if (serverError.message === 'TIMEOUT') throw serverError;
        console.warn(
          '⚠️ users 문서 서버 조회 실패, 캐시로 재시도:',
          serverError.code || serverError.message
        );
        return withTimeout(db.collection('users').doc(uid).get());
      }
    };

    // 1. 사용자 문서 로드 (타임아웃 10초)
    const userDoc = await getUserDocPreferServer();
    if (!userDoc.exists) {
      console.warn('⚠️ 사용자 문서가 없습니다. 잠시 후 재시도합니다...');

      // 3초 대기 후 재시도 (auth-manager.js의 문서 생성 대기)
      await new Promise(resolve => setTimeout(resolve, 3000));

      const retryDoc = await getUserDocPreferServer();
      if (!retryDoc.exists) {
        console.error('❌ 재시도 후에도 사용자 문서가 없습니다.');
        return null;
      }

      console.log('✅ 재시도 성공 - 사용자 문서 확인');
      return retryDoc.data();
    }

    const userData = userDoc.data();

    // 2. 설정 동기화
    if (userData.settings) {
      localStorage.setItem('pet_settings', JSON.stringify(userData.settings));
    }

    // 3. 선택된 학급 ID
    if (userData.selectedClassId) {
      localStorage.setItem('pet_selectedClass', userData.selectedClassId);
    }

    // 4. 학급 목록 로드 (타임아웃 10초)
    const classesSnapshot = await withTimeout(
      db.collection('users').doc(uid).collection('classes').get()
    );

    const decodeGroupsFromFirestore = (rawGroups, groupCount = 6) => {
      if (Array.isArray(rawGroups)) return rawGroups;
      if (!rawGroups || typeof rawGroups !== 'object') {
        return Array.from({ length: groupCount }, () => []);
      }

      const entries = Object.entries(rawGroups);
      if (entries.length === 0) {
        return Array.from({ length: groupCount }, () => []);
      }

      const ordered = entries
        .map(([key, members]) => {
          const numeric = parseInt(String(key).replace(/\D/g, ''), 10);
          return {
            index: Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER,
            members: Array.isArray(members) ? members : [],
          };
        })
        .sort((a, b) => a.index - b.index);

      const groups = ordered.map(item => item.members);
      while (groups.length < groupCount) {
        groups.push([]);
      }
      return groups;
    };

    const classes = [];
    for (const classDoc of classesSnapshot.docs) {
      const classData = classDoc.data();
      const classId = classDoc.id;

      // 5. 학생 로드 (타임아웃 10초)
      const studentsSnapshot = await withTimeout(
        db
          .collection('users')
          .doc(uid)
          .collection('classes')
          .doc(classId)
          .collection('students')
          .orderBy('number')
          .get()
      );

      const students = studentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          number: data.number || 0,
          gender: data.gender || '',
          sportsAbility: data.sportsAbility || '',
          tags: data.tags || [],
          note: data.note || '',
          groupIndex: data.groupIndex || -1,
        };
      });

      // 6. 학급 객체 생성
      const groupCount = classData.groupCount || 6;
      classes.push({
        id: classId,
        name: classData.name,
        students: students,
        groupNames: classData.groupNames || ['하나', '믿음', '우정', '희망', '협력', '사랑'],
        groups: decodeGroupsFromFirestore(classData.groups, groupCount),
        groupCount,
        createdAt: classData.createdAt
          ? classData.createdAt.toDate().toISOString()
          : new Date().toISOString(),
      });
    }

    // 7. localStorage에 저장
    localStorage.setItem('pet_classes', JSON.stringify(classes));

    console.log(`Firestore에서 ${classes.length}개 학급 로드 완료`);

    // 8. userData 반환 (온보딩 체크용)
    return userData;
  } catch (error) {
    if (error.message === 'TIMEOUT') {
      console.error('⏱ Firestore 데이터 로드 타임아웃 (10초)');
    } else {
      console.error('❌ Firestore 데이터 로드 실패:', error);
    }
    throw error;
  }
}

export const App = { init, navigateTo, getCurrentRoute, onClassSelected, goBackToLanding };

// HTML onclick 핸들러 및 모듈 간 참조를 위한 window 바인딩
window.App = App;
window.ClassManager = ClassManager;
window.TagGame = TagGame;
window.GroupManager = GroupManager;
window.WizardManager = WizardManager;
window.AuthManager = AuthManager;
window.FirebaseConfig = FirebaseConfig;
window.FirestoreSync = FirestoreSync;

// ESM modules는 defer되므로 DOM이 이미 준비됨
App.init();
