import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PasswordField } from './PasswordField';

const baseProps = {
  hidden: true,
  label: 'Password',
  onChange: () => undefined,
  onToggleVisibility: () => undefined,
  toggleLabel: 'Show password',
  value: '',
};

describe('PasswordField', () => {
  it('does not impose a minimum length on current-password login fields', () => {
    const markup = renderToStaticMarkup(
      <PasswordField {...baseProps} autoComplete="current-password" />,
    );

    expect(markup).not.toContain('minLength=');
  });

  it('renders the supplied six-character signup constraint', () => {
    const markup = renderToStaticMarkup(
      <PasswordField {...baseProps} autoComplete="new-password" minLength={6} />,
    );

    expect(markup).toContain('minLength="6"');
    expect(markup).not.toContain('minLength="8"');
  });
});
