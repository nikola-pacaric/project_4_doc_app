import { markPendingEntryFailed, createPendingTextEntry } from '@project4/sync';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PendingSyncRecovery } from './PendingSyncRecovery';

const failedEntry = markPendingEntryFailed(
  createPendingTextEntry(
    {
      occurredAt: '2026-07-29T10:30:00.000Z',
      patientId: 'patient-1',
      text: 'Unsynced note',
    },
    new Date('2026-07-29T10:31:00.000Z'),
  ),
  '42501',
);

describe('PendingSyncRecovery', () => {
  it('renders nothing when there are no failed entries', () => {
    expect(
      renderToStaticMarkup(
        <PendingSyncRecovery
          entries={[]}
          locale="en"
          onDiscard={vi.fn()}
          onRetry={vi.fn()}
          retryingEntryId={null}
        />,
      ),
    ).toBe('');
  });

  it('renders a labelled recovery section with retry and discard actions', () => {
    const markup = renderToStaticMarkup(
      <PendingSyncRecovery
        entries={[failedEntry]}
        locale="en"
        onDiscard={vi.fn()}
        onRetry={vi.fn()}
        retryingEntryId={null}
      />,
    );

    expect(markup).toContain('aria-labelledby="pending-sync-recovery-title"');
    expect(markup).toContain('<ul');
    expect(markup).toContain('Sync failed');
    expect(markup).toContain('aria-label="Try again: New note"');
    expect(markup).toContain('aria-label="Discard: New note"');
    expect(markup).not.toContain('42501');
  });

  it('marks the active item busy and disables both actions while retrying', () => {
    const markup = renderToStaticMarkup(
      <PendingSyncRecovery
        entries={[failedEntry]}
        locale="en"
        onDiscard={vi.fn()}
        onRetry={vi.fn()}
        retryingEntryId={failedEntry.id}
      />,
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup.match(/disabled=""/g)).toHaveLength(2);
    expect(markup).toContain('Trying again...');
  });
});
