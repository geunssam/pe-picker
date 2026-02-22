/**
 * Consent Manager — 약관 동의 상태 관리
 *
 * - localStorage에 캐시 (pet_consent)
 * - Firestore users/{uid}에 consentedAt, consentVersion 저장
 */
import { AuthManager } from './auth-manager.js';
import { getFirestoreInstance } from './firebase-config.js';
import { withTimeout } from './shared/promise-utils.js';
import {
  doc,
  getDoc,
  setDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const CONSENT_VERSION = '1.0';
const LOCAL_KEY = 'pet_consent';
const SYNC_TIMEOUT_MS = 8000;

/**
 * 로컬 캐시에서 동의 상태 확인
 */
function getLocalConsent() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setLocalConsent(version) {
  localStorage.setItem(
    LOCAL_KEY,
    JSON.stringify({ version, consentedAt: new Date().toISOString() })
  );
}

/**
 * 동의 여부 확인: 로컬 → Firestore 순서
 */
async function hasConsented() {
  // 1) 로컬 캐시 확인
  const local = getLocalConsent();
  if (local && local.version === CONSENT_VERSION) return true;

  // 2) Firestore 확인
  const db = getFirestoreInstance();
  const user = AuthManager.getCurrentUser();
  if (!db || !user) return false;

  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await withTimeout(getDoc(userRef), SYNC_TIMEOUT_MS, 'consent check');
    if (snap.exists()) {
      const data = snap.data();
      if (data.consentVersion === CONSENT_VERSION) {
        // Firestore에 있으면 로컬에 캐시
        setLocalConsent(CONSENT_VERSION);
        return true;
      }
    }
  } catch (error) {
    console.warn('[ConsentManager] Firestore 동의 확인 실패:', error);
  }

  return false;
}

/**
 * 동의 저장: Firestore + 로컬
 */
async function saveConsent() {
  const db = getFirestoreInstance();
  const user = AuthManager.getCurrentUser();

  // 로컬 캐시 먼저 저장
  setLocalConsent(CONSENT_VERSION);

  if (!db || !user) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    await withTimeout(
      setDoc(
        userRef,
        {
          consentVersion: CONSENT_VERSION,
          consentedAt: new Date().toISOString(),
        },
        { merge: true }
      ),
      SYNC_TIMEOUT_MS,
      'consent save'
    );
  } catch (error) {
    console.warn('[ConsentManager] Firestore 동의 저장 실패:', error);
    // 로컬에는 이미 저장됨 → 다음 동기화 시 재시도
  }
}

/**
 * 동의 모달 표시 + 이벤트 바인딩
 * @returns {Promise<boolean>} 동의 완료 여부
 */
function showConsentModal() {
  return new Promise(resolve => {
    const modal = document.getElementById('consent-modal');
    if (!modal) {
      resolve(false);
      return;
    }

    const allCheck = document.getElementById('consent-all-check');
    const termsCheck = document.getElementById('consent-terms-check');
    const privacyCheck = document.getElementById('consent-privacy-check');
    const submitBtn = document.getElementById('consent-submit-btn');

    if (!allCheck || !termsCheck || !privacyCheck || !submitBtn) {
      resolve(false);
      return;
    }

    // 초기 상태
    allCheck.checked = false;
    termsCheck.checked = false;
    privacyCheck.checked = false;
    submitBtn.disabled = true;

    function updateSubmitState() {
      const allRequired = termsCheck.checked && privacyCheck.checked;
      submitBtn.disabled = !allRequired;
      allCheck.checked = allRequired;
    }

    // 전체 동의
    const onAllChange = () => {
      termsCheck.checked = allCheck.checked;
      privacyCheck.checked = allCheck.checked;
      updateSubmitState();
    };

    // 개별 체크
    const onIndividualChange = () => {
      updateSubmitState();
    };

    // 제출
    const onSubmit = async () => {
      await saveConsent();
      cleanup();
      modal.style.display = 'none';
      resolve(true);
    };

    allCheck.addEventListener('change', onAllChange);
    termsCheck.addEventListener('change', onIndividualChange);
    privacyCheck.addEventListener('change', onIndividualChange);
    submitBtn.addEventListener('click', onSubmit);

    function cleanup() {
      allCheck.removeEventListener('change', onAllChange);
      termsCheck.removeEventListener('change', onIndividualChange);
      privacyCheck.removeEventListener('change', onIndividualChange);
      submitBtn.removeEventListener('click', onSubmit);
    }

    // 모달 표시 (배경 클릭 닫기 방지)
    modal.style.display = 'flex';
  });
}

/**
 * 게이트 함수: 동의 안 했으면 모달 표시
 * @returns {Promise<boolean>} 동의 여부
 */
async function ensureConsent() {
  const consented = await hasConsented();
  if (consented) return true;
  return showConsentModal();
}

export const ConsentManager = {
  hasConsented,
  saveConsent,
  showConsentModal,
  ensureConsent,
};
