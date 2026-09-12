import { describe, expect, it } from 'vitest';
import { evaluateEligibility } from '../src/evaluate.js';
import type { EligibilityResult } from '../src/types.js';
import { CONTEXT, GOLDEN_CASES, SEED_RULES, VERIFIED_RULES } from './load-golden.js';

/**
 * golden-tests.yaml 의 invariantTests 를 실행 가능한 형태로 옮긴 것.
 *
 * 모든 골든 케이스를 두 모드로 돌린 뒤, 결과 전체에 대해 불변식을 검사한다.
 * 개별 케이스의 기대값이 맞는지와 별개로 "어떤 입력에도 깨지면 안 되는 성질"이다.
 */

const ALL_RESULTS: { id: string; mode: string; result: EligibilityResult }[] = [];
for (const testCase of GOLDEN_CASES) {
  for (const [mode, rules] of [
    ['low', SEED_RULES],
    ['verified', VERIFIED_RULES],
  ] as const) {
    ALL_RESULTS.push({
      id: testCase.id,
      mode,
      result: evaluateEligibility(testCase.posting, testCase.profile, rules, CONTEXT),
    });
  }
}

function offenders(predicate: (r: EligibilityResult) => boolean): string[] {
  return ALL_RESULTS.filter(({ result }) => !predicate(result)).map(
    ({ id, mode }) => `${id}[${mode}]`,
  );
}

describe('불변식', () => {
  it('결과 집합이 비어 있지 않다 (테스트 자체의 건전성)', () => {
    expect(ALL_RESULTS.length).toBeGreaterThan(0);
  });

  it('INV-L3-001 — 모든 판정의 reasons 는 비어 있지 않다', () => {
    expect(offenders((r) => r.reasons.length > 0)).toEqual([]);
  });

  it('INV-L3-002 — 규칙에서 온 사유에는 sourceTitle 과 effectiveFrom 이 있다', () => {
    expect(
      offenders((r) =>
        r.reasons.every((reason) =>
          reason.kind === 'RULE'
            ? Boolean(reason.sourceTitle) && Boolean(reason.effectiveFrom)
            : true,
        ),
      ),
    ).toEqual([]);
  });

  it('INV-L3-002b — 엔진이 만든 사유에는 사유 코드와 i18n 키가 있다', () => {
    // ENGINE 사유는 대응하는 visa_rules 행이 없으므로 sourceTitle 을 가질 수 없다.
    // 대신 "근거 데이터가 없다"는 사실 자체가 사유이며 messageKey 가 그것을 설명한다.
    expect(
      offenders((r) =>
        r.reasons.every((reason) =>
          reason.kind === 'ENGINE' ? Boolean(reason.reasonCode) && Boolean(reason.messageKey) : true,
        ),
      ),
    ).toEqual([]);
  });

  it('INV-L3-003 — 모든 판정에 고지(disclaimer)가 실린다', () => {
    expect(
      offenders(
        (r) => Boolean(r.disclaimer.textKey) && Boolean(r.disclaimer.evaluatedAt) && Boolean(r.disclaimer.engineVersion),
      ),
    ).toEqual([]);
  });

  it('INV-L4-001 — confidence=low 규칙이 적용되면 ELIGIBLE 이 나올 수 없다', () => {
    expect(
      offenders((r) =>
        r.ruleSnapshot.some((rule) => rule.confidence === 'low') ? r.status !== 'ELIGIBLE' : true,
      ),
    ).toEqual([]);
  });

  it('INV-L4-002 — INDETERMINATE 가 있으면 CONDITIONAL 이 아니라 UNKNOWN 이다', () => {
    expect(
      offenders((r) => {
        const hasIndeterminate = r.reasons.some((reason) => reason.verdict === 'INDETERMINATE');
        const hasFail = r.reasons.some((reason) => reason.verdict === 'FAIL');
        return hasIndeterminate && !hasFail ? r.status === 'UNKNOWN' : true;
      }),
    ).toEqual([]);
  });

  it('INV-ORDER-001 — FAIL 이 있으면 항상 INELIGIBLE 이다', () => {
    expect(
      offenders((r) =>
        r.reasons.some((reason) => reason.verdict === 'FAIL') ? r.status === 'INELIGIBLE' : true,
      ),
    ).toEqual([]);
  });

  it('INV-L4-003 — ELIGIBLE 은 모든 사유가 PASS 일 때만 나온다', () => {
    expect(
      offenders((r) =>
        r.status === 'ELIGIBLE' ? r.reasons.every((reason) => reason.verdict === 'PASS') : true,
      ),
    ).toEqual([]);
  });

  it('INV-L4-004 — 적용된 규칙이 하나도 없으면 UNKNOWN 이다', () => {
    expect(offenders((r) => (r.ruleSnapshot.length === 0 ? r.status === 'UNKNOWN' : true))).toEqual(
      [],
    );
  });

  it('INV-L2-001 — ruleSnapshot 의 모든 규칙에 effectiveFrom 이 기록된다', () => {
    expect(
      offenders((r) => r.ruleSnapshot.every((rule) => Boolean(rule.effectiveFrom))),
    ).toEqual([]);
  });
});
