import type { EntryKind } from './entries';

/**
 * Canonical icons for entry kinds — used by quick actions, home history,
 * timeline cards, and form section headers so surfaces stay consistent.
 */
export const ENTRY_KIND_ICONS: Record<EntryKind, string> = {
  text: '✎',
  daily: '☀',
  meal: '🍽',
  fluid: '💧',
  symptom: '✚',
  stool: '💩',
  medication: '💊',
  exercise: '🏃',
  menstruation: '🩸',
  note: '✎',
  custom: '□',
};

/** Icon + soft chip colors matching the patient home quick-action tiles. */
export const ENTRY_KIND_ICON_STYLES: Record<
  EntryKind,
  { color: string; background: string }
> = {
  daily: { color: '#f97316', background: '#ffedd5' },
  meal: { color: '#3b82f6', background: '#dbeafe' },
  fluid: { color: '#3b82f6', background: '#dbeafe' },
  symptom: { color: '#ef4444', background: '#fee2e2' },
  stool: { color: '#f97316', background: '#ffedd5' },
  medication: { color: '#a63553', background: 'rgba(244, 113, 143, 0.2)' },
  exercise: { color: '#22c55e', background: '#dcfce7' },
  menstruation: { color: '#ef4444', background: '#fee2e2' },
  note: { color: '#ca8a04', background: '#fef9c3' },
  text: { color: '#ca8a04', background: '#fef9c3' },
  custom: { color: '#564145', background: '#f1ecf2' },
};

export function entryKindIcon(kind: EntryKind): string {
  return ENTRY_KIND_ICONS[kind];
}

export function entryKindIconStyle(kind: EntryKind): { color: string; background: string } {
  return ENTRY_KIND_ICON_STYLES[kind];
}
