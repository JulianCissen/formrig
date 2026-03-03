import { BadRequestException } from '@nestjs/common';
import { FieldDto } from '@formrig/shared';

/**
 * Hard validation — type-and-constraint checks enforced unconditionally on every PATCH.
 * Throws `BadRequestException` on any violation.
 */
export function hardValidate(field: FieldDto, value: unknown): void {
  switch (field.type) {
    case 'text': {
      if (typeof value !== 'string') {
        throw new BadRequestException(`Field "${field.id}" must be a string`);
      }
      if (value.length > 10_000) {
        throw new BadRequestException(`Field "${field.id}" exceeds the 10,000 character limit`);
      }
      break;
    }

    case 'textarea': {
      if (typeof value !== 'string') {
        throw new BadRequestException(`Field "${field.id}" must be a string`);
      }
      if (value.length > 100_000) {
        throw new BadRequestException(`Field "${field.id}" exceeds the 100,000 character limit`);
      }
      break;
    }

    case 'checkbox': {
      if (typeof value !== 'boolean') {
        throw new BadRequestException(`Field "${field.id}" must be a boolean`);
      }
      break;
    }

    case 'radio':
    case 'select': {
      const options: string[] = field.options ?? [];
      if (options.length > 500) {
        throw new BadRequestException(
          `Field "${field.id}" has too many options (${options.length}); maximum is 500`,
        );
      }
      for (const opt of options) {
        if (opt.length > 500) throw new BadRequestException(`Field "${field.id}" has an option that exceeds 500 characters`);
      }
      if (value !== null && typeof value !== 'string') {
        throw new BadRequestException(`Field "${field.id}" must be a string or null`);
      }
      if (typeof value === 'string' && !options.includes(value)) {
        throw new BadRequestException(`Field "${field.id}" value is not a valid option`);
      }
      break;
    }

    case 'multi-select': {
      const options: string[] = field.options ?? [];
      if (options.length > 500) {
        throw new BadRequestException(
          `Field "${field.id}" has too many options (${options.length}); maximum is 500`,
        );
      }
      for (const opt of options) {
        if (opt.length > 500) throw new BadRequestException(`Field "${field.id}" has an option that exceeds 500 characters`);
      }
      if (!Array.isArray(value)) {
        throw new BadRequestException(`Field "${field.id}" must be an array`);
      }
      if (value.length > options.length) {
        throw new BadRequestException(`Field "${field.id}" has more selected values than available options`);
      }
      if (new Set(value as string[]).size !== (value as string[]).length) {
        throw new BadRequestException(`Field "${field.id}" must not contain duplicate selections`);
      }
      for (const item of value) {
        if (typeof item !== 'string') {
          throw new BadRequestException(`Field "${field.id}" must be an array of strings`);
        }
        if (!options.includes(item as string)) {
          throw new BadRequestException(
            `Field "${field.id}" contains an invalid option: "${item}"`,
          );
        }
      }
      break;
    }

    case 'file-upload': {
      throw new BadRequestException(`Field "${field.id}" is a file-upload field and cannot be set via PATCH`);
    }

    default: {
      throw new BadRequestException(`Unknown field type: "${(field as { type: string }).type}"`);
    }
  }
}
