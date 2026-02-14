/* ============================================
   PE Picker - Tag Picker Core
   순수 술래/천사 뽑기 알고리즘
   UI와 상태 관리로부터 독립된 순수 함수
   ============================================ */

/**
 * Fisher-Yates 셔플 (간단 버전)
 * @param {Array} array - 셔플할 배열
 * @returns {Array} 셔플된 새 배열
 */
function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

/**
 * 후보 풀에서 지정된 수만큼 뽑기
 * 후보가 부족하면 전체 풀에서 보충
 *
 * @param {number} count - 뽑을 인원 수
 * @param {Array<string>} availablePool - 우선 후보 풀
 * @param {Array<string>} fullPlayerList - 전체 참가자 목록
 * @returns {{finalGroup: Array<string>, newPicks: Array<string>}}
 *   - finalGroup: 최종 뽑힌 사람들
 *   - newPicks: 후보 풀에서 새로 뽑힌 사람들
 */
function pickGroup(count, availablePool, fullPlayerList) {
  let pickedGroup = [];
  const shuffledAvailable = shuffle(availablePool);

  // 1) available에서 먼저 뽑기
  const newPicks = shuffledAvailable.slice(0, count);
  pickedGroup.push(...newPicks);

  // 2) 부족하면 전체에서 보충
  const needed = count - pickedGroup.length;
  if (needed > 0) {
    const replenishmentPool = fullPlayerList.filter(p => !pickedGroup.includes(p));
    const shuffledReplenish = shuffle(replenishmentPool);
    pickedGroup.push(...shuffledReplenish.slice(0, needed));
  }

  return { finalGroup: pickedGroup, newPicks };
}

/**
 * 술래와 천사 동시 뽑기
 *
 * @param {Object} config - 뽑기 설정
 * @param {number} config.itCount - 술래 수
 * @param {number} config.angelCount - 천사 수
 * @param {Array<string>} config.availableForIt - 술래 후보 풀
 * @param {Array<string>} config.availableForAngel - 천사 후보 풀
 * @param {Array<string>} config.participants - 전체 참가자
 * @param {boolean} config.excludePrevious - 중복 제외 여부
 * @returns {Object} 결과
 *   - its: 뽑힌 술래
 *   - angels: 뽑힌 천사
 *   - newAvailableForIt: 갱신된 술래 후보 풀
 *   - newAvailableForAngel: 갱신된 천사 후보 풀
 */
function pickItAndAngel(config) {
  const { itCount, angelCount, availableForIt, availableForAngel, participants, excludePrevious } =
    config;

  // 술래 뽑기
  const itResult = pickGroup(itCount, availableForIt, participants);
  const its = itResult.finalGroup;

  // 중복 제외 옵션에 따라 후보 풀 갱신
  let newAvailableForIt = excludePrevious
    ? availableForIt.filter(p => !itResult.newPicks.includes(p))
    : availableForIt;

  // 천사 뽑기 (술래와 중복 방지)
  let angels = [];
  let newAvailableForAngel = availableForAngel;

  if (angelCount > 0) {
    const angelCandidatePool = availableForAngel.filter(p => !its.includes(p));
    const fullAngelPlayerList = participants.filter(p => !its.includes(p));

    if (fullAngelPlayerList.length < angelCount) {
      throw new Error('천사를 뽑기에 인원이 부족합니다!');
    }

    const angelResult = pickGroup(angelCount, angelCandidatePool, fullAngelPlayerList);
    angels = angelResult.finalGroup;

    // 중복 제외 옵션에 따라 후보 풀 갱신
    newAvailableForAngel = excludePrevious
      ? availableForAngel.filter(p => !angelResult.newPicks.includes(p))
      : availableForAngel;
  }

  return {
    its,
    angels,
    newAvailableForIt,
    newAvailableForAngel,
  };
}

/**
 * 후보 풀 리셋 (중복 제외가 꺼져있을 때)
 *
 * @param {Array<string>} participants - 전체 참가자
 * @returns {{availableForIt: Array<string>, availableForAngel: Array<string>}}
 */
function resetPools(participants) {
  return {
    availableForIt: [...participants],
    availableForAngel: [...participants],
  };
}

export const TagPicker = {
  pickGroup,
  pickItAndAngel,
  resetPools,
  shuffle,
};
