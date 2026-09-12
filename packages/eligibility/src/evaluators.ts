import { koreanRank, type EligibilityStatus, type RuleType, type RuleVerdict } from '@jobtalk/shared';
import type { RuleEvaluator, RuleOutcome } from './types.js';

/**
 * rule_type 별 평가기.
 *
 * ⚠️ L2 — 이 파일에 비자 코드(D2/D4/E9…)를 조건으로 쓰는 분기를 넣지 않는다.
 *    평가기는 "규칙 타입을 어떻게 계산하는가"만 알고,
 *    "어떤 비자에 무슨 값이 적용되는가"는 전부 visa_rules 데이터가 정한다.
 */

const MISSING_POSTING_FIELD = 'MISSING_POSTING_FIELD';
const MISSING_PROFILE_FIELD = 'MISSING_PROFILE_FIELD';
const MALFORMED_RULE_VALUE = 'MALFORMED_RULE_VALUE';

/** violation_status 를 개별 규칙의 verdict 로 옮긴다 */
function verdictForViolation(status: EligibilityStatus): RuleVerdict {
  switch (status) {
    case 'INELIGIBLE':
      return 'FAIL';
    case 'CONDITIONAL':
      return 'WARN';
    case 'UNKNOWN':
      return 'INDETERMINATE';
    case 'ELIGIBLE':
      return 'PASS';
  }
}

function indeterminate(reasonCode: string, params: Record<string, unknown> = {}): RuleOutcome {
  return { verdict: 'INDETERMINATE', reasonCodeOverride: reasonCode, params };
}

function pass(params: Record<string, unknown> = {}): RuleOutcome {
  return { verdict: 'PASS', params };
}

function matchesPrefix(code: string, prefixes: string[]): string | null {
  for (const prefix of prefixes) {
    if (code.startsWith(prefix)) return prefix;
  }
  return null;
}

const weeklyHourCap: RuleEvaluator = (rule, posting, profile) => {
  const cap = rule.value.hours;
  if (cap == null) return indeterminate(MALFORMED_RULE_VALUE, { field: 'hours' });

  if (posting.weeklyHoursMax == null) {
    return indeterminate(MISSING_POSTING_FIELD, { field: 'weekly_hours_max', capHours: cap });
  }
  if (profile.currentWeeklyHours == null) {
    return indeterminate(MISSING_PROFILE_FIELD, { field: 'current_weekly_hours', capHours: cap });
  }

  // 사용자가 실제로 허가받은 시간이 지침 상한보다 낮을 수 있다. 낮은 쪽이 실질 상한이다.
  const effectiveCap =
    profile.permittedWeeklyHours == null ? cap : Math.min(cap, profile.permittedWeeklyHours);

  const total = profile.currentWeeklyHours + posting.weeklyHoursMax;
  const remainingHours = effectiveCap - profile.currentWeeklyHours;

  const params = {
    capHours: cap,
    effectiveCapHours: effectiveCap,
    currentWeeklyHours: profile.currentWeeklyHours,
    postingWeeklyHours: posting.weeklyHoursMax,
    totalWeeklyHours: total,
    term: rule.value.term ?? null,
  };

  // 경계값(합계 == 상한)은 허용한다. 초과(>)만 위반이다.
  if (total > effectiveCap) {
    return {
      verdict: verdictForViolation(rule.violationStatus),
      params,
      statusOnFail: rule.violationStatus,
      remainingHours,
    };
  }
  return { verdict: 'PASS', params, remainingHours };
};

const industryDeny: RuleEvaluator = (rule, posting) => {
  const prefixes = rule.value.ksic_prefixes;
  if (prefixes == null || prefixes.length === 0) {
    return indeterminate(MALFORMED_RULE_VALUE, { field: 'ksic_prefixes' });
  }
  if (posting.ksicCode == null) {
    return indeterminate(MISSING_POSTING_FIELD, { field: 'ksic_code', ksicPrefixes: prefixes });
  }

  const hit = matchesPrefix(posting.ksicCode, prefixes);
  const params = {
    ksicCode: posting.ksicCode,
    ksicPrefixes: prefixes,
    matchedPrefix: hit,
    labels: rule.value.labels ?? null,
  };

  if (hit != null) {
    return { verdict: verdictForViolation(rule.violationStatus), params, statusOnFail: rule.violationStatus };
  }
  return pass(params);
};

const industryAllow: RuleEvaluator = (rule, posting) => {
  const prefixes = rule.value.ksic_prefixes;
  if (prefixes == null || prefixes.length === 0) {
    return indeterminate(MALFORMED_RULE_VALUE, { field: 'ksic_prefixes' });
  }
  if (posting.ksicCode == null) {
    return indeterminate(MISSING_POSTING_FIELD, { field: 'ksic_code', ksicPrefixes: prefixes });
  }

  const hit = matchesPrefix(posting.ksicCode, prefixes);
  const params = { ksicCode: posting.ksicCode, ksicPrefixes: prefixes, matchedPrefix: hit };

  // 화이트리스트에 없으면 위반이다
  if (hit == null) {
    return { verdict: verdictForViolation(rule.violationStatus), params, statusOnFail: rule.violationStatus };
  }
  return pass(params);
};

const employmentFormDeny: RuleEvaluator = (rule, posting) => {
  const forms = rule.value.forms;
  if (forms == null || forms.length === 0) {
    return indeterminate(MALFORMED_RULE_VALUE, { field: 'forms' });
  }
  if (posting.employmentForm === 'UNKNOWN') {
    return indeterminate(MISSING_POSTING_FIELD, { field: 'employment_form', deniedForms: forms });
  }

  const params = {
    employmentForm: posting.employmentForm,
    deniedForms: forms,
    labels: rule.value.labels ?? null,
    jobCategoryCode: posting.jobCategoryCode ?? null,
  };

  if (forms.includes(posting.employmentForm)) {
    return { verdict: verdictForViolation(rule.violationStatus), params, statusOnFail: rule.violationStatus };
  }
  return pass(params);
};

const commuteMaxMinutes: RuleEvaluator = (rule, posting) => {
  const limit = rule.value.minutes;
  if (limit == null) return indeterminate(MALFORMED_RULE_VALUE, { field: 'minutes' });

  if (posting.commuteMinutes == null) {
    return indeterminate(MISSING_POSTING_FIELD, { field: 'commute_minutes', limitMinutes: limit });
  }

  const params = {
    commuteMinutes: posting.commuteMinutes,
    limitMinutes: limit,
    alternativeClaimMinutes: rule.value.alternative_claim ?? null,
  };

  if (posting.commuteMinutes > limit) {
    return { verdict: verdictForViolation(rule.violationStatus), params, statusOnFail: rule.violationStatus };
  }
  return pass(params);
};

const permitRequired: RuleEvaluator = (rule, _posting, profile) => {
  const params = {
    permit: rule.value.permit ?? null,
    steps: rule.value.steps ?? null,
    documents: rule.value.documents ?? null,
    feeKrw: rule.value.fee_krw ?? null,
    warning: rule.value.warning ?? null,
  };

  if (profile.hasPartTimePermit == null) {
    return indeterminate(MISSING_PROFILE_FIELD, { ...params, field: 'has_part_time_permit' });
  }
  if (profile.hasPartTimePermit) return pass(params);

  // 허가 미보유는 영구 불가가 아니다. 신청하면 되므로 조치 항목을 함께 낸다.
  return {
    verdict: verdictForViolation(rule.violationStatus),
    params,
    statusOnFail: rule.violationStatus,
    requiredActions: ['APPLY_PART_TIME_PERMIT'],
  };
};

const regionLock: RuleEvaluator = (rule, posting, profile) => {
  if (profile.currentRegionCode == null) {
    return indeterminate(MISSING_PROFILE_FIELD, { field: 'current_region_code' });
  }
  if (posting.regionCode == null) {
    return indeterminate(MISSING_POSTING_FIELD, { field: 'region_code' });
  }

  const params = {
    currentRegionCode: profile.currentRegionCode,
    postingRegionCode: posting.regionCode,
    scope: rule.value.scope ?? null,
  };

  if (profile.currentRegionCode !== posting.regionCode) {
    return { verdict: verdictForViolation(rule.violationStatus), params, statusOnFail: rule.violationStatus };
  }
  return pass(params);
};

/** 한쪽이 다른 쪽의 상위 분류이면 같은 업종으로 본다 (C29 ⊂ C) */
function sameIndustry(a: string, b: string): boolean {
  return a === b || a.startsWith(b) || b.startsWith(a);
}

const industryLock: RuleEvaluator = (rule, posting, profile) => {
  if (profile.currentKsicCode == null) {
    return indeterminate(MISSING_PROFILE_FIELD, { field: 'current_ksic_code' });
  }
  if (posting.ksicCode == null) {
    return indeterminate(MISSING_POSTING_FIELD, { field: 'ksic_code' });
  }

  const params = {
    currentKsicCode: profile.currentKsicCode,
    postingKsicCode: posting.ksicCode,
    scope: rule.value.scope ?? null,
  };

  if (!sameIndustry(profile.currentKsicCode, posting.ksicCode)) {
    return { verdict: verdictForViolation(rule.violationStatus), params, statusOnFail: rule.violationStatus };
  }
  return pass(params);
};

const changeCountCap: RuleEvaluator = (rule, _posting, profile) => {
  const max = rule.value.max_changes;
  if (max == null) return indeterminate(MALFORMED_RULE_VALUE, { field: 'max_changes' });

  if (profile.workplaceChangesUsed == null) {
    return indeterminate(MISSING_PROFILE_FIELD, { field: 'workplace_changes_used', maxChanges: max });
  }

  const params = {
    workplaceChangesUsed: profile.workplaceChangesUsed,
    maxChanges: max,
    exceptions: rule.value.exceptions ?? null,
  };

  // 상한을 이미 소진했으면 추가 변경이 불가하다
  if (profile.workplaceChangesUsed >= max) {
    return { verdict: verdictForViolation(rule.violationStatus), params, statusOnFail: rule.violationStatus };
  }
  return pass(params);
};

const koreanLevelMin: RuleEvaluator = (rule, posting, profile) => {
  const required = rule.value.level;
  if (required == null) return indeterminate(MALFORMED_RULE_VALUE, { field: 'level' });

  // scope 가 업종을 좁히는 경우, 그 업종이 아니면 이 규칙은 걸리지 않는다
  const scope = rule.value.scope;
  if (scope != null && typeof scope === 'object' && scope.ksic_prefixes != null) {
    if (posting.ksicCode == null) {
      return indeterminate(MISSING_POSTING_FIELD, { field: 'ksic_code', level: required });
    }
    if (matchesPrefix(posting.ksicCode, scope.ksic_prefixes) == null) {
      return { verdict: 'NOT_APPLICABLE' };
    }
  }

  const requiredRank = koreanRank(required);
  const actualRank = koreanRank(profile.koreanProficiency);
  if (requiredRank == null) return indeterminate(MALFORMED_RULE_VALUE, { field: 'level' });
  if (actualRank == null) {
    return indeterminate(MISSING_PROFILE_FIELD, { field: 'korean_proficiency', level: required });
  }

  const params = {
    requiredLevel: required,
    actualLevel: profile.koreanProficiency ?? null,
  };

  if (actualRank < requiredRank) {
    return { verdict: verdictForViolation(rule.violationStatus), params, statusOnFail: rule.violationStatus };
  }
  return pass(params);
};

export const EVALUATORS: Record<RuleType, RuleEvaluator> = {
  WEEKLY_HOUR_CAP: weeklyHourCap,
  INDUSTRY_ALLOW: industryAllow,
  INDUSTRY_DENY: industryDeny,
  EMPLOYMENT_FORM_DENY: employmentFormDeny,
  COMMUTE_MAX_MINUTES: commuteMaxMinutes,
  PERMIT_REQUIRED: permitRequired,
  REGION_LOCK: regionLock,
  INDUSTRY_LOCK: industryLock,
  KOREAN_LEVEL_MIN: koreanLevelMin,
  CHANGE_COUNT_CAP: changeCountCap,
};
