'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { VisaProfile } from '@jobtalk/eligibility';
import { loadProfile, useTranslation } from '@/lib/client-profile';
import { Badge, Chip, Disclaimer } from '@/components/ui';
import { LanguageSwitch } from '@/components/LanguageSwitch';

interface Reason {
  kind: string;
  reasonCode: string;
  verdict: string;
  message: string;
  sourceTitle: string | null;
  sourceClause: string | null;
  sourceUrl: string | null;
  effectiveFrom: string | null;
  confidence: string | null;
}

interface Evaluation {
  status: string;
  badge: string;
  signals: { code: string; tone: string; label: string }[];
  reasons: Reason[];
  requiredActions: { code: string; label: string; description: string }[];
  disclaimer: { text: string; ruleEffectiveDate: string | null };
}

interface Detail {
  id: string;
  title: string;
  summary: string | null;
  sourceUrl: string;
  employer: { name: string; isWageArrears: boolean; wageArrearsNote: string | null } | null;
  weeklyHoursMin: number | null;
  weeklyHoursMax: number | null;
  hourlyWageKrw: number | null;
  wageIsEstimated: boolean;
  schedule: { dow: number; start: string; end: string }[];
  missingFields: string[];
}

/** 근거 한 건의 좌측 표시 — 어떤 성격의 사유인지 */
const VERDICT_TONE: Record<string, string> = {
  FAIL: 'bg-danger',
  WARN: 'bg-caution',
  INDETERMINATE: 'bg-caution',
  PASS: 'bg-line-strong',
};

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, locale, setLocale } = useTranslation();

  const [detail, setDetail] = useState<Detail | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const profile: VisaProfile | null = loadProfile();

    async function load() {
      try {
        const [detailRes, evalRes] = await Promise.all([
          fetch(`/api/postings/${id}?locale=${locale}`),
          fetch(`/api/eligibility/evaluate?locale=${locale}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ postingId: id, profile }),
          }),
        ]);
        if (!detailRes.ok) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const d = (await detailRes.json()) as Detail;
        const e = evalRes.ok ? ((await evalRes.json()) as Evaluation) : null;
        if (!cancelled) {
          setDetail(d);
          setEvaluation(e);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, locale]);

  if (notFound) {
    return (
      <main className="mx-auto max-w-lg px-5 py-20 text-center">
        <p className="text-sm text-ink-soft">{t('detail.notFound')}</p>
        <Link href="/jobs" className="mt-4 inline-block text-xs font-semibold text-brand">
          {t('detail.back')}
        </Link>
      </main>
    );
  }

  if (detail == null) {
    return (
      <main className="mx-auto max-w-lg px-5 py-20 text-center">
        <p className="text-sm text-ink-faint">{t('results.loading')}</p>
      </main>
    );
  }

  const dows = [...new Set(detail.schedule.map((s) => s.dow))].sort();

  const reasons = evaluation?.reasons ?? [];
  /** 근거가 미확정이라 판단을 보류한 항목 — 문장이 전부 같아서 묶어 보여준다 */
  const unverified = reasons.filter((r) => r.reasonCode === 'LOW_CONFIDENCE_RULE');
  /** 판정을 실제로 가른 근거 */
  const decisive = reasons.filter((r) => r.reasonCode !== 'LOW_CONFIDENCE_RULE');

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 pb-16 pt-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <Link href="/jobs" className="text-xs font-semibold text-brand hover:underline">
          ← {t('detail.back')}
        </Link>
        <LanguageSwitch locale={locale} onChange={setLocale} label={t('nav.language')} />
      </div>

      {evaluation != null && (
        <div className="mb-4">
          <Badge kind={evaluation.badge} label={t(`badge.${evaluation.badge}`)} />
        </div>
      )}

      <h1 className="text-xl font-bold leading-snug text-ink">{detail.title}</h1>
      {detail.employer != null && (
        <p className="mt-1.5 text-sm text-ink-soft">{detail.employer.name}</p>
      )}
      {detail.summary != null && (
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{detail.summary}</p>
      )}

      {detail.employer?.isWageArrears && (
        <p className="mt-3 rounded-xl bg-danger-soft px-4 py-3 text-xs font-medium text-danger ring-1 ring-danger-line">
          {t('detail.wageArrears')}
        </p>
      )}

      {evaluation != null && evaluation.signals.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {evaluation.signals.map((s) => (
            <Chip key={s.code} tone={s.tone}>
              {s.label}
            </Chip>
          ))}
        </div>
      )}

      {/* 근무 조건 */}
      <section className="mt-7">
        <h2 className="text-sm font-semibold text-ink">{t('detail.workConditions')}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface px-3.5 py-3 ring-1 ring-line">
            <dt className="text-[11px] text-ink-faint">{t('detail.wage')}</dt>
            <dd className="tnum mt-1 text-sm font-bold text-ink">
              {detail.hourlyWageKrw == null
                ? t('card.noWage')
                : t('detail.wageValue', { wage: detail.hourlyWageKrw.toLocaleString() })}
            </dd>
          </div>
          <div className="rounded-xl bg-surface px-3.5 py-3 ring-1 ring-line">
            <dt className="text-[11px] text-ink-faint">{t('detail.hours')}</dt>
            <dd className="tnum mt-1 text-sm font-bold text-ink">
              {detail.weeklyHoursMax == null
                ? t('card.hoursUnknown')
                : t('card.weeklyHours', { hours: detail.weeklyHoursMax })}
            </dd>
          </div>
        </dl>
        {dows.length > 0 && (
          <p className="tnum mt-2 text-xs text-ink-soft">
            {dows.map((d) => t(`dow.${d}`)).join(' · ')}
          </p>
        )}
        {detail.missingFields.length > 0 && (
          <p className="mt-2 text-xs text-ink-faint">
            {t('detail.missingFields')}: {detail.missingFields.join(', ')}
          </p>
        )}
      </section>

      {/* 해야 할 것 */}
      {evaluation != null && evaluation.requiredActions.length > 0 && (
        <section className="mt-7">
          <h2 className="text-sm font-semibold text-ink">{t('detail.actions')}</h2>
          <ul className="mt-3 grid gap-2">
            {evaluation.requiredActions.map((a) => (
              <li
                key={a.code}
                className="rounded-xl bg-caution-soft px-4 py-3 ring-1 ring-caution-line"
              >
                <p className="text-sm font-semibold text-ink">{a.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">{a.description}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 판정 근거 — L3. 빠질 수 없다 */}
      {evaluation != null && (
        <section className="mt-7">
          <h2 className="text-sm font-semibold text-ink">{t('detail.basis')}</h2>

          {/*
            미검증 근거는 하나로 묶는다. 같은 문장이 네 번 반복되면
            정작 결정적인 근거(제한·조건)가 그 사이에 묻힌다.
            다만 출처는 전부 남긴다 — 근거를 줄이는 게 아니라 읽히게 하는 것이다 (L3).
          */}
          {unverified.length > 0 && (
            <div className="mt-3 rounded-xl bg-caution-soft p-3.5 ring-1 ring-caution-line">
              <p className="text-sm font-semibold text-ink">
                {t('detail.unverifiedGroup', { count: unverified.length })}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                {t('detail.unverifiedGroupBody')}
              </p>
              <ul className="mt-2.5 grid gap-1">
                {unverified.map((r, i) => (
                  <li key={`unverified-${i}`} className="text-[11px] leading-relaxed text-ink-faint">
                    · {r.sourceTitle}
                    {r.sourceClause != null && ` · ${r.sourceClause}`}
                    {r.effectiveFrom != null &&
                      ` · ${t('detail.effectiveFrom', { date: r.effectiveFrom })}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="mt-3 grid gap-2.5">
            {decisive.map((r, i) => (
              <li
                key={`${r.reasonCode}-${i}`}
                className="flex gap-3 rounded-xl bg-surface p-3.5 ring-1 ring-line"
              >
                <span
                  aria-hidden
                  className={`mt-1 h-full w-1 shrink-0 rounded-full ${
                    VERDICT_TONE[r.verdict] ?? 'bg-line-strong'
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm leading-relaxed text-ink">{r.message}</p>
                  {r.sourceTitle != null && (
                    <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
                      {r.sourceTitle}
                      {r.sourceClause != null && ` · ${r.sourceClause}`}
                      {r.effectiveFrom != null &&
                        ` · ${t('detail.effectiveFrom', { date: r.effectiveFrom })}`}
                      {r.confidence != null && ` · ${t(`confidence.${r.confidence}`)}`}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 원문 링크아웃 — L6. 우리는 원문을 보관하지 않는다 */}
      <section className="mt-7">
        <a
          href={detail.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-xl bg-brand px-4 py-3.5 text-center text-sm font-semibold text-white hover:opacity-90"
        >
          {t('detail.openSource')} ↗
        </a>
        <p className="mt-2 text-center text-[11px] text-ink-faint">{t('detail.originalNotice')}</p>
      </section>

      <footer className="mt-8 border-t border-line pt-5">
        <Disclaimer text={evaluation?.disclaimer.text ?? t('eligibility.disclaimer')} />
      </footer>
    </main>
  );
}
