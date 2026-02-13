/* ============================================
   PE Picker - Firebase Configuration
   Google OAuth 인증 설정
   ============================================ */

// Firebase 프로젝트 설정
// Firebase Console: https://console.firebase.google.com/project/pepick-iwg/overview
const firebaseConfig = {
  apiKey: "AIzaSyBR-wjw7ZptOyWhFpxTDTzrDBPjACZseIc",
  authDomain: "pepick-iwg.firebaseapp.com",
  projectId: "pepick-iwg",
  storageBucket: "pepick-iwg.firebasestorage.app",
  messagingSenderId: "490312923173",
  appId: "1:490312923173:web:ce1fffe7931793dedb27cc"
};

// Firebase 초기화 여부 확인
let firebaseApp = null;
let auth = null;
let db = null;

function initFirebase() {
  // Firebase가 이미 초기화되었는지 확인
  if (firebaseApp) return;

  try {
    // Firebase SDK가 로드되었는지 확인
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK가 로드되지 않았습니다.');
      return;
    }

    // Firebase 초기화
    firebaseApp = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();

    // Firestore 오프라인 지속성 활성화
    db.enablePersistence({ synchronizeTabs: true })
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('여러 탭이 열려 있어 오프라인 지속성을 활성화할 수 없습니다.');
        } else if (err.code === 'unimplemented') {
          console.warn('브라우저가 오프라인 지속성을 지원하지 않습니다.');
        }
      });

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
  getFirestore: () => db,
  getGoogleProvider,
  isConfigured: () => firebaseConfig.apiKey !== 'YOUR_API_KEY'
};
