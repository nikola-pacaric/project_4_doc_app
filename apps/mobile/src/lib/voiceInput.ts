import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

type VoiceInputNativeModule = {
  isAvailable: () => Promise<boolean>;
  start: (localeTag: string, prompt: string) => Promise<string>;
};

const nativeVoiceInput = NativeModules.VoiceInput as VoiceInputNativeModule | undefined;

export type VoiceLanguageTag = 'en-US' | 'sr-RS';

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

export async function startVoiceInput(
  languageTag: VoiceLanguageTag,
  prompt: string
): Promise<string> {
  if (Platform.OS !== 'android' || !nativeVoiceInput) {
    throw new Error('Voice input is not available on this device.');
  }

  const hasMicrophonePermission = await requestAndroidMicrophonePermission();
  if (!hasMicrophonePermission) {
    throw new Error('Voice input needs microphone permission.');
  }

  return nativeVoiceInput.start(languageTag, prompt);
}
