-- =============================================================================
--  외국인 일자리 적법성 판정 서비스 — PostgreSQL 16 스키마 (정본)
--  v0.2 / 2026-09-12
--
--  설계 원칙
--   1. 비자 규칙은 코드가 아니라 데이터다 (visa_rules, effective_from/to 버전관리)
--   2. 원문(raw)은 자산이 아니라 부채다 (TTL 파기, 필드 일부만 영구 보관)
--   3. 판정은 항상 근거·규칙 스냅샷과 함께 저장한다 (분쟁 시 재현 가능)
--   4. 식별번호(외국인등록번호·여권번호)는 컬럼 자체를 만들지 않는다
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- =============================================================================
--  ENUM
-- =============================================================================

CREATE TYPE visa_code AS ENUM ('D2', 'D4', 'E9', 'E74', 'F2', 'F4', 'F5', 'F6', 'OTHER');

-- D-2 세부: D-2-1 전문학사 ~ D-2-8 / D-4-1 어학연수
CREATE TYPE degree_level AS ENUM (
  'LANGUAGE',        -- 어학연수 (D-4-1)
  'ASSOCIATE',       -- 전문학사
  'BACHELOR_1_2',    -- 학사 1~2학년
  'BACHELOR_3_4',    -- 학사 3~4학년
  'MASTER',
  'DOCTORATE',
  'NONE'             -- 유학생 아님 (E-9 등)
);

-- 한국어 능력. TOPIK 급수와 KIIP 단계를 하나의 서열로 다루되 원본도 보존
CREATE TYPE korean_proficiency AS ENUM (
  'NONE',
  'TOPIK1', 'TOPIK2', 'TOPIK3', 'TOPIK4', 'TOPIK5', 'TOPIK6',
  'KIIP1', 'KIIP2', 'KIIP3', 'KIIP4', 'KIIP5'
);

-- 고용형태. 유학생은 파견·도급 금지이므로 판정에 직접 쓰인다
CREATE TYPE employment_form AS ENUM (
  'DIRECT',          -- 직접고용
  'DISPATCH',        -- 파견
  'SUBCONTRACT',     -- 도급
  'PLATFORM',        -- 특수형태근로 (배달·대리·택배 등)
  'UNKNOWN'
);

CREATE TYPE eligibility_status AS ENUM (
  'ELIGIBLE',        -- 지침상 가능해 보임
  'CONDITIONAL',     -- 조건 충족 시 가능 (예: 시간제취업 허가 선행)
  'INELIGIBLE',      -- 불가
  'UNKNOWN'          -- 판단 불가 (규칙 결측 / 공고 필드 결측 / 신뢰도 낮음)
);

-- 크롤 소스 법적 리스크 등급 (기획서 6.2)
CREATE TYPE source_risk_grade AS ENUM (
  'C',  -- 공공 Open API — 무위험
  'B',  -- 기업 자사 채용페이지·공개 게시판 — 낮음
  'A',  -- 커뮤니티(페이스북 공개그룹 등) — ToS/개인정보 리스크
  'S'   -- 상용 구인 DB(알바몬·알바천국·워크인 등) — 민사 소송 선례 있음
);

CREATE TYPE source_kind AS ENUM ('PUBLIC_API', 'CRAWL', 'EMPLOYER_DIRECT', 'USER_SUBMISSION');

CREATE TYPE posting_status AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'TAKEDOWN');

CREATE TYPE rule_confidence AS ENUM ('high', 'medium', 'low');

-- 규칙 타입. 새 타입을 추가할 때는 판정 엔진의 evaluator도 함께 추가한다
CREATE TYPE rule_type AS ENUM (
  'WEEKLY_HOUR_CAP',      -- 주당 취업 가능 시간 상한
  'INDUSTRY_ALLOW',       -- 허용 업종 화이트리스트
  'INDUSTRY_DENY',        -- 금지 업종 블랙리스트
  'EMPLOYMENT_FORM_DENY', -- 금지 고용형태 (파견·도급·특수형태)
  'COMMUTE_MAX_MINUTES',  -- 통학 소요시간 상한
  'PERMIT_REQUIRED',      -- 사전 허가 필요 (시간제취업 허가 등)
  'REGION_LOCK',          -- 권역 제한 (E-9 사업장 변경)
  'INDUSTRY_LOCK',        -- 동일 업종 제한 (E-9)
  'KOREAN_LEVEL_MIN',     -- 최소 한국어 능력
  'CHANGE_COUNT_CAP'      -- 사업장 변경 횟수 상한 (E-9)
);

-- =============================================================================
--  1. 수집 소스 — 킬스위치의 단위. 소스는 절대 코드에 하드코딩하지 않는다
-- =============================================================================

CREATE TABLE sources (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  kind                source_kind NOT NULL,
  risk_grade          source_risk_grade NOT NULL,
  base_url            TEXT,

  -- ⚡ 킬스위치. 법적 통지 수령 시 이 한 줄만 false로 바꾸면 즉시 중단된다
  enabled             BOOLEAN NOT NULL DEFAULT false,
  disabled_reason     TEXT,
  disabled_at         TIMESTAMPTZ,

  -- L7 준수 기록 (크롤 시작 전 반드시 채운다)
  robots_checked_at   TIMESTAMPTZ,
  robots_allows       BOOLEAN,          -- robots.txt가 대상 경로를 허용하는가
  tos_reviewed_at     TIMESTAMPTZ,
  tos_prohibits_crawl BOOLEAN,          -- 약관에 크롤링 금지 명시가 있는가
  requires_login      BOOLEAN NOT NULL DEFAULT false,  -- true면 수집 금지
  legal_note          TEXT,

  -- rate limit
  min_interval_ms     INTEGER NOT NULL DEFAULT 3000,
  max_concurrency     SMALLINT NOT NULL DEFAULT 1,

  crawl_config        JSONB NOT NULL DEFAULT '{}'::jsonb,  -- 셀렉터, 페이지네이션 등
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- L7: 로그인 필요 / 약관 금지 / robots 불허 소스는 활성화될 수 없다
  CONSTRAINT chk_source_legal_gate CHECK (
    enabled = false
    OR kind IN ('PUBLIC_API', 'EMPLOYER_DIRECT', 'USER_SUBMISSION')
    OR (requires_login = false
        AND COALESCE(robots_allows, false) = true
        AND COALESCE(tos_prohibits_crawl, true) = false)
  )
);

CREATE INDEX idx_sources_enabled ON sources (enabled) WHERE enabled = true;

CREATE TABLE crawl_runs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id      UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ,
  status         TEXT NOT NULL DEFAULT 'RUNNING',  -- RUNNING|SUCCESS|FAILED|ABORTED
  fetched_count  INTEGER NOT NULL DEFAULT 0,
  new_count      INTEGER NOT NULL DEFAULT 0,
  error_message  TEXT
);

CREATE INDEX idx_crawl_runs_source ON crawl_runs (source_id, started_at DESC);

-- =============================================================================
--  2. 원문 격리 — L6. body는 TTL 경과 후 NULL 처리한다
-- =============================================================================

CREATE TABLE raw_postings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id      UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  crawl_run_id   UUID REFERENCES crawl_runs(id) ON DELETE SET NULL,

  source_url     TEXT NOT NULL,                    -- 영구 보관 (링크아웃용)
  content_hash   TEXT NOT NULL,                    -- 영구 보관 (중복 판정용)

  -- ⚠️ 아래 두 컬럼은 TTL 경과 후 NULL 처리 대상이다 (purge_expired_raw_bodies)
  title_raw      TEXT,
  body_raw       TEXT,

  pii_masked     BOOLEAN NOT NULL DEFAULT false,   -- L8: LLM 전송 전 마스킹 완료 여부
  fetched_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  purge_after    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  purged_at      TIMESTAMPTZ,

  UNIQUE (source_id, content_hash)
);

CREATE INDEX idx_raw_purge ON raw_postings (purge_after) WHERE purged_at IS NULL;

COMMENT ON COLUMN raw_postings.body_raw IS
  'L6: 원문 본문. purge_after 경과 시 NULL 처리 필수. 사용자에게 노출 금지.';

-- =============================================================================
--  3. 업종 (KSIC) — 비자별 허용/금지 판정의 기준 축
-- =============================================================================

CREATE TABLE industries (
  ksic_code    TEXT PRIMARY KEY,        -- 한국표준산업분류. 대분류 'C', 세분류 'C29' 등
  name_ko      TEXT NOT NULL,
  name_en      TEXT,
  parent_code  TEXT REFERENCES industries(ksic_code),
  level        SMALLINT NOT NULL        -- 1=대분류 ... 5=세세분류
);

-- 직무 유형 (업종과 별개. "카페 보조", "배달 라이더" 등 지침이 직종 단위로 규정)
CREATE TABLE job_categories (
  code       TEXT PRIMARY KEY,          -- 'CAFE_ASSIST', 'DELIVERY_RIDER', ...
  name_ko    TEXT NOT NULL,
  name_en    TEXT,
  name_zh    TEXT,
  name_vi    TEXT,
  ksic_hint  TEXT REFERENCES industries(ksic_code)
);

-- =============================================================================
--  4. 사업주 / 사업장
-- =============================================================================

CREATE TABLE employers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  biz_reg_no_hash    TEXT,              -- 사업자등록번호는 해시만 (중복 판정용, 평문 저장 금지)
  contact_email      TEXT,
  contact_phone      TEXT,
  is_verified        BOOLEAN NOT NULL DEFAULT false,
  verified_at        TIMESTAMPTZ,

  -- 직업안정법: 명단 공개 중인 체불사업주의 구인정보는 그 사실을 알 수 있게 게재해야 함
  is_wage_arrears    BOOLEAN NOT NULL DEFAULT false,
  wage_arrears_note  TEXT,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workplaces (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id  UUID REFERENCES employers(id) ON DELETE CASCADE,
  address      TEXT,
  sido         TEXT,                    -- 시·도
  sigungu      TEXT,                    -- 시·군·구
  region_code  TEXT,                    -- E-9 권역 판정용 (REGION_LOCK 규칙이 참조)
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION
);

CREATE INDEX idx_workplaces_geo ON workplaces (lat, lng);
CREATE INDEX idx_workplaces_region ON workplaces (region_code);

-- =============================================================================
--  5. 공고 (정규화) — 판정 엔진의 입력
-- =============================================================================

CREATE TABLE postings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id          UUID NOT NULL REFERENCES sources(id),
  raw_posting_id     UUID REFERENCES raw_postings(id) ON DELETE SET NULL,
  employer_id        UUID REFERENCES employers(id) ON DELETE SET NULL,
  workplace_id       UUID REFERENCES workplaces(id) ON DELETE SET NULL,

  status             posting_status NOT NULL DEFAULT 'ACTIVE',

  -- 표시용 (요약. 원문 전문 아님 — L6)
  title              TEXT NOT NULL,
  summary            TEXT,                        -- LLM 생성 3줄 요약
  source_url         TEXT NOT NULL,               -- 링크아웃 대상 (필수)

  -- ── 판정 입력 필드 ──────────────────────────────────────────────
  ksic_code          TEXT REFERENCES industries(ksic_code),
  job_category_code  TEXT REFERENCES job_categories(code),
  employment_form    employment_form NOT NULL DEFAULT 'UNKNOWN',
  weekly_hours_min   NUMERIC(4,1),
  weekly_hours_max   NUMERIC(4,1),
  hourly_wage_krw    INTEGER,
  wage_is_estimated  BOOLEAN NOT NULL DEFAULT false,   -- 월급→시급 환산 시 true
  korean_required    korean_proficiency NOT NULL DEFAULT 'NONE',
  -- ────────────────────────────────────────────────────────────────

  -- 근무 스케줄. [{dow:1, start:"18:00", end:"22:00"}, ...]
  schedule           JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_night_shift     BOOLEAN NOT NULL DEFAULT false,
  is_weekend_only    BOOLEAN NOT NULL DEFAULT false,

  -- E-9/E-7-4 전용 (MVP UI 미노출, 스키마만 준비)
  has_dormitory      BOOLEAN,
  dormitory_cost_krw INTEGER,
  has_shuttle_bus    BOOLEAN,
  shuttle_routes     TEXT[],
  shift_pattern      TEXT,                        -- '주간고정'|'야간고정'|'2교대'|'3교대'

  -- 공고에 명시된 비자 제한 (있는 경우)
  stated_visas       visa_code[],

  -- 차별적 표현 (국적·성별 제한) 감지 — 노출 정책에 사용
  has_discriminatory_terms BOOLEAN NOT NULL DEFAULT false,
  discriminatory_note      TEXT,

  -- 구조화 품질
  extraction_confidence NUMERIC(3,2),             -- 0.00 ~ 1.00
  extracted_by          TEXT,                     -- 'llm:claude-...' | 'employer_direct'
  missing_fields        TEXT[] NOT NULL DEFAULT '{}',  -- 결측 필드 → UNKNOWN 사유

  posted_at          TIMESTAMPTZ,
  expires_at         TIMESTAMPTZ,
  first_seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_postings_active   ON postings (status, last_seen_at DESC) WHERE status = 'ACTIVE';
CREATE INDEX idx_postings_ksic     ON postings (ksic_code);
CREATE INDEX idx_postings_wage     ON postings (hourly_wage_krw);
CREATE INDEX idx_postings_hours    ON postings (weekly_hours_max);
CREATE INDEX idx_postings_source   ON postings (source_id);
CREATE INDEX idx_postings_fts      ON postings USING gin (to_tsvector('simple', title || ' ' || COALESCE(summary, '')));

-- 공고 번역 (카드 표시용)
CREATE TABLE posting_translations (
  posting_id  UUID NOT NULL REFERENCES postings(id) ON DELETE CASCADE,
  locale      TEXT NOT NULL,                      -- 'en' | 'zh-CN' | 'vi'
  title       TEXT NOT NULL,
  summary     TEXT,
  translated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (posting_id, locale)
);

-- =============================================================================
--  6. ⚡ 비자 규칙 — 이 제품의 핵심 자산. 코드가 아니라 데이터다 (L2)
-- =============================================================================

CREATE TABLE visa_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visa              visa_code NOT NULL,
  visa_subtype      TEXT,                          -- 'D-2-2', 'D-4-1' 등. NULL이면 전체
  rule_type         rule_type NOT NULL,

  -- 이 규칙이 적용되는 조건. 예: {"degree_level": ["BACHELOR_3_4"], "korean_min": "TOPIK4"}
  applies_when      JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 규칙 값. rule_type별 형태:
  --   WEEKLY_HOUR_CAP      {"hours": 30, "term": "SEMESTER"}
  --   INDUSTRY_DENY        {"ksic_prefixes": ["C", "F"]}
  --   EMPLOYMENT_FORM_DENY {"forms": ["DISPATCH", "SUBCONTRACT", "PLATFORM"]}
  --   COMMUTE_MAX_MINUTES  {"minutes": 60}
  --   PERMIT_REQUIRED      {"permit": "PART_TIME_WORK_PERMIT"}
  --   KOREAN_LEVEL_MIN     {"level": "TOPIK4", "scope": {"ksic_prefixes": ["C"]}}
  value             JSONB NOT NULL,

  -- 위반 시 판정 결과
  violation_status  eligibility_status NOT NULL DEFAULT 'INELIGIBLE',

  -- 근거 (L3 — 판정 응답에 그대로 실린다)
  source_title      TEXT NOT NULL,                 -- '외국인유학생 사증발급 및 체류관리 지침'
  source_clause     TEXT,                          -- 조항
  source_url        TEXT,
  effective_from    DATE NOT NULL,
  effective_to      DATE,                          -- NULL = 현재 유효

  -- ⚠️ confidence='low'인 규칙은 판정 시 UNKNOWN을 유발한다 (L4)
  confidence        rule_confidence NOT NULL DEFAULT 'low',
  reason_code       TEXT NOT NULL,                 -- i18n 키. 'WEEKLY_HOUR_EXCEEDED' 등
  note              TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_effective_range CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE INDEX idx_visa_rules_lookup ON visa_rules (visa, rule_type, effective_from)
  WHERE effective_to IS NULL;

COMMENT ON TABLE visa_rules IS
  'L2: 비자 규칙의 유일한 정본. 판정 로직에 비자 조건 if문을 넣지 말 것.';

-- 규칙 검수 이력 — 전문가(행정사·노무사) 확인 기록. 분쟁 시 방어 자료
CREATE TABLE rule_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_rule_id  UUID NOT NULL REFERENCES visa_rules(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  reviewer_role TEXT,                              -- '행정사' | '노무사' | '내부'
  reviewed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  verdict       TEXT NOT NULL,                     -- 'APPROVED' | 'REJECTED' | 'NEEDS_INFO'
  comment       TEXT
);

-- =============================================================================
--  7. 사용자 / 비자 프로필 — L5: 식별번호 컬럼 없음
-- =============================================================================

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE,
  locale        TEXT NOT NULL DEFAULT 'ko',
  nationality   TEXT,                              -- ISO 3166-1 alpha-2. 통계·언어 우선순위용
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE schools (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ko    TEXT NOT NULL,
  name_en    TEXT,
  campus     TEXT,
  address    TEXT,
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION
);

CREATE TABLE visa_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  visa                  visa_code NOT NULL,
  visa_subtype          TEXT,
  degree_level          degree_level NOT NULL DEFAULT 'NONE',
  korean_proficiency    korean_proficiency NOT NULL DEFAULT 'NONE',

  school_id             UUID REFERENCES schools(id),
  -- 기준 위치 (학교 또는 거주지). 통학 시간 계산의 출발점
  base_lat              DOUBLE PRECISION,
  base_lng              DOUBLE PRECISION,

  -- 잔여 시간 계산용. 사용자 자기신고값
  permitted_weekly_hours    NUMERIC(4,1),          -- 현재 허가받은 주당 시간
  current_weekly_hours      NUMERIC(4,1) NOT NULL DEFAULT 0,
  has_part_time_permit      BOOLEAN NOT NULL DEFAULT false,

  -- E-9 전용
  current_region_code       TEXT,
  current_ksic_code         TEXT,
  workplace_changes_used    SMALLINT,

  is_complete           BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visa_profiles_user ON visa_profiles (user_id);

-- L5 방어: 식별번호로 보이는 값이 들어오는 것을 막는다
COMMENT ON TABLE visa_profiles IS
  'L5: 외국인등록번호·여권번호 컬럼을 절대 추가하지 말 것. 비자 종류와 학위과정만 보관.';

-- =============================================================================
--  8. 판정 결과 — 근거·규칙 스냅샷과 함께 저장 (L3, 분쟁 시 재현)
-- =============================================================================

CREATE TABLE eligibility_evaluations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id        UUID NOT NULL REFERENCES postings(id) ON DELETE CASCADE,
  visa_profile_id   UUID REFERENCES visa_profiles(id) ON DELETE CASCADE,

  -- 익명 판정(로그인 전) 지원용 프로필 지문
  profile_fingerprint TEXT,

  status            eligibility_status NOT NULL,

  -- 판정 근거. [{rule_id, reason_code, rule_type, message_key, params, source_clause, effective_from}]
  reasons           JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- 적용된 규칙의 스냅샷. 규칙이 나중에 바뀌어도 당시 판정을 재현할 수 있어야 한다
  rule_snapshot     JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- 계산된 부가 정보
  commute_minutes   INTEGER,
  remaining_hours   NUMERIC(4,1),                  -- 허용 상한 - 현재 시간
  required_actions  TEXT[] NOT NULL DEFAULT '{}',  -- ['APPLY_PART_TIME_PERMIT', ...]

  engine_version    TEXT NOT NULL,
  evaluated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (posting_id, visa_profile_id)
);

CREATE INDEX idx_eval_posting ON eligibility_evaluations (posting_id, status);
CREATE INDEX idx_eval_profile ON eligibility_evaluations (visa_profile_id, status);

-- 통학 시간 캐시 (외부 경로 API 비용 절감)
CREATE TABLE commute_cache (
  origin_lat       DOUBLE PRECISION NOT NULL,
  origin_lng       DOUBLE PRECISION NOT NULL,
  dest_lat         DOUBLE PRECISION NOT NULL,
  dest_lng         DOUBLE PRECISION NOT NULL,
  transit_minutes  INTEGER NOT NULL,
  provider         TEXT NOT NULL,
  cached_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (origin_lat, origin_lng, dest_lat, dest_lng)
);

-- =============================================================================
--  9. 저장 조건 / 알림
-- =============================================================================

CREATE TABLE saved_filters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT,
  -- {min_wage, max_commute, ksic_in[], dows[], time_range, eligibility_in[]}
  criteria     JSONB NOT NULL,
  notify_web   BOOLEAN NOT NULL DEFAULT true,
  notify_email BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at  TIMESTAMPTZ
);

CREATE TABLE notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  saved_filter_id  UUID REFERENCES saved_filters(id) ON DELETE SET NULL,
  posting_id       UUID REFERENCES postings(id) ON DELETE CASCADE,
  channel          TEXT NOT NULL,                  -- 'web_push' | 'email'
  sent_at          TIMESTAMPTZ,
  clicked_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  keys        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
--  10. 리스크 관리 — takedown / 신고
-- =============================================================================

CREATE TABLE takedown_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id      UUID REFERENCES sources(id) ON DELETE SET NULL,
  posting_id     UUID REFERENCES postings(id) ON DELETE SET NULL,
  requester      TEXT NOT NULL,
  requester_type TEXT,                             -- 'SITE_OWNER' | 'EMPLOYER' | 'INDIVIDUAL'
  claim_type     TEXT NOT NULL,                    -- 'DB_RIGHT' | 'COPYRIGHT' | 'PRIVACY' | 'TOS' | 'OTHER'
  body           TEXT NOT NULL,
  received_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- SLA 24시간 (기획서 CR7)
  acted_at       TIMESTAMPTZ,
  action_taken   TEXT,                             -- 'SOURCE_DISABLED' | 'POSTING_REMOVED' | 'REJECTED'
  resolved_at    TIMESTAMPTZ
);

CREATE INDEX idx_takedown_open ON takedown_requests (received_at) WHERE acted_at IS NULL;

CREATE TABLE posting_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id  UUID NOT NULL REFERENCES postings(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  reason      TEXT NOT NULL,                       -- 'EXPIRED'|'FALSE_INFO'|'ILLEGAL'|'DISCRIMINATION'
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 감사 로그 (규칙 변경·소스 활성화 등 민감 조작)
CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  before      JSONB,
  after       JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
--  11. 배치 — L6 원문 TTL 파기 (worker에서 매일 실행)
-- =============================================================================

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

-- 소스 비활성화 시 해당 공고를 즉시 내리는 트리거 (킬스위치 연동)
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

CREATE TRIGGER trg_source_kill_switch
  AFTER UPDATE OF enabled ON sources
  FOR EACH ROW EXECUTE FUNCTION suspend_postings_on_source_disable();
