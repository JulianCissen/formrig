import {
  FieldDto,
  getEffectiveRules,
} from '@formrig/shared';

type ExtractableFieldDto = Exclude<FieldDto, { type: 'file-upload' }>;

function buildBaseSchema(fieldDto: ExtractableFieldDto): Record<string, unknown> {
  switch (fieldDto.type) {
    case 'text':
      return { type: 'string' };
    case 'textarea':
      return { type: 'string' };
    case 'checkbox':
      return { type: 'boolean' };
    case 'radio':
      return { type: 'string', enum: [...fieldDto.options] };
    case 'select':
      return fieldDto.required
        ? { type: 'string', enum: [...fieldDto.options] }
        : { type: 'string', enum: [...fieldDto.options, null] };
    case 'multi-select':
      return { type: 'array', items: { type: 'string', enum: [...fieldDto.options] } };
    case 'date-picker':
      return {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'ISO 8601 date (YYYY-MM-DD).',
      };
    case 'number':
      return { type: 'integer' };
  }
}

export function buildExtractionSchema(
  fieldDto: FieldDto,
  collectedValues: Record<string, unknown>,
): Record<string, unknown> | null {
  // Step 1 — file-upload not representable as a JSON Schema value
  if (fieldDto.type === 'file-upload') return null;

  // Step 2 — Build base schema per field type
  const schema: Record<string, unknown> = buildBaseSchema(fieldDto);

  // Step 3 — Constraint enrichment via getEffectiveRules()
  const rules = getEffectiveRules(fieldDto, collectedValues);
  const hints: string[] = [];

  for (const rule of rules) {
    switch (rule.type) {
      case 'required':
        // Skip — wrapper handles this via the `required` array
        break;

      case 'min-length':
        schema.minLength = (rule as unknown as { readonly min: number }).min;
        break;

      case 'max-length':
        schema.maxLength = (rule as unknown as { readonly max: number }).max;
        break;

      case 'matches-pattern':
        schema.pattern = (rule as unknown as { readonly pattern: string }).pattern;
        break;

      case 'min-value':
        schema.minimum = (rule as unknown as { readonly min: number }).min;
        break;

      case 'max-value':
        schema.maximum = (rule as unknown as { readonly max: number }).max;
        break;

      case 'min-count':
        schema.minItems = (rule as unknown as { readonly min: number }).min;
        break;

      case 'max-count':
        schema.maxItems = (rule as unknown as { readonly max: number }).max;
        break;

      case 'is-true':
        schema.const = true;
        break;

      case 'is-false':
        schema.const = false;
        break;

      case 'equals':
        schema.const = (rule as unknown as { readonly expected: unknown }).expected;
        break;

      case 'not-equals': {
        const expected = (rule as unknown as { readonly expected: unknown }).expected;
        hints.push(`Must not equal: ${expected}`);
        break;
      }

      case 'is-empty':
        hints.push('Must be empty');
        break;

      case 'is-not-empty':
        if (
          fieldDto.type === 'text' ||
          fieldDto.type === 'textarea' ||
          fieldDto.type === 'radio' ||
          fieldDto.type === 'select' ||
          fieldDto.type === 'date-picker'
        ) {
          schema.minLength = 1;
        } else if (fieldDto.type === 'multi-select') {
          schema.minItems = 1;
        } else {
          hints.push('Must not be empty');
        }
        break;

      case 'contains': {
        const substring = (rule as unknown as { readonly substring: string }).substring;
        hints.push(`Must contain the text: '${substring}'`);
        break;
      }

      case 'equals-field': {
        const fieldId = (rule as unknown as { readonly fieldId: string }).fieldId;
        hints.push(`Must equal the value for '${fieldId}': ${collectedValues[fieldId] ?? 'not yet collected'}`);
        break;
      }

      case 'comes-after-field': {
        const fieldId = (rule as unknown as { readonly fieldId: string }).fieldId;
        hints.push(`Must be a date after ${collectedValues[fieldId] ?? 'the value of ' + fieldId}`);
        break;
      }

      case 'comes-before-field': {
        const fieldId = (rule as unknown as { readonly fieldId: string }).fieldId;
        hints.push(`Must be a date before ${collectedValues[fieldId] ?? 'the value of ' + fieldId}`);
        break;
      }

      case 'older-than': {
        const years = (rule as unknown as { readonly years: number }).years;
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - years);
        hints.push(
          `The person must be at least ${years} years old (date must be on or before ${cutoff.toISOString().slice(0, 10)})`,
        );
        break;
      }

      case 'younger-than': {
        const years = (rule as unknown as { readonly years: number }).years;
        hints.push(`The person must be younger than ${years} years old`);
        break;
      }

      case 'before-static-date': {
        const date = (rule as unknown as { readonly date: string }).date;
        hints.push(`Must be a date before ${date}`);
        break;
      }

      case 'after-static-date': {
        const date = (rule as unknown as { readonly date: string }).date;
        hints.push(`Must be a date after ${date}`);
        break;
      }
    }
  }

  if (hints.length > 0) {
    schema.description = [schema.description, ...hints].filter(Boolean).join('; ');
  }

  // Step 4 — Wrap in value object
  const wrapper: Record<string, unknown> = {
    type: 'object',
    properties: { value: schema },
  };
  if (fieldDto.required && fieldDto.type !== 'checkbox') {
    wrapper.required = ['value'];
  }
  return wrapper;
}

export function isArrayField(fieldDto: FieldDto): boolean {
  if (fieldDto.type === 'file-upload') return false;
  return (buildBaseSchema(fieldDto as ExtractableFieldDto) as { type: string }).type === 'array';
}

export function buildSingleItemExtractionSchema(
  fieldDto: FieldDto,
): Record<string, unknown> | null {
  if (fieldDto.type === 'file-upload') return null;
  if (!isArrayField(fieldDto)) return null;

  const base = buildBaseSchema(fieldDto as ExtractableFieldDto) as {
    type: 'array';
    items: Record<string, unknown>;
  };
  const itemSchema: Record<string, unknown> = { ...base.items };

  const rules = getEffectiveRules(fieldDto, {});
  for (const rule of rules) {
    if (rule.type === 'min-length') {
      itemSchema.minLength = (rule as unknown as { readonly min: number }).min;
    }
    if (rule.type === 'max-length') {
      itemSchema.maxLength = (rule as unknown as { readonly max: number }).max;
    }
  }

  return {
    type: 'object',
    properties: { value: itemSchema },
    required: ['value'],
  };
}
