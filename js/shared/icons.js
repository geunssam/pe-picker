/* ============================================
   PE Picker - SVG Icon Module
   Lucide 스타일 인라인 SVG 아이콘 중앙 관리
   ============================================ */

const attr = (s = 16) =>
  `class="icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;

export const Icons = {
  // 설정/뽑기
  settings: (s = 16) =>
    `<svg ${attr(s)}><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
  clipboard: (s = 16) =>
    `<svg ${attr(s)}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  target: (s = 16) =>
    `<svg ${attr(s)}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  runner: (s = 16) =>
    `<svg ${attr(s)}><circle cx="12" cy="5" r="2"/><path d="m7 21 3-9m0 0 2-2 4-1m-6 3-2.5-3.5L10 7l4.5 1.5M17 21l-2-8"/></svg>`,
  angel: (s = 16) =>
    `<svg ${attr(s)}><path d="M12 2a3 3 0 0 0 0 6 3 3 0 0 0 0-6z"/><path d="M12 8c-3 0-5 2-5 5v6h10v-6c0-3-2-5-5-5z"/><path d="M8 2.5C6.5 3.5 6 5 6 5"/><path d="M16 2.5c1.5 1 2 2.5 2 2.5"/></svg>`,
  scroll: (s = 16) =>
    `<svg ${attr(s)}><path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 3H8a2 2 0 0 0-2 2v12"/></svg>`,
  medal: (s = 16) =>
    `<svg ${attr(s)}><circle cx="12" cy="16" r="6"/><path d="M8.523 11.11 7 2l5 3 5-3-1.523 9.11"/></svg>`,
  thermometer: (s = 16) =>
    `<svg ${attr(s)}><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>`,
  barChart: (s = 16) => `<svg ${attr(s)}><path d="M12 20V10M18 20V4M6 20v-4"/></svg>`,
  trophy: (s = 16) =>
    `<svg ${attr(s)}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  users: (s = 16) =>
    `<svg ${attr(s)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  info: (s = 16) =>
    `<svg ${attr(s)}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  play: (s = 16) => `<svg ${attr(s)}><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  shuffle: (s = 16) =>
    `<svg ${attr(s)}><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/></svg>`,
  pencil: (s = 16) =>
    `<svg ${attr(s)}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
  listOrdered: (s = 16) =>
    `<svg ${attr(s)}><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,
  folderOpen: (s = 16) =>
    `<svg ${attr(s)}><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>`,
  rotateCcw: (s = 16) =>
    `<svg ${attr(s)}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
  download: (s = 16) =>
    `<svg ${attr(s)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  upload: (s = 16) =>
    `<svg ${attr(s)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  maximize: (s = 16) =>
    `<svg ${attr(s)}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`,
  pin: (s = 16) =>
    `<svg ${attr(s)}><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`,
  tag: (s = 16) =>
    `<svg ${attr(s)}><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>`,
  megaphone: (s = 16) =>
    `<svg ${attr(s)}><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`,
  volume2: (s = 16) =>
    `<svg ${attr(s)}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  volumeX: (s = 16) =>
    `<svg ${attr(s)}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>`,
  pause: (s = 16) =>
    `<svg ${attr(s)}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
  star: (s = 16) =>
    `<svg ${attr(s)}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  user: (s = 16) =>
    `<svg ${attr(s)}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  check: (s = 16) => `<svg ${attr(s)}><polyline points="20 6 9 17 4 12"/></svg>`,
  dice: (s = 16) =>
    `<svg ${attr(s)}><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none"/><circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  timer: (s = 16) =>
    `<svg ${attr(s)}><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6M22 6l-3-3M6.38 18.7 4 21M17.64 18.67 20 21"/></svg>`,
  school: (s = 16) =>
    `<svg ${attr(s)}><path d="m4 6 8-4 8 4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M14 22v-4a2 2 0 0 0-4 0v4"/><path d="M18 5v17"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/></svg>`,
  building: (s = 16) =>
    `<svg ${attr(s)}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>`,
  graduationCap: (s = 16) =>
    `<svg ${attr(s)}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 10 3 12 0v-5"/></svg>`,
  book: (s = 16) =>
    `<svg ${attr(s)}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  userPair: (s = 16) =>
    `<svg ${attr(s)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
};

/**
 * ⭐ 리더 마크를 SVG star 아이콘으로 치환하여 렌더링
 * 저장 데이터의 "⭐ 김철수" 형식은 변경하지 않고, 표시만 변경
 */
export function renderLeaderName(text) {
  if (typeof text !== 'string') return text;
  if (text.startsWith('⭐ ')) {
    const name = text.slice(2).trim();
    return `<span class="leader-mark">${Icons.star(14)}</span>${name}`;
  }
  return text;
}
