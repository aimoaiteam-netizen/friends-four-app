# 목표 기능 대대적 개편 — Design Spec

> 날짜: 2026-03-28

## Context

현재 목표 기능은 수치 기반 증가/감소 목표만 지원하며, 슬라이더로 진행률을 업데이트한다. 모바일에서 화면 스크롤 중 슬라이더가 의도치 않게 변경되는 UX 문제가 있고, 금연 100일 같은 날짜 기반 목표나 라면 끊기 같은 무한 도전 목표를 표현할 수 없다. 완료/실패된 목표의 기록도 남지 않는다.

## 목표 타입 (3가지)

### 1. 날짜 카운트 (`date_count`)
- **용도**: 금연 100일, 커피값 절약 30일 등 일수 기반 목표
- **동작**: 시작일로부터 자동으로 하루씩 증가, 수동 조작 없음
- **달성**: 목표 일수 도달 시 자동으로 `status: "completed"` → 기록 탭으로 이동
- **달성률**: `(경과일 / 목표일수) × 100%`
- **생성 시 입력 필드**: 제목, 이모지, 시작일, 목표 일수

### 2. 무한 레이스 (`infinite_race`)
- **용도**: 라면 끊기, 야식 안 먹기 등 끝 없는 도전
- **동작**: 시작일로부터 자동 카운트, 목표 일수 없음 (무한)
- **"🏳️ 항복!" 버튼**: 클릭 시 확인 모달 표시
  - "🔄 다시 도전": 최장 기록 저장 → 카운트 리셋(raceStartDate 갱신) → 계속 진행
  - "🚪 포기": 최장 기록 저장 → `status: "abandoned"` → 기록 탭으로 이동
- **최장 기록**: 항상 `bestRecord` 필드에 저장, 카드에 `🏆 최장 N일` 표시
- **프로그레스바**: 최장 기록 대비 현재 진행률 (`현재일 / bestRecord × 100%`), 첫 시도면 바 표시 안 함 또는 100%
- **생성 시 입력 필드**: 제목, 이모지, 시작일

### 3. 수치 목표 (`numeric`)
- **용도**: 체중 감량, 턱걸이 횟수 증가, 저축 등
- **동작**: 사용자가 수동으로 현재값 업데이트
- **진행률 업데이트 UI**: 슬라이더 제거 → **+/− 버튼 + 숫자 탭 직접입력**
  - +/− 버튼: `step` 필드에 따라 증감 (체중: 0.1, 턱걸이: 1)
  - 숫자 탭: 숫자 영역 클릭 시 인라인 입력 모드로 전환, 직접 입력 가능
  - 소유자만 조작 가능
- **방향**: 시작값 > 목표값이면 감소, 시작값 < 목표값이면 증가 (자동 판별)
- **달성**: progress가 target 도달 시 `status: "completed"` 처리 (수동 확인 후)
- **생성 시 입력 필드**: 제목, 이모지, 시작값, 목표값, 단위, 증감 단위(step), 기한

## 데이터 모델 변경

### Goal 모델 (Prisma)

```
Goal {
  id          Int        @id @default(autoincrement())
  title       String
  emoji       String     @default("🎯")   // 새 필드: 목표 이모지
  goalType    String     // "date_count" | "infinite_race" | "numeric"
  status      String     @default("active") // "active" | "completed" | "abandoned"
  ownerId     Int?       // 유지: 생성자 = 수정 권한자, null이면 공동 목표
  owner       User?      @relation(...)

  // 날짜 카운트 + 무한 레이스 공통
  startDate   String?    // 시작일 (ISO date string)
  targetDays  Int?       // 목표 일수 (date_count만, infinite_race는 null)

  // 무한 레이스 전용
  bestRecord    Int      @default(0)  // 최장 기록 (일)
  raceStartDate String?  // 현재 레이스 시작일 (리셋마다 갱신)

  // 수치 목표 전용 (기존 필드 재활용)
  startValue  Float      @default(0)
  progress    Float      @default(0)
  target      Float      @default(100)
  unit        String?
  step        Float?     // +/- 버튼 단위 (0.1, 1 등)
  deadline    String?

  // 삭제 필드
  // direction  → 제거 (startValue vs target 비교로 자동 판별)
  // type       → 제거 ("personal"/"shared" 필터 탭 제거)
  // category   → 제거 (goalType + emoji로 대체)

  comments    GoalComment[]
  completedAt DateTime?  // 새 필드: 완료/포기 시점
  createdAt   DateTime   @default(now())
}
```

### 마이그레이션 전략

1. 새 필드 추가 (`goalType`, `status`, `emoji`, `startDate`, `targetDays`, `bestRecord`, `raceStartDate`, `step`, `completedAt`)
2. 기존 데이터 변환:
   - 모든 기존 목표 → `goalType: "numeric"`, `status: "active"`
   - `category` 값으로 emoji 매핑 (체중→⚖️, 운동→💪, 저축→💰, 금연→🚭, 독서→📚, 기타→✨)
   - `direction` 제거 (프론트에서 startValue vs target 비교로 판별)
3. 구 필드 삭제 (`direction`, `type`, `category`)

## UI 구조

### 목표 탭 레이아웃

```
GoalsTab
├─ 서브탭: [진행중] [기록]     ← 세그먼트 컨트롤 (기존 전체/공동/개인 대체)
├─ (진행중 탭)
│  ├─ "🎯 새 목표 추가하기" 버튼
│  └─ GoalCard[] (status === "active")
│     ├─ 날짜 카운트 카드 (DateCountCard)
│     ├─ 무한 레이스 카드 (InfiniteRaceCard)
│     └─ 수치 목표 카드 (NumericCard)
└─ (기록 탭)
   ├─ 통계 요약 카드 (달성 수, 실패 수, 최장 레이스+목표명)
   └─ 기록 리스트 (status !== "active")
      └─ 왼쪽 보더 색상: 달성=초록, 실패/포기=빨강
```

### 카드 공통 요소
- 상단: 이모지 + 제목 + 타입 배지 (📅 자동 / ♾️ 레이스 / 📊 수치)
- 소유자 표시: 개인 목표 → `🐰 정원주`, 공동 목표 → `🤝 공동 목표` (연한 보더)
- 프로그레스 바 + 달성률 %
- 하단: 댓글 수 + 타입별 액션

### 목표 생성 폼
1. 먼저 3가지 타입 버튼 중 선택 (📅 날짜 카운트 / ♾️ 무한 레이스 / 📊 수치 목표)
2. 선택한 타입에 맞는 필드만 표시:
   - **공통**: 제목, 이모지 선택, 개인/공동 토글
   - **날짜 카운트**: 시작일 (기본: 오늘), 목표 일수
   - **무한 레이스**: 시작일 (기본: 오늘)
   - **수치 목표**: 시작값, 목표값, 단위, 증감 단위(step), 기한

## API 변경사항

### POST /api/goals (생성)
- 요청: `{ title, emoji, goalType, ownerId?, startDate?, targetDays?, startValue?, target?, unit?, step?, deadline? }`
- goalType에 따라 필수 필드 검증
- 무한 레이스: `raceStartDate = startDate`, `bestRecord = 0`
- 수치 목표: `progress = startValue`

### PATCH /api/goals/[id] (업데이트)
- **수치 목표 진행률**: `{ progress: number }` — 소유자만
- **무한 레이스 항복 → 다시 도전**: `{ action: "reset" }` — bestRecord 갱신 + raceStartDate 리셋
- **무한 레이스 항복 → 포기**: `{ action: "abandon" }` — bestRecord 갱신 + status: "abandoned" + completedAt 저장
- **날짜 카운트 자동 완료**: 프론트에서 경과일 >= targetDays 감지 시 `{ action: "complete" }` 호출

### GET /api/goals
- `status` 쿼리 파라미터 추가: `?status=active` (진행중 탭), `?status=completed,abandoned` (기록 탭)
- 기록 탭 통계는 프론트에서 계산 (목록 데이터로 충분)

### DELETE /api/goals/[id]
- 기존과 동일, 소유자만 삭제 가능

### 권한 모델
- **개인 목표** (ownerId 있음): 소유자만 진행률 수정, 항복, 삭제 가능
- **공동 목표** (ownerId = null): 로그인한 모든 멤버가 진행률 수정, 항복 가능. 삭제는 불가 (또는 관리자만)

## 수정 대상 파일

| 파일 | 변경 내용 |
|------|----------|
| `prisma/schema.prisma` | Goal 모델 필드 추가/삭제 |
| `prisma/migrations/` | 마이그레이션 SQL |
| `src/lib/constants.ts` | GOAL_CATEGORIES 제거, GOAL_TYPES 추가 |
| `src/components/goals/GoalsTab.tsx` | 서브탭(진행중/기록), 필터 탭 제거, 생성 폼 개편 |
| `src/components/goals/GoalCard.tsx` | 3가지 타입별 카드 렌더링, 슬라이더→버튼 UI |
| `src/app/api/goals/route.ts` | POST 생성 로직 변경, GET 필터 추가 |
| `src/app/api/goals/[id]/route.ts` | PATCH 액션 추가 (reset, abandon, complete) |
| `src/app/api/init/route.ts` | goals 쿼리 수정 (새 필드 포함) |

## 검증 방법

1. **마이그레이션**: `npx prisma migrate dev` 실행 후 기존 데이터가 `goalType: "numeric"`, `status: "active"`로 변환되었는지 확인
2. **목표 생성**: 3가지 타입 각각 생성하여 올바른 필드 저장 확인
3. **날짜 카운트**: 시작일을 과거로 설정 → 자동 일수 계산 확인 → targetDays 도달 시 완료 처리 확인
4. **무한 레이스**: 항복 → 다시 도전 시 카운트 리셋 + bestRecord 유지 확인, 포기 시 기록 탭 이동 확인
5. **수치 목표**: +/− 버튼 클릭 시 step 단위 증감 확인, 숫자 탭 직접입력 확인, 소유자 외 조작 불가 확인
6. **기록 탭**: 통계 요약 정확성, 달성/실패 구분 색상, 최장 레이스 목표명 표시 확인
7. **공동 목표**: 🤝 배지 표시, ownerId null 시 모든 멤버가 수정/항복 가능 확인
