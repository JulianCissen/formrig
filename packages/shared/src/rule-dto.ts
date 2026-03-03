import { z } from 'zod';
import { isSafePattern } from './regex-safety';
import { EqualsRule, NotEqualsRule, IsEmptyRule, IsNotEmptyRule,
         ContainsRule, MatchesPatternRule,
         MinLengthRule, MaxLengthRule, MinCountRule, MaxCountRule,
         IsTrueRule, IsFalseRule,
         EqualsFieldRule, ComesAfterFieldRule, ComesBeforeFieldRule } from './rule';
import type { Rule } from './rule';

/** Optional custom error message field present on every rule DTO variant. */
const m = { message: z.string().optional() };

export const RuleDtoSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('equals'),              expected: z.unknown(),                                                                                      ...m }),
  z.object({ type: z.literal('not-equals'),          expected: z.unknown(),                                                                                      ...m }),
  z.object({ type: z.literal('is-empty'),                                                                                                                        ...m }),
  z.object({ type: z.literal('is-not-empty'),                                                                                                                    ...m }),
  z.object({ type: z.literal('contains'),            substring: z.string(),                                                                                      ...m }),
  z.object({ type: z.literal('matches-pattern'),     pattern: z.string().refine(isSafePattern, { message: 'Pattern is potentially unsafe (ReDoS)' }),            ...m }),
  z.object({ type: z.literal('min-length'),          min: z.number().int().positive(),                                                                           ...m }),
  z.object({ type: z.literal('max-length'),          max: z.number().int().positive(),                                                                           ...m }),
  z.object({ type: z.literal('min-count'),           min: z.number().int().positive(),                                                                           ...m }),
  z.object({ type: z.literal('max-count'),           max: z.number().int().positive(),                                                                           ...m }),
  z.object({ type: z.literal('is-true'),                                                                                                                         ...m }),
  z.object({ type: z.literal('is-false'),                                                                                                                        ...m }),
  z.object({ type: z.literal('equals-field'),        fieldId: z.string(),                                                                                        ...m }),
  z.object({ type: z.literal('comes-after-field'),   fieldId: z.string(),                                                                                        ...m }),
  z.object({ type: z.literal('comes-before-field'),  fieldId: z.string(),                                                                                        ...m }),
]);
// 15 members. RequiredRule is intentionally omitted — it is never serialised.

export type RuleDto = z.infer<typeof RuleDtoSchema>;

/** Creates the correct Rule class instance from a DTO. Exhaustive switch — TypeScript will flag missing cases. */
export function ruleFromDto(dto: RuleDto): Rule {
  const rule = buildRule(dto);
  if (dto.message !== undefined) rule.message = dto.message;
  return rule;
}

function buildRule(dto: RuleDto): Rule {
  switch (dto.type) {
    case 'equals':             return new EqualsRule(dto.expected);
    case 'not-equals':         return new NotEqualsRule(dto.expected);
    case 'is-empty':           return new IsEmptyRule();
    case 'is-not-empty':       return new IsNotEmptyRule();
    case 'contains':           return new ContainsRule(dto.substring);
    case 'matches-pattern':    return new MatchesPatternRule(dto.pattern);
    case 'min-length':         return new MinLengthRule(dto.min);
    case 'max-length':         return new MaxLengthRule(dto.max);
    case 'min-count':          return new MinCountRule(dto.min);
    case 'max-count':          return new MaxCountRule(dto.max);
    case 'is-true':            return new IsTrueRule();
    case 'is-false':           return new IsFalseRule();
    case 'equals-field':       return new EqualsFieldRule(dto.fieldId);
    case 'comes-after-field':  return new ComesAfterFieldRule(dto.fieldId);
    case 'comes-before-field': return new ComesBeforeFieldRule(dto.fieldId);
  }
}
