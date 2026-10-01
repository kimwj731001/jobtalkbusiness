import type { EligibilityResult, Reason } from '@jobtalk/eligibility';
import type { EligibilityStatus } from '@jobtalk/shared';

/**
 * 판정 결과를 화면 표현으로 옮긴다.
 *
 * 배지는 두 단계만 쓴다 — 불가 / 확인 필요.
 * 그 이상으로 쪼개면 "확인 필요인데 괜찮아 보이는 것"이 녹색 신호로 읽힐 위험이 있다.
 * 대신 왜 그런지는 칩으로 따로 붙여서, 사용자가 판단에 쓸 정보는 잃지 않게 한다.
 *
 * ⚠️ 여기서 ELIGIBLE 을 만들어내지 않는다. 배지는 엔진의 status 를 좁히기만 한다.
 */

export type Badge = 'INELIGIBLE' | 'NEEDS_CHECK' | 'CONDITIONAL' | 'ELIGIBLE';

export function toBadge(status: EligibilityStatus): Badge {
  switch (status) {
    case 'INELIGIBLE':
      return 'INELIGIBLE';
    case 'UNKNOWN':
      return 'NEEDS_CHECK';
    case 'CONDITIONAL':
      return 'CONDITIONAL';
    case 'ELIGIBLE':
      return 'ELIGIBLE';
  }
}

/**
 * 칩 종류. 심각한 것부터 나열한다 — 화면에서도 이 순서로 보인다.
 *
 * tone 은 색이 아니라 의미다:
 *   blocking  확인된 규칙이 막는다
 *   warning   제한 가능성이 있다 (미검증 근거 / 심사 재량)
 *   info      정보가 비어 있다
 */
export type ChipTone = 'blocking' | 'warning' | 'info';

export interface Signal {
  code: string;
  tone: ChipTone;
  /** 문구 보간용 */
  params: Record<string, unknown>;
}

function isLowConfidence(reason: Reason): boolean {
  return reason.reasonCode === 'LOW_CONFIDENCE_RULE';
}

function suppressed(reason: Reason): { verdict?: string; code?: string } {
  return {
    verdict: reason.params.suppressedVerdict as string | undefined,
    code: reason.params.suppressedReasonCode as string | undefined,
  };
}

/** 억제된 사유 코드를 칩 코드로 옮긴다. 모르는 코드는 일반 경고로 떨어뜨린다. */
function warningChipFor(reasonCode: string | undefined): string {
  switch (reasonCode) {
    case 'WEEKLY_HOUR_EXCEEDED':
      return 'signal.HOURS_MAY_EXCEED';
    case 'INDUSTRY_DENIED_MANUFACTURING':
    case 'INDUSTRY_DENIED_CONSTRUCTION':
    case 'INDUSTRY_DENIED_SEAFARER':
      return 'signal.INDUSTRY_MAY_RESTRICT';
    case 'EMPLOYMENT_FORM_DENIED':
      return 'signal.FORM_MAY_RESTRICT';
    case 'COMMUTE_EXCEEDED':
      return 'signal.COMMUTE_MAY_EXCEED';
    default:
      return 'signal.MAY_RESTRICT';
  }
}

/** 확정된 위반을 칩 코드로 옮긴다 */
function blockingChipFor(reasonCode: string): string {
  switch (reasonCode) {
    case 'EMPLOYMENT_FORM_DENIED':
      return 'signal.FORM_DENIED';
    case 'INDUSTRY_DENIED_MANUFACTURING':
      return 'signal.INDUSTRY_DENIED_MANUFACTURING';
    case 'INDUSTRY_DENIED_CONSTRUCTION':
      return 'signal.INDUSTRY_DENIED_CONSTRUCTION';
    case 'INDUSTRY_DENIED_SEAFARER':
      return 'signal.INDUSTRY_DENIED_SEAFARER';
    case 'WEEKLY_HOUR_EXCEEDED':
      return 'signal.HOURS_EXCEEDED';
    case 'COMMUTE_EXCEEDED':
      return 'signal.COMMUTE_EXCEEDED';
    case 'REGION_LOCKED':
      return 'signal.REGION_LOCKED';
    case 'INDUSTRY_LOCKED':
      return 'signal.INDUSTRY_LOCKED';
    case 'CHANGE_COUNT_EXCEEDED':
      return 'signal.CHANGE_COUNT_EXCEEDED';
    default:
      return 'signal.RESTRICTED';
  }
}

/** 결측 필드를 사람이 읽을 수 있는 칩으로. 모르는 필드는 내보내지 않는다. */
const MISSING_FIELD_CHIPS: Record<string, string> = {
  weekly_hours_max: 'signal.MISSING_HOURS',
  ksic_code: 'signal.MISSING_INDUSTRY',
  employment_form: 'signal.MISSING_FORM',
  commute_minutes: 'signal.MISSING_COMMUTE',
  region_code: 'signal.MISSING_REGION',
};

/** 프로필 결측도 어느 칸인지 짚어준다 */
const MISSING_PROFILE_CHIPS: Record<string, string> = {
  has_part_time_permit: 'signal.MISSING_PERMIT_ANSWER',
  current_weekly_hours: 'signal.MISSING_CURRENT_HOURS',
  korean_proficiency: 'signal.MISSING_KOREAN',
  current_ksic_code: 'signal.MISSING_CURRENT_INDUSTRY',
  current_region_code: 'signal.MISSING_CURRENT_REGION',
  workplace_changes_used: 'signal.MISSING_CHANGE_COUNT',
};

const TONE_ORDER: Record<ChipTone, number> = { blocking: 0, warning: 1, info: 2 };

/**
 * 카드에 붙일 칩을 만든다.
 *
 * 같은 칩이 여러 규칙에서 나와도 한 번만 낸다 —
 * "미검증 규칙 4건" 처럼 세어야 의미 있는 것만 개수를 붙인다.
 */
export function toSignals(result: EligibilityResult): Signal[] {
  const signals = new Map<string, Signal>();
  const add = (code: string, tone: ChipTone, params: Record<string, unknown> = {}) => {
    if (!signals.has(code)) signals.set(code, { code, tone, params });
  };

  let lowConfidenceCount = 0;

  for (const reason of result.reasons) {
    if (reason.verdict === 'FAIL') {
      add(blockingChipFor(reason.reasonCode), 'blocking', reason.params);
      continue;
    }

    if (reason.verdict === 'WARN') {
      if (reason.reasonCode === 'PERMIT_REQUIRED_PART_TIME') {
        add('signal.PERMIT_REQUIRED', 'warning', reason.params);
      } else {
        add(warningChipFor(reason.reasonCode), 'warning', reason.params);
      }
      continue;
    }

    if (reason.verdict !== 'INDETERMINATE') continue;

    if (isLowConfidence(reason)) {
      lowConfidenceCount += 1;
      const { verdict, code } = suppressed(reason);
      // 미검증 규칙이 "막는다"고 말하고 있으면 그건 알려줘야 한다.
      // 통과라고 말하는 미검증 규칙은 칩으로 내지 않는다 — 녹색 신호로 읽힌다.
      if (verdict === 'FAIL') add(warningChipFor(code), 'warning', reason.params);
      continue;
    }

    if (reason.reasonCode === 'INDUSTRY_EXCEPTION_DISCRETIONARY') {
      add('signal.DISCRETIONARY_REVIEW', 'warning', reason.params);
      continue;
    }

    if (reason.reasonCode === 'MISSING_POSTING_FIELD') {
      const field = reason.params.field as string | undefined;
      const chip = field == null ? undefined : MISSING_FIELD_CHIPS[field];
      if (chip != null) add(chip, 'info', reason.params);
      continue;
    }

    if (reason.reasonCode === 'MISSING_PROFILE_FIELD') {
      // 무엇이 빠졌는지 말해야 사용자가 고칠 수 있다.
      // "프로필 정보 부족"만 띄우면 어디를 눌러야 할지 알 수 없다.
      const field = reason.params.field as string | undefined;
      const chip = field == null ? undefined : MISSING_PROFILE_CHIPS[field];
      add(chip ?? 'signal.MISSING_PROFILE', 'info', reason.params);
      continue;
    }

    if (reason.reasonCode === 'NO_PROFILE') {
      add('signal.NO_PROFILE', 'info', {});
      continue;
    }

    if (reason.reasonCode === 'NO_RULES_FOUND') {
      add('signal.NO_RULES', 'info', reason.params);
    }
  }

  if (lowConfidenceCount > 0) {
    add('signal.UNVERIFIED_RULES', 'info', { count: lowConfidenceCount });
  }

  return [...signals.values()].sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}

/**
 * 카드 정렬 점수. 낮을수록 위에 온다.
 *
 * 추천이 성립하려면 순서가 있어야 하는데, 지금은 판정이 거의 전부 UNKNOWN 이라
 * status 만으로는 줄을 세울 수 없다. 칩의 심각도로 가른다.
 */
export function sortRank(result: EligibilityResult): number {
  const signals = toSignals(result);
  if (result.status === 'INELIGIBLE') return 400;
  if (signals.some((s) => s.tone === 'blocking')) return 300;
  if (signals.some((s) => s.tone === 'warning')) return 200;
  if (result.status === 'CONDITIONAL') return 150;
  if (result.status === 'ELIGIBLE') return 0;
  return 100;
}
