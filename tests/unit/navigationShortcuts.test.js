import { describe, it, expect } from 'vitest';
import { shouldIgnoreNavigationShortcut } from '../../app/lib/navigationShortcuts.js';

describe('navigation shortcut typing protection', () => {
  it('ignores typing in all form controls', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(shouldIgnoreNavigationShortcut({ target: { tagName }, key: 'g' })).toBe(true);
    }
  });
  it('ignores nested content editors and dialog controls', () => {
    expect(shouldIgnoreNavigationShortcut({ target: { tagName: 'SPAN', parentElement: { isContentEditable: true } } })).toBe(true);
    expect(shouldIgnoreNavigationShortcut({ target: { tagName: 'BUTTON', parentElement: { getAttribute: key => key === 'role' ? 'dialog' : null } } })).toBe(true);
  });
  it('preserves normal page navigation but skips consumed or composing events', () => {
    expect(shouldIgnoreNavigationShortcut({ target: { tagName: 'BODY' }, key: 'g' })).toBe(false);
    expect(shouldIgnoreNavigationShortcut({ isComposing: true })).toBe(true);
    expect(shouldIgnoreNavigationShortcut({ defaultPrevented: true })).toBe(true);
  });
});
