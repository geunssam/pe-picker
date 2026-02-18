/* ============================================
   PE Picker - Type Definitions
   JSDoc typedef로 공통 타입 정의
   ============================================ */

/**
 * 학생 객체 (확장형)
 * @typedef {Object} Student
 * @property {string} id - 고유 ID
 * @property {string} name - 학생 이름
 * @property {number} number - 번호 (출석번호)
 * @property {string} gender - 성별 ('male'|'female'|'')
 * @property {string} team - 소속 모둠 이름 (예: '1모둠', '' 미배정)
 * @property {string} sportsAbility - 운동 능력 ('high'|'medium'|'low'|'')
 * @property {string[]} tags - 태그 배열
 * @property {string} note - 메모
 */

/**
 * 학급 객체
 * @typedef {Object} Class
 * @property {string} id - 학급 ID
 * @property {string} name - 학급명
 * @property {(Student|string)[]} students - 학생 배열 (확장형 또는 이름만)
 * @property {string[]} teamNames - 모둠 이름 배열
 * @property {Array<Array<Student|string>>} teams - 모둠 배열 (2차원)
 * @property {number} teamCount - 모둠 수
 * @property {string} createdAt - 생성 일시 (ISO 8601)
 */

/**
 * 술래뽑기 게임 상태
 * @typedef {Object} TagGameState
 * @property {number} currentPhase - 현재 단계 (1: 설정, 2: 결과, 3: 타이머)
 * @property {number} currentRound - 현재 라운드
 * @property {string[]} participants - 참가자 목록
 * @property {string[]} selectedIts - 현재 라운드 술래
 * @property {string[]} selectedAngels - 현재 라운드 천사
 * @property {string[]} availableForIt - 술래 후보 풀
 * @property {string[]} availableForAngel - 천사 후보 풀
 * @property {TagGameSettings} gameSettings - 게임 설정
 * @property {string} gameState - 게임 상태 ('ready'|'picking'|'picked'|'timer')
 * @property {string[]} allItsHistory - 전체 술래 이력
 * @property {string[]} allAngelsHistory - 전체 천사 이력
 * @property {string} lastUpdated - 마지막 업데이트 시각
 */

/**
 * 술래뽑기 게임 설정
 * @typedef {Object} TagGameSettings
 * @property {number} studentCount - 총 학생 수
 * @property {number} itCount - 술래 수
 * @property {number} angelCount - 천사 수
 * @property {number} timerSeconds - 타이머 시간 (초)
 * @property {boolean} excludePrevious - 중복 제외 여부
 */

/**
 * 모둠 객체
 * @typedef {Object} Group
 * @property {number} id - 모둠 번호
 * @property {string} name - 모둠 이름
 * @property {string[]} members - 모둠원 이름 배열
 * @property {number} [cookies] - 쿠키 수 (선택)
 */

/**
 * 쿠키 기록
 * @typedef {Object} CookieRecord
 * @property {string} id - 기록 ID
 * @property {string} date - 기록 날짜 (ISO 8601)
 * @property {string} classId - 학급 ID
 * @property {Array<{id: number, members: string[], cookies: number}>} teams - 모둠 기록
 */

/**
 * 앱 설정
 * @typedef {Object} AppSettings
 * @property {string} cookieMode - 쿠키 모드 ('session'|'persistent')
 * @property {string} timerMode - 타이머 모드 ('global'|'per-group')
 * @property {number} defaultTime - 기본 시간 (초)
 * @property {string} timerAlert - 알림 방식 ('soundAndVisual'|'sound'|'visual'|'none')
 * @property {boolean} animationEnabled - 애니메이션 활성화
 * @property {string[]} defaultTeamNames - 기본 모둠 이름 배열
 */

/**
 * 교사 프로필
 * @typedef {Object} TeacherProfile
 * @property {string} [name] - 교사 이름
 * @property {string} [school] - 학교명
 * @property {boolean} isOnboarded - 온보딩 완료 여부
 * @property {string} onboardedAt - 온보딩 완료 시각 (ISO 8601)
 */

/**
 * 뽑기 결과 (술래/천사)
 * @typedef {Object} PickResult
 * @property {string[]} finalGroup - 최종 뽑힌 그룹
 * @property {string[]} newPicks - 새로 뽑힌 사람들 (후보 풀에서)
 */

/**
 * 뽑기 설정 (술래/천사)
 * @typedef {Object} PickConfig
 * @property {number} itCount - 술래 수
 * @property {number} angelCount - 천사 수
 * @property {string[]} availableForIt - 술래 후보 풀
 * @property {string[]} availableForAngel - 천사 후보 풀
 * @property {string[]} participants - 전체 참가자
 * @property {boolean} excludePrevious - 중복 제외 여부
 */

/**
 * 모둠 배정 설정
 * @typedef {Object} TeamAssignConfig
 * @property {string[]} students - 학생 이름 배열
 * @property {number} teamSize - 모둠당 인원 수
 * @property {number} teamCount - 모둠 수
 * @property {string[]} [teamNames] - 모둠 이름 배열
 * @property {boolean} [isFixed] - 고정 모둠 사용 여부
 * @property {Array<Array>} [savedTeams] - 저장된 모둠 (고정 모드)
 */

/**
 * 모둠 배정 통계
 * @typedef {Object} GroupStats
 * @property {number} totalStudents - 전체 학생 수
 * @property {string} averageSize - 평균 모둠 크기
 * @property {number} minSize - 최소 모둠 크기
 * @property {number} maxSize - 최대 모둠 크기
 * @property {boolean} isBalanced - 균형 여부
 */
