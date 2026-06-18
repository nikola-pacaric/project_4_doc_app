interface PasswordFieldProps {
  autoComplete: 'current-password' | 'new-password';
  hidden: boolean;
  label: string;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
  toggleLabel: string;
  value: string;
}

export function PasswordField({
  autoComplete,
  hidden,
  label,
  onChange,
  onToggleVisibility,
  toggleLabel,
  value,
}: PasswordFieldProps) {
  return (
    <label>
      <span>{label}</span>
      <span className="password-input-wrap">
        <input
          autoComplete={autoComplete}
          minLength={8}
          onChange={(event) => onChange(event.target.value)}
          required
          type={hidden ? 'password' : 'text'}
          value={value}
        />
        <button
          aria-label={toggleLabel}
          aria-pressed={!hidden}
          className="password-toggle"
          onClick={onToggleVisibility}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
            <circle cx="12" cy="12" r="2.75" />
            {hidden ? <path d="m4 4 16 16" /> : null}
          </svg>
        </button>
      </span>
    </label>
  );
}
