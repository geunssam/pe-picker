/* ============================================
   PE Picker - Firebase Configuration
   Google OAuth 인증 설정
   ============================================ */

// TODO: Firebase 프로젝트 설정 후 아래 값을 실제 값으로 교체하세요
// Firebase Console: https://console.firebase.google.com/
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase 초기화 여부 확인
let firebaseApp = null;
let auth = null;

function initFirebase() {
  // Firebase가 이미 초기화되었는지 확인
  if (firebaseApp) return;

  try {
    // Firebase SDK가 로드되었는지 확인
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK가 로드되지 않았습니다.');
      return;
    }

    // 설정이 기본값인지 확인
    if (firebaseConfig.apiKey === 'YOUR_API_KEY') {
      console.warn('Firebase 설정이 완료되지 않았습니다. firebase-config.js를 수정하세요.');
      return;
    }

    // Firebase 초기화
    firebaseApp = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();

    console.log('Firebase 초기화 완료');
  } catch (error) {
    console.error('Firebase 초기화 실패:', error);
  }
}

// Google OAuth 제공자
function getGoogleProvider() {
  if (!auth) return null;
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  return provider;
}

// Firebase 내보내기
const FirebaseConfig = {
  initFirebase,
  getAuth: () => auth,
  getGoogleProvider,
  isConfigured: () => firebaseConfig.apiKey !== 'YOUR_API_KEY'
};
