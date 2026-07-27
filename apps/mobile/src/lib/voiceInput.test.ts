import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  NativeModules: {},
  PermissionsAndroid: {
    check: vi.fn(),
    PERMISSIONS: { RECORD_AUDIO: 'android.permission.RECORD_AUDIO' },
    request: vi.fn(),
    RESULTS: { GRANTED: 'granted' },
  },
  Platform: { OS: 'android' },
}));

import { createVoiceInputSession } from './voiceInput';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('mobile voice input lifecycle', () => {
  it('does not start recognition when canceled during the permission request', async () => {
    const permission = deferred<boolean>();
    const nativeModule = {
      cancel: vi.fn().mockResolvedValue(undefined),
      isAvailable: vi.fn().mockResolvedValue(true),
      start: vi.fn().mockResolvedValue('ignored'),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const session = createVoiceInputSession({
      isAndroid: true,
      nativeModule,
      requestMicrophonePermission: () => permission.promise,
    });

    const result = session.start('sr-RS', 'Govorite sada');
    const expectation = expect(result).rejects.toMatchObject({ code: 'canceled' });
    await session.cancel();
    permission.resolve(true);

    await expectation;
    expect(nativeModule.start).not.toHaveBeenCalled();
    expect(nativeModule.cancel).not.toHaveBeenCalled();
  });

  it('cancels native recognition and rejects the pending transcript', async () => {
    const transcript = deferred<string>();
    const nativeModule = {
      cancel: vi.fn(() => {
        transcript.reject(Object.assign(new Error('canceled'), { code: 'canceled' }));
        return Promise.resolve();
      }),
      isAvailable: vi.fn().mockResolvedValue(true),
      start: vi.fn(() => transcript.promise),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const session = createVoiceInputSession({
      isAndroid: true,
      nativeModule,
      requestMicrophonePermission: vi.fn().mockResolvedValue(true),
    });

    const result = session.start('en-US', 'Speak now');
    const expectation = expect(result).rejects.toMatchObject({ code: 'canceled' });
    await vi.waitFor(() => expect(nativeModule.start).toHaveBeenCalledOnce());
    await session.cancel();

    await expectation;
    expect(nativeModule.cancel).toHaveBeenCalledOnce();
  });

  it('stops microphone capture while allowing the final transcript to resolve', async () => {
    const transcript = deferred<string>();
    const nativeModule = {
      cancel: vi.fn().mockResolvedValue(undefined),
      isAvailable: vi.fn().mockResolvedValue(true),
      start: vi.fn(() => transcript.promise),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const session = createVoiceInputSession({
      isAndroid: true,
      nativeModule,
      requestMicrophonePermission: vi.fn().mockResolvedValue(true),
    });

    const result = session.start('en-US', 'Speak now');
    await vi.waitFor(() => expect(nativeModule.start).toHaveBeenCalledOnce());
    await session.stop();
    transcript.resolve('final transcript');

    await expect(result).resolves.toBe('final transcript');
    expect(nativeModule.stop).toHaveBeenCalledOnce();
    expect(nativeModule.cancel).not.toHaveBeenCalled();
  });
});
