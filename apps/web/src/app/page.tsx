'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DegreeLevel, KoreanProficiency, VisaCode } from '@jobtalk/shared';
import type { VisaProfile } from '@jobtalk/eligibility';
import {
  EMPTY_PREFS,
  loadPrefs,
  loadProfile,
  saveProfile,
  savePrefs,
  useTranslation,
  type SearchPrefs,
} from '@/lib/client-profile';
import { Choice, ChoicePill, Field } from '@/components/ui';
import { LanguageSwitch } from '@/components/LanguageSwitch';

/**
 * 조건 입력.
 *
 * CLAUDE.md 5장 6단계 — 텍스트 입력 0회로 완료 가능해야 한다.
 * 한국어를 못 읽는 사용자가 자판을 두드리게 만들면 거기서 이탈한다.
 *
 * ⚠️ L5 — 이 화면에 식별번호 입력 칸은 없다. 만들라는 요청이 와도 만들지 않는다.
 *
 * E-9 / E-7-4 는 스키마·엔진만 지원하고 여기 노출하지 않는다 (CLAUDE.md 1장).
 */

/** D-2 는 학위과정을 묻고, D-4 는 어학연수로 고정된다 */
const DEGREES_BY_VISA: Record<string, DegreeLevel[]> = {
  D2: ['ASSOCIATE', 'BACHELOR_1_2', 'BACHELOR_3_4', 'MASTER', 'DOCTORATE'],
  D4: ['LANGUAGE'],
};

const KOREAN_LEVELS: KoreanProficiency[] = [
  'NONE',
  'TOPIK1',
  'TOPIK2',
  'TOPIK3',
  'TOPIK4',
  'TOPIK5',
  'TOPIK6',
];

const CURRENT_HOURS = [0, 5, 10, 15, 20, 25];
const MIN_WAGES = [null, 11000, 12000, 13000, 15000];
const MAX_HOURS = [null, 10, 15, 20, 25];

export default function OnboardingPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useTranslation();

  const [visa, setVisa] = useState<VisaCode>('D2');
  const [degreeLevel, setDegreeLevel] = useState<DegreeLevel>('BACHELOR_3_4');
  const [korean, setKorean] = useState<KoreanProficiency>('TOPIK3');
  const [currentHours, setCurrentHours] = useState(0);
  /**
   * 허가 여부는 "모르겠어요"(null)도 유효한 답이다 — 모르는 걸 안다고 하면 안 된다.
   * 다만 "아직 고르지 않음"과는 구분해야 해서 선택 여부를 따로 들고 있는다.
   */
  const [permitAnswered, setPermitAnswered] = useState(false);
  const [hasPermit, setHasPermit] = useState<boolean | null>(null);
  const [prefs, setPrefs] = useState<SearchPrefs>(EMPTY_PREFS);

  // 이미 입력한 적이 있으면 그 값에서 시작한다
  useEffect(() => {
    const saved = loadProfile();
    if (saved != null) {
      setVisa(saved.visa);
      setDegreeLevel(saved.degreeLevel);
      setKorean(saved.koreanProficiency ?? 'NONE');
      setCurrentHours(saved.currentWeeklyHours ?? 0);
      setHasPermit(saved.hasPartTimePermit ?? null);
      setPermitAnswered(true);
    }
    setPrefs(loadPrefs());
  }, []);

  // 비자를 바꾸면 학위과정이 맞지 않을 수 있다
  useEffect(() => {
    const allowed = DEGREES_BY_VISA[visa] ?? [];
    if (allowed.length > 0 && !allowed.includes(degreeLevel)) {
      setDegreeLevel(allowed[0]!);
    }
  }, [visa, degreeLevel]);

  function submit() {
    const profile: VisaProfile = {
      visa,
      degreeLevel,
      koreanProficiency: korean,
      currentWeeklyHours: currentHours,
      // 지침 상한은 규칙이 정한다. 사용자가 따로 신고한 값이 없으면 비워 둔다.
      permittedWeeklyHours: null,
      hasPartTimePermit: hasPermit,
      // 경로 API 가 없어 통학을 계산할 수 없다. 기준 위치를 받지 않으면
      // 통학 규칙이 적용되지 않아 모든 카드에 "판단 불가"가 붙는 일을 피한다.
      baseLat: null,
      baseLng: null,
    };
    saveProfile(profile);
    savePrefs(prefs);
    router.push('/jobs');
  }

  const degrees = DEGREES_BY_VISA[visa] ?? [];

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 pb-28 pt-6">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand">{t('app.name')}</p>
          <h1 className="mt-2 text-2xl font-bold leading-snug text-ink">{t('onboarding.title')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t('onboarding.subtitle')}</p>
        </div>
        <LanguageSwitch locale={locale} onChange={setLocale} label={t('nav.language')} />
      </header>

      <Field label={t('field.visa')} hint={t('field.visa.hint')}>
        <div className="grid gap-2">
          {(['D2', 'D4'] as VisaCode[]).map((v) => (
            <Choice
              key={v}
              selected={visa === v}
              onClick={() => setVisa(v)}
              label={t(`visa.${v}`)}
              description={t(`visa.${v}.desc`)}
            />
          ))}
        </div>
      </Field>

      {degrees.length > 1 && (
        <Field label={t('field.degree')}>
          <div className="flex flex-wrap gap-2">
            {degrees.map((d) => (
              <ChoicePill
                key={d}
                selected={degreeLevel === d}
                onClick={() => setDegreeLevel(d)}
                label={t(`degree.${d}`)}
              />
            ))}
          </div>
        </Field>
      )}

      <Field label={t('field.korean')} hint={t('field.korean.hint')}>
        <div className="flex flex-wrap gap-2">
          {KOREAN_LEVELS.map((k) => (
            <ChoicePill
              key={k}
              selected={korean === k}
              onClick={() => setKorean(k)}
              label={t(`korean.${k}`)}
            />
          ))}
        </div>
      </Field>

      <Field label={t('field.currentHours')} hint={t('field.currentHours.hint')}>
        <div className="flex flex-wrap gap-2">
          {CURRENT_HOURS.map((h) => (
            <ChoicePill
              key={h}
              selected={currentHours === h}
              onClick={() => setCurrentHours(h)}
              label={h === 0 ? t('hours.none') : t('hours.value', { hours: h })}
            />
          ))}
        </div>
      </Field>

      <Field label={t('field.permit')} hint={t('field.permit.hint')}>
        <div className="flex flex-wrap gap-2">
          {[true, false, null].map((value) => (
            <ChoicePill
              key={String(value)}
              selected={permitAnswered && hasPermit === value}
              onClick={() => {
                setHasPermit(value);
                setPermitAnswered(true);
              }}
              label={t(`permit.${String(value)}`)}
            />
          ))}
        </div>
      </Field>

      <Field label={t('field.minWage')}>
        <div className="flex flex-wrap gap-2">
          {MIN_WAGES.map((w) => (
            <ChoicePill
              key={String(w)}
              selected={prefs.minWage === w}
              onClick={() => setPrefs((p) => ({ ...p, minWage: w }))}
              label={w == null ? t('wage.any') : t('wage.atLeast', { wage: w.toLocaleString() })}
            />
          ))}
        </div>
      </Field>

      <Field label={t('field.maxHours')}>
        <div className="flex flex-wrap gap-2">
          {MAX_HOURS.map((h) => (
            <ChoicePill
              key={String(h)}
              selected={prefs.maxWeeklyHours === h}
              onClick={() => setPrefs((p) => ({ ...p, maxWeeklyHours: h }))}
              label={h == null ? t('maxHours.any') : t('maxHours.upTo', { hours: h })}
            />
          ))}
        </div>
      </Field>

      <p className="rounded-xl bg-surface px-4 py-3 text-xs leading-relaxed text-ink-faint ring-1 ring-line">
        {t('onboarding.privacy')}
      </p>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto max-w-lg">
          {!permitAnswered && (
            <p className="mb-2 text-center text-xs text-ink-faint">{t('onboarding.needPermit')}</p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!permitAnswered}
            className="w-full rounded-xl bg-brand px-4 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('onboarding.submit')}
          </button>
        </div>
      </div>
    </main>
  );
}
