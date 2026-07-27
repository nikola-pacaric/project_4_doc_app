import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

type VoiceInputNativeModule = {
  cancel: () => Promise<void>;
  isAvailable: () => Promise<boolean>;
  start: (localeTag: string, prompt: string) => Promise<string>;
  stop: () => Promise<void>;
};

const nativeVoiceInput = NativeModules.VoiceInput as VoiceInputNativeModule | undefined;

export type VoiceLanguageTag = 'en-US' | 'sr-RS';

export type VoiceInputRuntime = {
  isAndroid: boolean;
  nativeModule?: VoiceInputNativeModule;
  requestMicrophonePermission: () => Promise<boolean>;
};

export type VoiceInputSession = {
  cancel: () => Promise<void>;
  start: (languageTag: VoiceLanguageTag, prompt: string) => Promise<string>;
  stop: () => Promise<void>;
};

let activeSessionOwner: symbol | null = null;

function voiceInputError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

export function appendVoiceTranscript(currentValue: string, transcript: string): string {
  const cleanTranscript = transcript.trim();
  if (!cleanTranscript) return currentValue;

  const cleanValue = currentValue.trimEnd();
  if (!cleanValue) return cleanTranscript;

  return `${cleanValue} ${cleanTranscript}`;
}

export async function isVoiceInputSupported(): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeVoiceInput) return false;
  return nativeVoiceInput.isAvailable();
}

async function requestAndroidMicrophonePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  const alreadyGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  if (alreadyGranted) return true;

  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

const defaultRuntime: VoiceInputRuntime = {
  isAndroid: Platform.OS === 'android',
  nativeModule: nativeVoiceInput,
  requestMicrophonePermission: requestAndroidMicrophonePermission,
};

export function createVoiceInputSession(
  runtime: VoiceInputRuntime = defaultRuntime,
): VoiceInputSession {
  const owner = Symbol('voice-input-session');
  let requestVersion = 0;
  let nativeRecognitionStarted = false;

  function releaseOwnership() {
    if (activeSessionOwner === owner) {
      activeSessionOwner = null;
    }
  }

  return {
    async start(languageTag, prompt) {
      if (!runtime.isAndroid || !runtime.nativeModule) {
        throw voiceInputError('unavailable', 'Voice input is not available on this device.');
      }
      if (activeSessionOwner !== null) {
        throw voiceInputError('busy', 'Voice input is already running.');
      }

      activeSessionOwner = owner;
      const currentVersion = ++requestVersion;

      try {
        const hasMicrophonePermission = await runtime.requestMicrophonePermission();
        if (currentVersion !== requestVersion) {
          throw voiceInputError('canceled', 'Voice input was canceled.');
        }
        if (!hasMicrophonePermission) {
          throw voiceInputError('unavailable', 'Voice input needs microphone permission.');
        }

        nativeRecognitionStarted = true;
        const transcript = await runtime.nativeModule.start(languageTag, prompt);
        if (currentVersion !== requestVersion) {
          throw voiceInputError('canceled', 'Voice input was canceled.');
        }
        return transcript;
      } finally {
        if (currentVersion === requestVersion) {
          nativeRecognitionStarted = false;
          releaseOwnership();
        }
      }
    },

    async stop() {
      if (activeSessionOwner !== owner) return;

      if (!nativeRecognitionStarted) {
        requestVersion += 1;
        releaseOwnership();
        return;
      }

      await runtime.nativeModule?.stop();
    },

    async cancel() {
      if (activeSessionOwner !== owner) return;

      requestVersion += 1;
      const shouldCancelNativeRecognition = nativeRecognitionStarted;
      nativeRecognitionStarted = false;
      releaseOwnership();

      if (shouldCancelNativeRecognition) {
        await runtime.nativeModule?.cancel();
      }
    },
  };
}
