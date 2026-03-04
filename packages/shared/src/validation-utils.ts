import type { FieldDto } from './form-definition-dto';
import { Rule, RequiredRule, MinLengthRule, MaxLengthRule, MatchesPatternRule, MinCountRule, MaxCountRule } from './rule';
import { ruleFromDto } from './rule-dto';

/**
 * Builds the ordered list of effective rules for a field.
 *
 * Evaluation order:
 *   1. Virtual RequiredRule — prepended when field.required === true AND field.type !== 'checkbox'
 *   2. Property-based shorthand rules (e.g. maxCharacters → MaxLengthRule)
 *   3. Generic field.rules[] entries converted via ruleFromDto()
 *
 * This is the single canonical implementation of the "virtual rule" concept.
 * Both the Angular frontend and the NestJS backend submit handler import only this function.
 * @param field   - The field definition to derive rules for.
 * @param _values - Reserved for future context-dependent rule selection; currently unused.
 */
export function getEffectiveRules(
  field: FieldDto,
  _values: Record<string, unknown>,
): Rule[] {
  const rules: Rule[] = [];

  // 1. Virtual required rule (skipped for checkbox — checkboxes cannot be required)
  if (field.required && field.type !== 'checkbox') {
    rules.push(new RequiredRule({ fieldType: field.type }));
  }

  // 2. Property-based shorthands
  if (field.type === 'text' || field.type === 'textarea') {
    if (field.minCharacters != null)
      rules.push(new MinLengthRule({ min: field.minCharacters }));
    if (field.maxCharacters != null)
      rules.push(new MaxLengthRule({ max: field.maxCharacters }));
    if (field.type === 'text' && field.pattern != null)
      rules.push(new MatchesPatternRule({ pattern: field.pattern }));
  }

  if (field.type === 'multi-select') {
    if (field.minSelected != null)
      rules.push(new MinCountRule({ min: field.minSelected }));
    if (field.maxSelected != null)
      rules.push(new MaxCountRule({ max: field.maxSelected }));
  }

  // 3. Generic rules[] entries
  for (const rDto of (field as { rules?: unknown[] }).rules ?? []) {
    rules.push(ruleFromDto(rDto as Parameters<typeof ruleFromDto>[0]));
  }

  return rules;
}
