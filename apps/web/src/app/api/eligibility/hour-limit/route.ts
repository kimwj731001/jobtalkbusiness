import { z } from 'zod';
import { NextResponse } from 'next/server';
import { errorResponse, readJson } from '@/lib/api';
import { resolveLocale } from '@/lib/locale';
import { ForbiddenIdentityFieldError, parseVisaProfile } from '@/lib/profile-schema';
import { buildContext, evaluateEligibility, loadRulesFor, localizeResult } from '@/lib/evaluation';
import type { PostingFacts } from '@jobtalk/eligibility';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({ profile: z.unknown() }).strict();

/**
 * 온보딩 완료 화면용 — 공고 없이 프로필만으로 허용시간을 계산한다 (spec/API_SPEC.md 2장).
 *
 * 공고가 없으므로 판정 엔진에 "빈 공고"를 넣는다.
 * 시간 상한 규칙은 공고 시간이 없으면 INDETERMINATE 를 내므로,
 * 여기서는 status 가 아니라 규칙이 계산한 상한값만 꺼내 쓴다.
 */
const EMPTY_POSTING: PostingFacts = {
  ksicCode: null,
  jobCategoryCode: null,
  employmentForm: 'UNKNOWN',
  weeklyHoursMin: null,
  weeklyHoursMax: null,
  commuteMinutes: null,
  regionCode: null,
  missingFields: [],
};

export async function POST(request: Request) {
  const locale = resolveLocale(request);
  const raw = await readJson(request);
  if (raw == null) return errorResponse('VALIDATION_ERROR', 'JSON 본문이 필요합니다.');

  const parsedBody = bodySchema.safeParse(raw);
  if (!parsedBody.success) {
    return errorResponse('VALIDATION_ERROR', '요청 형식이 올바르지 않습니다.', {
      issues: parsedBody.error.issues,
    });
  }

  let profile;
  try {
    profile = parseVisaProfile(parsedBody.data.profile);
  } catch (error) {
    if (error instanceof ForbiddenIdentityFieldError) {
      return errorResponse('VALIDATION_ERROR', error.message, { fields: error.fields });
    }
    if (error instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', '프로필 형식이 올바르지 않습니다.', {
        issues: error.issues,
      });
    }
    throw error;
  }

  const context = buildContext();
  const rules = await loadRulesFor(profile, context);

  // 상한 자체는 규칙 데이터에서 직접 읽는다. 판정 상태를 쓰지 않는다.
  const capRules = rules.filter((rule) => rule.ruleType === 'WEEKLY_HOUR_CAP');
  const result = evaluateEligibility(EMPTY_POSTING, profile, rules, context);

  const applied = result.ruleSnapshot.filter((rule) => rule.ruleType === 'WEEKLY_HOUR_CAP');
  const caps = applied.map((rule) => rule.value.hours).filter((h): h is number => h != null);

  // 여러 규칙이 걸리면 가장 낮은 상한이 실질 상한이다
  const permittedWeeklyHours = caps.length === 0 ? null : Math.min(...caps);
  const current = profile.currentWeeklyHours ?? null;

  // 근거가 low 인 규칙이 섞이면 상한값을 단정하지 않는다 (L4)
  const isVerified = applied.length > 0 && applied.every((rule) => rule.confidence !== 'low');

  // 이 엔드포인트는 공고가 없으므로 판정 status 를 내지 않는다.
  // 근거(reasons)와 고지(disclaimer)만 가져다 쓴다 (L3).
  const localized = localizeResult(result, locale);

  return NextResponse.json({
    permittedWeeklyHours: isVerified ? permittedWeeklyHours : null,
    isVerified,
    term: applied[0]?.value.term ?? null,
    currentWeeklyHours: current,
    remainingHours:
      isVerified && permittedWeeklyHours != null && current != null
        ? permittedWeeklyHours - current
        : null,
    ruleCount: capRules.length,
    reasons: localized.reasons,
    disclaimer: localized.disclaimer,
  });
}
