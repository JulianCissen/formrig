import { describe, it, expect } from 'vitest';
import { navItems } from './nav-items';

describe('navItems', () => {
  it('contains exactly 2 items', () => {
    expect(navItems).toHaveLength(2);
  });

  it('every item has icon, label, route, and exact properties', () => {
    for (const item of navItems) {
      expect(item).toHaveProperty('icon');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('route');
      expect(item).toHaveProperty('exact');
    }
  });

  it('every item has non-empty string values for icon, label, and route', () => {
    for (const item of navItems) {
      expect(typeof item.icon).toBe('string');
      expect(item.icon.length).toBeGreaterThan(0);
      expect(typeof item.label).toBe('string');
      expect(item.label.length).toBeGreaterThan(0);
      expect(typeof item.route).toBe('string');
      expect(item.route.length).toBeGreaterThan(0);
    }
  });

  it('every item route starts with /', () => {
    for (const item of navItems) {
      expect(item.route).toMatch(/^\//);
    }
  });

  it('exact is a boolean on every item', () => {
    for (const item of navItems) {
      expect(typeof item.exact).toBe('boolean');
    }
  });

  it('has a Forms item pointing to the root route with exact matching', () => {
    const forms = navItems.find((item) => item.label === 'Forms');
    expect(forms).toBeDefined();
    expect(forms!.route).toBe('/');
    expect(forms!.exact).toBe(true);
  });

  it('has a New item pointing to /form/new without exact matching', () => {
    const newItem = navItems.find((item) => item.label === 'New');
    expect(newItem).toBeDefined();
    expect(newItem!.route).toBe('/form/new');
    expect(newItem!.exact).toBe(false);
  });
});
