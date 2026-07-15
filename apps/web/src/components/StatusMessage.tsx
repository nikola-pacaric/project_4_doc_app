import type { ReactNode } from 'react';

interface StatusMessageProps {
  children: ReactNode;
  tone: 'error' | 'success';
}

export function StatusMessage({ children, tone }: StatusMessageProps) {
  const isError = tone === 'error';

  return (
    <p
      aria-atomic="true"
      aria-live={isError ? 'assertive' : 'polite'}
      className={`notice ${tone}`}
      role={isError ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}
