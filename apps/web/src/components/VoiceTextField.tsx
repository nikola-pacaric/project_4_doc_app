import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { useEffect, useState, useRef } from 'react';

interface VoiceTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  type?: 'text' | 'textarea';
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
  const locale = DEFAULT_LOCALE;
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = locale === 'sr' ? 'sr-RS' : 'en-US';

      recognition.onstart = () => {
        setListening(true);
        setMessage(t(locale, 'voice.listening'));
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          const cleanTranscript = transcript.trim();
          if (cleanTranscript) {
            const cleanValue = value.trimEnd();
            const newValue = cleanValue ? `${cleanValue} ${cleanTranscript}` : cleanTranscript;
            onChange(newValue);
            setMessage(t(locale, 'voice.added'));
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'aborted') {
          setMessage(t(locale, 'voice.unavailable'));
        }
        setListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [locale, value, onChange]);

  function toggleListening() {
    if (!supported || !recognitionRef.current) return;

    if (listening) {
      recognitionRef.current.stop();
    } else {
      setMessage(null);
      try {
        recognitionRef.current.start();
      } catch {
        setMessage(t(locale, 'voice.unavailable'));
      }
    }
  }

  return (
    <div className="voice-text-field">
      <div className="voice-text-field-header">
        <span className="choice-label">{label}</span>
        {supported ? (
          <button
            type="button"
            className={`voice-mic-button ${listening ? 'listening' : ''}`}
            onClick={toggleListening}
            aria-label={t(locale, 'voice.start')}
            title={t(locale, 'voice.start')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
        ) : null}
      </div>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
      )}
      {message ? <p className="voice-message">{message}</p> : null}
    </div>
  );
}
