import { z } from 'zod';
import {
  DEGREE_LEVELS,
  KOREAN_PROFICIENCIES,
  VISA_CODES,
  type VisaProfileInput,
} from './types.js';

/**
 * L5 — 식별번호는 수집하지 않는다.
 *
 * 방어가 두 겹이다:
 *  1. 아래 금지 키가 요청에 들어 있으면 400 으로 거부한다 (명시적 거부)
 *  2. 스키마가 strict 라 화이트리스트 밖의 키는 전부 거부된다 (기본 차단)
 *
 * 1번이 없어도 2번이 막지만, 1번은 "왜 거부됐는지"를 알려준다.
 * 프런트엔드가 실수로 필드를 붙였을 때 조용히 무시되는 것보다 낫다.
 *
 * DB 에 컬럼이 없으므로 통과해도 저장될 곳이 없지만,
 * 그 값은 이미 우리 서버 로그·APM 에 남는다. 경계에서 막아야 한다.
 */
const FORBIDDEN_FIELDS = [
  'alienRegistrationNumber',
  'alien_registration_number',
  'passportNumber',
  'passport_number',
  'residentRegistrationNumber',
  'resident_registration_number',
  'rrn',
  'ssn',
  'nationalId',
  'national_id',
] as const;

export class ForbiddenIdentityFieldError extends Error {
  constructor(readonly fields: string[]) {
    super(`식별번호는 수집하지 않습니다: ${fields.join(', ')}`);
    this.name = 'ForbiddenIdentityFieldError';
  }
}

/** 중첩 객체까지 훑는다. `{ profile: { passportNumber } }` 도 막힌다. */
export function findForbiddenFields(value: unknown, path: string[] = []): string[] {
  if (value == null || typeof value !== 'object') return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findForbiddenFields(item, [...path, String(index)]));
  }

  const found: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[_-]/g, '');
    if (FORBIDDEN_FIELDS.some((f) => f.toLowerCase().replace(/[_-]/g, '') === normalized)) {
      found.push([...path, key].join('.'));
    }
    found.push(...findForbiddenFields(child, [...path, key]));
  }
  return found;
}

const hours = z.number().min(0).max(168);

export const visaProfileSchema = z
  .object({
    visa: z.enum(VISA_CODES),
    visaSubtype: z.string().max(16).nullish(),
    degreeLevel: z.enum(DEGREE_LEVELS).default('NONE'),
    koreanProficiency: z.enum(KOREAN_PROFICIENCIES).nullish(),

    permittedWeeklyHours: hours.nullish(),
    currentWeeklyHours: hours.nullish(),
    hasPartTimePermit: z.boolean().nullish(),

    baseLat: z.number().min(-90).max(90).nullish(),
    baseLng: z.number().min(-180).max(180).nullish(),

    currentRegionCode: z.string().max(64).nullish(),
    currentKsicCode: z.string().max(16).nullish(),
    workplaceChangesUsed: z.number().int().min(0).max(100).nullish(),
  })
  .strict();

export type ParsedVisaProfile = z.infer<typeof visaProfileSchema>;

/**
 * 금지 필드 검사 → 스키마 검증 순서로 처리한다.
 * 순서가 중요하다. strict 스키마가 먼저 걸면 "알 수 없는 키" 라는 모호한 메시지가 나간다.
 */
export function parseVisaProfile(input: unknown): VisaProfileInput {
  const forbidden = findForbiddenFields(input);
  if (forbidden.length > 0) throw new ForbiddenIdentityFieldError(forbidden);

  const parsed = visaProfileSchema.parse(input);
  return {
    visa: parsed.visa,
    visaSubtype: parsed.visaSubtype ?? null,
    degreeLevel: parsed.degreeLevel,
    koreanProficiency: parsed.koreanProficiency ?? null,
    permittedWeeklyHours: parsed.permittedWeeklyHours ?? null,
    currentWeeklyHours: parsed.currentWeeklyHours ?? null,
    hasPartTimePermit: parsed.hasPartTimePermit ?? null,
    baseLat: parsed.baseLat ?? null,
    baseLng: parsed.baseLng ?? null,
    currentRegionCode: parsed.currentRegionCode ?? null,
    currentKsicCode: parsed.currentKsicCode ?? null,
    workplaceChangesUsed: parsed.workplaceChangesUsed ?? null,
  };
}
