/* ============================================
   PE Picker - Group Picker Core
   순수 모둠 배정 알고리즘
   UI와 상태 관리로부터 독립된 순수 함수
   ============================================ */

/**
 * Fisher-Yates 셔플
 * @param {Array} array - 셔플할 배열
 * @returns {Array} 셔플된 새 배열
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 랜덤 모둠 배정
 * 학생을 섞어서 균등하게 배분
 *
 * @param {Array<string>} students - 학생 이름 배열
 * @param {number} groupSize - 모둠당 인원 수
 * @param {number} groupCount - 모둠 수
 * @param {Array<string>} [groupNames] - 모둠 이름 배열
 * @returns {Array<Object>} 모둠 배열
 *   - id: 모둠 번호 (1부터 시작)
 *   - name: 모둠 이름
 *   - members: 학생 이름 배열
 */
function assignRandom(students, groupSize, groupCount, groupNames = []) {
  const shuffled = shuffle(students);
  const groups = [];

  // 기본 배정
  for (let i = 0; i < groupCount; i++) {
    const start = i * groupSize;
    groups.push({
      id: i + 1,
      name: groupNames[i] || `${i + 1}모둠`,
      members: shuffled.slice(start, start + groupSize),
    });
  }

  // 남는 학생 → 랜덤 모둠에 분배
  const remaining = shuffled.slice(groupCount * groupSize);
  if (remaining.length > 0) {
    const randomIndices = shuffle([...Array(groupCount).keys()]);
    remaining.forEach((name, i) => {
      groups[randomIndices[i % groupCount]].members.push(name);
    });
  }

  return groups;
}

/**
 * 고정 모둠 배정
 * 학급의 기존 모둠 구조 유지, 현재 참가자만 필터링
 *
 * @param {Array<string>} currentStudents - 현재 참가 학생
 * @param {Array<Array>} savedGroups - 저장된 모둠 배열
 * @param {Array<string>} [groupNames] - 모둠 이름 배열
 * @param {boolean} [markLeader=true] - 첫 번째 학생을 리더로 표시
 * @returns {Array<Object>} 모둠 배열
 */
function assignFixed(currentStudents, savedGroups, groupNames = [], markLeader = true) {
  const studentSet = new Set(currentStudents);
  const groups = [];

  for (let i = 0; i < savedGroups.length; i++) {
    const savedMembers = savedGroups[i] || [];

    // 현재 참가 중인 학생만 필터링
    const activeMembers = savedMembers.filter(m => {
      const name = typeof m === 'string' ? m : m.name;
      return studentSet.has(name);
    });

    // 리더 표시 (옵션)
    const formattedMembers = markLeader
      ? activeMembers.map((m, idx) => {
          const name = typeof m === 'string' ? m : m.name;
          return idx === 0 ? `⭐ ${name}` : name;
        })
      : activeMembers.map(m => (typeof m === 'string' ? m : m.name));

    groups.push({
      id: i + 1,
      name: groupNames[i] || `${i + 1}모둠`,
      members: formattedMembers,
    });
  }

  return groups;
}

/**
 * 모둠 배정 (자동 모드 선택)
 * 설정에 따라 랜덤 또는 고정 모둠 배정
 *
 * @param {Object} config - 배정 설정
 * @param {Array<string>} config.students - 학생 이름 배열
 * @param {number} config.groupSize - 모둠당 인원 수
 * @param {number} config.groupCount - 모둠 수
 * @param {Array<string>} [config.groupNames] - 모둠 이름 배열
 * @param {boolean} [config.isFixed] - 고정 모둠 사용 여부
 * @param {Array<Array>} [config.savedGroups] - 저장된 모둠 (고정 모드)
 * @returns {Array<Object>} 모둠 배열
 */
function assign(config) {
  const {
    students,
    groupSize,
    groupCount,
    groupNames = [],
    isFixed = false,
    savedGroups = [],
  } = config;

  if (isFixed && savedGroups.length > 0) {
    return assignFixed(students, savedGroups, groupNames);
  }

  return assignRandom(students, groupSize, groupCount, groupNames);
}

/**
 * 배정 결과 통계
 *
 * @param {Array<Object>} groups - 모둠 배열
 * @returns {Object} 통계
 *   - totalStudents: 전체 학생 수
 *   - averageSize: 평균 모둠 크기
 *   - minSize: 최소 모둠 크기
 *   - maxSize: 최대 모둠 크기
 *   - isBalanced: 균형 여부 (최대-최소 <= 1)
 */
function getStats(groups) {
  const sizes = groups.map(g => g.members.length);
  const totalStudents = sizes.reduce((a, b) => a + b, 0);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);

  return {
    totalStudents,
    averageSize: (totalStudents / groups.length).toFixed(1),
    minSize,
    maxSize,
    isBalanced: maxSize - minSize <= 1,
  };
}

export const GroupPicker = {
  assign,
  assignRandom,
  assignFixed,
  getStats,
  shuffle,
};
