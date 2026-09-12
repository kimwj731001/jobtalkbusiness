export const LOCALES = ['ko', 'en', 'zh-CN', 'vi'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ko';

/**
 * 문구는 ICU MessageFormat 의 단순 보간(`{name}`)만 쓴다.
 * next-intl 이 그대로 소비할 수 있고, 평가기가 내보내는 params 의 키와 1:1로 맞는다.
 */
export type MessageCatalog = Record<string, string>;
