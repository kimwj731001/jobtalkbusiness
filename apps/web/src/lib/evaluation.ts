import { prisma, loadVisaRules } from '@jobtalk/db';
import {
  evaluateEligibility,
  ENGINE_VERSION,
  type EligibilityResult,
  type EvaluationContext,
  type PostingFacts,
  type VisaProfile,
} from '@jobtalk/eligibility';
import { E9_NO_BROKERAGE_I18N_KEY, formatMessage, type Locale } from '@jobtalk/shared';

/**
 * MVP 범위는 수도권 대학가다 (CLAUDE.md 1장).
 * 권역을 프로필 주소에서 유도하게 되면 이 상수는 사라진다.
 */
const MVP_REGION = 'CAPITAL_AREA';

/**
 * 학기/방학 구분.
 *
 * 방학 중 상한 미적용 조건이 아직 검증되지 않았다 (CLAUDE.md 9장).
 * 확인 전까지는 항상 학기 기준으로 본다 — 둘 중 더 엄격한 쪽이다.
 * 방학이라고 느슨하게 판정했다가 틀리면 사용자가 초과 취업으로 걸린다.
 */
const MVP_TERM = 'SEMESTER';

export function buildContext(evaluatedOn: Date = new Date()): EvaluationContext {
  return {
    evaluatedOn: evaluatedOn.toISOString().slice(0, 10),
    region: MVP_REGION,
    term: MVP_TERM,
    engineVersion: ENGINE_VERSION,
  };
}

type PostingWithRelations = {
  id: string;
  ksicCode: string | null;
  jobCategoryCode: string | null;
  employmentForm: PostingFacts['employmentForm'];
  weeklyHoursMin: { toNumber(): number } | null;
  weeklyHoursMax: { toNumber(): number } | null;
  missingFields: string[];
  workplace: { regionCode: string | null; lat: number | null; lng: number | null } | null;
};

/**
 * 공고 행 → 판정 입력.
 *
 * ⚠️ 모르는 값은 null 로 둔다. 0 이나 기본값으로 채우면 UNKNOWN 이 되어야 할 판정이
 *    ELIGIBLE 로 새어 나간다 (L4).
 */
export function toPostingFacts(
  posting: PostingWithRelations,
  commuteMinutes: number | null,
): PostingFacts {
  return {
    id: posting.id,
    ksicCode: posting.ksicCode,
    jobCategoryCode: posting.jobCategoryCode,
    employmentForm: posting.employmentForm,
    weeklyHoursMin: posting.weeklyHoursMin?.toNumber() ?? null,
    weeklyHoursMax: posting.weeklyHoursMax?.toNumber() ?? null,
    commuteMinutes,
    regionCode: posting.workplace?.regionCode ?? null,
    missingFields: posting.missingFields,
  };
}

/**
 * 통학 시간은 캐시에서만 읽는다.
 *
 * 경로 API(카카오/ODsay) 연동이 아직 없다. 캐시에 없으면 null 이고,
 * 통학 규칙은 MISSING_POSTING_FIELD 로 INDETERMINATE 가 된다 — 의도된 동작이다.
 * 추측한 소요시간으로 판정하는 것보다 "모른다"고 답하는 쪽이 맞다.
 */
export async function lookupCommuteMinutes(
  profile: VisaProfile,
  workplace: { lat: number | null; lng: number | null } | null,
): Promise<number | null> {
  if (
    profile.baseLat == null ||
    profile.baseLng == null ||
    workplace?.lat == null ||
    workplace.lng == null
  ) {
    return null;
  }

  const cached = await prisma.commuteCache.findUnique({
    where: {
      originLat_originLng_destLat_destLng: {
        originLat: profile.baseLat,
        originLng: profile.baseLng,
        destLat: workplace.lat,
        destLng: workplace.lng,
      },
    },
  });

  return cached?.transitMinutes ?? null;
}

/** 규칙 조회는 판정마다 반복되므로 요청 단위로 한 번만 읽는다 */
export async function loadRulesFor(profile: VisaProfile | null, context: EvaluationContext) {
  if (profile == null) return [];
  return loadVisaRules(prisma, { visa: profile.visa, on: new Date(context.evaluatedOn) });
}

/** API 응답용 — 엔진 결과에 번역된 문구를 입힌다 (L3: 근거는 읽을 수 있어야 근거다) */
export function localizeResult(result: EligibilityResult, locale: Locale) {
  return {
    status: result.status,
    reasons: result.reasons.map((reason) => ({
      kind: reason.kind,
      ruleId: reason.kind === 'RULE' ? reason.ruleId : null,
      ruleType: reason.kind === 'RULE' ? reason.ruleType : null,
      reasonCode: reason.reasonCode,
      verdict: reason.verdict,
      message: formatMessage(reason.messageKey, reason.params, locale),
      messageKey: reason.messageKey,
      params: reason.params,
      sourceTitle: reason.kind === 'RULE' ? reason.sourceTitle : null,
      sourceClause: reason.kind === 'RULE' ? reason.sourceClause : null,
      sourceUrl: reason.kind === 'RULE' ? reason.sourceUrl : null,
      effectiveFrom: reason.kind === 'RULE' ? reason.effectiveFrom : null,
      confidence: reason.kind === 'RULE' ? reason.confidence : null,
    })),
    remainingHours: result.remainingHours,
    commuteMinutes: result.commuteMinutes,
    requiredActions: result.requiredActions.map((action) => ({
      code: action,
      label: formatMessage(`action.${action}`, {}, locale),
      description: formatMessage(`action.${action}.description`, {}, locale),
    })),
    disclaimer: {
      text: formatMessage(result.disclaimer.textKey, {}, locale),
      evaluatedAt: result.disclaimer.evaluatedAt,
      engineVersion: result.disclaimer.engineVersion,
      ruleEffectiveDate: result.disclaimer.ruleEffectiveDate,
    },
  };
}

/**
 * E-9 판정에는 알선 미제공 고지를 반드시 함께 낸다 (CLAUDE.md L1).
 * 화면에서 빠뜨리는 것을 막기 위해 API 응답에 싣는다.
 */
export function brokerageNotice(profile: VisaProfile | null, locale: Locale): string | null {
  if (profile?.visa !== 'E9') return null;
  return formatMessage(E9_NO_BROKERAGE_I18N_KEY, {}, locale);
}

export { evaluateEligibility };
