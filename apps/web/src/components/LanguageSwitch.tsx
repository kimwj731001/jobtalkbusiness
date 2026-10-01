'use client';

import { LOCALES, type Locale } from '@jobtalk/shared';

const LABELS: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  'zh-CN': '中文',
  vi: 'Tiếng Việt',
};

/**
 * 언어 전환.
 *
 * 사용자 대부분이 한국어를 읽지 못한다. 언어를 못 찾으면 서비스 전체를 못 쓰므로
 * 메뉴 안에 숨기지 않고 상단에 항상 내놓는다.
 */
export function LanguageSwitch({
  locale,
  onChange,
  label,
}: {
  locale: Locale;
  onChange: (next: Locale) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">{label}</span>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value as Locale)}
        className="cursor-pointer rounded-lg bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-soft ring-1 ring-line hover:ring-line-strong focus:outline-none focus:ring-2 focus:ring-brand"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
