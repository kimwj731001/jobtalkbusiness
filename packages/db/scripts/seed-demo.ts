/**
 * 데모 공고 시드 — 개발·데모용이다. 운영 데이터가 아니다.
 *
 *   npm run seed:demo --workspace @jobtalk/db
 *   npm run seed:demo --workspace @jobtalk/db -- --clean
 *
 * 회기·이문·휘경 일대(MVP 범위)에 있을 법한 공고를 흉내 낸 것이며,
 * 판정 결과가 서로 다르게 나오도록 업종·고용형태를 흩어 놓았다.
 *
 * ⚠️ 실제 채용 공고가 아니다. sourceUrl 은 전부 example.invalid 다.
 *    제목에 [데모] 태그가 붙고, 이 태그로만 제거된다.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { ruleUuid } from '../src/rule-id.ts';

loadEnv({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '.env'),
});

const prisma = new PrismaClient();

/** 사업주 직접 등록 소스 */
const SOURCE_ID = '00000000-0000-5000-8000-000000000001';
const DEMO_TAG = '[데모]';

interface Demo {
  slug: string;
  title: string;
  summary: string;
  employer: string;
  address: string;
  lat: number;
  lng: number;
  ksicCode: string;
  jobCategoryCode: string;
  employmentForm: 'DIRECT' | 'DISPATCH' | 'SUBCONTRACT' | 'PLATFORM' | 'UNKNOWN';
  weeklyHoursMin: number | null;
  weeklyHoursMax: number | null;
  hourlyWageKrw: number | null;
  wageIsEstimated?: boolean;
  koreanRequired: 'NONE' | 'TOPIK1' | 'TOPIK2' | 'TOPIK3' | 'TOPIK4';
  schedule: { dow: number; start: string; end: string }[];
  isNightShift?: boolean;
  isWeekendOnly?: boolean;
  missingFields?: string[];
}

const DEMOS: Demo[] = [
  {
    slug: 'cafe-hoegi',
    title: '회기역 카페 바리스타 (오후 파트)',
    summary: '주 3일 오후 근무. 음료 제조와 홀 정리. 한국어 초급 가능.',
    employer: '카페 온다 회기점',
    address: '서울 동대문구 회기로 15',
    lat: 37.5896,
    lng: 127.0575,
    ksicCode: 'I56',
    jobCategoryCode: 'CAFE_ASSIST',
    employmentForm: 'DIRECT',
    weeklyHoursMin: 12,
    weeklyHoursMax: 15,
    hourlyWageKrw: 11200,
    koreanRequired: 'TOPIK2',
    schedule: [
      { dow: 1, start: '13:00', end: '18:00' },
      { dow: 3, start: '13:00', end: '18:00' },
      { dow: 5, start: '13:00', end: '18:00' },
    ],
  },
  {
    slug: 'convenience-imun-night',
    title: '이문동 편의점 야간 (주 3일)',
    summary: '야간 계산·진열 업무. 유학생 다수 근무 중.',
    employer: '이문 편의점',
    address: '서울 동대문구 이문로 88',
    lat: 37.5963,
    lng: 127.0619,
    ksicCode: 'G47',
    jobCategoryCode: 'RETAIL_SALES',
    employmentForm: 'DIRECT',
    weeklyHoursMin: 21,
    weeklyHoursMax: 24,
    hourlyWageKrw: 12000,
    koreanRequired: 'TOPIK2',
    schedule: [
      { dow: 2, start: '22:00', end: '06:00' },
      { dow: 4, start: '22:00', end: '06:00' },
      { dow: 6, start: '22:00', end: '06:00' },
    ],
    isNightShift: true,
  },
  {
    slug: 'restaurant-hwigyeong-weekend',
    title: '휘경동 한식당 주말 홀서빙',
    summary: '토·일 점심 피크 타임 근무. 주 10시간.',
    employer: '휘경 손칼국수',
    address: '서울 동대문구 휘경로 22',
    lat: 37.5893,
    lng: 127.0642,
    ksicCode: 'I56',
    jobCategoryCode: 'RESTAURANT_ASSIST',
    employmentForm: 'DIRECT',
    weeklyHoursMin: 10,
    weeklyHoursMax: 10,
    hourlyWageKrw: 11000,
    koreanRequired: 'TOPIK3',
    schedule: [
      { dow: 0, start: '11:00', end: '16:00' },
      { dow: 6, start: '11:00', end: '16:00' },
    ],
    isWeekendOnly: true,
  },
  {
    slug: 'logistics-dispatch',
    title: '물류센터 상하차 (파견)',
    summary: '주 4일 단기 근무. 파견업체를 통한 채용.',
    employer: '한빛인력 파견',
    address: '경기 광주시 초월읍',
    lat: 37.3799,
    lng: 127.2891,
    ksicCode: 'H52',
    jobCategoryCode: 'COURIER',
    employmentForm: 'DISPATCH',
    weeklyHoursMin: 20,
    weeklyHoursMax: 32,
    hourlyWageKrw: 13000,
    koreanRequired: 'NONE',
    schedule: [
      { dow: 1, start: '19:00', end: '04:00' },
      { dow: 2, start: '19:00', end: '04:00' },
    ],
    isNightShift: true,
  },
  {
    slug: 'delivery-rider',
    title: '배달 라이더 (자유 근무)',
    summary: '원하는 시간에 배달. 건당 정산.',
    employer: '퀵고 배달대행',
    address: '서울 동대문구 이문동',
    lat: 37.595,
    lng: 127.06,
    ksicCode: 'H52',
    jobCategoryCode: 'DELIVERY_RIDER',
    employmentForm: 'PLATFORM',
    weeklyHoursMin: null,
    weeklyHoursMax: 20,
    hourlyWageKrw: 15000,
    wageIsEstimated: true,
    koreanRequired: 'NONE',
    schedule: [],
  },
  {
    slug: 'manufacturing-line',
    title: '전자부품 조립 생산직',
    summary: '주간 고정 근무. 기숙사 제공.',
    employer: '가온정밀',
    address: '경기 안산시 단원구',
    lat: 37.3219,
    lng: 126.8309,
    ksicCode: 'C29',
    jobCategoryCode: 'MANUFACTURING_LINE',
    employmentForm: 'DIRECT',
    weeklyHoursMin: 40,
    weeklyHoursMax: 40,
    hourlyWageKrw: 11500,
    koreanRequired: 'TOPIK2',
    schedule: [
      { dow: 1, start: '09:00', end: '18:00' },
      { dow: 2, start: '09:00', end: '18:00' },
      { dow: 3, start: '09:00', end: '18:00' },
      { dow: 4, start: '09:00', end: '18:00' },
      { dow: 5, start: '09:00', end: '18:00' },
    ],
  },
  {
    slug: 'construction-site',
    title: '아파트 건설현장 보조',
    summary: '일당 지급. 현장 보조 업무.',
    employer: '대진건설',
    address: '서울 동대문구 전농동',
    lat: 37.58,
    lng: 127.056,
    ksicCode: 'F41',
    jobCategoryCode: 'CONSTRUCTION',
    employmentForm: 'DIRECT',
    weeklyHoursMin: 24,
    weeklyHoursMax: 32,
    hourlyWageKrw: 16000,
    koreanRequired: 'NONE',
    schedule: [{ dow: 1, start: '07:00', end: '17:00' }],
  },
  {
    slug: 'office-assist',
    title: '대학 연구실 사무 보조',
    summary: '문서 정리와 자료 입력. 주 10시간, 시간 조정 가능.',
    employer: '한빛대학교 산학협력단',
    address: '서울 동대문구 경희대로 26',
    lat: 37.5966,
    lng: 127.0522,
    ksicCode: 'N75',
    jobCategoryCode: 'OFFICE_ASSIST',
    employmentForm: 'DIRECT',
    weeklyHoursMin: 8,
    weeklyHoursMax: 10,
    hourlyWageKrw: 12500,
    koreanRequired: 'TOPIK3',
    schedule: [
      { dow: 2, start: '10:00', end: '15:00' },
      { dow: 4, start: '10:00', end: '15:00' },
    ],
  },
  {
    slug: 'translation-assist',
    title: '베트남어 통역·번역 보조',
    summary: '회의 통역 및 문서 번역. 일부 재택 가능.',
    employer: '동방무역',
    address: '서울 동대문구 답십리로 11',
    lat: 37.5747,
    lng: 127.056,
    ksicCode: 'M73',
    jobCategoryCode: 'TRANSLATION_ASSIST',
    employmentForm: 'DIRECT',
    weeklyHoursMin: 6,
    weeklyHoursMax: 12,
    hourlyWageKrw: 18000,
    koreanRequired: 'TOPIK4',
    schedule: [{ dow: 3, start: '14:00', end: '18:00' }],
  },
  {
    slug: 'unknown-hours',
    title: '스터디카페 주말 관리',
    summary: '좌석 정리와 간단 응대. 근무 시간 협의.',
    employer: '집중 스터디카페 회기점',
    address: '서울 동대문구 회기로 30',
    lat: 37.5901,
    lng: 127.0583,
    ksicCode: 'I56',
    jobCategoryCode: 'CAFE_ASSIST',
    employmentForm: 'DIRECT',
    weeklyHoursMin: null,
    weeklyHoursMax: null,
    hourlyWageKrw: 11000,
    koreanRequired: 'TOPIK2',
    schedule: [{ dow: 0, start: '10:00', end: '18:00' }],
    isWeekendOnly: true,
    // 근무 시간이 공고에 없다 — 판정이 UNKNOWN 이 되는 것을 보여주는 케이스
    missingFields: ['weekly_hours_max'],
  },
];

async function clean() {
  const postings = await prisma.posting.deleteMany({ where: { title: { startsWith: DEMO_TAG } } });
  const workplaces = await prisma.workplace.deleteMany({
    where: { address: { startsWith: DEMO_TAG } },
  });
  const employers = await prisma.employer.deleteMany({ where: { name: { startsWith: DEMO_TAG } } });
  console.log(`제거: 공고 ${postings.count}, 사업장 ${workplaces.count}, 사업주 ${employers.count}`);
}

async function main() {
  if (process.argv.includes('--clean')) {
    await clean();
    return;
  }

  // 재실행 시 중복을 막는다
  await clean();

  for (const demo of DEMOS) {
    const employer = await prisma.employer.create({
      data: { name: `${DEMO_TAG} ${demo.employer}`, isVerified: false },
    });
    const workplace = await prisma.workplace.create({
      data: {
        employerId: employer.id,
        address: `${DEMO_TAG} ${demo.address}`,
        sido: demo.address.split(' ')[0] ?? null,
        sigungu: demo.address.split(' ')[1] ?? null,
        lat: demo.lat,
        lng: demo.lng,
      },
    });
    await prisma.posting.create({
      data: {
        id: ruleUuid(`demo-posting-${demo.slug}`),
        sourceId: SOURCE_ID,
        employerId: employer.id,
        workplaceId: workplace.id,
        status: 'ACTIVE',
        title: `${DEMO_TAG} ${demo.title}`,
        summary: demo.summary,
        sourceUrl: `https://example.invalid/demo/${demo.slug}`,
        ksicCode: demo.ksicCode,
        jobCategoryCode: demo.jobCategoryCode,
        employmentForm: demo.employmentForm,
        weeklyHoursMin: demo.weeklyHoursMin,
        weeklyHoursMax: demo.weeklyHoursMax,
        hourlyWageKrw: demo.hourlyWageKrw,
        wageIsEstimated: demo.wageIsEstimated ?? false,
        koreanRequired: demo.koreanRequired,
        schedule: demo.schedule,
        isNightShift: demo.isNightShift ?? false,
        isWeekendOnly: demo.isWeekendOnly ?? false,
        missingFields: demo.missingFields ?? [],
        extractedBy: 'demo_seed',
      },
    });
  }

  console.log(`데모 공고 ${DEMOS.length}건 생성`);
  console.log('제거: npm run seed:demo --workspace @jobtalk/db -- --clean');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
