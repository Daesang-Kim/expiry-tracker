# expiry-tracker

가족(부부) 공유형 유통기한 관리 앱. Expo(React Native) + Firebase 기반.

## 스택

- Expo SDK 57 / React Native 0.86 / TypeScript
- Expo Router (파일 기반 라우팅)
- Firebase: Auth(이메일/비밀번호), Firestore, Storage
- expo-notifications (로컬 알림 — D-3 / D-1 / D-day 고정)

## 1. 개발 환경

- Node.js LTS
- `npx expo ...` 로 CLI 사용 (전역 설치 불필요)
- iOS: Xcode + iOS 시뮬레이터
- Android: Android Studio + 에뮬레이터, 또는 실기기에 **Expo Go** 앱 설치

> ⚠️ **Expo Go 호환성 안내**: 현재 코드는 Firebase JS SDK(순수 JS)와 `expo-image-picker`, `expo-notifications`만 사용하므로 Expo Go에서 바로 실행됩니다. 다만 계획하신 **온디바이스 ML Kit OCR**은 네이티브 모듈이라 Expo Go에서 동작하지 않습니다 — 그 기능을 붙이는 시점부터는 커스텀 dev client(EAS Build 또는 `npx expo prebuild`)가 필요합니다.

## 2. Firebase 프로젝트 준비 (콘솔에서 직접)

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 생성
2. Firestore 활성화 (테스트 모드로 시작 가능 — 이 저장소의 [`firestore.rules`](./firestore.rules)로 나중에 교체)
3. Authentication → 이메일/비밀번호 로그인 방식 활성화
4. Storage 활성화 (사진 저장용)
5. Cloud Messaging(FCM) 설정 (원격 푸시 단계에서 필요)
6. iOS/Android 앱 등록 후 설정 파일 확보:
   - `google-services.json` (Android) → 프로젝트 루트에 배치
   - `GoogleService-Info.plist` (iOS) → 프로젝트 루트에 배치
   - Firebase Web config 값 → 아래 `.env`에 입력

두 설정 파일과 `.env`는 `.gitignore`에 이미 포함되어 있어 커밋되지 않습니다.

## 3. 환경 변수

```bash
cp .env.example .env
```

`.env`에 Firebase 콘솔의 웹 앱 설정값을 채워주세요:

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

## 4. 실행

```bash
npm install
npm run start      # Metro 시작, QR로 Expo Go 연결
npm run ios        # iOS 시뮬레이터
npm run android    # Android 에뮬레이터
npm run web         # 브라우저 (레이아웃/로직 빠른 확인용)
```

## 5. 설계 결정 (현재 반영된 기본값)

| 항목 | 결정 | 비고 |
|---|---|---|
| 번들 ID | `com.thor.expirytracker` | `app.json`의 `ios.bundleIdentifier` / `android.package` |
| OCR | 온디바이스 ML Kit (예정) | 아직 미설치 — dev client 전환 시점에 추가 |
| 알림 타이밍 | D-3 / D-1 / D-day 고정 | `src/services/notifications.ts`, `DEFAULT_NOTIFY_OFFSETS` |
| 초대 코드 UX | 회원가입 직후 입력/생성 화면 | `app/(auth)/invite.tsx` |
| 사진 보관 정책 | 기본적으로 저장 안 함 — OCR은 온디바이스에서 텍스트만 추출 예정. 사용자가 원할 때만 압축 썸네일(480px, JPEG)을 선택적으로 저장 | `app/(tabs)/add.tsx`의 "사진도 보관하기" 스위치 |
| 사진 보관 기간 | 보관을 선택한 썸네일도 **만료일로부터 30일 후 자동 삭제** | `src/services/cleanup.ts`, `DEFAULT_PHOTO_RETENTION_DAYS` |

## 6. 저장공간 관리

용량/과금 걱정을 줄이기 위한 정책:

- 사진은 **기본적으로 업로드하지 않음** — OCR 완료 후 원본은 버림. 필요 시에만 압축 썸네일을 선택적으로 저장.
- 저장하기로 한 썸네일도 **만료 30일 후 자동 삭제**됨. 앱 실행 시(탭 화면 진입) 조용히 백그라운드에서 정리를 시도하고, 설정 탭에서 사용량 확인 + "지금 정리하기" 버튼으로 수동 실행 가능.
- 이 규모(가족 단위, 항목 수백 개)에서는 Firebase Storage 무료 티어(5GB)로도 충분히 여유롭지만, 위 정책으로 실질적으로 거의 0에 가깝게 유지됩니다.

> ⚠️ `getHouseholdStorageUsage`/`purgeExpiredPhotos`가 사용하는 Firestore 쿼리(`householdId == ... AND photoPath != null`)는 복합 색인이 필요합니다. 앱을 처음 실행하면 콘솔 에러 메시지에 색인 생성 링크가 뜨는데, 그 링크로 한 번 색인을 만들어주세요.

## 7. 폴더 구조

```
app/                     Expo Router 화면
  (auth)/                 로그인 · 회원가입 · 초대코드
  (tabs)/                 홈(목록) · 추가 · 설정
src/
  contexts/AuthContext.tsx   로그인 상태 + household 연결 관리
  lib/firebase.ts            Firebase 앱/Auth/Firestore/Storage 초기화
  services/                  Firestore CRUD, 알림 스케줄링, 사진 업로드/정리
  types/                     공용 타입 정의
firestore.rules            Firestore 보안 규칙 (household 멤버만 접근)
storage.rules              Storage 보안 규칙 (household 멤버만 접근)
```

## 8. 다음 단계 (미구현)

- [ ] 온디바이스 ML Kit OCR 연동 (dev client 필요) — 촬영한 사진에서 텍스트 추출 후 원본은 버리는 흐름으로 연결
- [ ] 원격 푸시(FCM) — 현재는 로컬 알림만 스케줄링됨
- [ ] Google 로그인 (현재는 이메일/비밀번호만)
- [ ] Firestore/Storage 보안 규칙을 테스트 모드에서 각 `.rules` 파일로 교체 배포
- [ ] Firestore 복합 색인 생성 (`households`/`items` 쿼리용, 위 참고)
