import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AppErrorBoundary } from './AppErrorBoundary';

describe('AppErrorBoundary', () => {
  it('renders children while the application is healthy', () => {
    const markup = renderToStaticMarkup(
      <AppErrorBoundary>
        <span>Healthy</span>
      </AppErrorBoundary>,
    );

    expect(markup).toContain('Healthy');
  });

  it('renders an actionable alert after an unhandled error', () => {
    const boundary = new AppErrorBoundary({ children: <span>Hidden</span> });
    boundary.state = AppErrorBoundary.getDerivedStateFromError();
    const markup = renderToStaticMarkup(boundary.render());

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Reload application');
    expect(markup).not.toContain('Hidden');
  });
});
