import {
  TextField, RadioField, CheckboxField, MultiSelectField, TextareaField, SelectField,
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
const applyingAs = new RadioField(
  'Applying as (Individual or Team)',
  ['Individual', 'Team'],
  null,   // default: nothing selected
  true,   // required
);

// Index 1: text — required, minCharacters + maxCharacters soft validation
const fullName = new TextField('Full name', '', true);
fullName.minCharacters = 2;
fullName.maxCharacters = 50;

// Index 2: text — only visible when 'Team' is selected (conditional rendering)
const teamSize = new TextField('Team size', '', false);
teamSize.pattern = '^[1-9][0-9]*$'; // positive integer only — pattern validation demo
teamSize.visibleWhen = {
  fieldId: fieldSlug('Applying as (Individual or Team)', 0),
  rule: new EqualsRule('Team'),
};

// Index 3: text — required, pattern validation (email-like)
const contactEmail = new TextField('Contact email', '', true);
contactEmail.rules = [
  new MatchesPatternRule('^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$')
    .withMessage('Please enter a valid email address (e.g. hello@example.com).'),
];
contactEmail.hint = 'Enter a valid email address, e.g. name@example.com';

// ── Step 2 fields (flat indices 4–8) ────────────────────────────────────────

// Index 4: multi-select with autocomplete — minSelected + maxSelected soft validation
const skills = new MultiSelectField(
  'Technical skills',
  ['TypeScript', 'Angular', 'NestJS', 'PostgreSQL', 'Docker', 'Python', 'React', 'Go'],
  [],
  true,   // autocomplete
);
skills.minSelected = 1;
skills.maxSelected = 3;

// Index 5: select — drives conditional rendering for State field
const country = new SelectField(
  'Country',
  ['United Kingdom', 'United States', 'Germany', 'France', 'Japan', 'Other'],
  null,
  false,  // no autocomplete
  true,   // required
);
country.info = 'If you select USA, you will be asked to provide a state.';

// Index 6: text — visible only when USA is selected
const stateOrTerritory = new TextField('State or territory', '', false);
stateOrTerritory.visibleWhen = {
  fieldId: fieldSlug('Country', 5),
  rule: new EqualsRule('United States'),
};

// Index 7: textarea — maxCharacters soft validation + character counter
const bio = new TextareaField('Short bio', '', 4, false);
bio.maxCharacters = 300;

// Index 8: checkbox — IsTrueRule: must be checked to submit
const terms = new CheckboxField('I accept the terms and conditions', false, false);
terms.rules = [new IsTrueRule().withMessage('You must accept the terms and conditions to continue.')];

class DemoValidationsForm implements FormTypePlugin {
  readonly definition: FormDefinition = {
    id: 'demo-form-validations',
    title: 'Validation & Conditional Rendering Demo',
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
