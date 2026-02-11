/* ============================================
   PE Picker - Store (통합 데이터 관리)
   localStorage 인터페이스 패턴
   - 추후 Firebase 전환 시 이 파일만 교체
   ============================================ */

const Store = (() => {
  const PREFIX = 'pet_';

  const KEYS = {
    CLASSES: `${PREFIX}classes`,
    TAG_GAME: `${PREFIX}tag_game`,
    CURRENT_GROUPS: `${PREFIX}current_groups`,
    SETTINGS: `${PREFIX}settings`,
    COOKIE_HISTORY: `${PREFIX}cookie_history`,
  };

  // --- Helpers ---
  function _get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error(`Store._get(${key}) 오류:`, e);
      return null;
    }
  }

  function _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Store._set(${key}) 오류:`, e);
    }
  }

  function _remove(key) {
    localStorage.removeItem(key);
  }

  // === 학급 관리 ===
  function getClasses() {
    return _get(KEYS.CLASSES) || [];
  }

  function saveClasses(classes) {
    _set(KEYS.CLASSES, classes);
  }

  function addClass(name, students) {
    const classes = getClasses();
    const newClass = {
      id: Date.now().toString(),
      name,
      students, // [{ name, number, gender }] 또는 string[]
      createdAt: new Date().toISOString(),
    };
    classes.push(newClass);
    saveClasses(classes);
    return newClass;
  }

  function updateClass(id, name, students) {
    const classes = getClasses();
    const idx = classes.findIndex(c => c.id === id);
    if (idx === -1) return null;
    classes[idx] = { ...classes[idx], name, students };
    saveClasses(classes);
    return classes[idx];
  }

  function deleteClass(id) {
    const classes = getClasses().filter(c => c.id !== id);
    saveClasses(classes);
  }

  function getClassById(id) {
    return getClasses().find(c => c.id === id) || null;
  }

  // === 술래뽑기 상태 ===
  function getTagGameData() {
    return _get(KEYS.TAG_GAME) || null;
  }

  function saveTagGameData(data) {
    _set(KEYS.TAG_GAME, { ...data, lastUpdated: new Date().toISOString() });
  }

  function clearTagGameData() {
    _remove(KEYS.TAG_GAME);
  }

  // === 모둠 관리 ===
  function getCurrentGroups() {
    return _get(KEYS.CURRENT_GROUPS) || [];
  }

  function saveCurrentGroups(groups) {
    _set(KEYS.CURRENT_GROUPS, groups);
  }

  function clearCurrentGroups() {
    _remove(KEYS.CURRENT_GROUPS);
  }

  // === 설정 ===
  function getSettings() {
    return _get(KEYS.SETTINGS) || {
      cookieMode: 'session',
      timerMode: 'global',
      defaultTime: 300,
      timerAlert: 'soundAndVisual',
      animationEnabled: true,
    };
  }

  function saveSettings(settings) {
    _set(KEYS.SETTINGS, settings);
  }

  // === 쿠키 히스토리 ===
  function getCookieHistory() {
    return _get(KEYS.COOKIE_HISTORY) || [];
  }

  function saveCookieHistory(history) {
    _set(KEYS.COOKIE_HISTORY, history);
  }

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

  function getCookieHistoryByClass(classId) {
    return getCookieHistory().filter(r => r.classId === classId);
  }

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

  function clearCookieHistory(classId) {
    if (classId) {
      const history = getCookieHistory().filter(r => r.classId !== classId);
      saveCookieHistory(history);
    } else {
      _remove(KEYS.COOKIE_HISTORY);
    }
  }

  // === 마이그레이션: 기존 앱 데이터 가져오기 ===
  function migrateFromLegacy() {
    // 기존 class-group-manager 데이터
    const legacyClasses = _get('cgm_classes');
    if (legacyClasses && !_get(KEYS.CLASSES)) {
      _set(KEYS.CLASSES, legacyClasses);
      console.log('[Store] cgm_classes 마이그레이션 완료');
    }

    const legacyGroups = _get('cgm_current_groups');
    if (legacyGroups && !_get(KEYS.CURRENT_GROUPS)) {
      _set(KEYS.CURRENT_GROUPS, legacyGroups);
    }

    const legacySettings = _get('cgm_settings');
    if (legacySettings && !_get(KEYS.SETTINGS)) {
      _set(KEYS.SETTINGS, legacySettings);
    }

    const legacyCookies = _get('cgm_cookie_history');
    if (legacyCookies && !_get(KEYS.COOKIE_HISTORY)) {
      _set(KEYS.COOKIE_HISTORY, legacyCookies);
    }

    // 기존 태그게임 데이터
    const legacyTag = _get('tagGameData');
    if (legacyTag && !_get(KEYS.TAG_GAME)) {
      _set(KEYS.TAG_GAME, legacyTag);
      console.log('[Store] tagGameData 마이그레이션 완료');
    }
  }

  // Public API
  return {
    // 학급
    getClasses,
    saveClasses,
    addClass,
    updateClass,
    deleteClass,
    getClassById,
    // 술래뽑기
    getTagGameData,
    saveTagGameData,
    clearTagGameData,
    // 모둠
    getCurrentGroups,
    saveCurrentGroups,
    clearCurrentGroups,
    // 설정
    getSettings,
    saveSettings,
    // 쿠키
    getCookieHistory,
    addCookieRecord,
    getCookieHistoryByClass,
    getCookieStats,
    clearCookieHistory,
    // 마이그레이션
    migrateFromLegacy,
  };
})();
