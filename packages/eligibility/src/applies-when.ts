import { koreanRank, type VisaRule } from '@jobtalk/shared';
import type { EvaluationContext, VisaProfile } from './types.js';

/**
 * 규칙의 applies_when 이 이 프로필·맥락에 걸리는가.
 *
 * 판단 방향은 보수적이다 (L4):
 *  - 프로필 정보가 없어서 조건을 확인할 수 없으면 "적용된다"로 본다.
 *    제한 규칙을 빠뜨리는 쪽보다 적용해 두고 INDETERMINATE 를 내는 쪽이 안전하다.
 */
export function ruleApplies(
  rule: VisaRule,
  profile: VisaProfile,
  context: EvaluationContext,
): boolean {
  if (rule.visa !== profile.visa) return false;

  if (rule.visaSubtype != null && profile.visaSubtype !== rule.visaSubtype) return false;

  const when = rule.appliesWhen;

  if (when.visa_subtype != null && when.visa_subtype.length > 0) {
    if (profile.visaSubtype == null) return true;
    if (!when.visa_subtype.includes(profile.visaSubtype)) return false;
  }

  if (when.degree_level != null && when.degree_level.length > 0) {
    if (!when.degree_level.includes(profile.degreeLevel)) return false;
  }

  const rank = koreanRank(profile.koreanProficiency);

  if (when.korean_min != null) {
    // 한국어 등급을 모르면 "완화 조건"을 충족했다고 보지 않는다
    if (rank == null) return false;
    const min = koreanRank(when.korean_min);
    if (min == null || rank < min) return false;
  }

  if (when.korean_below != null) {
    // 등급을 모르면 미충족(=제한 적용) 쪽으로 본다
    const below = koreanRank(when.korean_below);
    if (below == null) return false;
    if (rank != null && rank >= below) return false;
  }

  if (when.region != null && when.region !== context.region) return false;
  if (when.term != null && when.term !== context.term) return false;

  return true;
}

/** effective_from / effective_to 로 해당 시점에 유효한 규칙만 남긴다 (L2) */
export function isEffectiveOn(rule: VisaRule, isoDate: string): boolean {
  if (rule.effectiveFrom > isoDate) return false;
  if (rule.effectiveTo != null && rule.effectiveTo <= isoDate) return false;
  return true;
}

export function selectApplicableRules(
  rules: VisaRule[],
  profile: VisaProfile,
  context: EvaluationContext,
): VisaRule[] {
  return rules.filter(
    (rule) => isEffectiveOn(rule, context.evaluatedOn) && ruleApplies(rule, profile, context),
  );
}
