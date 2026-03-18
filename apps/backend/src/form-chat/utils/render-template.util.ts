/**
 * Replaces all {{key}} placeholders in template with the corresponding value from vars.
 * Unknown keys are left unchanged (no throw).
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
  });
}
