# PEPick! - 체육 수업 랜덤 활동 도우미

초등 체육 수업을 위한 올인원 웹 애플리케이션 (술래뽑기 + 모둠뽑기)

## 주요 기능

### 술래뽑기

- 랜덤 술래/천사 선정 (인원수 조절 가능)
- 중복 제외 옵션 및 뽑기 이력 관리
- 전체화면 타이머 + 휘슬

### 모둠뽑기

- 랜덤 / 고정 모둠 구성
- 모둠 이름 커스텀 (숫자순, 학급 설정, 즉석)
- 인원 자동 분배 (남는/부족 학생 처리)

### 학급 관리

- 다중 학급 지원 + Google 로그인 클라우드 동기화
- 학생 명렬표 CRUD + CSV/구글시트 가져오기
- 모둠 구성 저장 (드래그앤드롭 배치)
- 5단계 온보딩 위저드

### 기타

- 만능 휘슬 FAB (꾹 누르기 / 길게 / 삐삐삐)
- PWA 오프라인 지원
- 반응형 모바일/태블릿/데스크톱

## 기술 스택

- **Frontend**: Vanilla JavaScript (ES6+ Modules)
- **빌드**: Vite 7
- **인증**: Firebase Auth (Google OAuth)
- **DB**: Firestore + localStorage (Local-First)
- **스타일**: Custom CSS Design System
- **배포**: Netlify
- **코드 품질**: ESLint, Prettier, Husky + lint-staged

## 빠른 시작

```bash
# 저장소 클론
git clone https://github.com/geunssam/pe-picker.git
cd pe-picker

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

## 개발 명령어

```bash
npm run dev          # Vite 개발 서버 (HMR)
npm run build        # 프로덕션 빌드 → dist/
npm run preview      # 빌드 결과 로컬 미리보기
npm run lint         # ESLint 검사
npm run lint:fix     # ESLint 자동 수정
npm run format       # Prettier 포매팅
npm run deploy       # 빌드 + Netlify 배포
```

## 프로젝트 구조

```
pe-picker/
├── index.html                 # 앱 셸 (스플래시, 토스트, 스크립트)
├── login.html                 # 로그인 페이지
├── templates/                 # HTML 조각 (Vite ?raw import)
│   ├── navbar.html            # 상단 네비바
│   ├── whistle-fab.html       # 휘슬 FAB + 패널
│   ├── pages/                 # 5개 페이지 뷰
│   │   ├── class-selector.html
│   │   ├── tag-game.html
│   │   ├── group-manager.html
│   │   ├── settings.html
│   │   └── wizard.html
│   └── modals/                # 11개 모달
│       ├── class-roster.html
│       ├── class-team.html
│       └── ...
├── js/
│   ├── app.js                 # 메인 진입점 (라우팅, 초기화)
│   ├── template-loader.js     # HTML 템플릿 조립
│   ├── core/                  # 순수 알고리즘 (DOM/Storage 접근 금지)
│   ├── storage/               # localStorage Repository 계층
│   ├── shared/                # 공용 유틸리티 (store, ui-utils 등)
│   ├── class-management/      # 학급 관리 모듈
│   ├── tag-game/              # 술래뽑기 모듈
│   └── group-manager/         # 모둠뽑기 모듈
├── css/                       # 스타일시트
└── assets/                    # 로고, 사운드 등 정적 자산
```

## 아키텍처 요약

- **HTML 템플릿 패턴**: `index.html`은 최소 셸만 포함. `templates/` 폴더의 HTML 조각들을 Vite `?raw` import로 가져와 `template-loader.js`에서 DOM에 조립
- **Repository 패턴**: `storage/*-repo.js` → `shared/store.js` Facade
- **Fisher-Yates 셔플**: `shared/ui-utils.js`의 유일한 셔플 함수 사용
- **Firebase compat SDK**: `<script>` 태그로 로드 (ESM 미지원)

## 배포

```bash
# 프로덕션 배포 (Netlify)
npm run deploy

# Firestore 규칙만 배포
firebase deploy --only firestore:rules
```

## 라이선스

MIT License

---

**만든이**: 초등 교사 x 개발자
**목적**: 체육 수업의 모든 순간을 쉽고 재미있게
