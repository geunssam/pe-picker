/* ============================================
   PE Picker - Auth Manager
   사용자 인증 및 상태 관리
   ============================================ */

const AuthManager = (() => {
  let currentUser = null;
  let authMode = 'local'; // 'local' | 'google'

  function init() {
    // 저장된 인증 모드 확인
    const savedMode = localStorage.getItem('auth-mode');
    const savedUser = localStorage.getItem('current-user');

    if (savedMode === 'google' && savedUser) {
      // Google 로그인 사용자
      currentUser = JSON.parse(savedUser);
      authMode = 'google';

      // Firebase 초기화 및 상태 확인
      if (typeof FirebaseConfig !== 'undefined' && FirebaseConfig.isConfigured()) {
        FirebaseConfig.initFirebase();
        const auth = FirebaseConfig.getAuth();
        if (auth) {
          auth.onAuthStateChanged(handleAuthStateChanged);
        }
      }
    } else if (savedMode === 'local') {
      // 로컬 모드
      authMode = 'local';
      currentUser = { mode: 'local', displayName: '로컬 사용자' };
    }

    // 네비게이션 업데이트
    updateNavigation();
  }

  function handleAuthStateChanged(user) {
    if (user) {
      // 로그인됨
      currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        mode: 'google'
      };
      localStorage.setItem('current-user', JSON.stringify(currentUser));
      localStorage.setItem('auth-mode', 'google');
      updateNavigation();
    } else {
      // 로그아웃됨
      if (authMode === 'google') {
        logout();
      }
    }
  }

  async function loginWithGoogle() {
    if (typeof FirebaseConfig === 'undefined' || !FirebaseConfig.isConfigured()) {
      alert('Firebase가 설정되지 않았습니다. firebase-config.js를 확인하세요.');
      return false;
    }

    try {
      FirebaseConfig.initFirebase();
      const auth = FirebaseConfig.getAuth();
      const provider = FirebaseConfig.getGoogleProvider();

      if (!auth || !provider) {
        throw new Error('Firebase 인증을 초기화할 수 없습니다.');
      }

      const result = await auth.signInWithPopup(provider);
      const user = result.user;

      currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        mode: 'google'
      };

      authMode = 'google';
      localStorage.setItem('current-user', JSON.stringify(currentUser));
      localStorage.setItem('auth-mode', 'google');

      return true;
    } catch (error) {
      console.error('Google 로그인 실패:', error);
      alert('로그인에 실패했습니다: ' + error.message);
      return false;
    }
  }

  function loginAsLocal() {
    authMode = 'local';
    currentUser = { mode: 'local', displayName: '로컬 사용자' };
    localStorage.setItem('auth-mode', 'local');
    localStorage.setItem('current-user', JSON.stringify(currentUser));
    return true;
  }

  async function logout() {
    if (authMode === 'google') {
      const auth = FirebaseConfig.getAuth();
      if (auth) {
        try {
          await auth.signOut();
        } catch (error) {
          console.error('로그아웃 실패:', error);
        }
      }
    }

    currentUser = null;
    authMode = 'local';
    localStorage.removeItem('current-user');
    localStorage.removeItem('auth-mode');

    // 로그인 페이지로 이동
    window.location.href = 'login.html';
  }

  function updateNavigation() {
    const navClassInfo = document.getElementById('navbar-class-name');
    const navLogoutBtn = document.getElementById('navbar-logout-btn');

    if (currentUser && authMode === 'google') {
      // Google 사용자 정보 표시
      if (navClassInfo) {
        navClassInfo.textContent = currentUser.displayName || currentUser.email;
      }
      if (navLogoutBtn) {
        navLogoutBtn.style.display = '';
      }
    } else {
      // 로컬 모드
      const selectedClass = Store.getSelectedClass();
      if (navClassInfo && selectedClass) {
        navClassInfo.textContent = selectedClass.name;
      }
      if (navLogoutBtn) {
        navLogoutBtn.style.display = 'none'; // 로컬 모드에서는 로그아웃 버튼 숨김
      }
    }
  }

  function isAuthenticated() {
    return currentUser !== null;
  }

  function getCurrentUser() {
    return currentUser;
  }

  function getAuthMode() {
    return authMode;
  }

  return {
    init,
    loginWithGoogle,
    loginAsLocal,
    logout,
    isAuthenticated,
    getCurrentUser,
    getAuthMode,
    updateNavigation
  };
})();
