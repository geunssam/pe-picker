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

  async function handleAuthStateChanged(user) {
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

      // Firestore 사용자 문서 확인 (로그인 페이지가 아닌 경우만)
      if (!window.location.pathname.includes('login.html')) {
        await checkFirestoreUser(user);
      }
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

      // Firestore 사용자 문서 확인
      await checkFirestoreUser(user);

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
    // 실시간 동기화 중지 (FirestoreSync가 정의되어 있으면)
    if (typeof FirestoreSync !== 'undefined' && FirestoreSync.isEnabled()) {
      console.log('🛑 실시간 동기화 중지');
      FirestoreSync.stop();
    }

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

  async function checkFirestoreUser(user) {
    try {
      console.log('🔍 Firestore 사용자 확인 시작:', user.uid);

      const db = FirebaseConfig.getFirestore();
      if (!db) {
        console.warn('⚠️ Firestore가 초기화되지 않았습니다. wizard로 이동합니다.');
        // Firestore 실패해도 wizard로 이동
        if (window.location.pathname.includes('login.html')) {
          window.location.href = 'wizard.html';
        }
        return;
      }

      console.log('✅ Firestore 연결 확인');

      const userRef = db.collection('users').doc(user.uid);

      // 타임아웃 추가 (10초)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 10000);
      });

      const userDoc = await Promise.race([
        userRef.get(),
        timeoutPromise
      ]);

      if (!userDoc.exists) {
        console.log('📝 신규 사용자 - 문서 생성 중...');

        // 신규 사용자 → Firestore에 사용자 문서 생성
        await userRef.set({
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          selectedClassId: null,
          isOnboarded: false,  // ✅ 온보딩 미완료 상태로 시작
          settings: {
            cookieMode: 'session',
            timerMode: 'global',
            defaultTime: 300,
            timerAlert: 'soundAndVisual',
            animationEnabled: true,
            defaultGroupNames: ['하나', '믿음', '우정', '희망', '협력', '사랑']
          },
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ 신규 사용자 문서 생성 완료 → wizard.html로 이동');

        // 온보딩 페이지로 이동 (login.html에서만)
        if (window.location.pathname.includes('login.html')) {
          window.location.href = 'wizard.html';
        }
      } else {
        // 기존 사용자 → 문서가 있다는 것은 이미 온보딩을 거쳤다는 의미
        const userData = userDoc.data();

        // isOnboarded 플래그가 없는 기존 사용자는 자동으로 true 설정
        if (userData.isOnboarded !== true) {
          console.log('🔧 기존 사용자 isOnboarded 플래그 자동 설정');
          await userRef.update({
            isOnboarded: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

        console.log('✅ 기존 사용자 확인 완료 → index.html로 이동');

        // 기존 사용자 → index.html로 이동
        if (window.location.pathname.includes('login.html')) {
          window.location.href = 'index.html';
        }
      }
    } catch (error) {
      console.error('❌ Firestore 사용자 확인 실패:', error);

      // 타임아웃 또는 연결 실패 시 wizard로 이동
      if (error.message === 'TIMEOUT') {
        console.warn('⏱ Firestore 연결 타임아웃 (10초) - wizard로 이동');
        alert('서버 연결이 느립니다. 로컬 모드로 진행합니다.\n온보딩을 완료하면 다음부터는 정상 작동합니다.');
      } else {
        alert('클라우드 연결에 실패했습니다. 로컬 모드로 진행합니다.');
      }

      if (window.location.pathname.includes('login.html')) {
        window.location.href = 'wizard.html';
      }
    }
  }

  return {
    init,
    loginWithGoogle,
    loginAsLocal,
    logout,
    isAuthenticated,
    getCurrentUser,
    getAuthMode,
    updateNavigation,
    checkFirestoreUser
  };
})();
