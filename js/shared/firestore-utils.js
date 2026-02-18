function normalizeStudentName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toNameArray(item) {
  if (typeof item === 'string') return item.trim();
  if (!item || typeof item !== 'object') return '';

  if (typeof item.name === 'string') return item.name.trim();
  return '';
}

export function decodeTeamsFromFirestore(rawGroups = [], fallbackCount = 0) {
  if (!Array.isArray(rawGroups)) return [];

  const next = rawGroups
    .map(group => {
      // 새 인코딩 형식: JSON 문자열로 저장된 모둠을 배열로 파싱
      if (typeof group === 'string') {
        try {
          group = JSON.parse(group);
        } catch {
          return [];
        }
      }
      if (!Array.isArray(group)) return [];
      return group
        .map(toNameArray)
        .map(name => normalizeStudentName(name))
        .filter(Boolean);
    })
    .filter(group => Array.isArray(group) && group.length > 0);

  if (next.length === 0 && fallbackCount > 0) {
    return Array.from({ length: fallbackCount }, () => []);
  }

  return next;
}
