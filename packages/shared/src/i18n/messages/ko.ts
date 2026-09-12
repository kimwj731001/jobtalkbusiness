import type { MessageCatalog } from '../locales.js';

/**
 * 한국어 — 기준 카탈로그.
 *
 * 다른 언어는 이 파일의 키 집합과 정확히 같아야 한다 (i18n.test.ts 가 강제).
 * 새 사유 코드를 추가할 때는 ko 를 먼저 쓰고 나머지 3개를 맞춘다.
 *
 * ⚠️ 이 문구들은 사용자가 취업 여부를 결정하는 근거가 된다.
 *    "가능하다"고 단정하는 표현을 쓰지 않는다. UNKNOWN 문구가 안전 신호로 읽히면 안 된다.
 */
export const ko: MessageCatalog = {
  // ── 판정 상태 ────────────────────────────────────────────────
  'status.ELIGIBLE': '가능해 보임',
  'status.ELIGIBLE.description': '확인된 지침 기준으로는 제한 사유가 발견되지 않았습니다.',
  'status.CONDITIONAL': '조건 충족 시 가능',
  'status.CONDITIONAL.description': '아래 조치를 완료하면 근무할 수 있습니다.',
  'status.INELIGIBLE': '불가',
  'status.INELIGIBLE.description': '지침상 제한 사유가 있습니다.',
  'status.UNKNOWN': '확인 필요',
  'status.UNKNOWN.description':
    '판단에 필요한 근거나 정보가 부족해 가능 여부를 정하지 않았습니다. 가능하다는 뜻이 아닙니다.',

  // ── 주당 시간 ────────────────────────────────────────────────
  'reason.WEEKLY_HOUR_EXCEEDED.PASS':
    '주당 허용시간 안입니다. 현재 {currentWeeklyHours}시간 + 이 공고 {postingWeeklyHours}시간 = {totalWeeklyHours}시간 (상한 주 {effectiveCapHours}시간).',
  'reason.WEEKLY_HOUR_EXCEEDED.FAIL':
    '주당 허용시간을 초과합니다. 현재 {currentWeeklyHours}시간 + 이 공고 {postingWeeklyHours}시간 = {totalWeeklyHours}시간으로 상한 주 {effectiveCapHours}시간을 넘습니다.',

  // ── 업종 ────────────────────────────────────────────────────
  'reason.INDUSTRY_DENIED_MANUFACTURING.PASS':
    '이 공고의 업종({ksicCode})은 제조업·건설업 제한에 해당하지 않습니다.',
  'reason.INDUSTRY_DENIED_MANUFACTURING.FAIL':
    '제조업·건설업({ksicCode})은 현재 한국어 능력 기준에서 시간제취업이 제한됩니다.',
  'reason.INDUSTRY_EXCEPTION_DISCRETIONARY.PASS':
    '이 공고의 업종({ksicCode})은 제조업 예외 심사 대상이 아닙니다.',
  'reason.INDUSTRY_EXCEPTION_DISCRETIONARY.INDETERMINATE':
    '제조업({ksicCode})은 한국어 능력 기준을 충족하면 예외 심사 대상이 될 수 있으나, 허용 여부는 관할 출입국·외국인청의 심사 재량입니다. 가능하다고 단정할 수 없습니다.',
  'reason.INDUSTRY_DENIED_CONSTRUCTION.PASS': '이 공고의 업종({ksicCode})은 건설업이 아닙니다.',
  'reason.INDUSTRY_DENIED_CONSTRUCTION.FAIL':
    '건설업({ksicCode})은 한국어 능력과 무관하게 시간제취업이 제한됩니다.',
  'reason.INDUSTRY_DENIED_SEAFARER.PASS': '이 공고의 업종({ksicCode})은 선원취업에 해당하지 않습니다.',
  'reason.INDUSTRY_DENIED_SEAFARER.FAIL': '선원취업({ksicCode})은 시간제취업이 제한됩니다.',

  // ── 고용형태 ────────────────────────────────────────────────
  'reason.EMPLOYMENT_FORM_DENIED.PASS':
    '고용형태({employmentForm})는 제한 대상이 아닙니다.',
  'reason.EMPLOYMENT_FORM_DENIED.FAIL':
    '파견·도급·특수형태근로(배달·택배·대리운전 등)는 시간제취업이 제한됩니다. 이 공고의 고용형태: {employmentForm}.',

  // ── 통학 ────────────────────────────────────────────────────
  'reason.COMMUTE_EXCEEDED.PASS':
    '통학 소요시간 {commuteMinutes}분으로 상한 {limitMinutes}분 이내입니다.',
  'reason.COMMUTE_EXCEEDED.FAIL':
    '통학 소요시간이 {commuteMinutes}분으로 상한 {limitMinutes}분을 초과합니다.',

  // ── 사전 허가 ───────────────────────────────────────────────
  'reason.PERMIT_REQUIRED_PART_TIME.PASS': '시간제취업 허가를 보유하고 있습니다.',
  'reason.PERMIT_REQUIRED_PART_TIME.WARN':
    '시간제취업 허가가 필요합니다. 허가가 나기 전에 근무를 시작하면 불법취업이 됩니다. 신청 중 근무도 허용되지 않습니다.',

  // ── E-9 ─────────────────────────────────────────────────────
  'reason.REGION_LOCKED.PASS': '같은 권역({postingRegionCode}) 내 사업장입니다.',
  'reason.REGION_LOCKED.FAIL':
    '사업장 변경은 같은 권역 안에서만 가능합니다. 현재 {currentRegionCode} → 이 공고 {postingRegionCode}.',
  'reason.INDUSTRY_LOCKED.PASS': '현재와 같은 업종({postingKsicCode})입니다.',
  'reason.INDUSTRY_LOCKED.FAIL':
    '사업장 변경은 같은 업종 안에서만 가능합니다. 현재 {currentKsicCode} → 이 공고 {postingKsicCode}.',
  'reason.CHANGE_COUNT_EXCEEDED.PASS':
    '사업장 변경 {workplaceChangesUsed}회 사용 (상한 {maxChanges}회).',
  'reason.CHANGE_COUNT_EXCEEDED.FAIL':
    '사업장 변경 횟수 상한 {maxChanges}회를 모두 사용했습니다. 휴업·폐업·임금체불 등 사용자 책임 사유로 인한 변경은 횟수에 산입되지 않을 수 있으니 고용센터에 확인하세요.',

  // ── 판단 불가 ───────────────────────────────────────────────
  'reason.LOW_CONFIDENCE_RULE.INDETERMINATE':
    '이 항목의 근거 지침을 아직 원문으로 확인하지 못했습니다. 가능 여부를 판단하지 않습니다. 관할 출입국·외국인청 또는 학교 국제교류처에 확인하세요.',
  'reason.MISSING_POSTING_FIELD.INDETERMINATE':
    '공고에 판단에 필요한 정보({field})가 없습니다. 원문 공고에서 확인하세요.',
  'reason.MISSING_PROFILE_FIELD.INDETERMINATE':
    '프로필에 판단에 필요한 정보({field})가 없습니다. 프로필을 채우면 판정할 수 있습니다.',
  'reason.MALFORMED_RULE_VALUE.INDETERMINATE':
    '규칙 데이터에 오류가 있어 판단할 수 없습니다 ({field}). 운영자에게 신고해 주세요.',
  'reason.NO_PROFILE.INDETERMINATE':
    '비자 프로필이 없어 판정할 수 없습니다. 비자 종류와 학위과정을 입력하면 이 공고의 가능 여부를 확인할 수 있습니다.',
  'reason.NO_RULES_FOUND.INDETERMINATE':
    '{visa} 체류자격에 대한 판정 규칙이 아직 준비되지 않았습니다.',

  // ── 후속 조치 ───────────────────────────────────────────────
  'action.APPLY_PART_TIME_PERMIT': '시간제취업 허가 신청하기',
  'action.APPLY_PART_TIME_PERMIT.description':
    '표준근로계약서 작성 → 학교 확인서 발급 → 하이코리아 또는 출입국관서 신청 → 허가 후 근무 시작. 수수료 2만 원.',
  'action.CONSULT_IMMIGRATION_OFFICE': '관할 출입국·외국인청에 문의하기',
  'action.CONSULT_IMMIGRATION_OFFICE.description':
    '심사 재량이 걸린 사안이라 사전 문의가 필요합니다. 외국인종합안내센터 1345.',

  // ── 고지 ────────────────────────────────────────────────────
  'eligibility.disclaimer':
    '이 판정은 참고용 정보입니다. 최종 판단은 관할 출입국·외국인청의 심사에 따릅니다.',
  'eligibility.e9NoBrokerage':
    'E-9 사업장 변경은 고용센터를 통해서만 가능합니다. 이 서비스는 사전 정보 제공 도구이며 알선을 제공하지 않습니다.',
  'eligibility.ruleEffectiveDate': '근거 지침 시행일: {date}',

  // ── 근거 신뢰도 ─────────────────────────────────────────────
  'confidence.high': '지침 원문 확인 + 전문가 검수 완료',
  'confidence.medium': '지침 원문 확인, 검수 미완',
  'confidence.low': '원문 미확인 — 판단 보류',
};
