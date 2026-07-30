import { getActiveLocale, t } from '@project4/i18n';
import { describe, expect, it } from 'vitest';

import {
  configureVoiceRecognitionLifecycle,
  type VoiceRecognitionLifecycle,
} from './voiceRecognitionLifecycle';

class FakeSpeechRecognition implements VoiceRecognitionLifecycle {
  onend: VoiceRecognitionLifecycle['onend'] = null;
  onerror: VoiceRecognitionLifecycle['onerror'] = null;
  onresult: VoiceRecognitionLifecycle['onresult'] = null;
  onstart: VoiceRecognitionLifecycle['onstart'] = null;

  emitEnd() {
    this.onend?.();
  }

  emitError(error: string) {
    this.onerror?.({ error });
  }

  emitFinalTranscript(transcript: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ 0: { transcript }, isFinal: true }],
    });
  }
}

function configureFakeRecognition() {
  const recognition = new FakeSpeechRecognition();
  const messages: string[] = [];
  const transcripts: string[] = [];

  configureVoiceRecognitionLifecycle(recognition, {
    locale: getActiveLocale(),
    receivedTranscriptRef: { current: false },
    recognitionErrorRef: { current: false },
    onListeningChange: () => undefined,
    onMessage: (message) => messages.push(message),
    onTranscript: (transcript) => transcripts.push(transcript),
  });

  return { messages, recognition, transcripts };
}

describe('voice recognition lifecycle', () => {
  it('does not replace a concrete recognition error when the session ends', () => {
    const { messages, recognition } = configureFakeRecognition();

    recognition.emitError('network');
    recognition.emitEnd();

    expect(messages).toEqual([t(getActiveLocale(), 'voice.unavailable')]);
  });

  it('reports no speech when the session ends without a transcript or error', () => {
    const { messages, recognition } = configureFakeRecognition();

    recognition.emitEnd();

    expect(messages).toEqual([t(getActiveLocale(), 'voice.noSpeech')]);
  });

  it('does not report no speech after receiving a final transcript', () => {
    const { messages, recognition, transcripts } = configureFakeRecognition();

    recognition.emitFinalTranscript('  New observation  ');
    recognition.emitEnd();

    expect(transcripts).toEqual(['New observation']);
    expect(messages).toEqual([t(getActiveLocale(), 'voice.added')]);
  });
});
