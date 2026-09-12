import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';
import { VISA_RULES_SEED, type VisaRule } from '@jobtalk/shared';
import type { EvaluationContext, PostingFacts, VisaProfile } from '../src/types.js';

const here = dirname(fileURLToPath(import.meta.url));

export interface Expectation {
  status: string;
  reasonCodes?: string[];
  remainingHours?: number;
  requiredActions?: string[];
}

export interface GoldenCase {
  id: string;
  description: string;
  profile: VisaProfile | null;
  posting: PostingFacts;
  /** 현재 시드(= low 다수) 기준 기대값 */
  expect_with_low_confidence?: Expectation;
  /** 지침 원문 대조로 confidence 를 올린 뒤의 기대값 */
  expect_when_verified?: Expectation;
  note?: string;
}

interface GoldenFile {
  meta: { engineVersion: string; rulesetDate: string; evaluatedAt: string };
  cases: RawCase[];
}

type RawCase = Omit<GoldenCase, 'posting' | 'profile'> & {
  profile: Partial<VisaProfile> | null;
  posting: Partial<PostingFacts>;
};

/** YAML 에서 생략된 필드를 명시적 null 로 채운다. 기본값으로 메우지 않는다 (L4) */
function normalizePosting(raw: Partial<PostingFacts>): PostingFacts {
  return {
    ksicCode: raw.ksicCode ?? null,
    jobCategoryCode: raw.jobCategoryCode ?? null,
    employmentForm: raw.employmentForm ?? 'UNKNOWN',
    weeklyHoursMin: raw.weeklyHoursMin ?? null,
    weeklyHoursMax: raw.weeklyHoursMax ?? null,
    commuteMinutes: raw.commuteMinutes ?? null,
    regionCode: raw.regionCode ?? null,
    missingFields: raw.missingFields ?? [],
  };
}

function normalizeProfile(raw: Partial<VisaProfile> | null): VisaProfile | null {
  if (raw == null) return null;
  if (raw.visa == null) throw new Error('golden case profile is missing "visa"');
  return {
    visa: raw.visa,
    visaSubtype: raw.visaSubtype ?? null,
    degreeLevel: raw.degreeLevel ?? 'NONE',
    koreanProficiency: raw.koreanProficiency ?? null,
    permittedWeeklyHours: raw.permittedWeeklyHours ?? null,
    currentWeeklyHours: raw.currentWeeklyHours ?? null,
    hasPartTimePermit: raw.hasPartTimePermit ?? null,
    baseLat: raw.baseLat ?? null,
    baseLng: raw.baseLng ?? null,
    currentRegionCode: raw.currentRegionCode ?? null,
    currentKsicCode: raw.currentKsicCode ?? null,
    workplaceChangesUsed: raw.workplaceChangesUsed ?? null,
  };
}

const file = parse(
  readFileSync(join(here, 'golden', 'golden-tests.yaml'), 'utf8'),
) as GoldenFile;

export const GOLDEN_META = file.meta;

export const GOLDEN_CASES: GoldenCase[] = file.cases.map((raw) => ({
  ...raw,
  profile: normalizeProfile(raw.profile),
  posting: normalizePosting(raw.posting),
}));

/** 현재 시드 그대로 — confidence='low' 가 다수 */
export const SEED_RULES: VisaRule[] = VISA_RULES_SEED;

/**
 * "지침 원문 대조 완료" 가정 하의 규칙셋.
 *
 * confidence 만 올린다. violationStatus 는 건드리지 않으므로
 * 제조업 예외처럼 본질적으로 재량인 규칙은 검증 후에도 여전히 INDETERMINATE 다.
 */
export const VERIFIED_RULES: VisaRule[] = VISA_RULES_SEED.map((rule) => ({
  ...rule,
  confidence: 'high' as const,
}));

export const CONTEXT: EvaluationContext = {
  evaluatedOn: file.meta.evaluatedAt,
  region: 'CAPITAL_AREA',
  term: 'SEMESTER',
  engineVersion: file.meta.engineVersion,
};
