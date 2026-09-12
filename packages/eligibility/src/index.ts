export { evaluateEligibility, aggregateStatus, ENGINE_VERSION } from './evaluate.js';
export { ruleApplies, isEffectiveOn, selectApplicableRules } from './applies-when.js';
export { EVALUATORS } from './evaluators.js';
export type {
  PostingFacts,
  VisaProfile,
  EvaluationContext,
  EligibilityResult,
  Reason,
  RuleReason,
  EngineReason,
  Disclaimer,
  RuleOutcome,
  RuleEvaluator,
} from './types.js';
