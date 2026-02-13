# 🏃 PePick! - 체육 수업 도구

초등 체육 수업을 위한 올인원 웹 애플리케이션

## ✨ 주요 기능

### 🎲 술래뽑기
- 랜덤 술래/천사 선정
- 중복 제외 옵션
- 뽑기 이력 관리
- 후보자 풀 자동 관리

### 👥 모둠뽑기
- 랜덤 모둠 구성
- 고정 모둠 지원
- 모둠별 쿠키 점수 관리
- 인원 자동 분배

### 📚 학급 관리
- 다중 학급 지원
- 학생 정보 관리
- 모둠 구성 저장
- CSV/구글 시트 가져오기

## 🚀 빠른 시작

### 설치

```bash
# 저장소 클론
git clone [repository-url]

# 의존성 설치 (개발 도구용)
npm install
```

### 실행

웹 브라우저로 `index.html` 열기 또는 로컬 서버 실행:

```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server
```

브라우저에서 `http://localhost:8000` 접속

## 📁 프로젝트 구조

```
pe-picker/
├── index.html              # 메인 페이지
├── login.html              # 로그인 페이지
├── css/                    # 스타일시트
│   ├── design-system.css   # 디자인 시스템
│   └── ...
├── js/
│   ├── types.js            # 공통 타입 정의
│   ├── storage/            # 데이터 저장 계층
│   │   ├── base-repo.js    # 공통 헬퍼
│   │   ├── class-repo.js   # 학급 관리
│   │   ├── tag-game-repo.js # 술래뽑기 상태
│   │   ├── group-manager-repo.js # 모둠 관리
│   │   ├── settings-repo.js # 설정
│   │   └── teacher-repo.js # 교사 프로필
│   ├── core/               # 핵심 비즈니스 로직
│   │   ├── tag-picker.js   # 뽑기 알고리즘
│   │   └── group-picker.js # 배정 알고리즘
│   ├── shared/             # 공통 모듈
│   │   ├── store.js        # Facade 패턴
│   │   ├── ui-utils.js     # UI 유틸리티
│   │   ├── class-manager.js # 학급 UI 관리
│   │   └── ...
│   ├── tag-game/           # 술래뽑기 모듈
│   ├── group-manager/      # 모둠뽑기 모듈
│   └── ...
└── ...
```

자세한 내용은 [ARCHITECTURE.md](ARCHITECTURE.md) 참조

## 🛠 개발

### 코드 검사

```bash
# ESLint 검사
npm run lint

# 자동 수정
npm run lint:fix
```

### 코드 포매팅

```bash
# Prettier 포매팅
npm run format

# 포맷 확인
npm run format:check
```

## 💾 데이터 저장

### 현재: Local-First

- 모든 데이터는 브라우저 `localStorage`에 저장
- 오프라인 완전 지원
- 기기별 독립적

### 향후: Firebase 동기화 (계획)

- Google 로그인
- 클라우드 데이터 동기화
- 다중 기기 지원

## 📱 지원 브라우저

- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+

모바일 브라우저 완전 지원 (iOS Safari, Chrome Mobile)

## 🏗 기술 스택

- **Frontend**: Vanilla JavaScript (ES6+)
- **Storage**: localStorage (향후 Firestore)
- **Auth**: Firebase Auth (구현 예정)
- **UI**: Custom CSS + Design System
- **Code Quality**: ESLint, Prettier

## 📄 라이선스

MIT License

## 🤝 기여

이슈와 PR 환영합니다!

## 📞 문의

[연락처 정보]

---

**만든이**: 초등 교사 × 개발자
**목적**: 체육 수업의 모든 순간을 쉽고 재미있게
