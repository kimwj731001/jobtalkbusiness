import { DEFAULT_LOCALE, LOCALES, type Locale } from '@jobtalk/shared';

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * `?locale=` 을 먼저 보고, 없으면 Accept-Language 를 본다 (spec/API_SPEC.md).
 *
 * 언어 협상을 틀리면 사용자가 판정 근거를 못 읽는다.
 * 읽지 못하는 근거는 근거가 아니므로, 모르는 값이 오면 조용히 ko 로 떨어뜨린다.
 */
export function resolveLocale(request: Request): Locale {
  const url = new URL(request.url);
  const requested = url.searchParams.get('locale');
  if (requested != null && isLocale(requested)) return requested;

  const header = request.headers.get('accept-language');
  if (header == null) return DEFAULT_LOCALE;

  const candidates = header
    .split(',')
    .map((part) => {
      const [tag = '', ...rest] = part.trim().split(';');
      const qPart = rest.find((r) => r.trim().startsWith('q='));
      const q = qPart == null ? 1 : Number.parseFloat(qPart.trim().slice(2));
      return { tag: tag.trim(), q: Number.isNaN(q) ? 0 : q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of candidates) {
    if (isLocale(tag)) return tag;
    // zh-Hans-CN, zh-TW 등은 zh-CN 으로, en-US 는 en 으로
    const base = tag.split('-')[0] ?? '';
    if (base === 'zh') return 'zh-CN';
    if (isLocale(base)) return base;
  }

  return DEFAULT_LOCALE;
}
