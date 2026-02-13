/* ============================================
   PE Picker - Group Manager Repository
   모둠 배정 상태 및 쿠키 이력 관리
   ============================================ */

const GroupManagerRepo = (() => {
  const { KEYS, get, set, remove } = BaseRepo;

  // === 현재 모둠 상태 ===

  /**
   * 현재 모둠 가져오기
   * @returns {Array} 모둠 배열
   */
  function getCurrentGroups() {
    return get(KEYS.CURRENT_GROUPS) || [];
  }

  /**
   * 현재 모둠 저장
   * @param {Array} groups - 모둠 배열
   */
  function saveCurrentGroups(groups) {
    set(KEYS.CURRENT_GROUPS, groups);
  }

  /**
   * 현재 모둠 초기화
   */
  function clearCurrentGroups() {
    remove(KEYS.CURRENT_GROUPS);
  }

  // === 쿠키 이력 ===

  /**
   * 쿠키 이력 가져오기
   * @returns {Array} 이력 배열
   */
  function getCookieHistory() {
    return get(KEYS.COOKIE_HISTORY) || [];
  }

  /**
   * 쿠키 이력 저장
   * @param {Array} history - 이력 배열
   */
  function saveCookieHistory(history) {
    set(KEYS.COOKIE_HISTORY, history);
  }

  /**
   * 쿠키 기록 추가
   * @param {string} classId - 학급 ID
   * @param {Array} groups - 모둠 배열
   */
  function addCookieRecord(classId, groups) {
    const history = getCookieHistory();
    history.push({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      classId,
      groups: groups.map(g => ({
        id: g.id,
        members: [...g.members],
        cookies: g.cookies || 0,
      })),
    });
    saveCookieHistory(history);
  }

  /**
   * 특정 학급의 쿠키 이력 가져오기
   * @param {string} classId - 학급 ID
   * @returns {Array} 해당 학급의 이력
   */
  function getCookieHistoryByClass(classId) {
    return getCookieHistory().filter(r => r.classId === classId);
  }

  /**
   * 학생별 쿠키 통계
   * @param {string} classId - 학급 ID
   * @returns {Object} 학생명: 총 쿠키 수
   */
  function getCookieStats(classId) {
    const records = getCookieHistoryByClass(classId);
    const stats = {};

    for (const record of records) {
      for (const group of record.groups) {
        for (const member of group.members) {
          const name = typeof member === 'string' ? member : member.name;
          stats[name] = (stats[name] || 0) + (group.cookies || 0);
        }
      }
    }

    return stats;
  }

  /**
   * 쿠키 이력 초기화
   * @param {string} [classId] - 학급 ID (없으면 전체 삭제)
   */
  function clearCookieHistory(classId) {
    if (classId) {
      const history = getCookieHistory().filter(r => r.classId !== classId);
      saveCookieHistory(history);
    } else {
      remove(KEYS.COOKIE_HISTORY);
    }
  }

  return {
    getCurrentGroups,
    saveCurrentGroups,
    clearCurrentGroups,
    getCookieHistory,
    saveCookieHistory,
    addCookieRecord,
    getCookieHistoryByClass,
    getCookieStats,
    clearCookieHistory,
  };
})();
