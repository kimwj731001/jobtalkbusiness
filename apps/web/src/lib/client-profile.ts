'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_LOCALE, LOCALES, formatMessage, type Locale } from '@jobtalk/shared';
import type { VisaProfile } from '@jobtalk/eligibility';

/**
 * 프로필은 브라우저에만 둔다.
 *
 * 계정 없이 쓸 수 있어야 하고(구직자에게 가입을 강요하지 않는다),
 * 서버에 남기지 않으면 유출될 것도 없다.
 *
 * ⚠️ L5 — 여기 담기는 건 비자 종류·학위과정·한국어 급수뿐이다.
 *    식별번호는 폼에도 없고 타입에도 없다.
 */
const PROFILE_KEY = 'jobtalk.profile.v1';
const PREFS_KEY = 'jobtalk.prefs.v1';
const LOCALE_KEY = 'jobtalk.locale.v1';

export interface SearchPrefs {
  /** 최소 시급 (원). null 이면 상관없음 */
  minWage: number | null;
  /** 희망 주당 최대 시간. null 이면 상관없음 */
  maxWeeklyHours: number | null;
}

export const EMPTY_PREFS: SearchPrefs = { minWage: null, maxWeeklyHours: null };

function read<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? null : (JSON.parse(raw) as T);
  } catch {
    // 시크릿 모드나 저장소 차단 환경에서도 앱이 죽지 않아야 한다
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 못 해도 이번 세션은 동작한다 */
  }
}

export function loadProfile(): VisaProfile | null {
  return read<VisaProfile>(PROFILE_KEY);
}

export function saveProfile(profile: VisaProfile): void {
  write(PROFILE_KEY, profile);
}

export function loadPrefs(): SearchPrefs {
  return read<SearchPrefs>(PREFS_KEY) ?? EMPTY_PREFS;
}

export function savePrefs(prefs: SearchPrefs): void {
  write(PREFS_KEY, prefs);
}

function isLocale(value: string | null): value is Locale {
  return value != null && (LOCALES as readonly string[]).includes(value);
}

export function loadLocale(): Locale {
  const stored = read<string>(LOCALE_KEY);
  if (isLocale(stored)) return stored;

  // 저장된 값이 없으면 브라우저 언어를 따른다
  if (typeof navigator !== 'undefined') {
    for (const tag of navigator.languages ?? []) {
      if (isLocale(tag)) return tag;
      const base = tag.split('-')[0];
      if (base === 'zh') return 'zh-CN';
      if (isLocale(base ?? null)) return base as Locale;
    }
  }
  return DEFAULT_LOCALE;
}

export function saveLocale(locale: Locale): void {
  write(LOCALE_KEY, locale);
}

/**
 * 번역 훅.
 *
 * 서버 렌더와 클라이언트의 첫 렌더가 달라지면 hydration 이 깨지므로,
 * 저장된 언어는 마운트 후에 적용한다.
 */
export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(loadLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    saveLocale(next);
    setLocaleState(next);
    if (typeof document !== 'undefined') document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: string, params: Record<string, unknown> = {}) => formatMessage(key, params, locale),
    [locale],
  );

  return { t, locale, setLocale };
}
