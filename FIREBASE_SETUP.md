# Firebase 설정 가이드

PePick!에서 Google OAuth 로그인을 사용하려면 Firebase 프로젝트를 설정해야 합니다.

## 📋 준비사항

- Google 계정
- 5~10분 소요

## 🚀 설정 단계

### 1️⃣ Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. **"프로젝트 추가"** 클릭
3. 프로젝트 이름 입력 (예: `pe-picker`)
4. Google 애널리틱스는 선택사항 (건너뛰기 가능)
5. **"프로젝트 만들기"** 클릭

### 2️⃣ 웹 앱 추가

1. Firebase 프로젝트 대시보드에서 **웹 아이콘(</> )** 클릭
2. 앱 닉네임 입력 (예: `PePick Web`)
3. Firebase Hosting 설정은 건너뛰기
4. **"앱 등록"** 클릭
5. Firebase SDK 설정 코드가 표시됩니다 (복사해두기)

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 3️⃣ Google 로그인 활성화

1. 왼쪽 메뉴에서 **"Authentication"** 클릭
2. **"시작하기"** 클릭 (처음인 경우)
3. **"Sign-in method"** 탭 클릭
4. **"Google"** 선택
5. 토글 버튼을 **"사용 설정"**으로 변경
6. 프로젝트 공개용 이름 입력
7. 프로젝트 지원 이메일 선택
8. **"저장"** 클릭

### 4️⃣ 승인된 도메인 추가

1. Authentication > Settings > Authorized domains
2. 기본적으로 `localhost`와 Firebase Hosting 도메인이 추가되어 있습니다
3. Netlify 도메인 추가:
   - **"도메인 추가"** 클릭
   - `pe-picker.netlify.app` 입력
   - **"추가"** 클릭

### 5️⃣ 설정 파일 업데이트

`js/firebase-config.js` 파일을 열고, 2단계에서 복사한 설정값으로 교체합니다:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",           // 여기를 실제 값으로 교체
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## ✅ 테스트

1. 로컬 서버 실행:
   ```bash
   cd pe-picker
   python3 -m http.server 8000
   # 또는
   npx serve
   ```

2. 브라우저에서 `http://localhost:8000/login.html` 접속

3. **"Google로 로그인"** 버튼 클릭

4. Google 계정 선택 및 권한 승인

5. 로그인 성공 후 메인 페이지로 이동하는지 확인

## 🔒 보안 주의사항

### ⚠️ API Key는 공개되어도 괜찮습니다

Firebase API Key는 클라이언트 사이드에서 사용되므로 공개되어도 안전합니다. 실제 보안은 Firebase Security Rules로 관리됩니다.

### 🛡️ 권장 보안 설정

1. **API 키 제한 설정** (선택사항):
   - [Google Cloud Console](https://console.cloud.google.com/)
   - API 및 서비스 > 사용자 인증 정보
   - API 키 선택 > 애플리케이션 제한사항 설정

2. **도메인 제한**:
   - HTTP 리퍼러로 제한
   - 허용 도메인: `localhost`, `pe-picker.netlify.app`

## 🚀 배포 후 설정

Netlify에 배포한 후:

1. Firebase Console > Authentication > Settings > Authorized domains
2. 실제 배포 URL 추가 (예: `pe-picker.netlify.app`)
3. 저장

## 🆘 문제 해결

### "Firebase 설정이 완료되지 않았습니다" 메시지가 뜹니다

→ `js/firebase-config.js` 파일의 설정값을 확인하세요. `YOUR_API_KEY` 같은 placeholder가 남아있으면 안 됩니다.

### Google 로그인 팝업이 열리지 않습니다

→ 팝업 차단이 활성화되어 있는지 확인하세요. 브라우저 설정에서 팝업을 허용해야 합니다.

### "auth/unauthorized-domain" 에러

→ Firebase Console에서 현재 도메인이 승인된 도메인 목록에 있는지 확인하세요.

### 로컬에서는 작동하는데 배포 후 작동하지 않습니다

→ Netlify 도메인을 Firebase Console의 승인된 도메인에 추가했는지 확인하세요.

## 📚 추가 자료

- [Firebase Authentication 문서](https://firebase.google.com/docs/auth)
- [Google Sign-in 가이드](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase Console](https://console.firebase.google.com/)

---

설정 완료 후 이 파일은 삭제하거나 `.gitignore`에 추가하지 **마세요**.
다른 개발자나 미래의 자신을 위한 참고 문서로 유지하세요! 📖
