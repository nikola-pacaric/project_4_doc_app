import { expect, test } from '@playwright/test';

const hasWebConfiguration = Boolean(
  process.env.E2E_WEB_BASE_URL ||
  (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
);

test.skip(
  !hasWebConfiguration,
  'Set E2E_WEB_BASE_URL or VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to run web smoke tests.',
);

test('unauthenticated visitor can select patient and doctor sign-in routes', async ({ page }) => {
  await page.goto('/');

  const patientLogin = page.getByRole('tab', { name: 'Patient login' });
  const doctorLogin = page.getByRole('tab', { name: 'Doctor login' });

  await expect(patientLogin).toHaveAttribute('aria-selected', 'true');
  await expect(doctorLogin).toHaveAttribute('aria-selected', 'false');

  await doctorLogin.click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(doctorLogin).toHaveAttribute('aria-selected', 'true');

  await patientLogin.click();
  await expect(patientLogin).toHaveAttribute('aria-selected', 'true');
});
