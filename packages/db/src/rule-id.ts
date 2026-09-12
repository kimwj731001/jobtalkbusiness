import { createHash } from 'node:crypto';

/**
 * visa_rules.id 는 UUID 인데, 규칙 시드는 읽을 수 있는 슬러그로 관리한다.
 * 슬러그 → UUID 를 결정적으로 만들어 재시드해도 같은 행을 가리키게 한다.
 *
 * 슬러그가 바뀌면 UUID 도 바뀐다. 즉 기존 규칙을 "수정"하면 새 행이 된다 —
 * 기존 행에 effectiveTo 를 넣고 새 행을 추가하라는 L2 규칙과 맞물린다.
 */
const NAMESPACE = '6f0b6b1e-0a6a-4a4e-9a1e-1b2c3d4e5f60';

export function ruleUuid(slug: string): string {
  const namespaceBytes = Buffer.from(NAMESPACE.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1')
    .update(Buffer.concat([namespaceBytes, Buffer.from(slug, 'utf8')]))
    .digest();

  const bytes = Buffer.from(hash.subarray(0, 16));
  // RFC 4122 — version 5, variant 10xx
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
