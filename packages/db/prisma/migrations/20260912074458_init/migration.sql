-- CreateEnum
CREATE TYPE "visa_code" AS ENUM ('D2', 'D4', 'E9', 'E74', 'F2', 'F4', 'F5', 'F6', 'OTHER');

-- CreateEnum
CREATE TYPE "degree_level" AS ENUM ('LANGUAGE', 'ASSOCIATE', 'BACHELOR_1_2', 'BACHELOR_3_4', 'MASTER', 'DOCTORATE', 'NONE');

-- CreateEnum
CREATE TYPE "korean_proficiency" AS ENUM ('NONE', 'TOPIK1', 'TOPIK2', 'TOPIK3', 'TOPIK4', 'TOPIK5', 'TOPIK6', 'KIIP1', 'KIIP2', 'KIIP3', 'KIIP4', 'KIIP5');

-- CreateEnum
CREATE TYPE "employment_form" AS ENUM ('DIRECT', 'DISPATCH', 'SUBCONTRACT', 'PLATFORM', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "eligibility_status" AS ENUM ('ELIGIBLE', 'CONDITIONAL', 'INELIGIBLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "source_risk_grade" AS ENUM ('C', 'B', 'A', 'S');

-- CreateEnum
CREATE TYPE "source_kind" AS ENUM ('PUBLIC_API', 'CRAWL', 'EMPLOYER_DIRECT', 'USER_SUBMISSION');

-- CreateEnum
CREATE TYPE "posting_status" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'TAKEDOWN');

-- CreateEnum
CREATE TYPE "rule_confidence" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "rule_type" AS ENUM ('WEEKLY_HOUR_CAP', 'INDUSTRY_ALLOW', 'INDUSTRY_DENY', 'EMPLOYMENT_FORM_DENY', 'COMMUTE_MAX_MINUTES', 'PERMIT_REQUIRED', 'REGION_LOCK', 'INDUSTRY_LOCK', 'KOREAN_LEVEL_MIN', 'CHANGE_COUNT_CAP');

-- CreateTable
CREATE TABLE "sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "kind" "source_kind" NOT NULL,
    "risk_grade" "source_risk_grade" NOT NULL,
    "base_url" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "disabled_reason" TEXT,
    "disabled_at" TIMESTAMPTZ(6),
    "robots_checked_at" TIMESTAMPTZ(6),
    "robots_allows" BOOLEAN,
    "tos_reviewed_at" TIMESTAMPTZ(6),
    "tos_prohibits_crawl" BOOLEAN,
    "requires_login" BOOLEAN NOT NULL DEFAULT false,
    "legal_note" TEXT,
    "min_interval_ms" INTEGER NOT NULL DEFAULT 3000,
    "max_concurrency" SMALLINT NOT NULL DEFAULT 1,
    "crawl_config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "fetched_count" INTEGER NOT NULL DEFAULT 0,
    "new_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,

    CONSTRAINT "crawl_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_postings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "crawl_run_id" UUID,
    "source_url" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "title_raw" TEXT,
    "body_raw" TEXT,
    "pii_masked" BOOLEAN NOT NULL DEFAULT false,
    "fetched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purge_after" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() + interval '7 days'),
    "purged_at" TIMESTAMPTZ(6),

    CONSTRAINT "raw_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industries" (
    "ksic_code" TEXT NOT NULL,
    "name_ko" TEXT NOT NULL,
    "name_en" TEXT,
    "parent_code" TEXT,
    "level" SMALLINT NOT NULL,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("ksic_code")
);

-- CreateTable
CREATE TABLE "job_categories" (
    "code" TEXT NOT NULL,
    "name_ko" TEXT NOT NULL,
    "name_en" TEXT,
    "name_zh" TEXT,
    "name_vi" TEXT,
    "ksic_hint" TEXT,

    CONSTRAINT "job_categories_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "employers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "biz_reg_no_hash" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "is_wage_arrears" BOOLEAN NOT NULL DEFAULT false,
    "wage_arrears_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workplaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employer_id" UUID,
    "address" TEXT,
    "sido" TEXT,
    "sigungu" TEXT,
    "region_code" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "workplaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "raw_posting_id" UUID,
    "employer_id" UUID,
    "workplace_id" UUID,
    "status" "posting_status" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "source_url" TEXT NOT NULL,
    "ksic_code" TEXT,
    "job_category_code" TEXT,
    "employment_form" "employment_form" NOT NULL DEFAULT 'UNKNOWN',
    "weekly_hours_min" DECIMAL(4,1),
    "weekly_hours_max" DECIMAL(4,1),
    "hourly_wage_krw" INTEGER,
    "wage_is_estimated" BOOLEAN NOT NULL DEFAULT false,
    "korean_required" "korean_proficiency" NOT NULL DEFAULT 'NONE',
    "schedule" JSONB NOT NULL DEFAULT '[]',
    "is_night_shift" BOOLEAN NOT NULL DEFAULT false,
    "is_weekend_only" BOOLEAN NOT NULL DEFAULT false,
    "has_dormitory" BOOLEAN,
    "dormitory_cost_krw" INTEGER,
    "has_shuttle_bus" BOOLEAN,
    "shuttle_routes" TEXT[],
    "shift_pattern" TEXT,
    "stated_visas" "visa_code"[],
    "has_discriminatory_terms" BOOLEAN NOT NULL DEFAULT false,
    "discriminatory_note" TEXT,
    "extraction_confidence" DECIMAL(3,2),
    "extracted_by" TEXT,
    "missing_fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "posted_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posting_translations" (
    "posting_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "translated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posting_translations_pkey" PRIMARY KEY ("posting_id","locale")
);

-- CreateTable
CREATE TABLE "visa_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "visa" "visa_code" NOT NULL,
    "visa_subtype" TEXT,
    "rule_type" "rule_type" NOT NULL,
    "applies_when" JSONB NOT NULL DEFAULT '{}',
    "value" JSONB NOT NULL,
    "violation_status" "eligibility_status" NOT NULL DEFAULT 'INELIGIBLE',
    "source_title" TEXT NOT NULL,
    "source_clause" TEXT,
    "source_url" TEXT,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "confidence" "rule_confidence" NOT NULL DEFAULT 'low',
    "reason_code" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visa_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "visa_rule_id" UUID NOT NULL,
    "reviewer_name" TEXT NOT NULL,
    "reviewer_role" TEXT,
    "reviewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verdict" TEXT NOT NULL,
    "comment" TEXT,

    CONSTRAINT "rule_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    "nationality" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name_ko" TEXT NOT NULL,
    "name_en" TEXT,
    "campus" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visa_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "visa" "visa_code" NOT NULL,
    "visa_subtype" TEXT,
    "degree_level" "degree_level" NOT NULL DEFAULT 'NONE',
    "korean_proficiency" "korean_proficiency" NOT NULL DEFAULT 'NONE',
    "school_id" UUID,
    "base_lat" DOUBLE PRECISION,
    "base_lng" DOUBLE PRECISION,
    "permitted_weekly_hours" DECIMAL(4,1),
    "current_weekly_hours" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "has_part_time_permit" BOOLEAN NOT NULL DEFAULT false,
    "current_region_code" TEXT,
    "current_ksic_code" TEXT,
    "workplace_changes_used" SMALLINT,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visa_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_evaluations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "posting_id" UUID NOT NULL,
    "visa_profile_id" UUID,
    "profile_fingerprint" TEXT,
    "status" "eligibility_status" NOT NULL,
    "reasons" JSONB NOT NULL DEFAULT '[]',
    "rule_snapshot" JSONB NOT NULL DEFAULT '[]',
    "commute_minutes" INTEGER,
    "remaining_hours" DECIMAL(4,1),
    "required_actions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "engine_version" TEXT NOT NULL,
    "evaluated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eligibility_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commute_cache" (
    "origin_lat" DOUBLE PRECISION NOT NULL,
    "origin_lng" DOUBLE PRECISION NOT NULL,
    "dest_lat" DOUBLE PRECISION NOT NULL,
    "dest_lng" DOUBLE PRECISION NOT NULL,
    "transit_minutes" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "cached_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commute_cache_pkey" PRIMARY KEY ("origin_lat","origin_lng","dest_lat","dest_lng")
);

-- CreateTable
CREATE TABLE "saved_filters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT,
    "criteria" JSONB NOT NULL,
    "notify_web" BOOLEAN NOT NULL DEFAULT true,
    "notify_email" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_run_at" TIMESTAMPTZ(6),

    CONSTRAINT "saved_filters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "saved_filter_id" UUID,
    "posting_id" UUID,
    "channel" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "clicked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "takedown_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID,
    "posting_id" UUID,
    "requester" TEXT NOT NULL,
    "requester_type" TEXT,
    "claim_type" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acted_at" TIMESTAMPTZ(6),
    "action_taken" TEXT,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "takedown_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posting_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "posting_id" UUID NOT NULL,
    "user_id" UUID,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "posting_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sources_enabled_idx" ON "sources"("enabled");

-- CreateIndex
CREATE INDEX "crawl_runs_source_id_started_at_idx" ON "crawl_runs"("source_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "raw_postings_purge_after_idx" ON "raw_postings"("purge_after");

-- CreateIndex
CREATE UNIQUE INDEX "raw_postings_source_id_content_hash_key" ON "raw_postings"("source_id", "content_hash");

-- CreateIndex
CREATE INDEX "workplaces_lat_lng_idx" ON "workplaces"("lat", "lng");

-- CreateIndex
CREATE INDEX "workplaces_region_code_idx" ON "workplaces"("region_code");

-- CreateIndex
CREATE INDEX "postings_status_last_seen_at_idx" ON "postings"("status", "last_seen_at" DESC);

-- CreateIndex
CREATE INDEX "postings_ksic_code_idx" ON "postings"("ksic_code");

-- CreateIndex
CREATE INDEX "postings_hourly_wage_krw_idx" ON "postings"("hourly_wage_krw");

-- CreateIndex
CREATE INDEX "postings_weekly_hours_max_idx" ON "postings"("weekly_hours_max");

-- CreateIndex
CREATE INDEX "postings_source_id_idx" ON "postings"("source_id");

-- CreateIndex
CREATE INDEX "visa_rules_visa_rule_type_effective_from_idx" ON "visa_rules"("visa", "rule_type", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "visa_profiles_user_id_idx" ON "visa_profiles"("user_id");

-- CreateIndex
CREATE INDEX "eligibility_evaluations_posting_id_status_idx" ON "eligibility_evaluations"("posting_id", "status");

-- CreateIndex
CREATE INDEX "eligibility_evaluations_visa_profile_id_status_idx" ON "eligibility_evaluations"("visa_profile_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "eligibility_evaluations_posting_id_visa_profile_id_key" ON "eligibility_evaluations"("posting_id", "visa_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "takedown_requests_received_at_idx" ON "takedown_requests"("received_at");

-- AddForeignKey
ALTER TABLE "crawl_runs" ADD CONSTRAINT "crawl_runs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_postings" ADD CONSTRAINT "raw_postings_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_postings" ADD CONSTRAINT "raw_postings_crawl_run_id_fkey" FOREIGN KEY ("crawl_run_id") REFERENCES "crawl_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industries" ADD CONSTRAINT "industries_parent_code_fkey" FOREIGN KEY ("parent_code") REFERENCES "industries"("ksic_code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_categories" ADD CONSTRAINT "job_categories_ksic_hint_fkey" FOREIGN KEY ("ksic_hint") REFERENCES "industries"("ksic_code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings" ADD CONSTRAINT "postings_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings" ADD CONSTRAINT "postings_raw_posting_id_fkey" FOREIGN KEY ("raw_posting_id") REFERENCES "raw_postings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings" ADD CONSTRAINT "postings_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings" ADD CONSTRAINT "postings_workplace_id_fkey" FOREIGN KEY ("workplace_id") REFERENCES "workplaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings" ADD CONSTRAINT "postings_ksic_code_fkey" FOREIGN KEY ("ksic_code") REFERENCES "industries"("ksic_code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings" ADD CONSTRAINT "postings_job_category_code_fkey" FOREIGN KEY ("job_category_code") REFERENCES "job_categories"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posting_translations" ADD CONSTRAINT "posting_translations_posting_id_fkey" FOREIGN KEY ("posting_id") REFERENCES "postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_reviews" ADD CONSTRAINT "rule_reviews_visa_rule_id_fkey" FOREIGN KEY ("visa_rule_id") REFERENCES "visa_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_profiles" ADD CONSTRAINT "visa_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_profiles" ADD CONSTRAINT "visa_profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_evaluations" ADD CONSTRAINT "eligibility_evaluations_posting_id_fkey" FOREIGN KEY ("posting_id") REFERENCES "postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_evaluations" ADD CONSTRAINT "eligibility_evaluations_visa_profile_id_fkey" FOREIGN KEY ("visa_profile_id") REFERENCES "visa_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_saved_filter_id_fkey" FOREIGN KEY ("saved_filter_id") REFERENCES "saved_filters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_posting_id_fkey" FOREIGN KEY ("posting_id") REFERENCES "postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takedown_requests" ADD CONSTRAINT "takedown_requests_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takedown_requests" ADD CONSTRAINT "takedown_requests_posting_id_fkey" FOREIGN KEY ("posting_id") REFERENCES "postings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posting_reports" ADD CONSTRAINT "posting_reports_posting_id_fkey" FOREIGN KEY ("posting_id") REFERENCES "postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posting_reports" ADD CONSTRAINT "posting_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================
--  prisma/sql/constraints-and-triggers.sql (Prisma 가 생성하지 못하는 부분)
-- ============================================================

-- Prisma schema 로 표현할 수 없는 부분. 초기 마이그레이션 SQL 끝에 붙여 넣는다.
-- spec/DB_SCHEMA.sql 이 정본이며, 이 파일은 그중 Prisma 가 못 만드는 것만 추린 것이다.
--
--   npx prisma migrate dev --create-only --name init
--   → 생성된 migration.sql 끝에 이 파일 내용을 붙여 넣고
--   npx prisma migrate dev

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── L7: 로그인 필요 / 약관 금지 / robots 불허 소스는 활성화될 수 없다 ────────────
-- API 레이어에도 같은 가드가 있다 (spec/API_SPEC.md 7장). 이중 방어다.
ALTER TABLE sources
  ADD CONSTRAINT chk_source_legal_gate CHECK (
    enabled = false
    OR kind IN ('PUBLIC_API', 'EMPLOYER_DIRECT', 'USER_SUBMISSION')
    OR (requires_login = false
        AND COALESCE(robots_allows, false) = true
        AND COALESCE(tos_prohibits_crawl, true) = false)
  );

-- ── L2: 규칙 유효기간 ────────────────────────────────────────────────────────
ALTER TABLE visa_rules
  ADD CONSTRAINT chk_effective_range CHECK (
    effective_to IS NULL OR effective_to > effective_from
  );

-- ── 부분 인덱스 (Prisma 는 WHERE 절 인덱스를 만들지 못한다) ───────────────────
DROP INDEX IF EXISTS "sources_enabled_idx";
CREATE INDEX idx_sources_enabled ON sources (enabled) WHERE enabled = true;

DROP INDEX IF EXISTS "raw_postings_purge_after_idx";
CREATE INDEX idx_raw_purge ON raw_postings (purge_after) WHERE purged_at IS NULL;

DROP INDEX IF EXISTS "postings_status_last_seen_at_idx";
CREATE INDEX idx_postings_active ON postings (status, last_seen_at DESC) WHERE status = 'ACTIVE';

DROP INDEX IF EXISTS "visa_rules_visa_rule_type_effective_from_idx";
CREATE INDEX idx_visa_rules_lookup ON visa_rules (visa, rule_type, effective_from)
  WHERE effective_to IS NULL;

DROP INDEX IF EXISTS "takedown_requests_received_at_idx";
CREATE INDEX idx_takedown_open ON takedown_requests (received_at) WHERE acted_at IS NULL;

-- ── 전문 검색 ────────────────────────────────────────────────────────────────
CREATE INDEX idx_postings_fts ON postings
  USING gin (to_tsvector('simple', title || ' ' || COALESCE(summary, '')));

-- ── L6: 원문 TTL 파기. worker 가 매일 03:00 에 호출한다 ───────────────────────
CREATE OR REPLACE FUNCTION purge_expired_raw_bodies()
RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE raw_postings
     SET title_raw = NULL,
         body_raw  = NULL,
         purged_at = now()
   WHERE purged_at IS NULL
     AND purge_after < now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION purge_expired_raw_bodies IS
  'L6: 매일 1회 실행 필수. 미실행 시 크롤링 민사 노출이 누적된다.';

-- ── 킬스위치 연동: 소스를 끄면 해당 공고가 즉시 내려간다 ──────────────────────
CREATE OR REPLACE FUNCTION suspend_postings_on_source_disable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.enabled = true AND NEW.enabled = false THEN
    UPDATE postings
       SET status = 'SUSPENDED', updated_at = now()
     WHERE source_id = NEW.id AND status = 'ACTIVE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_source_kill_switch ON sources;
CREATE TRIGGER trg_source_kill_switch
  AFTER UPDATE OF enabled ON sources
  FOR EACH ROW EXECUTE FUNCTION suspend_postings_on_source_disable();

-- ── 컬럼 주석 (운영 중 실수 방지) ────────────────────────────────────────────
COMMENT ON COLUMN raw_postings.body_raw IS
  'L6: 원문 본문. purge_after 경과 시 NULL 처리 필수. 사용자에게 노출 금지.';

COMMENT ON TABLE visa_rules IS
  'L2: 비자 규칙의 유일한 정본. 판정 로직에 비자 조건 if문을 넣지 말 것.';

COMMENT ON TABLE visa_profiles IS
  'L5: 외국인등록번호·여권번호 컬럼을 절대 추가하지 말 것. 비자 종류와 학위과정만 보관.';
