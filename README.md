# 외국인 일자리 적법성 판정 서비스

외국인(D-2 / D-4 / E-9 / E-7-4)이 채용공고를 볼 때 **"내 비자로 여기서 일하면 합법인가?"** 에
근거와 함께 답하는 판정 엔진과, 그 판정을 필터로 쓰는 일자리 검색 서비스.

작업 규칙은 [CLAUDE.md](CLAUDE.md) 가 정본이다. 특히 2장의 INVARIANT(L1~L8)는 기능 요구가 아니라 법적 제약이다.

## 현재 상태

| # | 단계 | 상태 |
|---|---|---|
| 1 | DB 스키마 + Prisma | 🟡 스키마 작성 완료, **실제 DB에 미적용** |
| 2 | 판정 엔진 | 🟢 구현 완료, 테스트 50개 통과 |
| 3 | 비자 규칙 시드 | 🟡 20건 작성, 13건이 `confidence='low'` (원문 미대조) |
| 4~12 | 검색 API · UI · 크롤러 · 알림 | ⚪ 미착수 |

`apps/web` 은 아직 없다. **배포할 애플리케이션이 존재하지 않는다.**

## 다음에 필요한 것

1. **Postgres 인스턴스** (Supabase 또는 Neon) — 마이그레이션·시드를 한 번도 돌려보지 못했다.
   → [packages/db/README.md](packages/db/README.md)
2. **「외국인유학생 사증발급 및 체류관리 지침」 2026-07-09 개정 원문**
   — 이게 없으면 판정은 계속 `UNKNOWN` 만 낸다. 특히 통학 시간 상한(60분 vs 수도권 90분)이 갈린다.
3. 그 다음이 4단계(검색 API)부터의 애플리케이션 작업이다.

## 구조

```
spec/                   PRD · DB 스키마(정본) · API 명세 · 비자 규칙
packages/shared/        타입, i18n 키, 비자 규칙 시드 데이터
packages/eligibility/   ⚡ 판정 엔진 (순수 함수)
packages/db/            Prisma schema, seed
```

`packages/eligibility` 는 DB·네트워크·환경변수·현재시각에 의존하지 않는다.
테스트가 이 제약을 강제한다 (`__tests__/purity.test.ts`).

## 개발

```bash
npm install
npm run test        # 판정 엔진 골든 테스트
npm run typecheck
```

DB 작업에는 루트 `.env` 에 `DATABASE_URL` 이 필요하다.
