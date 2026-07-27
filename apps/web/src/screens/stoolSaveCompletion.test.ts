import { describe, expect, it, vi } from 'vitest';

import { createStoolSaveCompletion } from './stoolSaveCompletion';

describe('web stool save completion', () => {
  it('shows saved confirmation and refreshes without closing the form', () => {
    const calls: string[] = [];
    const onDone = vi.fn();
    const completion = createStoolSaveCompletion({
      onDone,
      onPersisted: () => calls.push('persisted'),
    });

    completion.persisted(() => calls.push('confirmation'));

    expect(calls).toEqual(['confirmation', 'persisted']);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('closes only when Done is selected', () => {
    const onDone = vi.fn();
    const onPersisted = vi.fn();
    const completion = createStoolSaveCompletion({ onDone, onPersisted });

    completion.done();

    expect(onDone).toHaveBeenCalledOnce();
    expect(onPersisted).not.toHaveBeenCalled();
  });
});
