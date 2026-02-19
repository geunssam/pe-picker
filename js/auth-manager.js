import { getAuthInstance, isFirebaseConfigReady } from './firebase-config.js';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { withTimeout } from './shared/promise-utils.js';

let currentUser = null;
let initialized = false;
let authReady = false;
let listeners = [];
let readyResolver = null;

let unsubscribe = null;

function getAuth() {
  return getAuthInstance();
}

function isAuthenticated() {
  return Boolean(currentUser);
}

function getCurrentUser() {
  return currentUser;
}

function notifyListeners(user) {
  listeners.forEach(listener => {
    try {
      listener(user);
    } catch (error) {
      console.error('[AuthManager] listener error:', error);
    }
  });
}

function markAuthReady() {
  authReady = true;
  if (readyResolver) {
    readyResolver(currentUser);
    readyResolver = null;
  }
}

async function init(listener) {
  if (!isFirebaseConfigReady) {
    authReady = true;
    markAuthReady();
    if (listener) listener(currentUser);
    return;
  }

  if (listener && typeof listener === 'function') {
    listeners.push(listener);
  }

  if (initialized) return;
  initialized = true;

  const auth = getAuth();
  if (!auth) {
    authReady = true;
    markAuthReady();
    if (listener) listener(currentUser);
    return;
  }

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.warn('[AuthManager] persistence set failed:', error);
  }

  unsubscribe = onAuthStateChanged(auth, user => {
    currentUser = user;
    notifyListeners(user);
    if (!authReady) {
      markAuthReady();
    }
  });
}

async function waitForAuthReady(timeoutMs = 15000) {
  if (authReady) return Promise.resolve(currentUser);
  return withTimeout(
    new Promise(resolve => {
      readyResolver = resolve;
    }),
    timeoutMs,
    'AuthManager ready'
  );
}

async function signInWithGoogle() {
  if (!isFirebaseConfigReady) {
    throw new Error('Firebase 설정이 되어 있지 않습니다.');
  }

  const auth = getAuth();
  if (!auth) throw new Error('Firebase 인증 모듈이 준비되지 않았습니다.');

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await withTimeout(signInWithPopup(auth, provider), 30000, 'Google sign in');
  return result.user;
}

async function signOut() {
  const auth = getAuth();
  if (!auth) return;
  await withTimeout(firebaseSignOut(auth), 8000, 'Sign out');
}

function destroy() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  listeners = [];
  initialized = false;
  authReady = false;
  currentUser = null;
}

export const AuthManager = {
  init,
  waitForAuthReady,
  isAuthenticated,
  getCurrentUser,
  signInWithGoogle,
  signOut,
  onAuthStateChanged: listener => {
    if (listener && typeof listener === 'function') listeners.push(listener);
  },
  destroy,
};
