import type { AppSupabaseClient } from '@project4/supabase-client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AuthScreen } from './AuthScreen';

const client = {} as AppSupabaseClient;

describe('AuthScreen language selector', () => {
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
});
