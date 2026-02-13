/* ============================================
   PE Picker - Teacher Repository
   교사 프로필 관리
   ============================================ */

const TeacherRepo = (() => {
  const { KEYS, get, set } = BaseRepo;

  /**
   * 교사 프로필 가져오기
   * @returns {Object|null} 프로필 또는 null
   */
  function getProfile() {
    return get(KEYS.TEACHER_PROFILE) || null;
  }

  /**
   * 교사 프로필 저장
   * @param {Object} profile - 프로필 객체
   */
  function saveProfile(profile) {
    set(KEYS.TEACHER_PROFILE, {
      ...profile,
      isOnboarded: true,
      onboardedAt: new Date().toISOString(),
    });
  }

  /**
   * 온보딩 완료 여부 확인
   * @returns {boolean} 온보딩 완료 여부
   */
  function isOnboarded() {
    const profile = getProfile();
    return profile && profile.isOnboarded;
  }

  return {
    getProfile,
    saveProfile,
    isOnboarded,
  };
})();
