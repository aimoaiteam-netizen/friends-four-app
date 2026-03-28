-- Goal 테이블 마이그레이션: 기존 데이터를 새 스키마로 변환
-- prisma db push 후 실행

-- 1. 기존 목표를 numeric 타입으로 설정
UPDATE "Goal" SET "goalType" = 'numeric', "status" = 'active' WHERE "goalType" = 'numeric' OR "goalType" IS NULL;

-- 2. category → emoji 매핑
UPDATE "Goal" SET "emoji" = '⚖️' WHERE "emoji" = '🎯' AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Goal' AND column_name = 'category') IS FALSE;

-- 참고: category 컬럼이 이미 삭제된 경우 이 스크립트는 스킵됩니다.
-- prisma db push가 자동으로 새 필드에 기본값을 적용합니다.
