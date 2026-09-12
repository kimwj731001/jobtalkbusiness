import { ko } from './messages/ko.js';
import { en } from './messages/en.js';
import { zhCN } from './messages/zh-CN.js';
import { vi } from './messages/vi.js';
import { DEFAULT_LOCALE, type Locale, type MessageCatalog } from './locales.js';

export { LOCALES, DEFAULT_LOCALE } from './locales.js';
export type { Locale, MessageCatalog } from './locales.js';

export const MESSAGES: Record<Locale, MessageCatalog> = {
  ko,
  en,
  'zh-CN': zhCN,
  vi,
};

/**
 * ICU 단순 보간만 처리한다 — `{name}` 을 params[name] 으로 치환한다.
 *
 * 이건 서버에서 판정 결과를 문자열로 굳혀야 할 때(알림 메일 등) 쓰는 최소 구현이다.
 * 웹 UI 는 next-intl 이 MESSAGES 를 그대로 받아 처리한다.
 *
 * 키가 없으면 빈 문자열이 아니라 키 자체를 돌려준다 — 누락이 조용히 묻히면 안 된다.
 */
export function formatMessage(
  key: string,
  params: Record<string, unknown> = {},
  locale: Locale = DEFAULT_LOCALE,
): string {
  const template = MESSAGES[locale]?.[key] ?? MESSAGES[DEFAULT_LOCALE][key];
  if (template == null) return key;

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value == null ? match : String(value);
  });
}
