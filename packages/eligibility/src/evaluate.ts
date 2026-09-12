import {
  DISCLAIMER_I18N_KEY,
  reasonMessageKey,
  type EligibilityStatus,
  type RequiredAction,
  type RuleVerdict,
  type VisaRule,
} from '@jobtalk/shared';
import { selectApplicableRules } from './applies-when.js';
import { EVALUATORS } from './evaluators.js';
import type {
  EligibilityResult,
  EvaluationContext,
  PostingFacts,
  Reason,
  RuleReason,
  VisaProfile,
} from './types.js';

export const ENGINE_VERSION = '1.0.0';

function engineReason(
  reasonCode: string,
  verdict: RuleVerdict,
  params: Record<string, unknown> = {},
): Reason {
  return {
    kind: 'ENGINE',
    reasonCode,
    verdict,
    messageKey: reasonMessageKey(reasonCode, verdict),
    params,
  };
}

function latestEffectiveFrom(rules: VisaRule[]): string | null {
  let latest: string | null = null;
  for (const rule of rules) {
    if (latest == null || rule.effectiveFrom > latest) latest = rule.effectiveFrom;
  }
  return latest;
}

/**
 * 개별 verdict 들을 하나의 판정으로 합친다.
 *
 * 우선순위: FAIL > INDETERMINATE > WARN > PASS
 * (golden-tests.yaml INV-ORDER-001, D2-PERMIT-002)
 *
 * 규칙이 하나도 평가되지 않았으면 ELIGIBLE 이 아니라 UNKNOWN 이다 (L4).
 */
export function aggregateStatus(verdicts: RuleVerdict[]): EligibilityStatus {
  const scored = verdicts.filter((v) => v !== 'NOT_APPLICABLE');
  if (scored.length === 0) return 'UNKNOWN';
  if (scored.includes('FAIL')) return 'INELIGIBLE';
  if (scored.includes('INDETERMINATE')) return 'UNKNOWN';
  if (scored.includes('WARN')) return 'CONDITIONAL';
  return 'ELIGIBLE';
}

function buildResult(
  status: EligibilityStatus,
  reasons: Reason[],
  ruleSnapshot: VisaRule[],
  context: EvaluationContext,
  extra: Partial<Pick<EligibilityResult, 'remainingHours' | 'commuteMinutes' | 'requiredActions'>> = {},
): EligibilityResult {
  return {
    status,
    reasons,
    ruleSnapshot,
    remainingHours: extra.remainingHours ?? null,
    commuteMinutes: extra.commuteMinutes ?? null,
    requiredActions: extra.requiredActions ?? [],
    disclaimer: {
      textKey: DISCLAIMER_I18N_KEY,
      evaluatedAt: context.evaluatedOn,
      engineVersion: context.engineVersion,
      ruleEffectiveDate: latestEffectiveFrom(ruleSnapshot),
    },
  };
}

/**
 * 판정 엔진 본체. 순수 함수다 — DB·네트워크·환경변수·현재시각에 의존하지 않는다.
 *
 * 기본값은 UNKNOWN 이며, 여기서 ELIGIBLE 로 올라가려면
 * 적용된 모든 규칙이 PASS 여야 하고 그중 confidence='low' 가 하나도 없어야 한다 (L4).
 */
export function evaluateEligibility(
  posting: PostingFacts,
  profile: VisaProfile | null,
  rules: VisaRule[],
  context: EvaluationContext,
): EligibilityResult {
  // 프로필이 없으면 판정하지 않는다. reasons 는 그래도 비우지 않는다 (L3).
  if (profile == null) {
    return buildResult(
      'UNKNOWN',
      [engineReason('NO_PROFILE', 'INDETERMINATE')],
      [],
      context,
      { commuteMinutes: posting.commuteMinutes },
    );
  }

  const applicable = selectApplicableRules(rules, profile, context);

  if (applicable.length === 0) {
    return buildResult(
      'UNKNOWN',
      [engineReason('NO_RULES_FOUND', 'INDETERMINATE', { visa: profile.visa })],
      [],
      context,
      { commuteMinutes: posting.commuteMinutes },
    );
  }

  const reasons: Reason[] = [];
  const snapshot: VisaRule[] = [];
  const verdicts: RuleVerdict[] = [];
  const requiredActions = new Set<RequiredAction>();
  let remainingHours: number | null = null;

  for (const rule of applicable) {
    const outcome = EVALUATORS[rule.ruleType](rule, posting, profile, context);
    if (outcome.verdict === 'NOT_APPLICABLE') continue;

    let verdict = outcome.verdict;
    let reasonCode = outcome.reasonCodeOverride ?? rule.reasonCode;
    let params = outcome.params ?? {};

    // L4 — confidence='low' 규칙은 근거가 확정되지 않았다.
    // 결과가 PASS든 FAIL이든 단정하지 않고 INDETERMINATE 로 내린다 (VISA_RULES.md 1장).
    // 이미 결측으로 INDETERMINATE 인 경우는 그 사유가 더 구체적이므로 유지한다.
    if (rule.confidence === 'low' && verdict !== 'INDETERMINATE') {
      params = { ...params, suppressedVerdict: verdict, suppressedReasonCode: reasonCode };
      verdict = 'INDETERMINATE';
      reasonCode = 'LOW_CONFIDENCE_RULE';
    }

    // 시간 규칙이 여러 개 걸리면 가장 빡빡한 잔여 시간을 남긴다
    const outcomeRemaining = outcome.remainingHours;
    if (outcomeRemaining != null) {
      remainingHours =
        remainingHours == null ? outcomeRemaining : Math.min(remainingHours, outcomeRemaining);
    }
    for (const action of outcome.requiredActions ?? []) requiredActions.add(action);

    const reason: RuleReason = {
      kind: 'RULE',
      ruleId: rule.id,
      ruleType: rule.ruleType,
      reasonCode,
      verdict,
      messageKey: reasonMessageKey(reasonCode, verdict),
      params,
      sourceTitle: rule.sourceTitle,
      sourceClause: rule.sourceClause,
      sourceUrl: rule.sourceUrl,
      effectiveFrom: rule.effectiveFrom,
      confidence: rule.confidence,
    };

    reasons.push(reason);
    snapshot.push(rule);
    verdicts.push(verdict);
  }

  if (reasons.length === 0) {
    return buildResult(
      'UNKNOWN',
      [engineReason('NO_RULES_FOUND', 'INDETERMINATE', { visa: profile.visa })],
      [],
      context,
      { commuteMinutes: posting.commuteMinutes },
    );
  }

  return buildResult(aggregateStatus(verdicts), reasons, snapshot, context, {
    remainingHours,
    commuteMinutes: posting.commuteMinutes,
    requiredActions: [...requiredActions],
  });
}
