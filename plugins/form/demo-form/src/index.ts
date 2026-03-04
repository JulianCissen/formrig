import { TextField, RadioField, CheckboxField, SelectField, MultiSelectField, TextareaField, FileUploadField, DatePickerField, OlderThanRule, AfterStaticDateRule } from '@formrig/shared';
import type { FormStep } from '@formrig/shared';
import type { FormTypePlugin, FormDefinition, FormEventContext } from '@formrig/sdk';

class DemoForm implements FormTypePlugin {
  readonly definition: FormDefinition = {
    id: 'demo-form',
    title: 'Demo Form',
    steps: [
      {
        label: 'About You',
        description: 'Tell us a bit about yourself.',
        fields: [
          new TextField({ label: 'Your name' }),
          new RadioField({ label: 'Favourite colour', options: ['Red', 'Green', 'Blue'] }),
          new CheckboxField({ label: 'Accept terms and conditions', value: false, required: true }),
        ],
      } satisfies FormStep,
      {
        label: 'Preferences',
        description: 'Customise your experience.',
        fields: [
          new SelectField({ label: 'Country', options: ['United Kingdom', 'United States', 'Germany', 'France', 'Japan'] }),
          new MultiSelectField({ label: 'Skills', options: ['TypeScript', 'Angular', 'NestJS', 'PostgreSQL', 'Docker'] }),
          new TextareaField({ label: 'Comments' }),
        ],
      } satisfies FormStep,
      {
        label: 'Documents',
        description: 'Upload any supporting files.',
        fields: [
          new FileUploadField({ label: 'Attach supporting documents', multiple: true, accept: '.pdf,.docx' }),
          new FileUploadField({ label: 'Upload your CV', multiple: false, accept: '.pdf,.doc,.docx' }),
        ],
      } satisfies FormStep,
      {
        label: 'Personal Details',
        description: 'A few date-related questions.',
        fields: [
          new DatePickerField({ label: 'Date of birth', rules: [new OlderThanRule({ years: 18 })] }),
          new DatePickerField({ label: 'Project start date', rules: [new AfterStaticDateRule({ date: '2024-01-01' })] }),
          new DatePickerField({ label: 'Planned event date', minDate: '2025-01-01', maxDate: '2030-12-31' }),
        ],
      } satisfies FormStep,
    ],
  };

  events = {
    async created(ctx: FormEventContext): Promise<void> {
      // Prefill the first field via the context (mutates the per-request clone, not the singleton)
      const first = ctx.fields[0];
      if (first && 'value' in first) {
        (first as TextField).value = 'Hello, formrig!';
      }
    },
    async submitted(_ctx: FormEventContext): Promise<void> {
      // no-op for MVP
    },
  };
}

export default new DemoForm();
