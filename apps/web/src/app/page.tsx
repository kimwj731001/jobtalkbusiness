import { prisma } from '@jobtalk/db';

export const dynamic = 'force-dynamic';

/**
 * 현재는 상태 확인용 페이지다. 검색 UI 는 7단계에서 만든다 (CLAUDE.md 5장).
 * 판정 엔진이 완성되기 전에는 UI 를 만들지 않는다는 순서를 지킨다.
 */
export default async function Home() {
  const [rules, lowConfidence, postings] = await Promise.all([
    prisma.visaRule.count(),
    prisma.visaRule.count({ where: { confidence: 'low' } }),
    prisma.posting.count({ where: { status: 'ACTIVE' } }),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">외국인 일자리 적법성 판정</h1>
      <p className="mt-2 text-neutral-600">
        내 비자로 여기서 일하면 합법인가 — 근거와 함께 답합니다.
      </p>

      <dl className="mt-10 grid grid-cols-3 gap-4 text-sm">
        <div className="rounded-lg border border-neutral-200 p-4">
          <dt className="text-neutral-500">비자 규칙</dt>
          <dd className="mt-1 text-2xl font-semibold">{rules}</dd>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4">
          <dt className="text-neutral-500">원문 미대조</dt>
          <dd className="mt-1 text-2xl font-semibold text-amber-600">{lowConfidence}</dd>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4">
          <dt className="text-neutral-500">활성 공고</dt>
          <dd className="mt-1 text-2xl font-semibold">{postings}</dd>
        </div>
      </dl>

      {lowConfidence > 0 && (
        <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
          규칙 {lowConfidence}건이 지침 원문과 대조되지 않았습니다. 이 규칙이 걸리는 판정은
          <strong> 확인 필요(UNKNOWN)</strong>로 나옵니다. 가능하다는 뜻이 아닙니다.
        </p>
      )}

      <p className="mt-10 text-xs text-neutral-500">
        이 판정은 참고용 정보입니다. 최종 판단은 관할 출입국·외국인청의 심사에 따릅니다.
      </p>
    </main>
  );
}
