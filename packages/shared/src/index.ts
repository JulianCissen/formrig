export { isSafePattern } from './regex-safety';
export { BaseField, TextField, RadioField, CheckboxField, SelectField, TextareaField, FileUploadField, MultiSelectField } from './fields';
export type { FormStep } from './fields';
export { FieldDtoSchema, StepDtoSchema, FormDefinitionDtoSchema } from './form-definition-dto';
export type { FieldDto, StepDto, FormDefinitionDto } from './form-definition-dto';

// Rule class hierarchy
export {
  Rule, EqualsRule, NotEqualsRule, IsEmptyRule, IsNotEmptyRule,
  ContainsRule, MatchesPatternRule, MinLengthRule, MaxLengthRule,
  MinCountRule, MaxCountRule, IsTrueRule, IsFalseRule,
  EqualsFieldRule, ComesAfterFieldRule, ComesBeforeFieldRule,
} from './rule';
// RequiredRule is intentionally NOT exported from index

// Rule DTO
export { RuleDtoSchema, ruleFromDto } from './rule-dto';
export type { RuleDto } from './rule-dto';

// Condition tree
export {
  MAX_CONDITION_TREE_DEPTH,
  ConditionLeafDtoSchema, ConditionTreeDtoSchema, evaluateConditionTree,
} from './condition-tree';
export type {
  ConditionOperator, ConditionLeaf, ConditionGroup, ConditionTree,
  ConditionLeafDto, ConditionGroupDto, ConditionTreeDto,
} from './condition-tree';

// Validation utilities
export { getEffectiveRules } from './validation-utils';
