import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { StatusMessage } from './StatusMessage';

describe('StatusMessage', () => {
  it('announces errors assertively', () => {
    const markup = renderToStaticMarkup(<StatusMessage tone="error">Save failed</StatusMessage>);

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('aria-live="assertive"');
  });

  it('announces success messages politely', () => {
    const markup = renderToStaticMarkup(<StatusMessage tone="success">Saved</StatusMessage>);

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
  });
});
