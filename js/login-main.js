import { AuthManager } from './auth-manager.js';
import { isFirebaseConfigReady } from './firebase-config.js';
import { syncTeacherProfileToFirestore } from './firestore-sync.js';

function setLoading(loading) {
  const btn = document.getElementById('google-login-btn');
  const msg = document.getElementById('login-message');
  if (!btn || !msg) return;

  if (loading) {
    btn.disabled = true;
    btn.textContent = '로그인 중...';
    msg.textContent = 'Google 계정 인증을 진행 중입니다.';
    msg.style.color = 'var(--text-primary)';
  } else {
    btn.disabled = false;
    btn.textContent = 'Google로 시작하기';
  }
}

function setStatus(message, isError = false) {
  const msg = document.getElementById('login-message');
  if (!msg) return;
  msg.textContent = message;
  msg.style.color = isError ? 'var(--color-danger)' : 'var(--text-primary)';
}

function renderProfile() {
  const profile = AuthManager.getCurrentUser();
  const userCard = document.getElementById('login-user-card');
  const btn = document.getElementById('google-login-btn');
  if (!profile || !userCard || !btn) return;

  const label = [profile.displayName, profile.email].filter(Boolean).join(' / ');
  userCard.textContent = `현재 로그인: ${label}`;
  btn.textContent = '메인으로 이동';
  setStatus('로그인 상태를 확인했습니다.');
}

function goToNextStep() {
  // 항상 index.html로 이동 — app.js가 Firestore 동기화 후 wizard 여부를 판단
  window.location.href = './index.html';
}

function bindLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async () => {
    try {
      await AuthManager.signOut();
      location.href = './login.html';
    } catch (error) {
      setStatus('로그아웃 중 오류가 발생했습니다.', true);
    }
  });
}

function bindLogin() {
  const btn = document.getElementById('google-login-btn');
  const localBtn = document.getElementById('local-fallback-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (!isFirebaseConfigReady) {
      setStatus('Firebase 설정이 되어있지 않습니다. firebase-config.js에서 키를 입력하세요.', true);
      return;
    }

    setLoading(true);
    setStatus('Google 로그인 창을 여는 중입니다...');

    try {
      const user = await AuthManager.signInWithGoogle();
      const teacherName = user?.displayName?.trim() || '';
      if (teacherName) {
        await syncTeacherProfileToFirestore({ teacherName });
      }

      renderProfile();
      goToNextStep();
    } catch (error) {
      setStatus(`로그인 실패: ${error.message}`, true);
      setLoading(false);
    }
  });

  if (localBtn) {
    localBtn.addEventListener('click', () => {
      goToNextStep();
    });
  }
}

function bootstrap() {
  if (!isFirebaseConfigReady) {
    setStatus('Firebase 설정이 필요합니다. Firebase 설정값을 입력하세요.', true);
    return;
  }

  AuthManager.init();
  AuthManager.waitForAuthReady().then(() => {
    const user = AuthManager.getCurrentUser();
    if (user) {
      renderProfile();
      goToNextStep();
    } else {
      setStatus('Google 계정으로 시작하세요.');
    }
  });

  bindLogin();
  bindLogout();
}

bootstrap();
