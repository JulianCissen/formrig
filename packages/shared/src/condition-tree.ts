import { z, ZodType } from 'zod';
import { RuleDtoSchema, type RuleDto, ruleFromDto } from './rule-dto';

export const MAX_CONDITION_TREE_DEPTH = 15;
import type { Rule } from './rule';

// ── Operator ─────────────────────────────────────────────────────────────────
export type ConditionOperator = 'AND' | 'OR' | 'XOR';

// ── Runtime types (used in plugin code / fields.ts) ──────────────────────────
export interface ConditionLeaf {
  fieldId: string;
  rule: Rule;   // class instance — never serialised
}

export interface ConditionGroup {
  operator: ConditionOperator;
  children: ConditionTree[];  // ≥ 2 elements at runtime
}

export type ConditionTree = ConditionGroup | ConditionLeaf;

// ── Serialised DTO types ─────────────────────────────────────────────────────
export interface ConditionLeafDto {
  fieldId: string;
  rule: RuleDto;
}

export interface ConditionGroupDto {
  operator: ConditionOperator;
  children: ConditionTreeDto[];
}

export type ConditionTreeDto = ConditionGroupDto | ConditionLeafDto;

// ── Zod schemas ──────────────────────────────────────────────────────────────
export const ConditionLeafDtoSchema = z.object({
  fieldId: z.string(),
  rule: RuleDtoSchema,
});

// z.lazy() is required for recursive children array.
// Explicit ZodType<ConditionTreeDto> annotation prevents TypeScript circular inference errors.
export const ConditionTreeDtoSchema: ZodType<ConditionTreeDto> = z.lazy(() =>
  z.union([
    ConditionLeafDtoSchema,
    z.object({
      operator: z.enum(['AND', 'OR', 'XOR']),
      children: z.array(ConditionTreeDtoSchema).min(2),
    }),
  ])
) as ZodType<ConditionTreeDto>;

// ── evaluateConditionTree ─────────────────────────────────────────────────────
/**
 * Evaluates a serialised ConditionTree (ConditionTreeDto) against a map of current field values.
 *
 * Discriminant: a node is a leaf when it has a 'rule' property; a group when it has
 * 'operator' and 'children'. No explicit type tag is needed.
 *
 * @param tree   The condition tree to evaluate (ConditionTreeDto).
 * @param values A map of fieldId → current value for all fields in the form.
 * @returns      true if the condition is satisfied, false otherwise.
 */
export function evaluateConditionTree(
  tree: ConditionTreeDto,
  values: Record<string, unknown>,
  _depth = 0,
): boolean {
  if (_depth > MAX_CONDITION_TREE_DEPTH) {
    throw new Error('ConditionTree exceeds maximum nesting depth');
  }
  if ('rule' in tree) {
    // Leaf node
    const rule = ruleFromDto(tree.rule);
    const value = values[tree.fieldId] ?? null;
    return rule.matches(value, values);
  }
  // Group node
  const results = tree.children.map(child => evaluateConditionTree(child, values, _depth + 1));
  switch (tree.operator) {
    case 'AND': return results.every(Boolean);
    case 'OR':  return results.some(Boolean);
    case 'XOR': return results.filter(Boolean).length === 1;
  }
}

// ── evaluateRuntimeConditionTree ─────────────────────────────────────────────
/**
 * Evaluates a runtime ConditionTree (with Rule class instances on leaves) against
 * a map of current field values.
 *
 * Use this variant when the tree comes from plugin code / BaseField instances.
 * For serialised ConditionTreeDto values, use evaluateConditionTree instead.
 *
 * @param tree   The runtime condition tree to evaluate.
 * @param values A map of fieldId → current value for all fields in the form.
 * @returns      true if the condition is satisfied, false otherwise.
 */
export function evaluateRuntimeConditionTree(
  tree: ConditionTree,
  values: Record<string, unknown>,
  _depth = 0,
): boolean {
  if (_depth > MAX_CONDITION_TREE_DEPTH) {
    throw new Error('ConditionTree exceeds maximum nesting depth');
  }
  if ('rule' in tree) {
    // Leaf node — rule is already a Rule instance, call matches() directly
    const value = values[tree.fieldId] ?? null;
    return tree.rule.matches(value, values);
  }
  // Group node
  const results = tree.children.map(child => evaluateRuntimeConditionTree(child, values, _depth + 1));
  switch (tree.operator) {
    case 'AND': return results.every(Boolean);
    case 'OR':  return results.some(Boolean);
    case 'XOR': return results.filter(Boolean).length === 1;
  }
}
