import type { PrismaClient } from '@prisma/client';
import type { AppliesWhen, RuleValue, VisaCode, VisaRule } from '@jobtalk/shared';

/**
 * visa_rules 행을 판정 엔진의 입력 타입으로 옮긴다.
 *
 * 엔진은 DB 를 모른다 (CLAUDE.md 4장). 이 경계가 그 대가다 —
 * DB 를 아는 쪽이 변환을 책임진다.
 */

type VisaRuleRow = Awaited<ReturnType<PrismaClient['visaRule']['findMany']>>[number];

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function toEngineRule(row: VisaRuleRow): VisaRule {
  return {
    id: row.id,
    visa: row.visa,
    visaSubtype: row.visaSubtype,
    ruleType: row.ruleType,
    appliesWhen: (row.appliesWhen ?? {}) as AppliesWhen,
    value: (row.value ?? {}) as RuleValue,
    violationStatus: row.violationStatus,
    sourceTitle: row.sourceTitle,
    sourceClause: row.sourceClause,
    sourceUrl: row.sourceUrl,
    effectiveFrom: toIsoDate(row.effectiveFrom),
    effectiveTo: row.effectiveTo == null ? null : toIsoDate(row.effectiveTo),
    confidence: row.confidence,
    reasonCode: row.reasonCode,
    note: row.note,
  };
}

/**
 * 특정 시점에 유효한 규칙을 읽는다.
 *
 * `on` 을 인자로 받는 이유는 과거 판정 재현 때문이다 (L2).
 * 분쟁이 생기면 "그때 어떤 규칙이 유효했는가"를 되돌릴 수 있어야 한다.
 *
 * 시점 필터를 엔진에서도 한 번 더 적용하므로 여기 조건이 느슨해도 결과는 같다.
 * 다만 읽어오는 양을 줄이기 위해 DB 에서 먼저 거른다.
 */
export async function loadVisaRules(
  prisma: PrismaClient,
  options: { visa?: VisaCode; on: Date },
): Promise<VisaRule[]> {
  const rows = await prisma.visaRule.findMany({
    where: {
      ...(options.visa == null ? {} : { visa: options.visa }),
      effectiveFrom: { lte: options.on },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: options.on } }],
    },
    orderBy: [{ visa: 'asc' }, { ruleType: 'asc' }, { effectiveFrom: 'desc' }],
  });

  return rows.map(toEngineRule);
}
