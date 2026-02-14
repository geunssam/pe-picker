/**
 * Firestore의 groups 맵을 로컬 배열로 변환
 * @param {Object|Array} rawGroups - Firestore에서 읽은 groups 데이터
 * @param {number} [groupCount=6] - 모둠 수
 * @returns {Array<Array>}
 */
export function decodeGroupsFromFirestore(rawGroups, groupCount = 6) {
  if (Array.isArray(rawGroups)) return rawGroups;
  if (!rawGroups || typeof rawGroups !== 'object') {
    return Array.from({ length: groupCount }, () => []);
  }

  const entries = Object.entries(rawGroups);
  if (entries.length === 0) {
    return Array.from({ length: groupCount }, () => []);
  }

  const ordered = entries
    .map(([key, members]) => {
      const numeric = parseInt(String(key).replace(/\D/g, ''), 10);
      return {
        index: Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER,
        members: Array.isArray(members) ? members : [],
      };
    })
    .sort((a, b) => a.index - b.index);

  const groups = ordered.map(item => item.members);
  while (groups.length < groupCount) {
    groups.push([]);
  }
  return groups;
}
