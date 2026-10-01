import { describe, expect, it } from 'vitest';
import { evaluateEligibility, type PostingFacts, type VisaProfile } from '@jobtalk/eligibility';
import { LOCALES, MESSAGES, VISA_RULES_SEED, formatMessage } from '@jobtalk/shared';
import { sortRank, toBadge, toSignals } from '@/lib/signals';

const CONTEXT = {
  evaluatedOn: '2026-10-01',
  region: 'CAPITAL_AREA',
  term: 'SEMESTER',
  engineVersion: 'test',
};

const STUDENT: VisaProfile = {
  visa: 'D2',
  degreeLevel: 'BACHELOR_3_4',
  koreanProficiency: 'TOPIK4',
  permittedWeeklyHours: 30,
  currentWeeklyHours: 10,
  hasPartTimePermit: true,
};

function posting(overrides: Partial<PostingFacts>): PostingFacts {
  return {
    ksicCode: 'I56',
    jobCategoryCode: null,
    employmentForm: 'DIRECT',
    weeklyHoursMin: null,
    weeklyHoursMax: 12,
    commuteMinutes: null,
    regionCode: null,
    missingFields: [],
    ...overrides,
  };
}

function signalsFor(p: Partial<PostingFacts>, profile: VisaProfile | null = STUDENT) {
  const result = evaluateEligibility(posting(p), profile, VISA_RULES_SEED, CONTEXT);
  return { result, signals: toSignals(result), codes: toSignals(result).map((s) => s.code) };
}

describe('배지', () => {
  it('UNKNOWN 은 "확인 필요"로 좁힌다', () => {
    expect(toBadge('UNKNOWN')).toBe('NEEDS_CHECK');
  });

  it('INELIGIBLE 은 그대로 불가다', () => {
    expect(toBadge('INELIGIBLE')).toBe('INELIGIBLE');
  });

  it('배지가 ELIGIBLE 을 만들어내지 않는다', () => {
    // 엔진이 ELIGIBLE 을 내지 않는 한 배지도 낼 수 없다
    const { result } = signalsFor({});
    expect(result.status).not.toBe('ELIGIBLE');
    expect(toBadge(result.status)).not.toBe('ELIGIBLE');
  });
});

describe('칩 — 확정 제한', () => {
  it('파견 공고에 파견 금지 칩이 붙는다', () => {
    const { codes, signals } = signalsFor({ employmentForm: 'DISPATCH' });
    expect(codes).toContain('signal.FORM_DENIED');
    expect(signals.find((s) => s.code === 'signal.FORM_DENIED')?.tone).toBe('blocking');
  });

  it('확정 제한 칩이 맨 앞에 온다', () => {
    const { signals } = signalsFor({ employmentForm: 'PLATFORM' });
    expect(signals[0]?.tone).toBe('blocking');
  });
});

describe('칩 — 가능성', () => {
  it('미검증 규칙이 시간 초과를 가리키면 "초과 가능" 칩이 붙는다', () => {
    // 현재 10시간 + 공고 24시간 = 34시간, 상한 30
    const { codes } = signalsFor({ weeklyHoursMax: 24 });
    expect(codes).toContain('signal.HOURS_MAY_EXCEED');
  });

  it('제조업 예외 심사는 재량 칩이 붙는다', () => {
    const { codes } = signalsFor({ ksicCode: 'C29', weeklyHoursMax: 10 });
    expect(codes).toContain('signal.DISCRETIONARY_REVIEW');
  });

  it('건설업은 미검증이라도 업종 제한 가능 칩이 붙는다', () => {
    const { codes } = signalsFor({ ksicCode: 'F41', weeklyHoursMax: 10 });
    expect(codes).toContain('signal.INDUSTRY_MAY_RESTRICT');
  });
});

describe('칩 — 통과를 뜻하는 칩은 만들지 않는다', () => {
  it('미검증 규칙이 통과라고 해도 칩이 생기지 않는다', () => {
    // 카페, 주 12시간 — 걸리는 게 없지만 근거가 미검증이라 UNKNOWN 이다
    const { result, codes } = signalsFor({ weeklyHoursMax: 12 });
    expect(result.status).toBe('UNKNOWN');
    // "제한 없음", "가능" 류의 칩이 있으면 안 된다
    expect(codes.filter((c) => c !== 'signal.UNVERIFIED_RULES')).toEqual([]);
    expect(codes).toContain('signal.UNVERIFIED_RULES');
  });

  it('미검증 규칙 건수를 센다', () => {
    const { signals } = signalsFor({ weeklyHoursMax: 12 });
    const chip = signals.find((s) => s.code === 'signal.UNVERIFIED_RULES');
    expect(Number(chip?.params.count)).toBeGreaterThan(0);
  });
});

describe('칩 — 정보 부족', () => {
  it('공고에 근무시간이 없으면 그 사실을 알린다', () => {
    const { codes } = signalsFor({ weeklyHoursMax: null });
    expect(codes).toContain('signal.MISSING_HOURS');
  });

  it('기준 위치가 없으면 통학 칩이 붙지 않는다', () => {
    // 통학 규칙 자체가 적용되지 않는다 — 전 카드에 같은 칩이 붙는 노이즈를 막는다
    const { codes } = signalsFor({});
    expect(codes).not.toContain('signal.MISSING_COMMUTE');
  });

  it('기준 위치가 있는데 소요시간을 모르면 통학 칩이 붙는다', () => {
    const { codes } = signalsFor({}, { ...STUDENT, baseLat: 37.5967, baseLng: 127.0585 });
    expect(codes).toContain('signal.MISSING_COMMUTE');
  });

  it('프로필이 없으면 조건 입력 칩이 붙는다', () => {
    const { codes } = signalsFor({}, null);
    expect(codes).toContain('signal.NO_PROFILE');
  });
});

describe('정렬', () => {
  it('불가가 맨 아래로 간다', () => {
    const clean = signalsFor({ weeklyHoursMax: 12 }).result;
    const warned = signalsFor({ weeklyHoursMax: 24 }).result;
    const blocked = signalsFor({ employmentForm: 'DISPATCH' }).result;

    expect(sortRank(clean)).toBeLessThan(sortRank(warned));
    expect(sortRank(warned)).toBeLessThan(sortRank(blocked));
  });

  it('같은 UNKNOWN 이라도 제한 가능성이 있으면 뒤로 간다', () => {
    // 배지가 둘뿐이므로 순서가 추천의 유일한 수단이다
    expect(sortRank(signalsFor({ weeklyHoursMax: 12 }).result)).toBeLessThan(
      sortRank(signalsFor({ ksicCode: 'F41', weeklyHoursMax: 10 }).result),
    );
  });
});

describe('i18n', () => {
  it('엔진이 낼 수 있는 모든 칩 문구가 4개 언어에 있다', () => {
    const cases: Partial<PostingFacts>[] = [
      {},
      { weeklyHoursMax: 24 },
      { weeklyHoursMax: null },
      { employmentForm: 'DISPATCH' },
      { employmentForm: 'UNKNOWN' },
      { employmentForm: 'PLATFORM' },
      { ksicCode: 'C29', weeklyHoursMax: 10 },
      { ksicCode: 'F41', weeklyHoursMax: 10 },
      { ksicCode: null },
    ];
    const emitted = new Set<string>();
    for (const c of cases) {
      for (const profile of [STUDENT, null, { ...STUDENT, baseLat: 37.5, baseLng: 127 }]) {
        signalsFor(c, profile).codes.forEach((code) => emitted.add(code));
      }
    }
    expect(emitted.size).toBeGreaterThan(5);

    for (const locale of LOCALES) {
      const missing = [...emitted].filter((code) => MESSAGES[locale][code] == null);
      expect(missing, `${locale} 번역 누락`).toEqual([]);
    }
  });

  it('칩 문구에 보간 값이 채워진다', () => {
    const text = formatMessage('signal.UNVERIFIED_RULES', { count: 4 }, 'ko');
    expect(text).toContain('4');
    expect(text).not.toContain('{');
  });
});
