/* ============================================
   PE Picker - Firebase Configuration
   Google OAuth 인증 설정
   ============================================ */

// Firebase 프로젝트 설정
// Firebase Console: https://console.firebase.google.com/project/pepick-iwg/overview
const firebaseConfig = {
  apiKey: 'AIzaSyBR-wjw7ZptOyWhFpxTDTzrDBPjACZseIc',
  authDomain: 'pepick-iwg.firebaseapp.com',
  projectId: 'pepick-iwg',
  storageBucket: 'pepick-iwg.firebasestorage.app',
  messagingSenderId: '490312923173',
  appId: '1:490312923173:web:ce1fffe7931793dedb27cc',
};

// Firebase 초기화 여부 확인
let firebaseApp = null;
let auth = null;
let db = null;

function initFirebase() {
  // Firebase가 이미 초기화되었는지 확인
  if (firebaseApp) {
    console.log('✅ Firebase 이미 초기화됨');
    return;
  }

  try {
    console.log('🔥 Firebase 초기화 시작...');

    // Firebase SDK가 로드되었는지 확인
    if (typeof firebase === 'undefined') {
      console.error('❌ Firebase SDK가 로드되지 않았습니다.');
      return;
    }

    // Firebase 초기화
    firebaseApp = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();

    console.log('✅ Firebase App 초기화 성공');
    console.log('✅ Firebase Auth 초기화 성공');
    console.log('✅ Firestore 초기화 성공');

    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalDev = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';

    if (isLocalDev) {
      // 로컬 개발에서는 캐시 꼬임/오래된 userData 방지를 위해 persistence 비활성화
      console.log('ℹ️ 로컬 개발 환경: Firestore 오프라인 지속성 비활성화');
    } else {
      // Firestore 오프라인 지속성 활성화 (옵션 - 실패해도 계속 진행)
      // IMPORTANT: 오프라인 지속성은 선택사항입니다. 실패해도 앱은 정상 작동합니다.
      db.enablePersistence({ synchronizeTabs: false }) // synchronizeTabs: false로 변경하여 다중 탭 문제 방지
        .then(() => {
          console.log('✅ Firestore 오프라인 지속성 활성화');
        })
        .catch(err => {
          // 오프라인 지속성 실패는 치명적이지 않음 - 경고만 출력
          if (err.code === 'failed-precondition') {
            console.warn(
              '⚠️ 여러 탭이 열려 있어 오프라인 지속성을 비활성화합니다. (앱은 정상 작동)'
            );
          } else if (err.code === 'unimplemented') {
            console.warn('⚠️ 브라우저가 오프라인 지속성을 지원하지 않습니다. (앱은 정상 작동)');
          } else {
            console.warn('⚠️ Firestore 오프라인 지속성 비활성화:', err.code, '(앱은 정상 작동)');
          }
        });
    }

    console.log('✅ Firebase 초기화 완료');
  } catch (error) {
    console.error('❌ Firebase 초기화 실패:', {
      error: error.message,
      code: error.code,
      stack: error.stack,
    });
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
  getFirestore: () => db,
  getGoogleProvider,
  isConfigured: () => firebaseConfig.apiKey !== 'YOUR_API_KEY',
};
