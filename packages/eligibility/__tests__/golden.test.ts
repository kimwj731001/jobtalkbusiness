import { describe, expect, it } from 'vitest';
import { evaluateEligibility } from '../src/evaluate.js';
import type { EligibilityResult } from '../src/types.js';
import {
  CONTEXT,
  GOLDEN_CASES,
  SEED_RULES,
  VERIFIED_RULES,
  type Expectation,
  type GoldenCase,
} from './load-golden.js';

/**
 * 골든 테스트는 두 모드로 돈다.
 *
 *  low       — 현재 시드 그대로. 대부분의 규칙이 confidence='low' 라 UNKNOWN 이 많다.
 *  verified  — 지침 원문 대조를 마쳤다고 가정하고 confidence 를 high 로 올린 규칙셋.
 *
 * 케이스가 expect_with_low_confidence 를 가지면 low 모드로,
 * expect_when_verified 를 가지면 verified 모드로 검증한다. 둘 다 있으면 둘 다 돈다.
 *
 * reasonCodes 는 부분집합(⊆) 비교다. 기대한 사유가 빠지면 실패하지만,
 * 다른 규칙이 추가로 낸 사유가 있다고 해서 실패하지는 않는다.
 */

function reasonCodesOf(result: EligibilityResult): string[] {
  return result.reasons.map((r) => r.reasonCode);
}

function assertExpectation(result: EligibilityResult, expected: Expectation, label: string) {
  expect(result.status, `${label}: status`).toBe(expected.status);

  if (expected.reasonCodes != null) {
    const actual = reasonCodesOf(result);
    for (const code of expected.reasonCodes) {
      expect(actual, `${label}: reasonCodes should contain ${code}`).toContain(code);
    }
  }

  if (expected.remainingHours != null) {
    expect(result.remainingHours, `${label}: remainingHours`).toBe(expected.remainingHours);
  }

  if (expected.requiredActions != null) {
    for (const action of expected.requiredActions) {
      expect(result.requiredActions, `${label}: requiredActions`).toContain(action);
    }
  }

  // L3 — 근거 없는 판정은 존재할 수 없다
  expect(result.reasons.length, `${label}: reasons must not be empty`).toBeGreaterThan(0);
}

function run(testCase: GoldenCase, mode: 'low' | 'verified'): EligibilityResult {
  return evaluateEligibility(
    testCase.posting,
    testCase.profile,
    mode === 'low' ? SEED_RULES : VERIFIED_RULES,
    CONTEXT,
  );
}

describe('golden — 현재 시드 (confidence 미검증)', () => {
  const cases = GOLDEN_CASES.filter((c) => c.expect_with_low_confidence != null);

  it('검증 대상 케이스가 존재한다', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const testCase of cases) {
    it(`${testCase.id} — ${testCase.description}`, () => {
      const result = run(testCase, 'low');
      assertExpectation(result, testCase.expect_with_low_confidence!, testCase.id);
    });
  }
});

describe('golden — 원문 대조 완료 가정 (confidence=high)', () => {
  const cases = GOLDEN_CASES.filter((c) => c.expect_when_verified != null);

  it('검증 대상 케이스가 존재한다', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const testCase of cases) {
    it(`${testCase.id} — ${testCase.description}`, () => {
      const result = run(testCase, 'verified');
      assertExpectation(result, testCase.expect_when_verified!, testCase.id);
    });
  }
});

describe('CLAUDE.md 6장 — 커버리지 요구', () => {
  it('모든 케이스가 최소 한 모드의 기대값을 가진다', () => {
    const orphans = GOLDEN_CASES.filter(
      (c) => c.expect_with_low_confidence == null && c.expect_when_verified == null,
    ).map((c) => c.id);
    expect(orphans, `기대값이 없는 케이스: ${orphans.join(', ')}`).toEqual([]);
  });

  it('UNKNOWN 케이스가 포함되어 있다', () => {
    const unknowns = GOLDEN_CASES.filter(
      (c) =>
        c.expect_with_low_confidence?.status === 'UNKNOWN' ||
        c.expect_when_verified?.status === 'UNKNOWN',
    );
    expect(unknowns.length).toBeGreaterThan(0);
  });

  it('시드 규칙에 존재하는 모든 rule_type 이 최소 3케이스로 덮인다', () => {
    // 각 케이스를 실제로 돌려서 어떤 rule_type 이 평가됐는지 센다
    const coverage = new Map<string, number>();
    for (const testCase of GOLDEN_CASES) {
      const mode = testCase.expect_when_verified != null ? 'verified' : 'low';
      const result = run(testCase, mode);
      const seen = new Set(
        result.reasons.filter((r) => r.kind === 'RULE').map((r) => r.ruleType),
      );
      for (const ruleType of seen) {
        coverage.set(ruleType, (coverage.get(ruleType) ?? 0) + 1);
      }
    }

    const seededTypes = new Set(SEED_RULES.map((r) => r.ruleType));
    const under = [...seededTypes]
      .map((t) => ({ ruleType: t, count: coverage.get(t) ?? 0 }))
      .filter((e) => e.count < 3);

    expect(
      under,
      `3케이스 미만인 rule_type: ${under.map((u) => `${u.ruleType}(${u.count})`).join(', ')}`,
    ).toEqual([]);
  });
});
