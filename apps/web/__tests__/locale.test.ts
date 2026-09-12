import { describe, expect, it } from 'vitest';
import { resolveLocale } from '@/lib/locale';

function req(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers });
}

describe('언어 협상', () => {
  it('?locale 이 Accept-Language 를 이긴다', () => {
    expect(
      resolveLocale(req('https://x.test/api?locale=vi', { 'accept-language': 'en-US' })),
    ).toBe('vi');
  });

  it('Accept-Language 의 q 값 순서를 따른다', () => {
    expect(
      resolveLocale(req('https://x.test/api', { 'accept-language': 'en;q=0.6,vi;q=0.9' })),
    ).toBe('vi');
  });

  it('en-US 처럼 지역이 붙어도 en 으로 떨어진다', () => {
    expect(resolveLocale(req('https://x.test/api', { 'accept-language': 'en-US,en;q=0.9' }))).toBe(
      'en',
    );
  });

  it('중국어 변종은 zh-CN 으로 모은다', () => {
    expect(resolveLocale(req('https://x.test/api', { 'accept-language': 'zh-Hans-CN' }))).toBe(
      'zh-CN',
    );
    expect(resolveLocale(req('https://x.test/api', { 'accept-language': 'zh-TW' }))).toBe('zh-CN');
  });

  it('헤더가 없으면 ko', () => {
    expect(resolveLocale(req('https://x.test/api'))).toBe('ko');
  });

  it('지원하지 않는 언어는 ko 로 떨어진다', () => {
    expect(resolveLocale(req('https://x.test/api', { 'accept-language': 'ja,th' }))).toBe('ko');
  });

  it('알 수 없는 ?locale 값은 무시하고 헤더를 본다', () => {
    expect(resolveLocale(req('https://x.test/api?locale=xx', { 'accept-language': 'vi' }))).toBe(
      'vi',
    );
  });
});
