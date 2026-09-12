import type { MessageCatalog } from '../locales.js';

/**
 * English. Keys must match ko.ts exactly.
 *
 * ⚠️ These strings are what a person relies on when deciding whether to take a job.
 *    Never phrase UNKNOWN as if it were a green light.
 */
export const en: MessageCatalog = {
  // ── Status ──────────────────────────────────────────────────
  'status.ELIGIBLE': 'Appears permitted',
  'status.ELIGIBLE.description':
    'No restriction was found under the guidelines we have verified.',
  'status.CONDITIONAL': 'Permitted once conditions are met',
  'status.CONDITIONAL.description': 'You may work here after completing the steps below.',
  'status.INELIGIBLE': 'Not permitted',
  'status.INELIGIBLE.description': 'The guidelines restrict this work.',
  'status.UNKNOWN': 'Needs checking',
  'status.UNKNOWN.description':
    'We did not decide, because the basis or the information was incomplete. This does not mean it is allowed.',

  // ── Weekly hours ────────────────────────────────────────────
  'reason.WEEKLY_HOUR_EXCEEDED.PASS':
    'Within your weekly hour limit. Current {currentWeeklyHours}h + this job {postingWeeklyHours}h = {totalWeeklyHours}h (limit {effectiveCapHours}h/week).',
  'reason.WEEKLY_HOUR_EXCEEDED.FAIL':
    'Exceeds your weekly hour limit. Current {currentWeeklyHours}h + this job {postingWeeklyHours}h = {totalWeeklyHours}h, over the limit of {effectiveCapHours}h/week.',

  // ── Industry ────────────────────────────────────────────────
  'reason.INDUSTRY_DENIED_MANUFACTURING.PASS':
    'This industry ({ksicCode}) is not subject to the manufacturing or construction restriction.',
  'reason.INDUSTRY_DENIED_MANUFACTURING.FAIL':
    'Manufacturing and construction ({ksicCode}) are restricted for part-time work at your current Korean proficiency level.',
  'reason.INDUSTRY_EXCEPTION_DISCRETIONARY.PASS':
    'This industry ({ksicCode}) is not subject to the manufacturing exception review.',
  'reason.INDUSTRY_EXCEPTION_DISCRETIONARY.INDETERMINATE':
    'Manufacturing ({ksicCode}) may be considered for an exception if you meet the Korean proficiency requirement, but approval is at the discretion of your local immigration office. We cannot state that it is permitted.',
  'reason.INDUSTRY_DENIED_CONSTRUCTION.PASS': 'This industry ({ksicCode}) is not construction.',
  'reason.INDUSTRY_DENIED_CONSTRUCTION.FAIL':
    'Construction ({ksicCode}) is restricted for part-time work regardless of Korean proficiency.',
  'reason.INDUSTRY_DENIED_SEAFARER.PASS':
    'This industry ({ksicCode}) is not maritime employment.',
  'reason.INDUSTRY_DENIED_SEAFARER.FAIL':
    'Maritime employment ({ksicCode}) is restricted for part-time work.',

  // ── Employment form ─────────────────────────────────────────
  'reason.EMPLOYMENT_FORM_DENIED.PASS':
    'This employment form ({employmentForm}) is not restricted.',
  'reason.EMPLOYMENT_FORM_DENIED.FAIL':
    'Dispatch, subcontracted and platform work (delivery, courier, proxy driving and similar) are restricted for part-time work. This job: {employmentForm}.',

  // ── Commute ─────────────────────────────────────────────────
  'reason.COMMUTE_EXCEEDED.PASS':
    'Commute of {commuteMinutes} minutes is within the {limitMinutes}-minute limit.',
  'reason.COMMUTE_EXCEEDED.FAIL':
    'Commute of {commuteMinutes} minutes exceeds the {limitMinutes}-minute limit.',

  // ── Permit ──────────────────────────────────────────────────
  'reason.PERMIT_REQUIRED_PART_TIME.PASS': 'You hold a part-time work permit.',
  'reason.PERMIT_REQUIRED_PART_TIME.WARN':
    'A part-time work permit is required. Starting work before the permit is granted is illegal employment. Working while the application is pending is also not allowed.',

  // ── E-9 ─────────────────────────────────────────────────────
  'reason.REGION_LOCKED.PASS': 'This workplace is in your current region ({postingRegionCode}).',
  'reason.REGION_LOCKED.FAIL':
    'Workplace changes are only allowed within the same region. Currently {currentRegionCode}, this job {postingRegionCode}.',
  'reason.INDUSTRY_LOCKED.PASS': 'Same industry as your current workplace ({postingKsicCode}).',
  'reason.INDUSTRY_LOCKED.FAIL':
    'Workplace changes are only allowed within the same industry. Currently {currentKsicCode}, this job {postingKsicCode}.',
  'reason.CHANGE_COUNT_EXCEEDED.PASS':
    'You have used {workplaceChangesUsed} workplace changes (limit {maxChanges}).',
  'reason.CHANGE_COUNT_EXCEEDED.FAIL':
    'You have used all {maxChanges} permitted workplace changes. Changes caused by the employer — suspension of business, closure, unpaid wages — may not count toward this limit. Check with your Employment Center.',

  // ── Cannot decide ───────────────────────────────────────────
  'reason.LOW_CONFIDENCE_RULE.INDETERMINATE':
    'We have not yet verified this point against the original guideline text, so we are not deciding. Please check with your local immigration office or your school international office.',
  'reason.MISSING_POSTING_FIELD.INDETERMINATE':
    'The job posting does not state something we need ({field}). Please check the original posting.',
  'reason.MISSING_PROFILE_FIELD.INDETERMINATE':
    'Your profile is missing something we need ({field}). Complete your profile to get a decision.',
  'reason.MALFORMED_RULE_VALUE.INDETERMINATE':
    'We cannot decide because of an error in our rule data ({field}). Please report this to us.',
  'reason.NO_PROFILE.INDETERMINATE':
    'We cannot decide without a visa profile. Enter your visa type and course of study to see whether this job is open to you.',
  'reason.NO_RULES_FOUND.INDETERMINATE':
    'We do not yet have rules for the {visa} status.',

  // ── Actions ─────────────────────────────────────────────────
  'action.APPLY_PART_TIME_PERMIT': 'Apply for a part-time work permit',
  'action.APPLY_PART_TIME_PERMIT.description':
    'Sign the standard employment contract, get your school confirmation letter, apply via HiKorea or an immigration office, then start work once approved. Fee: KRW 20,000.',
  'action.CONSULT_IMMIGRATION_OFFICE': 'Contact your local immigration office',
  'action.CONSULT_IMMIGRATION_OFFICE.description':
    'This case is subject to case-by-case review, so ask before you start. Immigration Contact Center: 1345.',

  // ── Notices ─────────────────────────────────────────────────
  'eligibility.disclaimer':
    'This assessment is for reference only. The final decision rests with your local immigration office.',
  'eligibility.e9NoBrokerage':
    'E-9 workplace changes can only be made through an Employment Center. This service provides information in advance and does not act as a job placement agency.',
  'eligibility.ruleEffectiveDate': 'Guideline effective from {date}',

  // ── Confidence ──────────────────────────────────────────────
  'confidence.high': 'Verified against the guideline text and expert-reviewed',
  'confidence.medium': 'Verified against the guideline text, review pending',
  'confidence.low': 'Not yet verified — decision withheld',
};
