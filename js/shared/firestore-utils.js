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

  const next = rawGroups.map(group => {
    // 새 인코딩 형식: JSON 문자열로 저장된 모둠을 배열로 파싱
    if (typeof group === 'string') {
      try {
        group = JSON.parse(group);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(group)) return [];
    // null 슬롯(빈 자리) 보존
    return group.map(member => {
      if (member === null || member === undefined) return null;
      const name = normalizeStudentName(toNameArray(member));
      return name || null;
    });
  });

  if (next.length === 0 && fallbackCount > 0) {
    return Array.from({ length: fallbackCount }, () => []);
  }

  return next;
}
