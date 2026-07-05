import { NativeModules, Platform } from 'react-native';

import type { Locale } from '@project4/i18n';

type VoiceInputNativeModule = {
  isAvailable: () => Promise<boolean>;
  start: (localeTag: string, prompt: string) => Promise<string>;
};

const nativeVoiceInput = NativeModules.VoiceInput as VoiceInputNativeModule | undefined;

export type VoiceLanguageTag = 'en-US' | 'sr-RS';

export function voiceLanguageFromLocale(locale: Locale): VoiceLanguageTag {
  return locale === 'sr' ? 'sr-RS' : 'en-US';
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

export async function startVoiceInput(
  languageTag: VoiceLanguageTag,
  prompt: string
): Promise<string> {
  if (Platform.OS !== 'android' || !nativeVoiceInput) {
    throw new Error('Voice input is not available on this device.');
  }

  return nativeVoiceInput.start(languageTag, prompt);
}
