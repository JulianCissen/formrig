import {
  TextField, RadioField, CheckboxField, MultiSelectField, TextareaField, SelectField, NumberField,
  EqualsRule, IsTrueRule, MatchesPatternRule,
} from '@formrig/shared';
import type { FormStep } from '@formrig/shared';
import type { FormTypePlugin, FormDefinition, FormEventContext } from '@formrig/sdk';

/** Mirrors FormService.fieldSlug so visibleWhen.fieldId values stay in sync with backend-assigned IDs. */
function fieldSlug(label: string, index: number): string {
  return label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + index;
}

// ── Step 1 fields (flat indices 0–3) ────────────────────────────────────────

// Index 0: radio — drives conditional rendering for Team size field
const applyingAs = new RadioField({
  label: 'Applying as (Individual or Team)',
  options: ['Individual', 'Team'],
  value: null,
  required: true,
});

// Index 1: text — required, minCharacters + maxCharacters soft validation
const fullName = new TextField({ label: 'Full name', value: '', required: true, minCharacters: 2, maxCharacters: 50 });

// Index 2: number — only visible when 'Team' is selected; min: 1 enforces at least one member
const teamSize = new NumberField({
  label: 'Team size',
  min: 1,
  visibleWhen: {
    fieldId: fieldSlug('Applying as (Individual or Team)', 0),
    rule: new EqualsRule({ expected: 'Team' }),
  },
});

// Index 3: text — required, pattern validation (email-like)
const contactEmail = new TextField({
  label: 'Contact email',
  value: '',
  required: true,
  rules: [
    new MatchesPatternRule({ pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' })
      .withMessage('Please enter a valid email address (e.g. hello@example.com).'),
  ],
  hint: 'Enter a valid email address, e.g. name@example.com',
});

// ── Step 2 fields (flat indices 4–8) ────────────────────────────────────────

// Index 4: multi-select with autocomplete — minSelected + maxSelected soft validation
const skills = new MultiSelectField({
  label: 'Technical skills',
  options: ['TypeScript', 'Angular', 'NestJS', 'PostgreSQL', 'Docker', 'Python', 'React', 'Go'],
  value: [],
  autocomplete: true,
  minSelected: 1,
  maxSelected: 3,
  aiContext: 'Inform the user that they must select between 1 and 3 skills. They can pick from the provided list.',
});

// Index 5: select — drives conditional rendering for State field
const country = new SelectField({
  label: 'Country',
  options: ['United Kingdom', 'United States', 'Germany', 'France', 'Japan', 'Other'],
  value: null,
  autocomplete: false,
  required: true,
  info: 'If you select USA, you will be asked to provide a state.',
});

// Index 6: text — visible only when USA is selected
const stateOrTerritory = new TextField({
  label: 'State or territory',
  value: '',
  visibleWhen: {
    fieldId: fieldSlug('Country', 5),
    rule: new EqualsRule({ expected: 'United States' }),
  },
});

// Index 7: textarea — maxCharacters soft validation + character counter
const bio = new TextareaField({ label: 'Short bio', value: '', rows: 4, maxCharacters: 300, aiContext: 'Ask the user for a brief professional biography of 2–3 sentences.' });

// Index 8: checkbox — IsTrueRule: must be checked to submit
const terms = new CheckboxField({
  label: 'I accept the terms and conditions',
  value: false,
  rules: [new IsTrueRule().withMessage('You must accept the terms and conditions to continue.')],
});

class DemoValidationsForm implements FormTypePlugin {
  readonly definition: FormDefinition = {
    id: 'demo-form-validations',
    title: 'Validation & Conditional Rendering Demo',
    description: 'Demo form showcasing soft validations and conditional rendering',
    steps: [
      {
        label: 'About Your Application',
        description:
          "Demonstrates: required fields, min/max length (Full name), pattern validation (email), and conditional rendering — select 'Team' to reveal the Team size field.",
        fields: [applyingAs, fullName, teamSize, contactEmail],
      } satisfies FormStep,
      {
        label: 'Skills & Details',
        description:
          'Demonstrates: autocomplete chip-based multi-select (Technical skills, pick 1–3), single-select with conditional rendering (Country — select USA to reveal State field), maxCharacters on textarea, and IsTrueRule (terms checkbox must be checked to submit).',
        fields: [skills, country, stateOrTerritory, bio, terms],
      } satisfies FormStep,
    ],
  };

  events = {
    async created(_ctx: FormEventContext): Promise<void> {
      // No prefill — user should interact to see validation and conditional rendering behaviour
    },
    async submitted(_ctx: FormEventContext): Promise<void> {
      // no-op for demo
    },
  };
}

export default new DemoValidationsForm();
