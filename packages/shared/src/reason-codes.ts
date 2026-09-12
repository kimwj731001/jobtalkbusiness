/**
 * 판정 사유 코드. 그대로 i18n 키의 마지막 구간이 된다.
 *   ko: reason.WEEKLY_HOUR_EXCEEDED.message
 *
 * 규칙에서 오는 코드(visa_rules.reason_code)와 엔진이 직접 만드는 코드를 구분한다.
 */

/** 엔진이 직접 만드는 사유 — 대응하는 visa_rules 행이 없다 */
export const ENGINE_REASON_CODES = [
  /** 프로필이 없어 판정할 수 없음 (비로그인) */
  'NO_PROFILE',
  /** 해당 비자에 적용할 규칙이 하나도 없음 */
  'NO_RULES_FOUND',
  /** 공고 필드 결측으로 규칙을 평가할 수 없음 */
  'MISSING_POSTING_FIELD',
  /** 프로필 필드 결측으로 규칙을 평가할 수 없음 */
  'MISSING_PROFILE_FIELD',
  /** 규칙의 confidence 가 low — 근거가 확정되지 않음 */
  'LOW_CONFIDENCE_RULE',
] as const;
export type EngineReasonCode = (typeof ENGINE_REASON_CODES)[number];

/** i18n 키 프리픽스 */
export const REASON_I18N_PREFIX = 'reason';

/**
 * 사유 문구의 i18n 키.
 *
 * verdict 를 키에 포함시킨다. 같은 사유 코드라도 통과와 위반은 정반대 문장이기 때문이다.
 *   reason.WEEKLY_HOUR_EXCEEDED.PASS  "주당 허용시간 내입니다"
 *   reason.WEEKLY_HOUR_EXCEEDED.FAIL  "주당 허용시간을 초과합니다"
 */
export function reasonMessageKey(reasonCode: string, verdict: string): string {
  return `${REASON_I18N_PREFIX}.${reasonCode}.${verdict}`;
}

/** 판정 응답에 반드시 실리는 고지 문구의 i18n 키 (L3) */
export const DISCLAIMER_I18N_KEY = 'eligibility.disclaimer';

/**
 * E-9 화면에 항상 함께 출력해야 하는 고지 (CLAUDE.md L1).
 * 알선을 제공하지 않는다는 사실을 명시한다.
 */
export const E9_NO_BROKERAGE_I18N_KEY = 'eligibility.e9NoBrokerage';

/** 사용자가 취해야 할 후속 조치 */
export const REQUIRED_ACTIONS = ['APPLY_PART_TIME_PERMIT', 'CONSULT_IMMIGRATION_OFFICE'] as const;
export type RequiredAction = (typeof REQUIRED_ACTIONS)[number];
