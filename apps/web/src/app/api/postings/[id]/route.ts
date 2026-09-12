import { NextResponse } from 'next/server';
import { prisma } from '@jobtalk/db';
import { errorResponse } from '@/lib/api';
import { resolveLocale } from '@/lib/locale';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 공고 상세.
 *
 * ⚠️ L6 — 원문 전문(raw_postings.body_raw)을 반환하지 않는다.
 *    이 라우트는 raw_postings 를 아예 조회하지 않는다. 실수로 새어 나갈 경로 자체를 없앤다.
 *    사용자가 전문을 보려면 sourceUrl 로 나간다.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const request = _request;
  const locale = resolveLocale(request);
  const { id } = await ctx.params;

  const posting = await prisma.posting.findUnique({
    where: { id },
    include: {
      workplace: true,
      employer: { select: { name: true, isWageArrears: true, wageArrearsNote: true } },
      industry: { select: { ksicCode: true, nameKo: true, nameEn: true } },
      jobCategory: true,
      translations: { where: { locale } },
    },
  });

  if (posting == null || posting.status === 'TAKEDOWN') {
    return errorResponse('NOT_FOUND', '공고를 찾을 수 없습니다.');
  }

  const translation = posting.translations[0];

  return NextResponse.json({
    id: posting.id,
    status: posting.status,
    title: translation?.title ?? posting.title,
    summary: translation?.summary ?? posting.summary,
    /** 원문은 여기로 나간다. 본문을 우리가 싣지 않는다 (L6). */
    sourceUrl: posting.sourceUrl,
    employer: posting.employer,
    workplace:
      posting.workplace == null
        ? null
        : {
            sido: posting.workplace.sido,
            sigungu: posting.workplace.sigungu,
            lat: posting.workplace.lat,
            lng: posting.workplace.lng,
          },
    industry: posting.industry,
    jobCategory: posting.jobCategory,
    employmentForm: posting.employmentForm,
    weeklyHoursMin: posting.weeklyHoursMin?.toNumber() ?? null,
    weeklyHoursMax: posting.weeklyHoursMax?.toNumber() ?? null,
    hourlyWageKrw: posting.hourlyWageKrw,
    wageIsEstimated: posting.wageIsEstimated,
    koreanRequired: posting.koreanRequired,
    schedule: posting.schedule,
    isNightShift: posting.isNightShift,
    isWeekendOnly: posting.isWeekendOnly,
    /** 결측 필드를 숨기지 않는다. 왜 UNKNOWN 인지 사용자가 알아야 한다. */
    missingFields: posting.missingFields,
    postedAt: posting.postedAt,
    expiresAt: posting.expiresAt,
  });
}
