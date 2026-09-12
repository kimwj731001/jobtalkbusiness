# 외국인 일자리 적법성 판정 서비스

외국인(D-2 / D-4 / E-9 / E-7-4)이 채용공고를 볼 때 **"내 비자로 여기서 일하면 합법인가?"** 에
근거와 함께 답하는 판정 엔진과, 그 판정을 필터로 쓰는 일자리 검색 서비스.

작업 규칙은 [CLAUDE.md](CLAUDE.md) 가 정본이다. 특히 2장의 INVARIANT(L1~L8)는 기능 요구가 아니라 법적 제약이다.

## 현재 상태

| # | 단계 | 상태 |
|---|---|---|
| 1 | DB 스키마 + Prisma | 🟢 Neon 에 적용 + 시드 완료, DB 방어 20항목 검증 통과 |
| 2 | 판정 엔진 | 🟢 구현 완료, 테스트 60개 통과 |
| 3 | 비자 규칙 시드 | 🟡 20건 투입, 13건이 `confidence='low'` (원문 미대조) |
| 8 | i18n (ko/en/zh-CN/vi) | 🟢 판정 근거 문구까지 4개 언어 완비 |
| 4~7, 9~12 | 검색 API · UI · 크롤러 · 알림 | ⚪ 미착수 |

`apps/web` 은 아직 없다. **배포할 애플리케이션이 존재하지 않는다.**

## 남은 최대 리스크

**「외국인유학생 사증발급 및 체류관리 지침」 2026-07-09 개정 원문이 없다.**

규칙 20건 중 13건이 `confidence='low'` 이고, low 규칙이 걸리는 판정은 전부 `UNKNOWN` 이 된다.
즉 **지금 이 서비스는 어떤 공고에 대해서도 "가능"이라고 답하지 못한다.** 설계대로다 (L4).

원문을 확보해 값을 대조하고 `rule_reviews` 에 검수를 기록하기 전까지는 이 상태가 유지된다.
가장 급한 것은 통학 시간 상한(60분 vs 수도권 90분)이다 — 핵심 필터인데 자료가 갈린다.

## 구조

```
spec/                   PRD · DB 스키마(정본) · API 명세 · 비자 규칙
packages/shared/        타입, i18n 카탈로그(ko/en/zh-CN/vi), 비자 규칙 시드 데이터
packages/eligibility/   ⚡ 판정 엔진 (순수 함수)
packages/db/            Prisma schema, seed, DB 방어 검증 스크립트
```

`packages/eligibility` 는 DB·네트워크·환경변수·현재시각에 의존하지 않는다.
테스트가 이 제약을 강제한다 (`__tests__/purity.test.ts`).

## 개발

```bash
npm install
npm run test        # 판정 엔진 골든 테스트 + i18n 커버리지
npm run typecheck
```

DB 작업에는 루트 `.env` 가 필요하다 (`.env.example` 참고).

```bash
npm run verify --workspace @jobtalk/db   # DB 레벨 방어가 살아 있는지 확인
```
