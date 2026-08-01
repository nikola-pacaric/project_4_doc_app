import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { OfflineCacheNotice } from './OfflineCacheNotice';

describe('OfflineCacheNotice', () => {
  it('renders the localized cached-history warning as an alert', () => {
    const markup = renderToStaticMarkup(<OfflineCacheNotice locale="en" visible />);

    expect(markup).toContain('role="alert"');
    expect(markup).toContain(
      'Showing saved recent entries. New notes will sync when the connection returns.',
    );
  });

  it('renders nothing while online', () => {
    expect(renderToStaticMarkup(<OfflineCacheNotice locale="sr" visible={false} />)).toBe('');
  });
});
