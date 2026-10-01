'use client';

import Link from 'next/link';
import { Badge, Chip } from './ui';

export interface JobItem {
  id: string;
  rank: number;
  title: string;
  summary: string | null;
  sourceUrl: string;
  employer: { name: string; isWageArrears: boolean } | null;
  weeklyHoursMin: number | null;
  weeklyHoursMax: number | null;
  hourlyWageKrw: number | null;
  wageIsEstimated: boolean;
  schedule: { dow: number; start: string; end: string }[];
  eligibility: {
    status: string;
    badge: string;
    signals: { code: string; tone: string; label: string }[];
  };
}

type T = (key: string, params?: Record<string, unknown>) => string;

function hoursLabel(item: JobItem, t: T): string {
  const { weeklyHoursMin: min, weeklyHoursMax: max } = item;
  if (max == null && min == null) return t('card.hoursUnknown');
  if (min != null && max != null && min !== max) {
    return t('card.weeklyHoursRange', { min, max });
  }
  return t('card.weeklyHours', { hours: max ?? min });
}

/**
 * 공고 카드.
 *
 * 배지를 제목 옆이 아니라 맨 위 한 줄에 둔다 — 스캔할 때 가장 먼저 읽혀야 하는 정보다.
 * 시급을 크게 쓰는 건 구인 서비스의 관행이고 실제로 사용자가 제일 먼저 보는 값이지만,
 * 판정 배지보다 위에 두지는 않는다. 조건이 좋아도 불법이면 소용이 없다.
 */
export function JobCard({ item, t }: { item: JobItem; t: T }) {
  const { eligibility } = item;
  const dows = [...new Set(item.schedule.map((s) => s.dow))].sort();

  return (
    <li className="rounded-card bg-surface ring-1 ring-line transition-shadow hover:shadow-sm">
      <Link href={`/jobs/${item.id}`} className="block p-4 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 rounded-card">
        <div className="flex items-center justify-between gap-3">
          <Badge kind={eligibility.badge} label={t(`badge.${eligibility.badge}`)} />
          {item.hourlyWageKrw != null && (
            <span className="tnum text-right text-base font-bold text-ink">
              {t('card.perHour', { wage: item.hourlyWageKrw.toLocaleString() })}
              {item.wageIsEstimated && (
                <span className="ml-1 align-middle text-[10px] font-medium text-ink-faint">
                  {t('card.wageEstimated')}
                </span>
              )}
            </span>
          )}
        </div>

        <h3 className="mt-3 text-[15px] font-semibold leading-snug text-ink">{item.title}</h3>
        {item.employer != null && (
          <p className="mt-1 text-xs text-ink-faint">{item.employer.name}</p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
          <span className="tnum">{hoursLabel(item, t)}</span>
          {dows.length > 0 && (
            <span className="tnum">{dows.map((d) => t(`dow.${d}`)).join(' · ')}</span>
          )}
          {item.hourlyWageKrw == null && <span>{t('card.noWage')}</span>}
        </div>

        {eligibility.signals.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {eligibility.signals.map((s) => (
              <Chip key={s.code} tone={s.tone}>
                {s.label}
              </Chip>
            ))}
          </div>
        )}
      </Link>
    </li>
  );
}
