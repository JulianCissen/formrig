# Design Spec Template

Filename: `design-specs/<kebab-case-name>.md`

```markdown
# Design Spec: <Screen or Component Name>

## Purpose
One sentence: what this screen/component does and who uses it.

## Scope
What is in and out of scope for this spec.

## Layout
Describe layout structure: regions, column grid, breakpoints. Reference MD3 layout patterns.
Include a text-based wireframe or region description if helpful.

## Components
List every UI component used. For each:
- Component name (MD3 canonical name)
- Variant / configuration
- Attributes or configuration of note
- Any custom behaviour beyond defaults

## States
Enumerate all states for interactive components and the overall screen:
- Default / empty / loading / error / success
- Disabled, focused, hovered, pressed (where applicable)
- Edge cases: empty list, maximum-length input, etc.

## Interactions
For every user interaction:
- Trigger (click, keyboard shortcut, swipe, etc.)
- Expected outcome (navigation, dialog opens, inline error, etc.)
- Transitions or animations (reference MD3 motion tokens where applicable)

## Typography
Map content to MD3 type scale roles (e.g. "page title: Headline Large").

## Colour
Map UI elements to MD3 colour roles (e.g. "primary action: primary / on-primary").
Note brand colour overrides with their source.

## Accessibility notes
- ARIA roles, labels, or live-region requirements for custom elements
- Keyboard navigation order if non-linear
- Screen-reader announcements for dynamic content changes
- Any WCAG criterion that required a specific design decision
```
