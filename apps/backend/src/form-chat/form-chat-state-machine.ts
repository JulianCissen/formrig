import { FieldDto, BaseField, evaluateRuntimeConditionTree } from '@formrig/shared';

export type SlotResult =
  | { kind: 'field'; field: FieldDto }
  | { kind: 'completed' };

export class FormChatStateMachine {
  getNextSlot(
    allFields: FieldDto[],
    formValues: Record<string, unknown>,
    context: { skippedFieldIds: string[]; unconfirmedFieldIds: string[] },
  ): SlotResult {
    // PASS 1: Normal traverse — skip hidden, answered, or skipped fields
    for (const field of allFields) {
      if (!this.isVisible(field, formValues)) continue;
      if (this.isAnswered(field, formValues, context.unconfirmedFieldIds)) continue;
      if (context.skippedFieldIds.includes(field.id)) continue;
      return { kind: 'field', field };
    }

    // PASS 2: Cycling traverse — required fields only, ignore skip list
    for (const field of allFields) {
      if (!this.isVisible(field, formValues)) continue;
      if (this.isAnswered(field, formValues, context.unconfirmedFieldIds)) continue;
      if (field.required) {
        return { kind: 'field', field };
      }
    }

    return { kind: 'completed' };
  }

  isAnswered(field: FieldDto, formValues: Record<string, unknown>, unconfirmedFieldIds: string[]): boolean {
    if (unconfirmedFieldIds.includes(field.id)) return false;
    const value = formValues[field.id];
    if (field.type === 'checkbox') return value === true || value === false;
    if (Array.isArray(value)) return value.length > 0;
    return value != null && value !== '';
  }

  private isVisible(field: FieldDto, formValues: Record<string, unknown>): boolean {
    const visibleWhen = (field as unknown as BaseField).visibleWhen;
    if (visibleWhen === undefined) return true;
    return evaluateRuntimeConditionTree(visibleWhen, formValues);
  }
}
