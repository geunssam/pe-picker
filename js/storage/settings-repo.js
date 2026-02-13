/* ============================================
   PE Picker - Settings Repository
   앱 설정 관리
   ============================================ */

const SettingsRepo = (() => {
  const { KEYS, get, set } = BaseRepo;

  const DEFAULT_SETTINGS = {
    cookieMode: 'session',
    timerMode: 'global',
    defaultTime: 300,
    timerAlert: 'soundAndVisual',
    animationEnabled: true,
    defaultGroupNames: ['하나', '믿음', '우정', '희망', '협력', '사랑', '소망', '열정'],
  };

  /**
   * 설정 가져오기
   * @returns {Object} 설정 객체
   */
  function getAll() {
    return get(KEYS.SETTINGS) || DEFAULT_SETTINGS;
  }

  /**
   * 설정 저장
   * @param {Object} settings - 설정 객체
   */
  function save(settings) {
    set(KEYS.SETTINGS, settings);
  }

  /**
   * 기본 모둠 이름 가져오기
   * @returns {Array<string>} 모둠 이름 배열
   */
  function getDefaultGroupNames() {
    const settings = getAll();
    return settings.defaultGroupNames || DEFAULT_SETTINGS.defaultGroupNames;
  }

  /**
   * 기본 모둠 이름 저장
   * @param {Array<string>} names - 모둠 이름 배열
   */
  function saveDefaultGroupNames(names) {
    const settings = getAll();
    settings.defaultGroupNames = names;
    save(settings);
  }

  return {
    getAll,
    save,
    getDefaultGroupNames,
    saveDefaultGroupNames,
  };
})();
