# @jobtalk/db

`spec/DB_SCHEMA.sql` 이 정본이고, `prisma/schema.prisma` 를 거기에 맞춘다.
스키마를 바꿀 때는 **SQL 을 먼저 고치고** Prisma 를 따라가게 한다 (CLAUDE.md 7장).

## 아직 실행되지 않은 것

마이그레이션과 시드는 **아직 한 번도 실제 DB에 적용되지 않았다.** 살아 있는 Postgres 16 이 필요하다.
스키마는 `prisma validate` / `prisma generate` 까지만 검증된 상태다.

## 설정

1. Postgres 16 을 준비한다 (Supabase 또는 Neon).
2. 리포지토리 루트에 `.env` 를 만든다:

   ```
   DATABASE_URL="postgresql://...?sslmode=require"
   ```

   `.env` 는 `.gitignore` 에 있다. 커밋하지 않는다.

3. 초기 마이그레이션을 만든다:

   ```bash
   npx prisma migrate dev --create-only --name init --schema packages/db/prisma/schema.prisma
   ```

4. 생성된 `migration.sql` **끝에** `prisma/sql/constraints-and-triggers.sql` 내용을 붙여 넣는다.
   Prisma 가 만들지 못하는 것들이 거기 들어 있다:

   - `chk_source_legal_gate` — 로그인 필요/robots 불허/약관 금지 소스의 활성화를 DB 레벨에서 막는다 (L7)
   - `chk_effective_range` — 규칙 유효기간 (L2)
   - 부분 인덱스, FTS GIN 인덱스
   - `purge_expired_raw_bodies()` — 원문 TTL 파기 (L6)
   - `trg_source_kill_switch` — 소스를 끄면 공고가 즉시 `SUSPENDED` 가 된다

   **이 단계를 건너뛰면 L6·L7 의 DB 레벨 방어가 통째로 빠진다.**

5. 적용하고 시드를 넣는다:

   ```bash
   npx prisma migrate dev --schema packages/db/prisma/schema.prisma
   npm run seed --workspace @jobtalk/db
   ```

## 시드 내용

| 대상 | 건수 | 정본 |
|---|---|---|
| `visa_rules` | 20 | `packages/shared/src/rules/seed-2026-07-09.ts` |
| `industries` | 17 | 이 패키지의 `prisma/seed.ts` |
| `job_categories` | 18 | `spec/VISA_RULES.md` 7장 |
| `schools` | 3 | MVP 범위 (회기·이문·휘경) |
| `sources` | 2 | 사업주 직접 등록 / 사용자 제보 |

시드는 멱등하다. 규칙 id 는 슬러그에서 결정적으로 유도한 UUIDv5 라서 (`src/rule-id.ts`)
재시드해도 같은 행을 갱신한다.

## ⚠️ 규칙 20건 중 13건이 `confidence='low'` 다

`low` 규칙이 걸리는 판정은 전부 `UNKNOWN` 이 된다. 설계대로다 (CLAUDE.md L4).
`ELIGIBLE` 이 나오게 하려면 순서가 있다:

1. 「외국인유학생 사증발급 및 체류관리 지침」 2026-07-09 개정 **원문 확보**
2. 값 대조 후 `source_url` 기입 (현재 전부 `null`)
3. 행정사·노무사 검수 → `rule_reviews` 기록
4. 그때 비로소 `confidence` 승급

기존 규칙 행을 직접 `UPDATE` 하지 않는다. `effective_to` 를 넣고 새 행을 추가한다 —
그러지 않으면 과거 판정의 근거가 소급 변조된다 (L2).

가장 급한 것은 **통학 시간 상한(60분 vs 수도권 90분)** 이다. 핵심 필터인데 자료가 갈린다.
