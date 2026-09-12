# @jobtalk/db

`spec/DB_SCHEMA.sql` 이 정본이고, `prisma/schema.prisma` 를 거기에 맞춘다.
스키마를 바꿀 때는 **SQL 을 먼저 고치고** Prisma 를 따라가게 한다 (CLAUDE.md 7장).

## 상태

Neon (`ap-southeast-1`) 에 마이그레이션 적용 + 시드 완료.
DB 레벨 방어 20개 항목 검증 통과 (`npm run verify --workspace @jobtalk/db`).

> ⚠️ `spec/DB_SCHEMA.sql` 은 PostgreSQL 16 기준이지만 실제 인스턴스는 **18.6** 이다.
> 쓰고 있는 기능(enum, jsonb, 배열, 부분 인덱스, plpgsql, GIN FTS)은 전부 16→18 에서
> 동작이 같아 현재 문제는 없다. 다만 스펙과 운영 환경이 다르다는 사실은 기록해 둔다.

## 설정

1. Postgres 를 준비한다 (Neon 또는 Supabase).
2. 리포지토리 루트에 `.env` 를 만든다. `.env.example` 을 복사하면 된다.

   ```
   DATABASE_URL="...-pooler...."   # 런타임 (서버리스 커넥션 고갈 방지)
   DIRECT_URL="...."               # 마이그레이션 (직결)
   ```

   `.env` 는 `.gitignore` 에 있다. 커밋하지 않는다.

   > **`DIRECT_URL` 이 따로 필요하다.** PgBouncer transaction 모드로는 Prisma Migrate 가
   > 동작하지 않는다. Neon 은 호스트에서 `-pooler` 를 뺀 것이 직결 주소다.

3. 적용하고 시드를 넣는다:

   ```bash
   npm run generate --workspace @jobtalk/db
   npm run migrate:deploy --workspace @jobtalk/db
   npm run seed --workspace @jobtalk/db
   npm run verify --workspace @jobtalk/db
   ```

## 마이그레이션을 새로 만들 때

Prisma 가 만들지 못하는 것들이 `prisma/sql/constraints-and-triggers.sql` 에 있다.
스키마를 바꿔 새 마이그레이션을 만들면, 이 SQL 중 영향받는 부분을
**생성된 `migration.sql` 끝에 직접 붙여 넣어야 한다.**

- `chk_source_legal_gate` — 로그인 필요/robots 불허/약관 금지 소스의 활성화를 DB 레벨에서 막는다 (L7)
- `chk_effective_range` — 규칙 유효기간 (L2)
- 부분 인덱스, FTS GIN 인덱스
- `purge_expired_raw_bodies()` — 원문 TTL 파기 (L6)
- `trg_source_kill_switch` — 소스를 끄면 공고가 즉시 `SUSPENDED` 가 된다

**빠뜨리면 L6·L7 의 DB 레벨 방어가 통째로 사라진다.** `npm run verify` 가 이를 잡아낸다.

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
