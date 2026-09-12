/**
 * 시드 — 실행에 살아 있는 Postgres 가 필요하다.
 *   DATABASE_URL=... npm run seed --workspace @jobtalk/db
 *
 * 멱등하다. 여러 번 돌려도 같은 행을 갱신한다.
 *
 * ⚠️ visa_rules 는 VISA_RULES_SEED (packages/shared) 가 정본이다.
 *    규칙을 바꿀 때 이 파일이 아니라 그쪽을 고친다.
 */
import { PrismaClient } from '@prisma/client';
import { VISA_RULES_SEED } from '@jobtalk/shared';
import { ruleUuid } from '../src/rule-id.ts';

const prisma = new PrismaClient();

/** MVP 범위(회기·이문·휘경)에서 실제로 쓰이는 대·중분류만 넣는다 */
const INDUSTRIES: { ksicCode: string; nameKo: string; nameEn: string | null; parentCode: string | null; level: number }[] = [
  { ksicCode: 'C', nameKo: '제조업', nameEn: 'Manufacturing', parentCode: null, level: 1 },
  { ksicCode: 'C29', nameKo: '기타 기계 및 장비 제조업', nameEn: 'Other machinery and equipment', parentCode: 'C', level: 2 },
  { ksicCode: 'F', nameKo: '건설업', nameEn: 'Construction', parentCode: null, level: 1 },
  { ksicCode: 'F41', nameKo: '종합 건설업', nameEn: 'General construction', parentCode: 'F', level: 2 },
  { ksicCode: 'G', nameKo: '도매 및 소매업', nameEn: 'Wholesale and retail trade', parentCode: null, level: 1 },
  { ksicCode: 'G47', nameKo: '소매업 (자동차 제외)', nameEn: 'Retail trade', parentCode: 'G', level: 2 },
  { ksicCode: 'H', nameKo: '운수 및 창고업', nameEn: 'Transportation and storage', parentCode: null, level: 1 },
  { ksicCode: 'H52', nameKo: '창고 및 운송관련 서비스업', nameEn: 'Warehousing and support', parentCode: 'H', level: 2 },
  { ksicCode: 'H501', nameKo: '해상 여객 운송업', nameEn: 'Sea passenger transport', parentCode: 'H', level: 3 },
  { ksicCode: 'H502', nameKo: '해상 화물 운송업', nameEn: 'Sea freight transport', parentCode: 'H', level: 3 },
  { ksicCode: 'I', nameKo: '숙박 및 음식점업', nameEn: 'Accommodation and food service', parentCode: null, level: 1 },
  { ksicCode: 'I56', nameKo: '음식점 및 주점업', nameEn: 'Food and beverage service', parentCode: 'I', level: 2 },
  { ksicCode: 'M', nameKo: '전문, 과학 및 기술 서비스업', nameEn: 'Professional and technical services', parentCode: null, level: 1 },
  { ksicCode: 'M73', nameKo: '기타 전문, 과학 및 기술 서비스업', nameEn: 'Other professional services', parentCode: 'M', level: 2 },
  { ksicCode: 'N', nameKo: '사업시설 관리 및 사업지원 서비스업', nameEn: 'Business facilities and support', parentCode: null, level: 1 },
  { ksicCode: 'N75', nameKo: '사업지원 서비스업', nameEn: 'Business support services', parentCode: 'N', level: 2 },
  { ksicCode: 'N752', nameKo: '기타 사업지원 서비스업', nameEn: 'Other business support', parentCode: 'N75', level: 3 },
];

/** VISA_RULES.md 7장 */
const JOB_CATEGORIES: { code: string; nameKo: string; nameEn: string; ksicHint: string | null }[] = [
  { code: 'RESTAURANT_ASSIST', nameKo: '일반 음식점 보조', nameEn: 'Restaurant assistant', ksicHint: 'I56' },
  { code: 'CAFE_ASSIST', nameKo: '카페 보조', nameEn: 'Cafe assistant', ksicHint: 'I56' },
  { code: 'RETAIL_SALES', nameKo: '매장 판매·상품 정리 보조', nameEn: 'Retail sales assistant', ksicHint: 'G47' },
  { code: 'OFFICE_ASSIST', nameKo: '사무 보조', nameEn: 'Office assistant', ksicHint: 'N75' },
  { code: 'EVENT_ASSIST', nameKo: '행사 보조', nameEn: 'Event assistant', ksicHint: 'N752' },
  { code: 'TOUR_GUIDE_ASSIST', nameKo: '관광안내 보조', nameEn: 'Tour guide assistant', ksicHint: 'N752' },
  { code: 'TRANSLATION_ASSIST', nameKo: '통역·번역 보조', nameEn: 'Translation assistant', ksicHint: 'M73' },
  { code: 'DUTY_FREE_SALES', nameKo: '면세점 판매 보조', nameEn: 'Duty-free sales assistant', ksicHint: 'G47' },
  { code: 'MAJOR_RELATED', nameKo: '전공 연계 보조업무', nameEn: 'Major-related assistance', ksicHint: null },
  { code: 'VACATION_INTERN', nameKo: '방학 중 인턴', nameEn: 'Vacation internship', ksicHint: null },
  // 금지 목록 — 판정으로 걸러내려면 분류 자체는 존재해야 한다
  { code: 'DELIVERY_RIDER', nameKo: '배달대행 라이더', nameEn: 'Delivery rider', ksicHint: 'H52' },
  { code: 'COURIER', nameKo: '택배기사', nameEn: 'Courier', ksicHint: 'H52' },
  { code: 'PROXY_DRIVER', nameKo: '대리운전 기사', nameEn: 'Proxy driver', ksicHint: 'H52' },
  { code: 'INSURANCE_AGENT', nameKo: '보험설계사', nameEn: 'Insurance agent', ksicHint: null },
  { code: 'TUTOR_VISIT', nameKo: '학습지 교사', nameEn: 'Visiting tutor', ksicHint: null },
  { code: 'DOOR_TO_DOOR_SALES', nameKo: '방문판매원', nameEn: 'Door-to-door sales', ksicHint: null },
  { code: 'MANUFACTURING_LINE', nameKo: '생산라인', nameEn: 'Manufacturing line', ksicHint: 'C' },
  { code: 'CONSTRUCTION', nameKo: '건설 현장', nameEn: 'Construction site', ksicHint: 'F' },
];

/** MVP 범위: 서울 동대문구 회기·이문·휘경 */
const SCHOOLS = [
  { nameKo: '경희대학교', nameEn: 'Kyung Hee University', campus: '서울캠퍼스', address: '서울 동대문구 경희대로 26', lat: 37.5966, lng: 127.0522 },
  { nameKo: '한국외국어대학교', nameEn: 'Hankuk University of Foreign Studies', campus: '서울캠퍼스', address: '서울 동대문구 이문로 107', lat: 37.5975, lng: 127.0587 },
  { nameKo: '서울시립대학교', nameEn: 'University of Seoul', campus: null, address: '서울 동대문구 서울시립대로 163', lat: 37.5838, lng: 127.0586 },
];

async function seedSources() {
  // 사업주 직접 등록은 크롤이 아니므로 기본 활성이다 (L7 게이트 대상 아님).
  await prisma.source.upsert({
    where: { id: '00000000-0000-5000-8000-000000000001' },
    update: { enabled: true },
    create: {
      id: '00000000-0000-5000-8000-000000000001',
      name: '사업주 직접 등록',
      kind: 'EMPLOYER_DIRECT',
      riskGrade: 'C',
      enabled: true,
      requiresLogin: false,
      legalNote: '사업주가 직접 입력한 공고. 수집이 아니므로 robots/ToS 대상이 아니다.',
    },
  });

  // 사용자 제보 경로. 크롤링 대신 권장하는 경로다.
  await prisma.source.upsert({
    where: { id: '00000000-0000-5000-8000-000000000002' },
    update: { enabled: true },
    create: {
      id: '00000000-0000-5000-8000-000000000002',
      name: '사용자 제보',
      kind: 'USER_SUBMISSION',
      riskGrade: 'C',
      enabled: true,
      requiresLogin: false,
      legalNote: '사용자가 링크를 제보한 공고.',
    },
  });
}

async function seedIndustries() {
  // 부모를 먼저 만들어야 FK 가 걸린다
  for (const industry of [...INDUSTRIES].sort((a, b) => a.level - b.level)) {
    await prisma.industry.upsert({
      where: { ksicCode: industry.ksicCode },
      update: { nameKo: industry.nameKo, nameEn: industry.nameEn, parentCode: industry.parentCode, level: industry.level },
      create: industry,
    });
  }
}

async function seedJobCategories() {
  for (const job of JOB_CATEGORIES) {
    await prisma.jobCategory.upsert({
      where: { code: job.code },
      update: { nameKo: job.nameKo, nameEn: job.nameEn, ksicHint: job.ksicHint },
      create: job,
    });
  }
}

async function seedSchools() {
  for (const school of SCHOOLS) {
    const existing = await prisma.school.findFirst({
      where: { nameKo: school.nameKo, campus: school.campus },
    });
    if (existing) {
      await prisma.school.update({ where: { id: existing.id }, data: school });
    } else {
      await prisma.school.create({ data: school });
    }
  }
}

async function seedVisaRules() {
  for (const rule of VISA_RULES_SEED) {
    const id = ruleUuid(rule.id);
    const data = {
      visa: rule.visa,
      visaSubtype: rule.visaSubtype,
      ruleType: rule.ruleType,
      appliesWhen: rule.appliesWhen as object,
      value: rule.value as object,
      violationStatus: rule.violationStatus,
      sourceTitle: rule.sourceTitle,
      sourceClause: rule.sourceClause,
      sourceUrl: rule.sourceUrl,
      effectiveFrom: new Date(`${rule.effectiveFrom}T00:00:00Z`),
      effectiveTo: rule.effectiveTo ? new Date(`${rule.effectiveTo}T00:00:00Z`) : null,
      confidence: rule.confidence,
      reasonCode: rule.reasonCode,
      note: rule.note == null ? `slug=${rule.id}` : `${rule.note} (slug=${rule.id})`,
    };
    await prisma.visaRule.upsert({ where: { id }, update: data, create: { id, ...data } });
  }
}

async function main() {
  await seedSources();
  await seedIndustries();
  await seedJobCategories();
  await seedSchools();
  await seedVisaRules();

  const lowConfidence = VISA_RULES_SEED.filter((r) => r.confidence === 'low').length;
  console.log(`seeded: ${VISA_RULES_SEED.length} visa rules (${lowConfidence} at confidence=low)`);
  console.log(`         ${INDUSTRIES.length} industries, ${JOB_CATEGORIES.length} job categories, ${SCHOOLS.length} schools`);
  if (lowConfidence > 0) {
    console.warn(
      `\n⚠️  confidence='low' 규칙이 ${lowConfidence}건이다. 이 규칙이 걸리는 판정은 UNKNOWN 이 된다.\n` +
        `   지침 원문 대조 → rule_reviews 기록 → confidence 승급 순서로 해소한다 (spec/VISA_RULES.md 8장).`,
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
