import { getActiveLocale, getActiveVoiceLanguage, t } from '@project4/i18n';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';

interface VoiceTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  type?: 'text' | 'textarea';
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0?: { transcript?: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onstart: (() => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;

  const browserWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

export function VoiceTextField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 4,
  type = 'textarea',
}: VoiceTextFieldProps) {
  const locale = getActiveLocale();
  const inputId = useId();
  const messageId = `${inputId}-voice-status`;
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => getSpeechRecognitionConstructor() !== null);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const receivedTranscriptRef = useRef(false);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [onChange, value]);

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = getActiveVoiceLanguage();

    recognition.onstart = () => {
      setListening(true);
      setMessage(t(locale, 'voice.listening'));
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
      const currentValue = valueRef.current.trimEnd();
      const transcript = transcripts.join(' ');
      onChangeRef.current(currentValue ? `${currentValue} ${transcript}` : transcript);
      setMessage(t(locale, 'voice.added'));
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        setMessage(t(locale, 'voice.unavailable'));
      }
    };

    recognition.onend = () => {
      setListening(false);
      if (!receivedTranscriptRef.current) {
        setMessage(t(locale, 'voice.noSpeech'));
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };
  }, [locale]);

  function toggleListening() {
    const recognition = recognitionRef.current;
    if (!supported || !recognition) return;

    if (listening) {
      recognition.stop();
      return;
    }

    inputRef.current?.focus();
    receivedTranscriptRef.current = false;
    setMessage(null);
    try {
      recognition.lang = getActiveVoiceLanguage();
      recognition.start();
    } catch {
      setListening(false);
      setMessage(t(locale, 'voice.unavailable'));
    }
  }

  const voiceLabel = listening ? t(locale, 'voice.stop') : t(locale, 'voice.start');

  return (
    <div className="voice-text-field">
      <div className="voice-text-field-header">
        <label className="choice-label" htmlFor={inputId}>
          {label}
        </label>
        {supported ? (
          <button
            aria-label={voiceLabel}
            className={`voice-mic-button ${listening ? 'listening' : ''}`}
            onClick={toggleListening}
            title={voiceLabel}
            type="button"
          >
            <svg
              fill="none"
              height="18"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              width="18"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="23" />
              <line x1="8" x2="16" y1="23" y2="23" />
            </svg>
          </button>
        ) : null}
      </div>
      {type === 'textarea' ? (
        <textarea
          aria-describedby={message ? messageId : undefined}
          id={inputId}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          ref={inputRef as RefObject<HTMLTextAreaElement>}
          required={required}
          rows={rows}
          value={value}
        />
      ) : (
        <input
          aria-describedby={message ? messageId : undefined}
          id={inputId}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          ref={inputRef as RefObject<HTMLInputElement>}
          required={required}
          type="text"
          value={value}
        />
      )}
      {message ? (
        <p
          aria-atomic="true"
          aria-live="polite"
          className="voice-message"
          id={messageId}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
