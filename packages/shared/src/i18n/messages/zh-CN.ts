import type { MessageCatalog } from '../locales.js';

/**
 * 简体中文。键集必须与 ko.ts 完全一致。
 *
 * ⚠️ 这些文本是用户判断能否就业的依据。
 *    不要把 UNKNOWN 写成像是"可以"的意思。
 */
export const zhCN: MessageCatalog = {
  // ── 判定状态 ────────────────────────────────────────────────
  'status.ELIGIBLE': '看起来可以',
  'status.ELIGIBLE.description': '在已核实的指针范围内，未发现限制事由。',
  'status.CONDITIONAL': '满足条件后可以',
  'status.CONDITIONAL.description': '完成下列手续后即可工作。',
  'status.INELIGIBLE': '不可以',
  'status.INELIGIBLE.description': '指针中存在限制事由。',
  'status.UNKNOWN': '需要确认',
  'status.UNKNOWN.description':
    '因依据或信息不足，我们没有作出判断。这并不表示可以工作。',

  // ── 每周工时 ────────────────────────────────────────────────
  'reason.WEEKLY_HOUR_EXCEEDED.PASS':
    '在每周允许工时之内。当前 {currentWeeklyHours} 小时 + 本招聘 {postingWeeklyHours} 小时 = {totalWeeklyHours} 小时（上限每周 {effectiveCapHours} 小时）。',
  'reason.WEEKLY_HOUR_EXCEEDED.FAIL':
    '超过每周允许工时。当前 {currentWeeklyHours} 小时 + 本招聘 {postingWeeklyHours} 小时 = {totalWeeklyHours} 小时，超过上限每周 {effectiveCapHours} 小时。',

  // ── 行业 ────────────────────────────────────────────────────
  'reason.INDUSTRY_DENIED_MANUFACTURING.PASS':
    '本招聘的行业（{ksicCode}）不属于制造业·建筑业限制范围。',
  'reason.INDUSTRY_DENIED_MANUFACTURING.FAIL':
    '按当前韩语能力标准，制造业·建筑业（{ksicCode}）的兼职就业受到限制。',
  'reason.INDUSTRY_EXCEPTION_DISCRETIONARY.PASS':
    '本招聘的行业（{ksicCode}）不属于制造业例外审查对象。',
  'reason.INDUSTRY_EXCEPTION_DISCRETIONARY.INDETERMINATE':
    '若满足韩语能力标准，制造业（{ksicCode}）可能成为例外审查对象，但是否许可取决于管辖出入境·外国人厅的裁量。我们无法断定可以。',
  'reason.INDUSTRY_DENIED_CONSTRUCTION.PASS': '本招聘的行业（{ksicCode}）不是建筑业。',
  'reason.INDUSTRY_DENIED_CONSTRUCTION.FAIL':
    '建筑业（{ksicCode}）无论韩语能力如何，兼职就业均受限制。',
  'reason.INDUSTRY_DENIED_SEAFARER.PASS': '本招聘的行业（{ksicCode}）不属于船员就业。',
  'reason.INDUSTRY_DENIED_SEAFARER.FAIL': '船员就业（{ksicCode}）的兼职就业受到限制。',

  // ── 雇佣形态 ────────────────────────────────────────────────
  'reason.EMPLOYMENT_FORM_DENIED.PASS': '雇佣形态（{employmentForm}）不属于限制对象。',
  'reason.EMPLOYMENT_FORM_DENIED.FAIL':
    '派遣·承包·特殊形态劳动（外卖·快递·代驾等）的兼职就业受到限制。本招聘的雇佣形态：{employmentForm}。',

  // ── 通勤 ────────────────────────────────────────────────────
  'reason.COMMUTE_EXCEEDED.PASS':
    '通勤时间 {commuteMinutes} 分钟，在上限 {limitMinutes} 分钟以内。',
  'reason.COMMUTE_EXCEEDED.FAIL':
    '通勤时间为 {commuteMinutes} 分钟，超过上限 {limitMinutes} 分钟。',

  // ── 事先许可 ────────────────────────────────────────────────
  'reason.PERMIT_REQUIRED_PART_TIME.PASS': '您已持有兼职就业许可。',
  'reason.PERMIT_REQUIRED_PART_TIME.WARN':
    '需要兼职就业许可。在许可下发前开始工作属于非法就业。申请期间工作同样不被允许。',

  // ── E-9 ─────────────────────────────────────────────────────
  'reason.REGION_LOCKED.PASS': '属于同一区域（{postingRegionCode}）内的工作单位。',
  'reason.REGION_LOCKED.FAIL':
    '变更工作单位只能在同一区域内进行。当前 {currentRegionCode} → 本招聘 {postingRegionCode}。',
  'reason.INDUSTRY_LOCKED.PASS': '与当前相同的行业（{postingKsicCode}）。',
  'reason.INDUSTRY_LOCKED.FAIL':
    '变更工作单位只能在同一行业内进行。当前 {currentKsicCode} → 本招聘 {postingKsicCode}。',
  'reason.CHANGE_COUNT_EXCEEDED.PASS':
    '已使用变更工作单位 {workplaceChangesUsed} 次（上限 {maxChanges} 次）。',
  'reason.CHANGE_COUNT_EXCEEDED.FAIL':
    '已用完变更工作单位的上限 {maxChanges} 次。因停业·关闭·拖欠工资等用人单位责任事由导致的变更可能不计入次数，请向雇佣中心确认。',

  // ── 无法判断 ────────────────────────────────────────────────
  'reason.LOW_CONFIDENCE_RULE.INDETERMINATE':
    '该项依据的指针原文尚未核实，因此我们不作判断。请向管辖出入境·外国人厅或学校国际交流处确认。',
  'reason.MISSING_POSTING_FIELD.INDETERMINATE':
    '招聘信息中缺少判断所需的内容（{field}）。请查看原招聘信息。',
  'reason.MISSING_PROFILE_FIELD.INDETERMINATE':
    '个人档案中缺少判断所需的内容（{field}）。补全档案后即可判定。',
  'reason.MALFORMED_RULE_VALUE.INDETERMINATE':
    '因规则数据存在错误而无法判断（{field}）。请向运营方反馈。',
  'reason.NO_PROFILE.INDETERMINATE':
    '没有签证档案，无法判定。填写签证类型和学位课程后即可查看本招聘是否适合您。',
  'reason.NO_RULES_FOUND.INDETERMINATE': '{visa} 在留资格的判定规则尚未准备好。',

  // ── 后续手续 ────────────────────────────────────────────────
  'action.APPLY_PART_TIME_PERMIT': '申请兼职就业许可',
  'action.APPLY_PART_TIME_PERMIT.description':
    '签订标准劳动合同 → 取得学校确认书 → 通过 HiKorea 或出入境机关申请 → 获批后开始工作。手续费 2 万韩元。',
  'action.CONSULT_IMMIGRATION_OFFICE': '咨询管辖出入境·外国人厅',
  'action.CONSULT_IMMIGRATION_OFFICE.description':
    '此事项涉及审查裁量，需事先咨询。外国人综合咨询中心 1345。',

  // ── 告知 ────────────────────────────────────────────────────
  'eligibility.disclaimer':
    '本判定仅供参考。最终判断以管辖出入境·外国人厅的审查为准。',
  'eligibility.e9NoBrokerage':
    'E-9 变更工作单位只能通过雇佣中心办理。本服务是事先信息提供工具，不提供职业介绍。',
  'eligibility.ruleEffectiveDate': '依据指针施行日：{date}',

  // ── 依据可信度 ──────────────────────────────────────────────
  'confidence.high': '已核实指针原文并完成专家审核',
  'confidence.medium': '已核实指针原文，审核未完成',
  'confidence.low': '原文未核实 — 暂不判断',
};
