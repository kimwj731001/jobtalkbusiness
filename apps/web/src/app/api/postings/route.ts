import { z } from 'zod';
import { NextResponse } from 'next/server';
import type { Prisma } from '@jobtalk/db';
import { prisma } from '@jobtalk/db';
import { errorResponse } from '@/lib/api';
import { resolveLocale } from '@/lib/locale';
import { ForbiddenIdentityFieldError, parseVisaProfile } from '@/lib/profile-schema';
import {
  buildContext,
  evaluateEligibility,
  loadRulesFor,
  localizeResult,
  lookupCommuteMinutes,
  toPostingFacts,
} from '@/lib/evaluation';
import { ELIGIBILITY_STATUSES } from '@jobtalk/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const csv = (value: string | null) =>
  value == null ? undefined : value.split(',').map((v) => v.trim()).filter(Boolean);

const querySchema = z.object({
  q: z.string().max(100).optional(),
  minWage: z.coerce.number().int().min(0).optional(),
  maxWeeklyHours: z.coerce.number().min(0).max(168).optional(),
  ksic: z.array(z.string().max(16)).optional(),
  jobCategory: z.array(z.string().max(64)).optional(),
  eligibility: z.array(z.enum(ELIGIBILITY_STATUSES)).optional(),
  sort: z.enum(['RELEVANCE', 'WAGE_DESC', 'COMMUTE_ASC', 'RECENT']).default('RECENT'),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * 공고 검색. 비로그인 허용 (spec/API_SPEC.md 1장).
 *
 * 프로필을 주면 각 공고에 판정을 붙여 돌려준다.
 * 프로필이 없으면 판정은 UNKNOWN 이고 사유는 NO_PROFILE 하나다 — 빈 배열이 아니다 (L3).
 */
export async function GET(request: Request) {
  const locale = resolveLocale(request);
  const url = new URL(request.url);

  const parsed = querySchema.safeParse({
    q: url.searchParams.get('q') ?? undefined,
    minWage: url.searchParams.get('minWage') ?? undefined,
    maxWeeklyHours: url.searchParams.get('maxWeeklyHours') ?? undefined,
    ksic: csv(url.searchParams.get('ksic')),
    jobCategory: csv(url.searchParams.get('jobCategory')),
    eligibility: csv(url.searchParams.get('eligibility')),
    sort: url.searchParams.get('sort') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', '검색 조건이 올바르지 않습니다.', {
      issues: parsed.error.issues,
    });
  }
  const query = parsed.data;

  // 프로필은 헤더로 받는다 (GET 이라 본문이 없다). 세션 도입 전까지의 임시 경로다.
  let profile = null;
  const profileHeader = request.headers.get('x-visa-profile');
  if (profileHeader != null && profileHeader.length > 0) {
    try {
      profile = parseVisaProfile(JSON.parse(profileHeader));
    } catch (error) {
      if (error instanceof ForbiddenIdentityFieldError) {
        return errorResponse('VALIDATION_ERROR', error.message, { fields: error.fields });
      }
      return errorResponse('VALIDATION_ERROR', '프로필 형식이 올바르지 않습니다.');
    }
  }

  const where: Prisma.PostingWhereInput = {
    status: 'ACTIVE',
    ...(query.minWage == null ? {} : { hourlyWageKrw: { gte: query.minWage } }),
    ...(query.maxWeeklyHours == null ? {} : { weeklyHoursMax: { lte: query.maxWeeklyHours } }),
    ...(query.ksic == null ? {} : { ksicCode: { in: query.ksic } }),
    ...(query.jobCategory == null ? {} : { jobCategoryCode: { in: query.jobCategory } }),
    ...(query.q == null
      ? {}
      : {
          OR: [
            { title: { contains: query.q, mode: 'insensitive' } },
            { summary: { contains: query.q, mode: 'insensitive' } },
          ],
        }),
  };

  const orderBy: Prisma.PostingOrderByWithRelationInput[] =
    query.sort === 'WAGE_DESC'
      ? [{ hourlyWageKrw: 'desc' }, { id: 'asc' }]
      : [{ lastSeenAt: 'desc' }, { id: 'asc' }];

  const rows = await prisma.posting.findMany({
    where,
    orderBy,
    take: query.limit + 1,
    ...(query.cursor == null ? {} : { cursor: { id: query.cursor }, skip: 1 }),
    include: {
      workplace: true,
      employer: { select: { name: true, isWageArrears: true } },
      translations: { where: { locale } },
    },
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  const context = buildContext();
  const rules = await loadRulesFor(profile, context);

  const items = await Promise.all(
    page.map(async (posting) => {
      const commuteMinutes =
        profile == null ? null : await lookupCommuteMinutes(profile, posting.workplace);
      const result = evaluateEligibility(
        toPostingFacts(posting, commuteMinutes),
        profile,
        rules,
        context,
      );
      const translation = posting.translations[0];

      return {
        id: posting.id,
        title: translation?.title ?? posting.title,
        // L6 — 요약만 내보낸다. 원문 전문은 응답에 싣지 않는다. 상세는 sourceUrl 링크아웃.
        summary: translation?.summary ?? posting.summary,
        sourceUrl: posting.sourceUrl,
        employer: posting.employer,
        ksicCode: posting.ksicCode,
        jobCategoryCode: posting.jobCategoryCode,
        employmentForm: posting.employmentForm,
        weeklyHoursMin: posting.weeklyHoursMin?.toNumber() ?? null,
        weeklyHoursMax: posting.weeklyHoursMax?.toNumber() ?? null,
        hourlyWageKrw: posting.hourlyWageKrw,
        wageIsEstimated: posting.wageIsEstimated,
        koreanRequired: posting.koreanRequired,
        schedule: posting.schedule,
        commuteMinutes,
        eligibility: localizeResult(result, locale),
      };
    }),
  );

  /**
   * ⚠️ 판정 필터는 DB가 아니라 여기서 적용된다.
   *    판정은 프로필에 따라 달라져 미리 계산해 둘 수 없기 때문이다.
   *    그래서 필터를 걸면 페이지가 limit 보다 적게 찰 수 있다.
   *    공고가 수천 건 단위로 늘면 eligibility_evaluations 캐시를 조인하는 쪽으로 바꾼다.
   */
  const filtered =
    query.eligibility == null
      ? items
      : items.filter((item) => query.eligibility!.includes(item.eligibility.status));

  return NextResponse.json({
    items: filtered,
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    eligibilityFilterApplied: query.eligibility != null,
  });
}
