import { TextField } from '@formrig/shared';
import type { FormTypePlugin, FormDefinition, FormEventContext } from '@formrig/sdk';

class DemoForm implements FormTypePlugin {
  readonly definition: FormDefinition = {
    id: 'demo-form',
    title: 'Demo Form',
    fields: [
      new TextField('Your name'),
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
