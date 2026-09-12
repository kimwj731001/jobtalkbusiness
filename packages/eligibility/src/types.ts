import type {
  DegreeLevel,
  EligibilityStatus,
  EmploymentForm,
  KoreanProficiency,
  RuleConfidence,
  RuleType,
  RuleVerdict,
  VisaCode,
  VisaRule,
  RequiredAction,
} from '@jobtalk/shared';

/**
 * 판정 입력 — 공고에서 뽑아낸 사실관계.
 * 모르는 값은 반드시 null 이다. 0 이나 기본값으로 채우지 않는다 (L4).
 */
export interface PostingFacts {
  id?: string;
  ksicCode: string | null;
  jobCategoryCode?: string | null;
  employmentForm: EmploymentForm;
  /** 주당 시간. CLAUDE.md 7장 — 시간 단위는 항상 주당 시간으로 정규화 */
  weeklyHoursMin?: number | null;
  weeklyHoursMax: number | null;
  /** 프로필 기준 위치에서의 대중교통 소요시간(분) */
  commuteMinutes: number | null;
  /** E-9 권역 판정용 */
  regionCode?: string | null;
  /** 정규화 단계에서 채우지 못한 필드 목록. UNKNOWN 사유로 그대로 쓰인다 */
  missingFields?: string[];
}

/**
 * 판정 입력 — 사용자의 비자 프로필.
 * L5: 외국인등록번호·여권번호·주민등록번호 필드를 절대 추가하지 않는다.
 */
export interface VisaProfile {
  visa: VisaCode;
  visaSubtype?: string | null;
  degreeLevel: DegreeLevel;
  koreanProficiency?: KoreanProficiency | null;

  /** 사용자가 현재 허가받은 주당 시간 (자기신고값) */
  permittedWeeklyHours?: number | null;
  /** 현재 다른 곳에서 일하고 있는 주당 시간 */
  currentWeeklyHours?: number | null;
  hasPartTimePermit?: boolean | null;

  baseLat?: number | null;
  baseLng?: number | null;

  /** E-9 전용 */
  currentRegionCode?: string | null;
  currentKsicCode?: string | null;
  workplaceChangesUsed?: number | null;
}

/**
 * 판정 맥락. 지침이 학기/방학, 수도권/지방을 구분하므로 규칙 매칭에 필요하다.
 * 엔진이 기본값을 추측하지 않고 호출자가 명시한다.
 */
export interface EvaluationContext {
  /** 규칙 유효기간 대조 기준일 (YYYY-MM-DD) */
  evaluatedOn: string;
  /** 'CAPITAL_AREA' 등 */
  region: string;
  /** 'SEMESTER' | 'VACATION' */
  term: string;
  engineVersion: string;
}

/**
 * 판정 사유 (L3).
 *
 * visa_rules 행에서 나온 사유(RULE)와 엔진이 직접 만든 사유(ENGINE)를 구분한다.
 * ENGINE 사유는 대응하는 규칙 행이 없으므로 sourceTitle/effectiveFrom 이 존재할 수 없다.
 * 대신 "근거 데이터가 없다"는 사실 자체가 사유이며, messageKey 가 그것을 설명한다.
 */
export type Reason = RuleReason | EngineReason;

export interface RuleReason {
  kind: 'RULE';
  ruleId: string;
  ruleType: RuleType;
  reasonCode: string;
  verdict: RuleVerdict;
  messageKey: string;
  params: Record<string, unknown>;
  sourceTitle: string;
  sourceClause: string | null;
  sourceUrl: string | null;
  /** 근거 지침의 시행·개정일 (L3) */
  effectiveFrom: string;
  confidence: RuleConfidence;
}

export interface EngineReason {
  kind: 'ENGINE';
  reasonCode: string;
  verdict: RuleVerdict;
  messageKey: string;
  params: Record<string, unknown>;
}

/** 판정 응답에 항상 실리는 고지 (L3) */
export interface Disclaimer {
  textKey: string;
  evaluatedAt: string;
  engineVersion: string;
  /** 적용된 규칙 중 가장 늦은 시행·개정일 */
  ruleEffectiveDate: string | null;
}

export interface EligibilityResult {
  status: EligibilityStatus;
  /** 절대 비어 있을 수 없다 (L3) */
  reasons: Reason[];
  /** 적용된 규칙의 스냅샷. 규칙이 바뀌어도 당시 판정을 재현할 수 있어야 한다 (L2) */
  ruleSnapshot: VisaRule[];
  /** 허용 상한 − 현재 주당 시간. 계산 불가면 null */
  remainingHours: number | null;
  commuteMinutes: number | null;
  requiredActions: RequiredAction[];
  disclaimer: Disclaimer;
}

/** 개별 규칙 평가기의 반환값 */
export interface RuleOutcome {
  verdict: RuleVerdict;
  /** 규칙 자체의 reasonCode 대신 쓸 코드 (결측 등) */
  reasonCodeOverride?: string;
  params?: Record<string, unknown>;
  /** 규칙이 위반됐을 때 이 사유가 만들어내는 판정 */
  statusOnFail?: EligibilityStatus;
  requiredActions?: RequiredAction[];
  /** 시간 규칙이 계산한 잔여 시간 */
  remainingHours?: number | null;
}

export type RuleEvaluator = (
  rule: VisaRule,
  posting: PostingFacts,
  profile: VisaProfile,
  context: EvaluationContext,
) => RuleOutcome;
