/* ============================================
   PE Picker - Badge Configuration
   배지 타입, 레벨 테이블, XP 상수
   ============================================ */

// ── 배지 이미지 import (Vite가 해시 경로로 변환) ──
import imgCooperation from '../../../assets/badges/협동.png';
import imgRespect from '../../../assets/badges/존중.png';
import imgConsideration from '../../../assets/badges/배려.png';
import imgSafety from '../../../assets/badges/안전.png';
import imgLeadership from '../../../assets/badges/리더십.png';
import imgTeamwork from '../../../assets/badges/팀워크.png';
import imgFairplay from '../../../assets/badges/페어플레이.png';
import imgVictory from '../../../assets/badges/승리.png';
import imgChallenge from '../../../assets/badges/도전.png';
import imgPositivity from '../../../assets/badges/긍정.png';

/** 배지 1개당 XP */
export const XP_PER_BADGE = 10;

/** 배지 10종 정의 */
export const BADGE_TYPES = {
  cooperation: {
    name: '협동',
    emoji: '🧩',
    image: imgCooperation,
    color: '#f5a67c',
    desc: '친구와 합심하여 미션/경기 진행 시 부여',
  },
  respect: {
    name: '존중',
    emoji: '❤️',
    image: imgRespect,
    color: '#a78bfa',
    desc: '친구의 의견을 존중할 경우 부여',
  },
  consideration: {
    name: '배려',
    emoji: '🕊️',
    image: imgConsideration,
    color: '#67e8f9',
    desc: '친구를 배려한 경기 진행 시 부여',
  },
  safety: {
    name: '안전',
    emoji: '🛡️',
    image: imgSafety,
    color: '#bef264',
    desc: '무리하지 않고 안전하게 경기 진행 시 부여',
  },
  leadership: {
    name: '리더십',
    emoji: '👑',
    image: imgLeadership,
    color: '#f57c7c',
    desc: '친구들을 잘 이끌어 미션/경기 진행 시 부여',
  },
  teamwork: {
    name: '팀워크',
    emoji: '🤝',
    image: imgTeamwork,
    color: '#7c9ef5',
    desc: '여러 명이서 기지를 발휘했을 때 부여',
  },
  fairplay: {
    name: '페어플레이',
    emoji: '⚖️',
    image: imgFairplay,
    color: '#60a5fa',
    desc: '공정하게 경기의 규칙을 준수 시 부여',
  },
  victory: {
    name: '승리',
    emoji: '🏆',
    image: imgVictory,
    color: '#fb7185',
    desc: '게임에서 최종 승리 시 부여',
  },
  challenge: {
    name: '도전',
    emoji: '🚩',
    image: imgChallenge,
    color: '#f97316',
    desc: '본인 목표와 어려운 과제에 도전할 시 부여',
  },
  positivity: {
    name: '긍정',
    emoji: '😊',
    image: imgPositivity,
    color: '#a3e635',
    desc: '밝은 모습으로 활동에 참여할 시 부여',
  },
};

/** 배지 키 목록 (순서 고정) */
export const BADGE_KEYS = Object.keys(BADGE_TYPES);

/** 레벨 테이블 (Lv.1 ~ Lv.10) */
export const LEVEL_TABLE = [
  { level: 1, name: '새싹', minXp: 0 },
  { level: 2, name: '새싹+', minXp: 30 },
  { level: 3, name: '성장', minXp: 80 },
  { level: 4, name: '성장+', minXp: 160 },
  { level: 5, name: '도약', minXp: 280 },
  { level: 6, name: '도약+', minXp: 440 },
  { level: 7, name: '빛남', minXp: 650 },
  { level: 8, name: '빛남+', minXp: 920 },
  { level: 9, name: '전설', minXp: 1250 },
  { level: 10, name: '체육왕', minXp: 1650 },
];

/**
 * XP로 레벨 정보 계산
 * @param {number} xp - 누적 XP
 * @returns {{ level: number, name: string, minXp: number, nextXp: number|null, progress: number }}
 */
export function getLevelInfo(xp) {
  let current = LEVEL_TABLE[0];
  for (let i = LEVEL_TABLE.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_TABLE[i].minXp) {
      current = LEVEL_TABLE[i];
      break;
    }
  }
  const next = LEVEL_TABLE[current.level] || null; // 다음 레벨 (없으면 null = MAX)
  const nextXp = next ? next.minXp : null;
  const progress = nextXp ? (xp - current.minXp) / (nextXp - current.minXp) : 1;

  return {
    level: current.level,
    name: current.name,
    minXp: current.minXp,
    nextXp,
    progress: Math.min(1, Math.max(0, progress)),
  };
}

/** 기본 온도계 설정 */
export const DEFAULT_THERMOSTAT = {
  targetBadges: 200,
  milestones: [
    { temp: 20, reward: '야외 수업 1회' },
    { temp: 40, reward: '자유시간 2분' },
    { temp: 60, reward: '과자파티' },
    { temp: 70, reward: '교장놀이 1시간' },
    { temp: 90, reward: '체육 1시간!' },
    { temp: 100, reward: '영화 보기' },
  ],
};
