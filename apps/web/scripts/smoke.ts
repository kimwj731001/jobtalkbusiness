/**
 * API 스모크 테스트 — 실행 중인 서버를 상대로 실제 DB 를 거쳐 왕복한다.
 *
 *   npm run dev --workspace @jobtalk/web      # 다른 터미널에서
 *   npm run smoke --workspace @jobtalk/web
 *
 * 유닛 테스트가 잡지 못하는 것(라우팅, 직렬화, Prisma 매핑, 번역 연결)을 확인한다.
 * 만든 데이터는 끝에 전부 지운다.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '.env') });

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const EMPLOYER_DIRECT_SOURCE = '00000000-0000-5000-8000-000000000001';

const prisma = new PrismaClient();
let failures = 0;

function check(name: string, ok: boolean, detail: unknown = '') {
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}`, detail);
  }
}

const D2_STUDENT = {
  visa: 'D2',
  degreeLevel: 'BACHELOR_3_4',
  koreanProficiency: 'TOPIK4',
  permittedWeeklyHours: 30,
  currentWeeklyHours: 10,
  hasPartTimePermit: true,
};

async function main() {
  console.log(`대상: ${BASE}`);

  // ── 준비: 카페 공고 1건, 물류 파견 공고 1건 ────────────────────────
  const workplace = await prisma.workplace.create({
    data: { address: '서울 동대문구 회기로 1', sido: '서울', sigungu: '동대문구', lat: 37.5896, lng: 127.0575 },
  });
  const cafe = await prisma.posting.create({
    data: {
      sourceId: EMPLOYER_DIRECT_SOURCE,
      workplaceId: workplace.id,
      title: '[스모크] 회기역 카페 바리스타 파트타임',
      summary: '주 12시간, 오후 시간대 근무',
      sourceUrl: 'https://example.invalid/smoke-cafe',
      ksicCode: 'I56',
      jobCategoryCode: 'CAFE_ASSIST',
      employmentForm: 'DIRECT',
      weeklyHoursMax: 12,
      hourlyWageKrw: 11000,
    },
  });
  const warehouse = await prisma.posting.create({
    data: {
      sourceId: EMPLOYER_DIRECT_SOURCE,
      title: '[스모크] 물류센터 상하차 (파견)',
      sourceUrl: 'https://example.invalid/smoke-warehouse',
      ksicCode: 'H52',
      employmentForm: 'DISPATCH',
      weeklyHoursMax: 20,
      hourlyWageKrw: 12000,
    },
  });

  try {
    // ── 1. 검색: 프로필 없이 ───────────────────────────────────────
    console.log('\nGET /api/postings (프로필 없음)');
    const anon = await fetch(`${BASE}/api/postings?q=스모크`).then((r) => r.json());
    check('공고 2건이 나온다', anon.items?.length === 2, anon.items?.length);
    const anonFirst = anon.items?.[0];
    check('판정이 UNKNOWN 이다', anonFirst?.eligibility?.status === 'UNKNOWN', anonFirst?.eligibility?.status);
    check(
      '사유가 NO_PROFILE 이다 (빈 배열이 아니다 — L3)',
      anonFirst?.eligibility?.reasons?.[0]?.reasonCode === 'NO_PROFILE',
      anonFirst?.eligibility?.reasons?.[0]?.reasonCode,
    );
    check('고지가 실려 있다', typeof anonFirst?.eligibility?.disclaimer?.text === 'string');

    // ── 2. 검색: D-2 프로필 ────────────────────────────────────────
    console.log('\nGET /api/postings (D-2 학사 3학년 TOPIK4)');
    const withProfile = await fetch(`${BASE}/api/postings?q=스모크`, {
      headers: { 'x-visa-profile': JSON.stringify(D2_STUDENT) },
    }).then((r) => r.json());
    const byTitle = Object.fromEntries(
      (withProfile.items ?? []).map((i: { title: string }) => [i.title, i]),
    );
    const cafeItem = byTitle['[스모크] 회기역 카페 바리스타 파트타임'];
    const whItem = byTitle['[스모크] 물류센터 상하차 (파견)'];

    check(
      '파견 공고는 INELIGIBLE 이다',
      whItem?.eligibility?.status === 'INELIGIBLE',
      whItem?.eligibility?.status,
    );
    check(
      '파견 사유가 EMPLOYMENT_FORM_DENIED 다',
      whItem?.eligibility?.reasons?.some(
        (r: { reasonCode: string }) => r.reasonCode === 'EMPLOYMENT_FORM_DENIED',
      ),
    );
    check(
      '카페 공고는 UNKNOWN 이다 (규칙 confidence=low 때문)',
      cafeItem?.eligibility?.status === 'UNKNOWN',
      cafeItem?.eligibility?.status,
    );
    check(
      '카페 UNKNOWN 사유에 LOW_CONFIDENCE_RULE 이 있다',
      cafeItem?.eligibility?.reasons?.some(
        (r: { reasonCode: string }) => r.reasonCode === 'LOW_CONFIDENCE_RULE',
      ),
    );
    check(
      '근거에 출처와 시행일이 실린다 (L3)',
      cafeItem?.eligibility?.reasons?.every(
        (r: { kind: string; sourceTitle: string | null; effectiveFrom: string | null }) =>
          r.kind !== 'RULE' || (Boolean(r.sourceTitle) && Boolean(r.effectiveFrom)),
      ),
    );

    // ── 3. 판정 단건 ──────────────────────────────────────────────
    console.log('\nPOST /api/eligibility/evaluate');
    const evaluated = await fetch(`${BASE}/api/eligibility/evaluate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postingId: warehouse.id, profile: D2_STUDENT }),
    }).then((r) => r.json());
    check('INELIGIBLE', evaluated.status === 'INELIGIBLE', evaluated.status);
    check('번역된 문구가 온다', typeof evaluated.reasons?.[0]?.message === 'string');
    check(
      '한국어 문구다',
      evaluated.reasons?.some((r: { message: string }) => /[가-힣]/.test(r.message)),
    );

    // ── 4. 언어 협상 ──────────────────────────────────────────────
    console.log('\n언어 협상');
    for (const [locale, pattern] of [
      ['vi', /[ăâđêôơư]/i],
      ['zh-CN', /[一-鿿]/],
    ] as const) {
      const res = await fetch(`${BASE}/api/eligibility/evaluate?locale=${locale}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ postingId: warehouse.id, profile: D2_STUDENT }),
      }).then((r) => r.json());
      check(
        `${locale} 문구가 온다`,
        res.reasons?.some((r: { message: string }) => pattern.test(r.message)),
        res.reasons?.[0]?.message,
      );
    }

    // ── 5. L5 — 식별번호 거부 ─────────────────────────────────────
    console.log('\nL5 — 식별번호 거부');
    const rejected = await fetch(`${BASE}/api/eligibility/evaluate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        postingId: cafe.id,
        profile: { ...D2_STUDENT, passportNumber: 'M12345678' },
      }),
    });
    const rejectedBody = await rejected.json();
    check('400 으로 거부된다', rejected.status === 400, rejected.status);
    check('VALIDATION_ERROR 코드', rejectedBody.error?.code === 'VALIDATION_ERROR');
    check(
      '어떤 필드가 문제인지 알려준다',
      rejectedBody.error?.details?.fields?.includes('passportNumber'),
      rejectedBody.error?.details,
    );

    // ── 6. 상세 — 원문 전문이 새지 않는다 (L6) ────────────────────
    console.log('\nGET /api/postings/:id (L6)');
    const detail = await fetch(`${BASE}/api/postings/${cafe.id}`).then((r) => r.json());
    check('sourceUrl 로 링크아웃한다', typeof detail.sourceUrl === 'string');
    const detailKeys = JSON.stringify(detail);
    check(
      '응답에 원문 필드가 없다',
      !detailKeys.includes('bodyRaw') && !detailKeys.includes('body_raw') && !detailKeys.includes('titleRaw'),
    );

    // ── 7. 허용시간 계산 ──────────────────────────────────────────
    console.log('\nPOST /api/eligibility/hour-limit');
    const hours = await fetch(`${BASE}/api/eligibility/hour-limit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profile: D2_STUDENT }),
    }).then((r) => r.json());
    check('상한 규칙을 찾았다', hours.ruleCount > 0, hours.ruleCount);
    check(
      '근거가 low 라 상한값을 단정하지 않는다',
      hours.isVerified === false && hours.permittedWeeklyHours === null,
      { isVerified: hours.isVerified, permittedWeeklyHours: hours.permittedWeeklyHours },
    );
  } finally {
    await prisma.posting.deleteMany({ where: { id: { in: [cafe.id, warehouse.id] } } });
    await prisma.workplace.delete({ where: { id: workplace.id } });
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures}건 실패`);
    process.exitCode = 1;
  } else {
    console.log('전부 통과');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
