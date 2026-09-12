import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * CLAUDE.md 4장 — packages/eligibility 는 순수 함수로 유지한다.
 * DB·네트워크·환경변수·현재시각에 의존하는 순간 판정을 재현할 수 없게 된다.
 *
 * 리뷰에서 놓치기 쉬운 제약이라 테스트로 고정한다.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /from ['"]@prisma\//, why: 'DB 클라이언트 의존' },
  { pattern: /from ['"]@jobtalk\/db['"]/, why: 'DB 패키지 의존' },
  { pattern: /\bprocess\.env\b/, why: '환경변수 의존' },
  { pattern: /\bfetch\s*\(/, why: '네트워크 호출' },
  { pattern: /from ['"]node:(fs|http|https|net|child_process)['"]/, why: '런타임 I/O 의존' },
  { pattern: /\bnew Date\s*\(\s*\)/, why: '현재시각 의존 — evaluatedOn 을 입력으로 받는다' },
  { pattern: /\bDate\.now\s*\(/, why: '현재시각 의존 — evaluatedOn 을 입력으로 받는다' },
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith('.ts') ? [full] : [];
  });
}

describe('판정 엔진 순수성', () => {
  it('src 아래에 금지된 의존이 없다', () => {
    const violations: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const content = readFileSync(file, 'utf8');
      for (const { pattern, why } of FORBIDDEN) {
        if (pattern.test(content)) {
          violations.push(`${file.replace(SRC, 'src')}: ${why} (${pattern})`);
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('같은 입력에 대해 항상 같은 결과를 낸다', async () => {
    const { evaluateEligibility } = await import('../src/evaluate.js');
    const { CONTEXT, GOLDEN_CASES, SEED_RULES } = await import('./load-golden.js');

    for (const testCase of GOLDEN_CASES) {
      const first = evaluateEligibility(testCase.posting, testCase.profile, SEED_RULES, CONTEXT);
      const second = evaluateEligibility(testCase.posting, testCase.profile, SEED_RULES, CONTEXT);
      expect(second, testCase.id).toEqual(first);
    }
  });

  it('입력 객체를 변형하지 않는다', async () => {
    const { evaluateEligibility } = await import('../src/evaluate.js');
    const { CONTEXT, GOLDEN_CASES, SEED_RULES } = await import('./load-golden.js');

    const rulesBefore = structuredClone(SEED_RULES);
    for (const testCase of GOLDEN_CASES) {
      const postingBefore = structuredClone(testCase.posting);
      const profileBefore = structuredClone(testCase.profile);
      evaluateEligibility(testCase.posting, testCase.profile, SEED_RULES, CONTEXT);
      expect(testCase.posting, `${testCase.id}: posting`).toEqual(postingBefore);
      expect(testCase.profile, `${testCase.id}: profile`).toEqual(profileBefore);
    }
    expect(SEED_RULES).toEqual(rulesBefore);
  });
});
