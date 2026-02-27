import { TextField, RadioField, CheckboxField, SelectField, TextareaField, FileUploadField } from '@formrig/shared';
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
          new TextField('Your name'),
          new RadioField('Favourite colour', ['Red', 'Green', 'Blue']),
          new CheckboxField('Accept terms and conditions', false, true),
        ],
      } satisfies FormStep,
      {
        label: 'Preferences',
        description: 'Customise your experience.',
        fields: [
          new SelectField('Country', ['United Kingdom', 'United States', 'Germany', 'France', 'Japan']),
          new SelectField('Skills', ['TypeScript', 'Angular', 'NestJS', 'PostgreSQL', 'Docker'], '', true),
          new TextareaField('Comments'),
        ],
      } satisfies FormStep,
      {
        label: 'Documents',
        description: 'Upload any supporting files.',
        fields: [
          new FileUploadField('Attach supporting documents', true, '.pdf,.docx'),
          new FileUploadField('Upload your CV', false, '.pdf,.doc,.docx'),
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
    async submitted(ctx: FormEventContext): Promise<void> {
      // no-op for MVP
    },
  };
}

export default new DemoForm();
