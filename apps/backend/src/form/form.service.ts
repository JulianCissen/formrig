import { Injectable, Logger }      from '@nestjs/common';
import { PluginService }           from '../plugin/plugin.service';
import { FormEventContext }        from '@formrig/sdk';
import { BaseField }               from '@formrig/shared';
import { FormDefinitionDto, FieldDto } from './dto/form-definition.dto';

@Injectable()
export class FormService {
  private readonly logger = new Logger(FormService.name);

  constructor(private readonly pluginService: PluginService) {}

  /**
   * Loads the first available plugin, clones its fields, fires the `created`
   * event, and returns the resulting form definition as a serialisable DTO.
   *
   * Returns null if no plugin is loaded (caller should respond 503).
   *
   * Field cloning strategy: shallow prototype-preserving clone via
   * Object.assign(Object.create(Object.getPrototypeOf(f)), f).
   * This ensures the plugin's singleton `definition.fields` is never mutated
   * across requests while preserving the class prototype chain (so `instanceof`
   * checks and `readonly type` remain correct on the cloned instances).
   */
  async getActiveForm(): Promise<FormDefinitionDto | null> {
    const all = this.pluginService.getAll();
    if (all.length === 0) {
      this.logger.warn('getActiveForm called but no plugins are loaded.');
      return null;
    }

    // MVP: always use the first loaded plugin
    const { plugin } = all[0];

    // Clone each field to isolate per-request state from the plugin singleton
    const clonedFields: BaseField[] = plugin.definition.fields.map(
      (f) => Object.assign(Object.create(Object.getPrototypeOf(f)) as BaseField, f),
    );

    const ctx: FormEventContext = { fields: clonedFields };

    await plugin.events.created(ctx);

    // Serialise to plain DTO (NestJS will JSON.stringify this)
    return {
      id:     plugin.definition.id,
      title:  plugin.definition.title,
      fields: ctx.fields.map((f, index): FieldDto => ({
        id:       FormService.fieldSlug(f.label, index),
        type:     f.type,
        label:    f.label,
        required: f.required,
        disabled: f.disabled,
        // Only include `value` for field types that carry it
        ...('value' in f ? { value: String((f as { value: unknown }).value) } : {}),
      })),
    };
  }

  /** Generates a URL-safe slug from a field label, suffixed with the field index for guaranteed uniqueness. */
  private static fieldSlug(label: string, index: number): string {
    const base = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return base + '-' + index;
  }
}
