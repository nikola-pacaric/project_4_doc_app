import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { VoiceTextField } from './VoiceTextField';

describe('VoiceTextField accessibility', () => {
  it('programmatically associates its visible label with the textarea', () => {
    const markup = renderToStaticMarkup(
      <VoiceTextField label="Observation" onChange={() => undefined} value="" />,
    );
    const labelTarget = markup.match(/<label[^>]+for="([^"]+)"/)?.[1];

    expect(labelTarget).toBeTruthy();
    expect(markup).toContain(`<textarea id="${labelTarget}"`);
  });
});
