# PRD007 | 우리넷 🤝

> 정원주 · 이재원 · 조훈경 · 한성훈 4인 한정 프라이빗 웹앱

## 타겟 고객
친한 친구 4명이 모임, 추억, 목표를 함께 관리하는 개인 공간

## 기술 스택
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS 3
- Prisma ORM + SQLite (로컬) / PostgreSQL (Supabase, 프로덕션)
- JWT 쿠키 세션 + bcryptjs PIN 해싱
- Vercel 배포

## 핵심 기능

### 인증
- 4인 한정 이름 선택 (정원주 / 이재원 / 조훈경 / 한성훈)
- 첫 방문: 이름 선택 → PIN 4자리 설정
- 재방문: 이름 + PIN 입력
- JWT HttpOnly 쿠키 (30일 유지)

### 탭 구성
| 탭 | 기능 |
|----|------|
| 🏠 피드 | 텍스트/이미지 포스팅, 하트 반응 |
| 📅 모임 | 날짜 제안 + 4인 투표로 모임 확정 |
| 🎯 목표 | 개인/공동 목표 생성 + 진행도 추적 |
| 🗺️ 지도 | 방문 장소 기록 + 한줄평 + 별점 |
| 💬 채팅 | 그룹 채팅 (10초 폴링) |

## 실행 방법

```bash
# 1. 환경변수 설정
cp .env.local.example .env.local
# .env.local 열어서 JWT_SECRET 값 변경

# 2. 의존성 설치
npm install

# 3. DB 초기화
npx prisma migrate dev --name init

# 4. 개발 서버 시작
npm run dev
# → http://localhost:3007

# 5. 같은 네트워크 폰에서 접속
# → http://[내 IP]:3007
```

## 배포 (Vercel + Supabase)

```bash
# Supabase에서 PostgreSQL URL 발급 후 .env.local 수정:
# DATABASE_URL="postgresql://..."

# Vercel 배포:
npx vercel --prod
# Vercel 환경변수에 JWT_SECRET, DATABASE_URL 설정
```

## 파일 구조
```
src/
├── app/
│   ├── page.tsx          # 로그인 페이지
│   ├── home/page.tsx     # 메인 탭 화면
│   └── api/              # API 라우트
├── components/           # 탭별 컴포넌트
│   ├── feed/
│   ├── meetup/
│   ├── goals/
│   ├── map/
│   └── chat/
└── lib/
    ├── auth.ts           # JWT 세션
    ├── db.ts             # Prisma 클라이언트
    └── constants.ts      # 멤버 목록 등
```

## 외주 단가 참고
개인 프로젝트 (비매매)

## 작업일
2026-03-24

## 연관 강의
미정
