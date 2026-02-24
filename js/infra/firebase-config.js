import {
  initializeApp,
  getApps,
  getApp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function isPlaceholder(value) {
  return (
    !value ||
    value === 'undefined' ||
    String(value).includes('YOUR_') ||
    String(value).includes('your_')
  );
}

const REQUIRED_KEYS = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];
export const isFirebaseConfigReady = REQUIRED_KEYS.every(
  key => !isPlaceholder(firebaseConfig[key])
);

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigReady) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('[Firebase] 초기화 실패:', error);
  }
}

export const firebaseApp = app;
export function getAuthInstance() {
  return auth;
}

export function getFirestoreInstance() {
  return db;
}

export { firebaseConfig };
