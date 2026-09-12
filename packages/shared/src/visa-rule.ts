import type {
  EligibilityStatus,
  EmploymentForm,
  KoreanProficiency,
  RuleConfidence,
  RuleType,
  VisaCode,
} from './enums.js';

/**
 * visa_rules.applies_when — 이 규칙이 어떤 프로필/맥락에 적용되는가.
 * 여기에 없는 키는 "조건 없음"으로 간주한다.
 */
export interface AppliesWhen {
  /** degree_level 화이트리스트 */
  degree_level?: string[];
  /** 프로필 한국어 등급이 이 값 이상일 때 적용 */
  korean_min?: KoreanProficiency;
  /** 프로필 한국어 등급이 이 값 미만일 때 적용 */
  korean_below?: KoreanProficiency;
  /** 권역. 맥락(EvaluationContext.region)과 대조한다 */
  region?: string;
  /** 'SEMESTER' | 'VACATION'. 맥락(EvaluationContext.term)과 대조한다 */
  term?: string;
  /** visa_subtype 화이트리스트 */
  visa_subtype?: string[];
}

/** 규칙이 걸리는 범위를 좁히는 하위 조건 */
export interface RuleScope {
  ksic_prefixes?: string[];
}

/** rule_type 별 value 형태. DB_SCHEMA.sql 6장의 주석이 정본이다. */
export interface RuleValue {
  /** WEEKLY_HOUR_CAP */
  hours?: number;
  term?: string;
  /** INDUSTRY_ALLOW / INDUSTRY_DENY */
  ksic_prefixes?: string[];
  /** EMPLOYMENT_FORM_DENY */
  forms?: EmploymentForm[];
  /** COMMUTE_MAX_MINUTES */
  minutes?: number;
  /** 자료 상충 시 반대 주장값. 존재하면 규칙이 미확정이라는 표식이다 */
  alternative_claim?: number;
  /** PERMIT_REQUIRED */
  permit?: string;
  steps?: string[];
  documents?: string[];
  fee_krw?: number;
  warning?: string;
  /**
   * REGION_LOCK / INDUSTRY_LOCK 에서는 'SAME_REGION' 같은 문자열,
   * KOREAN_LEVEL_MIN 에서는 규칙이 걸리는 업종 범위를 나타내는 객체다.
   */
  scope?: string | RuleScope;
  /** CHANGE_COUNT_CAP */
  max_changes?: number;
  exceptions?: string[];
  /** KOREAN_LEVEL_MIN */
  level?: KoreanProficiency;
  /** 표시용 라벨 (i18n 이전의 원문 라벨) */
  labels?: string[];
}

/**
 * visa_rules 테이블 1행. 판정 엔진의 유일한 규칙 입력이다 (L2).
 * 엔진 코드에 비자 조건 if 문을 넣지 않는다.
 */
export interface VisaRule {
  id: string;
  visa: VisaCode;
  visaSubtype: string | null;
  ruleType: RuleType;
  appliesWhen: AppliesWhen;
  value: RuleValue;
  /** 규칙 위반 시의 판정. 'UNKNOWN' 이면 위반이 아니라 "단정 불가" 규칙이다 */
  violationStatus: EligibilityStatus;
  sourceTitle: string;
  sourceClause: string | null;
  sourceUrl: string | null;
  /** ISO date (YYYY-MM-DD) */
  effectiveFrom: string;
  effectiveTo: string | null;
  /** L4: 'low' 는 판정 시 INDETERMINATE 를 유발한다 */
  confidence: RuleConfidence;
  reasonCode: string;
  note: string | null;
}
