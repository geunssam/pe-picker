# Firestore 데이터베이스 스키마

PePick! Firestore 데이터 구조 문서

## 🏗️ 전체 구조 개요

```
users/{userId}/
├── (user document fields)
└── classes/{classId}/
    ├── (class document fields)
    └── students/{studentId}/
        └── (student document fields)
```

---

## 📚 컬렉션 상세

### 1️⃣ `users` (최상위 컬렉션)

**목적**: 로그인한 교사 정보 저장

**Document ID**: Firebase Auth UID (자동 생성)

**필드**:
```typescript
{
  email: string;              // "teacher@school.com"
  displayName: string;        // "홍길동"
  photoURL: string | null;    // Google 프로필 이미지
  createdAt: Timestamp;       // 계정 생성 시각
  updatedAt: Timestamp;       // 마지막 업데이트 시각

  // 선택적 필드 (추후 추가 가능)
  schoolName?: string;        // "○○초등학교"
  phoneNumber?: string;       // "010-1234-5678"
  preferences?: {             // 사용자 설정
    theme: string;
    notifications: boolean;
  };
}
```

**예시**:
```json
{
  "email": "teacher@example.com",
  "displayName": "홍길동",
  "photoURL": "https://lh3.googleusercontent.com/...",
  "createdAt": "2025-02-12T10:30:00Z",
  "updatedAt": "2025-02-12T10:30:00Z"
}
```

---

### 2️⃣ `users/{userId}/classes` (서브컬렉션)

**목적**: 교사가 담당하는 학급들

**Document ID**: 자동 생성 또는 커스텀 (`class-001`, `class-002`)

**필드**:
```typescript
{
  name: string;                   // "5-1" 또는 "6학년 2반"
  year: number;                   // 2025 (학년도)
  grade?: number;                 // 5 (학년)
  studentCount: number;           // 20 (학생 수, 실시간 계산 or 캐시)

  // 모둠 관련
  groupNames: string[];           // ["열정팀", "도전팀", "성장팀", ...]
  groups: string[][];             // [["김철수", "이영희"], ["박민수", ...]]

  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // 선택적 필드
  description?: string;           // "체육 전담반"
  color?: string;                 // "#FF5733" (학급 색상)
  archived?: boolean;             // false (졸업/종료된 학급)
}
```

**예시**:
```json
{
  "name": "5-1",
  "year": 2025,
  "grade": 5,
  "studentCount": 20,
  "groupNames": ["열정팀", "도전팀", "성장팀", "협력팀", "우정팀"],
  "groups": [
    ["김철수", "이영희", "박민수", "최지훈"],
    ["정수진", "강미래", "윤서준", "임하은"],
    ...
  ],
  "createdAt": "2025-03-01T09:00:00Z",
  "updatedAt": "2025-03-15T14:30:00Z",
  "description": "체육 전담반",
  "archived": false
}
```

---

### 3️⃣ `users/{userId}/classes/{classId}/students` (서브컬렉션)

**목적**: 학급의 학생 정보

**Document ID**: 자동 생성 또는 학생 번호 기반 (`student-001`)

**필드**:
```typescript
{
  name: string;                   // "김철수"
  number: number;                 // 1 (출석번호)
  gender?: "male" | "female";     // 선택적 성별 정보

  // 모둠 정보
  groupIndex?: number;            // 0 (소속 모둠 인덱스)
  groupName?: string;             // "열정팀" (캐시용)

  // 출결 및 상태
  attendance?: boolean;           // true (출석 여부)

  // 메타데이터
  createdAt: Timestamp;
  updatedAt?: Timestamp;

  // 선택적 필드 (추후 확장)
  notes?: string;                 // "리더십 있음"
  tags?: string[];                // ["체육부장", "리더"]
  avatar?: string;                // 프로필 이미지 URL
}
```

**예시**:
```json
{
  "name": "김철수",
  "number": 1,
  "gender": "male",
  "groupIndex": 0,
  "groupName": "열정팀",
  "attendance": true,
  "createdAt": "2025-03-01T09:00:00Z",
  "tags": ["체육부장"]
}
```

---

## ✅ 이 구조의 장점

### 1. **완벽한 데이터 격리**
- 각 교사의 데이터가 완전히 분리됨
- 다른 교사의 데이터 접근 불가능
- Security Rules로 자동 보호

### 2. **확장성**
```typescript
// 추후 추가 가능한 컬렉션들
users/{userId}/
├── classes/{classId}/
│   ├── students/{studentId}
│   ├── activities/{activityId}      // 수업 활동 기록
│   ├── assessments/{assessmentId}   // 평가 기록
│   └── schedules/{scheduleId}       // 시간표
├── templates/{templateId}            // 재사용 가능한 템플릿
└── settings/{settingId}              // 앱 설정
```

### 3. **효율적인 쿼리**
```javascript
// 특정 교사의 모든 학급
db.collection('users/{userId}/classes')

// 특정 학급의 모든 학생
db.collection('users/{userId}/classes/{classId}/students')
  .orderBy('number')

// 특정 학년의 학급만
db.collection('users/{userId}/classes')
  .where('grade', '==', 5)
  .where('archived', '==', false)
```

### 4. **충돌 방지**
- 각 교사가 독립적으로 작업
- 동시 수정 시 충돌 없음
- Transaction 사용으로 데이터 일관성 보장

### 5. **오프라인 지원**
```javascript
// Firestore 오프라인 지속성 활성화
firebase.firestore().enablePersistence()
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // 여러 탭에서 열림
    } else if (err.code == 'unimplemented') {
      // 브라우저가 지원하지 않음
    }
  });
```

---

## ⚠️ 주의사항

### 1. **studentCount 동기화**
학생을 추가/삭제할 때 `classes/{classId}.studentCount`를 수동으로 업데이트해야 합니다.

**해결책**: Cloud Functions 사용 (선택)
```javascript
// 학생이 추가/삭제될 때 자동으로 카운트 업데이트
exports.updateStudentCount = functions.firestore
  .document('users/{userId}/classes/{classId}/students/{studentId}')
  .onWrite((change, context) => {
    // studentCount 자동 업데이트
  });
```

### 2. **groups 배열 vs students 컬렉션**
현재는 두 곳에 모둠 정보가 있습니다:
- `classes.groups`: 전체 모둠 구성 (빠른 조회)
- `students.groupIndex`: 개별 학생의 소속 모둠

**동기화 전략**:
- 모둠 재편성 시 두 곳 모두 업데이트
- `groups`를 source of truth로 사용
- `students.groupIndex`는 캐시로 사용

### 3. **실시간 업데이트**
```javascript
// 학급 데이터 실시간 감지
db.collection('users/{userId}/classes/{classId}')
  .onSnapshot((doc) => {
    // 데이터 변경 시 자동 업데이트
    const classData = doc.data();
    updateUI(classData);
  });
```

---

## 🔄 대안 구조 (비교)

### 옵션 2: Flat Structure (추천하지 않음)

```
classes (collection) ← 최상위
├── {classId}
    ├── ownerId: string ← 교사 ID
    ├── name: string
    └── ...

students (collection) ← 최상위
├── {studentId}
    ├── classId: string ← 학급 ID
    ├── ownerId: string ← 교사 ID
    └── ...
```

**단점**:
- Security Rules 복잡해짐
- 데이터 격리 어려움
- 쿼리 시 항상 `ownerId` 필터 필요
- 실수로 다른 교사 데이터 접근 가능

---

## 📊 비용 추정

### Firestore 무료 할당량 (일일)
- 읽기: 50,000회
- 쓰기: 20,000회
- 삭제: 20,000회
- 저장공간: 1GB

### 예상 사용량 (교사 1명, 학급 6개, 학생 120명)
- **초기 로드**: 1회 (user) + 6회 (classes) + 120회 (students) = **127 reads**
- **학급 변경**: 1회 write
- **학생 추가**: 1회 write
- **모둠 재편성**: 1회 (class) + N회 (students) writes

**결론**: 일반적인 사용으로는 무료 할당량 충분! 🎉

---

## 🚀 구현 우선순위

### Phase 1: 기본 CRUD (우선)
- ✅ 학급 생성/조회/수정/삭제
- ✅ 학생 생성/조회/수정/삭제
- ✅ 로컬 ↔ Firestore 동기화

### Phase 2: 실시간 동기화
- 📡 여러 기기에서 자동 동기화
- 🔄 오프라인 지원

### Phase 3: 고급 기능
- 📊 수업 활동 기록
- 📈 학생 평가 데이터
- 📅 시간표 관리

---

## 📚 참고 자료

- [Firestore 데이터 모델링](https://firebase.google.com/docs/firestore/data-model)
- [Security Rules 가이드](https://firebase.google.com/docs/firestore/security/get-started)
- [베스트 프랙티스](https://firebase.google.com/docs/firestore/best-practices)

---

**마지막 업데이트**: 2025-02-12
**작성자**: Claude Sonnet 4.5
