import { renderTemplate } from '../utils/render-template.util';

describe('renderTemplate()', () => {
  it('replaces a single placeholder', () => {
    expect(renderTemplate('Hello {{name}}!', { name: 'World' })).toBe('Hello World!');
  });

  it('replaces multiple occurrences of the same placeholder', () => {
    expect(renderTemplate('{{x}} and {{x}}', { x: 'foo' })).toBe('foo and foo');
  });

  it('replaces multiple different placeholders', () => {
    expect(
      renderTemplate('{{a}} - {{b}}', { a: 'first', b: 'second' }),
    ).toBe('first - second');
  });

  it('leaves unknown placeholders unchanged', () => {
    expect(renderTemplate('{{known}} and {{unknown}}', { known: 'yes' })).toBe(
      'yes and {{unknown}}',
    );
  });

  it('returns template unchanged when vars is empty', () => {
    expect(renderTemplate('{{foo}}', {})).toBe('{{foo}}');
  });

  it('handles templates with no placeholders', () => {
    expect(renderTemplate('no placeholders', { x: 'y' })).toBe('no placeholders');
  });

  it('does not replace prototype-polluted keys', () => {
    const vars = Object.create({ protoKey: 'polluted' }) as Record<string, string>;
    expect(renderTemplate('{{protoKey}}', vars)).toBe('{{protoKey}}');
  });
});
