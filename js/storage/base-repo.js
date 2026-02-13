/* ============================================
   PE Picker - Base Repository
   localStorage 공통 헬퍼 함수
   ============================================ */

const BaseRepo = (() => {
  const PREFIX = 'pet_';

  const KEYS = {
    CLASSES: `${PREFIX}classes`,
    TAG_GAME: `${PREFIX}tag_game`,
    CURRENT_GROUPS: `${PREFIX}current_groups`,
    SETTINGS: `${PREFIX}settings`,
    COOKIE_HISTORY: `${PREFIX}cookie_history`,
    SELECTED_CLASS: `${PREFIX}selected_class`,
    TEACHER_PROFILE: `${PREFIX}teacher_profile`,
  };

  /**
   * localStorage에서 데이터 읽기
   * @param {string} key - 저장소 키
   * @returns {any|null} 파싱된 데이터 또는 null
   */
  function get(key) {
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
  function set(key, value) {
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
  function remove(key) {
    localStorage.removeItem(key);
  }

  /**
   * 고유 ID 생성
   * @returns {string} 타임스탬프 기반 ID
   */
  function generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  return { KEYS, get, set, remove, generateId };
})();
