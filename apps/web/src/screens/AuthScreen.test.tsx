import type { AppSupabaseClient } from '@project4/supabase-client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AuthScreen } from './AuthScreen';
import { authModeUiAfterChange } from './authModeUi';

const client = {} as AppSupabaseClient;

describe('AuthScreen', () => {
  it('renders an accessible English and Serbian selector using the supplied locale', () => {
    const markup = renderToStaticMarkup(
      <AuthScreen client={client} locale="sr" onChangeLocale={() => undefined} />,
    );

    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-label="Jezik"');
    expect(markup).toContain('lang="en"');
    expect(markup).toContain('lang="sr"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('Prijavi se');
  });

  it('does not block login attempts based on password length', () => {
    const markup = renderToStaticMarkup(
      <AuthScreen client={client} locale="en" onChangeLocale={() => undefined} />,
    );

    expect(markup).toContain('autoComplete="current-password"');
    expect(markup).not.toContain('minLength=');
  });

  it('clears stale feedback and re-hides the password when auth mode changes', () => {
    expect(authModeUiAfterChange('doctor-login')).toEqual({
      error: null,
      message: null,
      mode: 'doctor-login',
      passwordHidden: true,
    });
  });
});
