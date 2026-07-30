import { t } from '@project4/i18n';

interface RecognitionResult {
  isFinal: boolean;
  0?: { transcript?: string };
}

interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}

interface RecognitionErrorEvent {
  error: string;
}

export interface VoiceRecognitionLifecycle {
  onend: (() => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onstart: (() => void) | null;
}

interface MutableBooleanRef {
  current: boolean;
}

interface VoiceRecognitionLifecycleOptions {
  locale: Parameters<typeof t>[0];
  receivedTranscriptRef: MutableBooleanRef;
  recognitionErrorRef: MutableBooleanRef;
  onListeningChange: (listening: boolean) => void;
  onMessage: (message: string) => void;
  onTranscript: (transcript: string) => void;
}

export function configureVoiceRecognitionLifecycle(
  recognition: VoiceRecognitionLifecycle,
  {
    locale,
    receivedTranscriptRef,
    recognitionErrorRef,
    onListeningChange,
    onMessage,
    onTranscript,
  }: VoiceRecognitionLifecycleOptions,
) {
  recognition.onstart = () => {
    onListeningChange(true);
    onMessage(t(locale, 'voice.listening'));
  };

  recognition.onresult = (event) => {
    const transcripts: string[] = [];
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      if (result?.isFinal) {
        const transcript = result[0]?.transcript?.trim();
        if (transcript) transcripts.push(transcript);
      }
    }

    if (!transcripts.length) return;

    receivedTranscriptRef.current = true;
    onTranscript(transcripts.join(' '));
    onMessage(t(locale, 'voice.added'));
  };

  recognition.onerror = (event) => {
    if (event.error !== 'aborted') {
      recognitionErrorRef.current = true;
      onMessage(t(locale, 'voice.unavailable'));
    }
  };

  recognition.onend = () => {
    onListeningChange(false);
    if (!receivedTranscriptRef.current && !recognitionErrorRef.current) {
      onMessage(t(locale, 'voice.noSpeech'));
    }
  };
}
