import { describe, expect, it, vi } from 'vitest';

import { registerPhotoUploadHardwareBack } from './photoUploadBackHandler';

describe('photo upload hardware Back handling', () => {
  it('invokes nested navigation, consumes Back, and removes the listener', () => {
    const remove = vi.fn();
    const onBack = vi.fn();
    let listener: (() => boolean) | undefined;
    const addEventListener = vi.fn(
      (_eventName: 'hardwareBackPress', nextListener: () => boolean) => {
        listener = nextListener;
        return { remove };
      },
    );

    const unregister = registerPhotoUploadHardwareBack({ addEventListener }, onBack);

    expect(addEventListener).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));
    expect(listener?.()).toBe(true);
    expect(onBack).toHaveBeenCalledTimes(1);

    unregister();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
