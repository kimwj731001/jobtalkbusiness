/**
 * 마이그레이션이 실제 DB에 제대로 들어갔는지 확인한다.
 *
 *   npm run verify --workspace @jobtalk/db
 *
 * 단순 행 수 확인이 아니라, Prisma 가 만들지 못해 별도 SQL 로 넣은 방어 장치들이
 * 살아 있는지 검사한다. 이것들이 빠지면 L6·L7 이 DB 레벨에서 통째로 뚫린다.
 *
 * 검사 후 만든 데이터는 전부 되돌린다.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '.env') });

const prisma = new PrismaClient();

let failures = 0;

function check(name: string, ok: boolean, detail = '') {
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function checkSeedCounts() {
  console.log('\n시드 데이터');
  const [rules, industries, jobs, schools, sources] = await Promise.all([
    prisma.visaRule.count(),
    prisma.industry.count(),
    prisma.jobCategory.count(),
    prisma.school.count(),
    prisma.source.count(),
  ]);
  check('visa_rules 20건', rules === 20, `${rules}건`);
  check('industries 17건', industries === 17, `${industries}건`);
  check('job_categories 18건', jobs === 18, `${jobs}건`);
  check('schools 3건', schools === 3, `${schools}건`);
  check('sources 2건', sources === 2, `${sources}건`);

  const low = await prisma.visaRule.count({ where: { confidence: 'low' } });
  check('confidence=low 13건 (원문 미대조 상태)', low === 13, `${low}건`);

  const reviewed = await prisma.ruleReview.count();
  check('rule_reviews 0건 (아직 검수 없음 — high 규칙이 없어야 정상)', reviewed === 0, `${reviewed}건`);

  const high = await prisma.visaRule.count({ where: { confidence: 'high' } });
  check('검수 없이 confidence=high 인 규칙이 없다', high === 0, `${high}건`);
}

/** L7 — 로그인이 필요한 크롤 소스는 DB가 활성화를 거부해야 한다 */
async function checkLegalGate() {
  console.log('\nL7 — 소스 활성화 게이트 (chk_source_legal_gate)');
  const id = '00000000-0000-5000-8000-0000000000ff';

  await prisma.source.deleteMany({ where: { id } });
  await prisma.source.create({
    data: {
      id,
      name: '[검증용] 로그인 필요 크롤 소스',
      kind: 'CRAWL',
      riskGrade: 'S',
      enabled: false,
      requiresLogin: true,
    },
  });

  let rejected = false;
  try {
    await prisma.source.update({ where: { id }, data: { enabled: true } });
  } catch {
    rejected = true;
  }
  check('로그인 필요 크롤 소스의 활성화가 거부된다', rejected);

  // robots 미확인 소스도 마찬가지
  await prisma.source.update({ where: { id }, data: { requiresLogin: false } });
  let rejectedRobots = false;
  try {
    await prisma.source.update({ where: { id }, data: { enabled: true } });
  } catch {
    rejectedRobots = true;
  }
  check('robots 미확인 크롤 소스의 활성화가 거부된다', rejectedRobots);

  await prisma.source.deleteMany({ where: { id } });
}

/** L2 — 규칙 유효기간 역전을 DB가 막아야 한다 */
async function checkEffectiveRange() {
  console.log('\nL2 — 규칙 유효기간 (chk_effective_range)');
  let rejected = false;
  try {
    await prisma.visaRule.create({
      data: {
        visa: 'D2',
        ruleType: 'WEEKLY_HOUR_CAP',
        value: { hours: 10 },
        sourceTitle: '[검증용]',
        effectiveFrom: new Date('2026-01-01T00:00:00Z'),
        effectiveTo: new Date('2025-01-01T00:00:00Z'),
        reasonCode: 'VERIFY',
      },
    });
  } catch {
    rejected = true;
  }
  check('effective_to < effective_from 인 규칙이 거부된다', rejected);
  await prisma.visaRule.deleteMany({ where: { reasonCode: 'VERIFY' } });
}

/** 킬스위치 — 소스를 끄면 공고가 즉시 내려가야 한다 */
async function checkKillSwitch() {
  console.log('\n킬스위치 (trg_source_kill_switch)');
  const sourceId = '00000000-0000-5000-8000-0000000000fe';

  await prisma.posting.deleteMany({ where: { sourceId } });
  await prisma.source.deleteMany({ where: { id: sourceId } });
  await prisma.source.create({
    data: {
      id: sourceId,
      name: '[검증용] 킬스위치 소스',
      kind: 'EMPLOYER_DIRECT',
      riskGrade: 'C',
      enabled: true,
    },
  });

  const posting = await prisma.posting.create({
    data: {
      sourceId,
      title: '[검증용] 공고',
      sourceUrl: 'https://example.invalid/verify',
      status: 'ACTIVE',
    },
  });

  await prisma.source.update({ where: { id: sourceId }, data: { enabled: false } });
  const after = await prisma.posting.findUniqueOrThrow({ where: { id: posting.id } });
  check('소스를 끄면 ACTIVE 공고가 SUSPENDED 가 된다', after.status === 'SUSPENDED', after.status);

  await prisma.posting.deleteMany({ where: { sourceId } });
  await prisma.source.deleteMany({ where: { id: sourceId } });
}

/** L6 — 원문 TTL 파기 함수 */
async function checkPurgeFunction() {
  console.log('\nL6 — 원문 TTL 파기 (purge_expired_raw_bodies)');
  const sourceId = '00000000-0000-5000-8000-000000000001'; // 사업주 직접 등록

  await prisma.rawPosting.deleteMany({ where: { contentHash: 'verify-hash' } });
  const raw = await prisma.rawPosting.create({
    data: {
      sourceId,
      sourceUrl: 'https://example.invalid/verify-raw',
      contentHash: 'verify-hash',
      titleRaw: '[검증용] 원문 제목',
      bodyRaw: '[검증용] 원문 본문 — 파기되어야 한다',
      // 이미 만료된 것으로 만든다
      purgeAfter: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });

  const purged = await prisma.$queryRaw<{ purge_expired_raw_bodies: number }[]>`
    SELECT purge_expired_raw_bodies()
  `;
  check('파기 함수가 존재하고 실행된다', Array.isArray(purged) && purged.length === 1);

  const after = await prisma.rawPosting.findUniqueOrThrow({ where: { id: raw.id } });
  check('만료된 원문의 body_raw 가 NULL 이 된다', after.bodyRaw === null, String(after.bodyRaw));
  check('만료된 원문의 title_raw 가 NULL 이 된다', after.titleRaw === null, String(after.titleRaw));
  check('source_url 은 보존된다 (링크아웃용)', after.sourceUrl.length > 0);
  check('content_hash 는 보존된다 (중복 판정용)', after.contentHash === 'verify-hash');
  check('purged_at 이 기록된다', after.purgedAt !== null);

  await prisma.rawPosting.deleteMany({ where: { contentHash: 'verify-hash' } });
}

/** L5 — 식별번호 컬럼이 존재하지 않아야 한다 */
async function checkNoIdentityColumns() {
  console.log('\nL5 — 식별번호 컬럼 부재');
  const rows = await prisma.$queryRaw<{ table_name: string; column_name: string }[]>`
    SELECT table_name, column_name
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND (column_name ILIKE '%alien%registration%'
         OR column_name ILIKE '%passport%'
         OR column_name ILIKE '%resident%registration%'
         OR column_name ILIKE '%rrn%')
  `;
  check(
    '외국인등록번호·여권번호·주민등록번호 컬럼이 없다',
    rows.length === 0,
    rows.map((r) => `${r.table_name}.${r.column_name}`).join(', '),
  );
}

async function main() {
  console.log(`검증 대상: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}`);
  await checkSeedCounts();
  await checkLegalGate();
  await checkEffectiveRange();
  await checkKillSwitch();
  await checkPurgeFunction();
  await checkNoIdentityColumns();

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
