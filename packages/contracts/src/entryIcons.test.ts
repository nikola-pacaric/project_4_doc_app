import { describe, expect, it } from 'vitest';

import type { EntryKind } from './entries';
import {
  ENTRY_KIND_ICONS,
  ENTRY_KIND_ICON_STYLES,
  entryKindIcon,
  entryKindIconStyle,
} from './entryIcons';

const allKinds: EntryKind[] = [
  'text',
  'daily',
  'meal',
  'fluid',
  'symptom',
  'stool',
  'medication',
  'exercise',
  'menstruation',
  'note',
  'custom',
];

describe('entryKindIcon', () => {
  it('defines a non-empty icon for every entry kind', () => {
    for (const kind of allKinds) {
      expect(ENTRY_KIND_ICONS[kind]?.trim().length).toBeGreaterThan(0);
      expect(entryKindIcon(kind)).toBe(ENTRY_KIND_ICONS[kind]);
    }
  });

  it('matches the patient home quick-action icon set', () => {
    expect(entryKindIcon('daily')).toBe('☀');
    expect(entryKindIcon('meal')).toBe('🍽');
    expect(entryKindIcon('symptom')).toBe('✚');
    expect(entryKindIcon('stool')).toBe('💩');
    expect(entryKindIcon('medication')).toBe('💊');
    expect(entryKindIcon('exercise')).toBe('🏃');
    expect(entryKindIcon('menstruation')).toBe('🩸');
    expect(entryKindIcon('note')).toBe('✎');
    expect(entryKindIcon('fluid')).toBe('💧');
  });

  it('defines matching chip colors for every entry kind', () => {
    for (const kind of allKinds) {
      const style = entryKindIconStyle(kind);
      expect(style.color).toMatch(/^#|rgba/);
      expect(style.background.length).toBeGreaterThan(0);
      expect(ENTRY_KIND_ICON_STYLES[kind]).toEqual(style);
    }
    expect(entryKindIconStyle('symptom')).toEqual({
      color: '#ef4444',
      background: '#fee2e2',
    });
  });
});
