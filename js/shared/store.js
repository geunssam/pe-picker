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
    SELECTED_CLASS: `${PREFIX}selected_class`,
    TEACHER_PROFILE: `${PREFIX}teacher_profile`,
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

  function addClass(name, students, groupNames = null, groups = null, groupCount = 6) {
    const classes = getClasses();
    const defaultNames = getDefaultGroupNames();
    const newClass = {
      id: Date.now().toString(),
      name,
      students, // [{ name, number, gender }] 또는 string[]
      groupNames: groupNames || defaultNames.slice(0, groupCount),
      groups: groups || [], // [[s1, s2], [s3, s4], ...]
      groupCount,
      createdAt: new Date().toISOString(),
    };
    classes.push(newClass);
    saveClasses(classes);
    return newClass;
  }

  function updateClass(id, name, students, groupNames = null, groups = null, groupCount = null) {
    const classes = getClasses();
    const idx = classes.findIndex(c => c.id === id);
    if (idx === -1) return null;
    const updated = { ...classes[idx], name, students };
    if (groupNames !== null) {
      updated.groupNames = groupNames;
    }
    if (groups !== null) {
      updated.groups = groups;
    }
    if (groupCount !== null) {
      updated.groupCount = groupCount;
    }
    classes[idx] = updated;
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
      defaultGroupNames: ['하나', '믿음', '우정', '희망', '협력', '사랑', '소망', '열정'],
    };
  }

  function saveSettings(settings) {
    _set(KEYS.SETTINGS, settings);
  }

  function getDefaultGroupNames() {
    const settings = getSettings();
    return settings.defaultGroupNames || ['하나', '믿음', '우정', '희망', '협력', '사랑', '소망', '열정'];
  }

  function saveDefaultGroupNames(names) {
    const settings = getSettings();
    settings.defaultGroupNames = names;
    saveSettings(settings);
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

  // === 선택된 학급 ===
  function getSelectedClassId() {
    return _get(KEYS.SELECTED_CLASS) || null;
  }

  function setSelectedClassId(id) {
    _set(KEYS.SELECTED_CLASS, id);
  }

  function clearSelectedClass() {
    _remove(KEYS.SELECTED_CLASS);
  }

  function getSelectedClass() {
    const id = getSelectedClassId();
    return id ? getClassById(id) : null;
  }

  // === groupCount 마이그레이션 ===
  function migrateGroupCount() {
    const classes = getClasses();
    let changed = false;
    classes.forEach(c => {
      if (c.groupCount === undefined) {
        c.groupCount = (c.groups && c.groups.length > 0) ? c.groups.length : 6;
        changed = true;
      }
    });
    if (changed) {
      saveClasses(classes);
      console.log('[Store] groupCount 마이그레이션 완료');
    }
  }

  // === ID 생성 헬퍼 ===
  function generateId() {
    return `stu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // === 학생 데이터 마이그레이션 ===
  function migrateStudentData() {
    const classes = getClasses();
    let changed = false;

    classes.forEach(cls => {
      cls.students = cls.students.map(student => {
        // 문자열인 경우 (레거시)
        if (typeof student === 'string') {
          changed = true;
          return {
            id: generateId(),
            name: student,
            number: 0, // 추후 설정
            gender: '',
            sportsAbility: '',
            tags: [],
            note: ''
          };
        }

        // 기존 객체에 신규 필드 추가
        if (!student.id) {
          changed = true;
          return {
            id: generateId(),
            sportsAbility: '',
            tags: [],
            note: '',
            ...student
          };
        }

        // 이미 확장된 구조인 경우 기본값 보장
        return {
          sportsAbility: '',
          tags: [],
          note: '',
          ...student
        };
      });
    });

    if (changed) {
      saveClasses(classes);
      console.log('[Store] 학생 데이터 마이그레이션 완료');
    }
  }

  // === 교사 프로필 관리 ===
  function getTeacherProfile() {
    return _get(KEYS.TEACHER_PROFILE) || null;
  }

  function saveTeacherProfile(profile) {
    _set(KEYS.TEACHER_PROFILE, {
      ...profile,
      isOnboarded: true,
      onboardedAt: new Date().toISOString()
    });
  }

  function isTeacherOnboarded() {
    const profile = getTeacherProfile();
    return profile && profile.isOnboarded;
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

    // groupCount 마이그레이션
    migrateGroupCount();

    // 학생 데이터 마이그레이션
    migrateStudentData();
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
    // 선택된 학급
    getSelectedClassId,
    setSelectedClassId,
    clearSelectedClass,
    getSelectedClass,
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
    getDefaultGroupNames,
    saveDefaultGroupNames,
    // 쿠키
    getCookieHistory,
    addCookieRecord,
    getCookieHistoryByClass,
    getCookieStats,
    clearCookieHistory,
    // 교사 프로필
    getTeacherProfile,
    saveTeacherProfile,
    isTeacherOnboarded,
    // 마이그레이션
    migrateFromLegacy,
  };
})();
