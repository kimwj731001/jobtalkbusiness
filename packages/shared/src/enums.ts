/**
 * DB_SCHEMA.sql 의 ENUM 정본을 TypeScript로 옮긴 것.
 * 스키마가 정본이므로, 여기를 고칠 때는 DB_SCHEMA.sql 을 먼저 고친다.
 */

export const VISA_CODES = ['D2', 'D4', 'E9', 'E74', 'F2', 'F4', 'F5', 'F6', 'OTHER'] as const;
export type VisaCode = (typeof VISA_CODES)[number];

export const DEGREE_LEVELS = [
  'LANGUAGE',
  'ASSOCIATE',
  'BACHELOR_1_2',
  'BACHELOR_3_4',
  'MASTER',
  'DOCTORATE',
  'NONE',
] as const;
export type DegreeLevel = (typeof DEGREE_LEVELS)[number];

export const KOREAN_PROFICIENCIES = [
  'NONE',
  'TOPIK1',
  'TOPIK2',
  'TOPIK3',
  'TOPIK4',
  'TOPIK5',
  'TOPIK6',
  'KIIP1',
  'KIIP2',
  'KIIP3',
  'KIIP4',
  'KIIP5',
] as const;
export type KoreanProficiency = (typeof KOREAN_PROFICIENCIES)[number];

export const EMPLOYMENT_FORMS = [
  'DIRECT',
  'DISPATCH',
  'SUBCONTRACT',
  'PLATFORM',
  'UNKNOWN',
] as const;
export type EmploymentForm = (typeof EMPLOYMENT_FORMS)[number];

/**
 * L4: boolean 으로 축약하지 않는다. UNKNOWN 과 INELIGIBLE 은 서로 다른 의미다.
 */
export const ELIGIBILITY_STATUSES = ['ELIGIBLE', 'CONDITIONAL', 'INELIGIBLE', 'UNKNOWN'] as const;
export type EligibilityStatus = (typeof ELIGIBILITY_STATUSES)[number];

export const RULE_CONFIDENCES = ['high', 'medium', 'low'] as const;
export type RuleConfidence = (typeof RULE_CONFIDENCES)[number];

export const RULE_TYPES = [
  'WEEKLY_HOUR_CAP',
  'INDUSTRY_ALLOW',
  'INDUSTRY_DENY',
  'EMPLOYMENT_FORM_DENY',
  'COMMUTE_MAX_MINUTES',
  'PERMIT_REQUIRED',
  'REGION_LOCK',
  'INDUSTRY_LOCK',
  'KOREAN_LEVEL_MIN',
  'CHANGE_COUNT_CAP',
] as const;
export type RuleType = (typeof RULE_TYPES)[number];

/**
 * 개별 규칙 1건의 평가 결과.
 *
 * 종합 우선순위는 FAIL > INDETERMINATE > WARN > PASS 이다.
 * (golden-tests.yaml INV-ORDER-001 / D2-PERMIT-002)
 */
export const RULE_VERDICTS = [
  'FAIL',
  'INDETERMINATE',
  'WARN',
  'PASS',
  'NOT_APPLICABLE',
] as const;
export type RuleVerdict = (typeof RULE_VERDICTS)[number];
