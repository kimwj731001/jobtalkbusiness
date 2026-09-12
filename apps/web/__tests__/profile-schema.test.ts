import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ForbiddenIdentityFieldError,
  findForbiddenFields,
  parseVisaProfile,
} from '@/lib/profile-schema';

/**
 * L5 — 식별번호를 수집·저장하지 않는다.
 *
 * DB 에 컬럼이 없으므로 저장될 곳은 없지만, 요청이 서버에 닿는 순간
 * 그 값은 로그·APM·에러 리포트에 남는다. 경계에서 거부해야 한다.
 */

const VALID = {
  visa: 'D2',
  degreeLevel: 'BACHELOR_3_4',
  koreanProficiency: 'TOPIK4',
  permittedWeeklyHours: 30,
  currentWeeklyHours: 10,
  hasPartTimePermit: true,
};

describe('L5 — 식별번호 차단', () => {
  it('정상 프로필은 통과한다', () => {
    const parsed = parseVisaProfile(VALID);
    expect(parsed.visa).toBe('D2');
    expect(parsed.koreanProficiency).toBe('TOPIK4');
  });

  it.each([
    'alienRegistrationNumber',
    'alien_registration_number',
    'passportNumber',
    'passport_number',
    'residentRegistrationNumber',
    'rrn',
    'ssn',
    'nationalId',
  ])('%s 가 있으면 거부한다', (field) => {
    expect(() => parseVisaProfile({ ...VALID, [field]: '1234567890123' })).toThrow(
      ForbiddenIdentityFieldError,
    );
  });

  it('대소문자·구분자가 달라도 잡는다', () => {
    expect(() => parseVisaProfile({ ...VALID, PassPort_Number: 'M12345678' })).toThrow(
      ForbiddenIdentityFieldError,
    );
  });

  it('중첩된 객체 안에 숨어 있어도 잡는다', () => {
    const found = findForbiddenFields({
      visa: 'D2',
      extra: { nested: { passportNumber: 'M12345678' } },
    });
    expect(found).toEqual(['extra.nested.passportNumber']);
  });

  it('배열 안에 숨어 있어도 잡는다', () => {
    const found = findForbiddenFields({ docs: [{ rrn: '900101-1234567' }] });
    expect(found).toEqual(['docs.0.rrn']);
  });

  it('거부 시 어떤 필드가 문제인지 알려준다', () => {
    try {
      parseVisaProfile({ ...VALID, passportNumber: 'M1', rrn: '9' });
      expect.unreachable('거부되어야 한다');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenIdentityFieldError);
      expect((error as ForbiddenIdentityFieldError).fields).toEqual(
        expect.arrayContaining(['passportNumber', 'rrn']),
      );
    }
  });

  it('화이트리스트 밖의 필드는 이름과 무관하게 거부한다', () => {
    // 금지 목록에 없는 새로운 식별자 필드가 와도 strict 스키마가 막는다
    expect(() => parseVisaProfile({ ...VALID, someNewIdNumber: 'X' })).toThrow(z.ZodError);
  });
});

describe('프로필 검증', () => {
  it('비자 코드가 없으면 거부한다', () => {
    expect(() => parseVisaProfile({ degreeLevel: 'MASTER' })).toThrow(z.ZodError);
  });

  it('주당 시간이 168을 넘으면 거부한다', () => {
    expect(() => parseVisaProfile({ ...VALID, currentWeeklyHours: 200 })).toThrow(z.ZodError);
  });

  it('생략된 값은 기본값이 아니라 null 이 된다', () => {
    // L4 — 모르는 값을 0 으로 채우면 UNKNOWN 이어야 할 판정이 통과해 버린다
    const parsed = parseVisaProfile({ visa: 'D2' });
    expect(parsed.currentWeeklyHours).toBeNull();
    expect(parsed.hasPartTimePermit).toBeNull();
    expect(parsed.koreanProficiency).toBeNull();
  });
});
