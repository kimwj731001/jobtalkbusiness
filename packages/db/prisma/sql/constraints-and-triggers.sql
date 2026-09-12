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
