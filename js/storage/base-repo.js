/* ============================================
   PE Picker - Base Repository
   localStorage 공통 헬퍼 함수
   ============================================ */

const PREFIX = 'pet_';

export const KEYS = {
  CLASSES: `${PREFIX}classes`,
  TAG_GAME: `${PREFIX}tag_game`,
  CURRENT_TEAMS: `${PREFIX}current_teams`,
  SETTINGS: `${PREFIX}settings`,
  BADGE_LOG: `${PREFIX}badge_log`,
  THERMOSTAT: `${PREFIX}thermostat`,
  SELECTED_CLASS: `${PREFIX}selected_class`,
  TEACHER_PROFILE: `${PREFIX}teacher_profile`,
};

/**
 * localStorage에서 데이터 읽기
 * @param {string} key - 저장소 키
 * @returns {any|null} 파싱된 데이터 또는 null
 */
export function get(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error(`BaseRepo.get(${key}) 오류:`, e);
    return null;
  }
}

/**
 * localStorage에 데이터 저장
 * @param {string} key - 저장소 키
 * @param {any} value - 저장할 데이터
 */
export function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`BaseRepo.set(${key}) 오류:`, e);
  }
}

/**
 * localStorage에서 데이터 삭제
 * @param {string} key - 저장소 키
 */
export function remove(key) {
  localStorage.removeItem(key);
}

/**
 * 고유 ID 생성
 * @param {string} [prefix=''] - ID 앞에 붙일 접두사 (예: 'stu', 'student')
 * @returns {string} 타임스탬프 기반 ID
 */
export function generateId(prefix = '') {
  const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * 모든 pet_ 접두사 localStorage 키 삭제 (계정 전환/로그아웃 시)
 */
export function clearAll() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

export { PREFIX };
