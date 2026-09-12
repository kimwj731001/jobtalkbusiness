import type { KoreanProficiency } from './enums.js';

/**
 * VISA_RULES.md 6장. TOPIK 급수와 KIIP 단계를 하나의 서열로 다룬다.
 *
 * ⚠️ 두 기준을 1:1 로 대응시키는 것은 우리의 단순화다.
 *    지침 원문이 어떻게 병렬 인정하는지 확인 전까지 관련 규칙은 confidence='low' 로 둔다.
 */
export const KOREAN_RANK: Record<KoreanProficiency, number> = {
  NONE: 0,
  TOPIK1: 1,
  KIIP1: 1,
  TOPIK2: 2,
  KIIP2: 2,
  TOPIK3: 3,
  KIIP3: 3,
  TOPIK4: 4,
  KIIP4: 4,
  TOPIK5: 5,
  KIIP5: 5,
  TOPIK6: 6,
};

export function koreanRank(level: KoreanProficiency | null | undefined): number | null {
  if (level == null) return null;
  return KOREAN_RANK[level] ?? null;
}
