-- ============================================
-- 시험 공부 플래너 - Supabase 테이블 설정
-- Supabase 대시보드 → SQL Editor에서 실행하세요.
-- ============================================

-- 기존 테이블 삭제 (재설정 시)
DROP TABLE IF EXISTS daily_plans;
DROP TABLE IF EXISTS subjects;

-- 1. 과목 테이블
CREATE TABLE subjects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  exam_date TEXT DEFAULT '미정',
  exam_range TEXT DEFAULT '',
  progress INTEGER DEFAULT 0
);

-- 2. 날짜별 계획 테이블
CREATE TABLE daily_plans (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  content TEXT DEFAULT '',
  hourly_schedule JSONB DEFAULT '{}'::jsonb
);

-- 과목 기본 데이터 삽입
INSERT INTO subjects (name, exam_date, exam_range, progress) VALUES
  ('국어', '미정', '', 0),
  ('영어', '미정', '', 0),
  ('수학', '미정', '', 0),
  ('과학', '미정', '', 0),
  ('사회', '미정', '', 0);

-- 6월 1일 ~ 7월 6일 날짜 데이터 삽입 (36일)
INSERT INTO daily_plans (date, content)
SELECT d::date, ''
FROM generate_series('2026-06-01'::date, '2026-07-06'::date, '1 day'::interval) AS d;

-- RLS 활성화 + 모든 접근 허용 정책 (단일 사용자용)
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects_allow_all" ON subjects
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_plans_allow_all" ON daily_plans
  FOR ALL USING (true) WITH CHECK (true);
