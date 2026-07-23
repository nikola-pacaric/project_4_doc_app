import { describe, expect, it } from 'vitest';

import { dictionaries } from './dictionaries';

describe('product trust copy', () => {
  it('uses one product identity in both locales', () => {
    expect(dictionaries.en['app.brand']).toBe('Patient Research Tracking');
    expect(dictionaries.en['web.portalTitle']).toBe(dictionaries.en['app.brand']);
    expect(dictionaries.sr['web.portalTitle']).toBe(dictionaries.sr['app.brand']);
  });

  it('does not make unverified encryption or connection claims', () => {
    const visibleCopy = JSON.stringify(dictionaries);

    expect(visibleCopy).not.toMatch(/VitalTrack|MyHealth|data is encrypted|secure connection/i);
    expect(visibleCopy).not.toMatch(/šifrovan|šifriran|bezbedna veza/i);
  });

  it('uses Serbian diacritics in the corrected privacy and brand copy', () => {
    expect(dictionaries.sr['app.brand']).toMatch(/[ćčšžđ]/i);
    expect(dictionaries.sr['baseline.privacyNote']).toMatch(/[ćčšžđ]/i);
    expect(dictionaries.sr['web.privateWorkspace']).toMatch(/[ćčšžđ]/i);
  });

  it('localizes every doctor bottom-navigation destination', () => {
    for (const locale of ['en', 'sr'] as const) {
      expect(dictionaries[locale]['doctor.nav.dashboard']).toBeTruthy();
      expect(dictionaries[locale]['doctor.nav.patientsExports']).toBeTruthy();
      expect(dictionaries[locale]['doctor.nav.generateCode']).toBeTruthy();
      expect(dictionaries[locale]['settings.title']).toBeTruthy();
    }
  });

  it('localizes fatal-error and unsaved-form recovery copy', () => {
    for (const locale of ['en', 'sr'] as const) {
      expect(dictionaries[locale]['app.fatalErrorTitle']).toBeTruthy();
      expect(dictionaries[locale]['app.fatalErrorBody']).toBeTruthy();
      expect(dictionaries[locale]['form.discardTitle']).toBeTruthy();
      expect(dictionaries[locale]['form.discardBody']).toBeTruthy();
      expect(dictionaries[locale]['form.keepEditing']).toBeTruthy();
    }
  });
});
