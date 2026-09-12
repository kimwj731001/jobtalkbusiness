import { describe, expect, it } from 'vitest';
import {
  DISCLAIMER_I18N_KEY,
  E9_NO_BROKERAGE_I18N_KEY,
  ELIGIBILITY_STATUSES,
  LOCALES,
  MESSAGES,
  REQUIRED_ACTIONS,
  RULE_CONFIDENCES,
  formatMessage,
} from '@jobtalk/shared';
import { evaluateEligibility } from '../src/evaluate.js';
import { CONTEXT, GOLDEN_CASES, SEED_RULES, VERIFIED_RULES } from './load-golden.js';

/**
 * CLAUDE.md 7장 — 모든 사용자 노출 문자열은 i18n 키 경유. 판정 근거 문구도 예외 없음.
 *
 * 엔진은 messageKey 만 내보내므로, 그 키가 4개 언어에 전부 있는지 검사하지 않으면
 * 번역 누락이 배포까지 조용히 흘러간다. 여기서 막는다.
 */

/** 골든 케이스를 두 모드로 돌려 엔진이 실제로 내보내는 키를 모은다 */
const EMITTED_KEYS = new Set<string>();
for (const testCase of GOLDEN_CASES) {
  for (const rules of [SEED_RULES, VERIFIED_RULES]) {
    const result = evaluateEligibility(testCase.posting, testCase.profile, rules, CONTEXT);
    for (const reason of result.reasons) EMITTED_KEYS.add(reason.messageKey);
    EMITTED_KEYS.add(result.disclaimer.textKey);
  }
}

describe('i18n 카탈로그', () => {
  it('엔진이 키를 실제로 내보낸다 (테스트 자체의 건전성)', () => {
    expect(EMITTED_KEYS.size).toBeGreaterThan(10);
  });

  it('4개 언어가 모두 존재한다', () => {
    for (const locale of LOCALES) {
      expect(MESSAGES[locale], locale).toBeDefined();
    }
  });

  it('모든 언어의 키 집합이 동일하다', () => {
    const koKeys = Object.keys(MESSAGES.ko).sort();
    for (const locale of LOCALES) {
      const keys = Object.keys(MESSAGES[locale]).sort();
      const missing = koKeys.filter((k) => !keys.includes(k));
      const extra = keys.filter((k) => !koKeys.includes(k));
      expect(missing, `${locale}: ko 에 있는데 없는 키`).toEqual([]);
      expect(extra, `${locale}: ko 에 없는 키`).toEqual([]);
    }
  });

  it('빈 문구가 없다', () => {
    for (const locale of LOCALES) {
      const blanks = Object.entries(MESSAGES[locale])
        .filter(([, value]) => value.trim().length === 0)
        .map(([key]) => key);
      expect(blanks, `${locale}: 빈 문구`).toEqual([]);
    }
  });

  it('엔진이 내보내는 모든 사유 키가 4개 언어에 있다', () => {
    for (const locale of LOCALES) {
      const missing = [...EMITTED_KEYS].filter((key) => MESSAGES[locale][key] == null).sort();
      expect(missing, `${locale}: 번역 누락`).toEqual([]);
    }
  });

  it('판정 상태·후속 조치·신뢰도 라벨이 4개 언어에 있다', () => {
    const required = [
      ...ELIGIBILITY_STATUSES.flatMap((s) => [`status.${s}`, `status.${s}.description`]),
      ...REQUIRED_ACTIONS.flatMap((a) => [`action.${a}`, `action.${a}.description`]),
      ...RULE_CONFIDENCES.map((c) => `confidence.${c}`),
      DISCLAIMER_I18N_KEY,
      E9_NO_BROKERAGE_I18N_KEY,
    ];
    for (const locale of LOCALES) {
      const missing = required.filter((key) => MESSAGES[locale][key] == null);
      expect(missing, `${locale}: 누락`).toEqual([]);
    }
  });

  it('같은 키의 보간 변수는 언어마다 동일하다', () => {
    const placeholders = (text: string) =>
      [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

    for (const key of Object.keys(MESSAGES.ko)) {
      const expected = placeholders(MESSAGES.ko[key]!);
      for (const locale of LOCALES) {
        expect(placeholders(MESSAGES[locale][key]!), `${locale} / ${key}`).toEqual(expected);
      }
    }
  });

  it('formatMessage 가 params 를 채운다', () => {
    const text = formatMessage(
      'reason.COMMUTE_EXCEEDED.FAIL',
      { commuteMinutes: 75, limitMinutes: 60 },
      'ko',
    );
    expect(text).toContain('75');
    expect(text).toContain('60');
    expect(text).not.toContain('{');
  });

  it('없는 키는 빈 문자열이 아니라 키 자체를 돌려준다', () => {
    expect(formatMessage('reason.NOT_A_REAL_KEY.FAIL', {}, 'en')).toBe(
      'reason.NOT_A_REAL_KEY.FAIL',
    );
  });

  it('UNKNOWN 문구가 "가능"으로 읽히지 않는다', () => {
    // 이 제품에서 가장 위험한 번역 실수다. 명시적으로 고정한다.
    expect(MESSAGES.ko['status.UNKNOWN.description']).toContain('아닙니다');
    expect(MESSAGES.en['status.UNKNOWN.description']).toContain('does not mean');
    expect(MESSAGES['zh-CN']['status.UNKNOWN.description']).toContain('并不表示');
    expect(MESSAGES.vi['status.UNKNOWN.description']).toContain('không có nghĩa là');
  });
});
