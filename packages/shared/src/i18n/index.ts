import { ko } from './messages/ko.js';
import { en } from './messages/en.js';
import { zhCN } from './messages/zh-CN.js';
import { vi } from './messages/vi.js';
import { SIGNAL_MESSAGES } from './messages/signals.js';
import { UI_MESSAGES } from './messages/ui.js';
import { DEFAULT_LOCALE, type Locale, type MessageCatalog } from './locales.js';

export { LOCALES, DEFAULT_LOCALE } from './locales.js';
export type { Locale, MessageCatalog } from './locales.js';

/**
 * 판정 사유 문구(locale 파일)와 카드 칩 문구(signals)를 합친다.
 * 둘을 나눠 두는 이유는 성격이 달라서다 — 사유는 문장이고 칩은 라벨이다.
 */
export const MESSAGES: Record<Locale, MessageCatalog> = {
  ko: { ...ko, ...SIGNAL_MESSAGES.ko, ...UI_MESSAGES.ko },
  en: { ...en, ...SIGNAL_MESSAGES.en, ...UI_MESSAGES.en },
  'zh-CN': { ...zhCN, ...SIGNAL_MESSAGES['zh-CN'], ...UI_MESSAGES['zh-CN'] },
  vi: { ...vi, ...SIGNAL_MESSAGES.vi, ...UI_MESSAGES.vi },
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
