'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { VisaProfile } from '@jobtalk/eligibility';
import { loadPrefs, loadProfile, useTranslation, type SearchPrefs } from '@/lib/client-profile';
import { JobCard, type JobItem } from '@/components/JobCard';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Disclaimer } from '@/components/ui';

type Sort = 'RECOMMENDED' | 'WAGE_DESC' | 'RECENT';

/**
 * 검색 결과.
 *
 * 판정은 프로필에 따라 달라지므로 서버에 미리 계산해 둘 수 없다.
 * 프로필을 헤더로 실어 보내고 서버가 매번 판정한다.
 */
export default function JobsPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useTranslation();

  const [profile, setProfile] = useState<VisaProfile | null>(null);
  const [prefs, setPrefs] = useState<SearchPrefs | null>(null);
  const [items, setItems] = useState<JobItem[] | null>(null);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<Sort>('RECOMMENDED');

  // 조건을 입력한 적이 없으면 입력 화면으로 돌려보낸다
  useEffect(() => {
    const saved = loadProfile();
    if (saved == null) {
      router.replace('/');
      return;
    }
    setProfile(saved);
    setPrefs(loadPrefs());
  }, [router]);

  const fetchJobs = useCallback(
    async (p: VisaProfile, pr: SearchPrefs, sortBy: Sort) => {
      setError(false);
      setItems(null);
      const params = new URLSearchParams({ locale, limit: '50' });
      if (pr.minWage != null) params.set('minWage', String(pr.minWage));
      if (pr.maxWeeklyHours != null) params.set('maxWeeklyHours', String(pr.maxWeeklyHours));
      if (sortBy === 'WAGE_DESC') params.set('sort', 'WAGE_DESC');
      if (sortBy === 'RECENT') params.set('sort', 'RECENT');

      try {
        const res = await fetch(`/api/postings?${params}`, {
          headers: { 'x-visa-profile': JSON.stringify(p) },
        });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { items: JobItem[] };
        setItems(body.items);
      } catch {
        setError(true);
      }
    },
    [locale],
  );

  useEffect(() => {
    if (profile == null || prefs == null) return;
    void fetchJobs(profile, prefs, sort);
  }, [profile, prefs, sort, fetchJobs]);

  const conditions =
    profile == null
      ? ''
      : t('results.conditions', {
          visa: t(`visa.${profile.visa}`),
          degree: t(`degree.${profile.degreeLevel}`),
          korean: t(`korean.${profile.koreanProficiency ?? 'NONE'}`),
        });

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 pb-16 pt-6">
      <header className="mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-brand">{t('app.name')}</p>
            <h1 className="mt-2 text-xl font-bold text-ink">{t('results.title')}</h1>
          </div>
          <LanguageSwitch locale={locale} onChange={setLocale} label={t('nav.language')} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-2.5 ring-1 ring-line">
          <p className="truncate text-xs text-ink-soft">{conditions}</p>
          <Link
            href="/"
            className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-soft"
          >
            {t('nav.edit')}
          </Link>
        </div>
      </header>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-ink-faint">
          {items != null && t('results.count', { count: items.length })}
        </p>
        <label className="flex items-center gap-1.5">
          <span className="sr-only">{t('results.sort')}</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="cursor-pointer rounded-lg bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-soft ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {(['RECOMMENDED', 'WAGE_DESC', 'RECENT'] as Sort[]).map((s) => (
              <option key={s} value={s}>
                {t(`results.sort.${s}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {items == null && !error && (
        <p className="py-16 text-center text-sm text-ink-faint">{t('results.loading')}</p>
      )}

      {error && (
        <div className="py-16 text-center">
          <p className="text-sm text-ink-soft">{t('results.error')}</p>
          <button
            type="button"
            onClick={() => profile && prefs && void fetchJobs(profile, prefs, sort)}
            className="mt-3 rounded-lg bg-surface px-4 py-2 text-xs font-semibold text-brand ring-1 ring-brand-line"
          >
            {t('results.retry')}
          </button>
        </div>
      )}

      {items != null && items.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm font-medium text-ink">{t('results.empty')}</p>
          <p className="mt-1.5 text-xs text-ink-faint">{t('results.emptyHint')}</p>
        </div>
      )}

      {items != null && items.length > 0 && (
        <ul className="grid gap-3">
          {items.map((item) => (
            <JobCard key={item.id} item={item} t={t} />
          ))}
        </ul>
      )}

      <footer className="mt-10 border-t border-line pt-5">
        <Disclaimer text={t('eligibility.disclaimer')} />
      </footer>
    </main>
  );
}
