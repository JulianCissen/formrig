import { z } from 'zod';
import { isSafePattern } from './regex-safety';
import { EqualsRule, NotEqualsRule, IsEmptyRule, IsNotEmptyRule,
         ContainsRule, MatchesPatternRule,
         MinLengthRule, MaxLengthRule, MinCountRule, MaxCountRule,
         IsTrueRule, IsFalseRule,
         EqualsFieldRule, ComesAfterFieldRule, ComesBeforeFieldRule,
         OlderThanRule, YoungerThanRule, BeforeStaticDateRule, AfterStaticDateRule,
         MinValueRule, MaxValueRule } from './rule';
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
  z.object({ type: z.literal('older-than'),        years: z.number().int().positive(), ...m }),
  z.object({ type: z.literal('younger-than'),       years: z.number().int().positive(), ...m }),
  z.object({ type: z.literal('before-static-date'), date: z.string(), ...m }),
  z.object({ type: z.literal('after-static-date'),  date: z.string(), ...m }),
  z.object({ type: z.literal('min-value'),          min: z.number().int(),  ...m }),
  z.object({ type: z.literal('max-value'),          max: z.number().int(),  ...m }),
]);
// 21 members. RequiredRule is intentionally omitted — it is never serialised.

export type RuleDto = z.infer<typeof RuleDtoSchema>;

/** Creates the correct Rule class instance from a DTO. Exhaustive switch — TypeScript will flag missing cases. */
export function ruleFromDto(dto: RuleDto): Rule {
  const rule = buildRule(dto);
  if (dto.message !== undefined) rule.message = dto.message;
  return rule;
}

function buildRule(dto: RuleDto): Rule {
  switch (dto.type) {
    case 'equals':             return new EqualsRule({ expected: dto.expected });
    case 'not-equals':         return new NotEqualsRule({ expected: dto.expected });
    case 'is-empty':           return new IsEmptyRule();
    case 'is-not-empty':       return new IsNotEmptyRule();
    case 'contains':           return new ContainsRule({ substring: dto.substring });
    case 'matches-pattern':    return new MatchesPatternRule({ pattern: dto.pattern });
    case 'min-length':         return new MinLengthRule({ min: dto.min });
    case 'max-length':         return new MaxLengthRule({ max: dto.max });
    case 'min-count':          return new MinCountRule({ min: dto.min });
    case 'max-count':          return new MaxCountRule({ max: dto.max });
    case 'is-true':            return new IsTrueRule();
    case 'is-false':           return new IsFalseRule();
    case 'equals-field':       return new EqualsFieldRule({ fieldId: dto.fieldId });
    case 'comes-after-field':  return new ComesAfterFieldRule({ fieldId: dto.fieldId });
    case 'comes-before-field':  return new ComesBeforeFieldRule({ fieldId: dto.fieldId });
    case 'older-than':           return new OlderThanRule({ years: dto.years });
    case 'younger-than':         return new YoungerThanRule({ years: dto.years });
    case 'before-static-date':   return new BeforeStaticDateRule({ date: dto.date });
    case 'after-static-date':    return new AfterStaticDateRule({ date: dto.date });
    case 'min-value':            return new MinValueRule({ min: dto.min });
    case 'max-value':            return new MaxValueRule({ max: dto.max });
  }
}
