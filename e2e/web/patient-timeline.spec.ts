import { expect, test } from '@playwright/test';

const hasWebConfiguration = Boolean(
  process.env.E2E_WEB_BASE_URL ||
  (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
);
const hasPatientCredentials = Boolean(
  process.env.E2E_PATIENT_EMAIL && process.env.E2E_PATIENT_PASSWORD,
);

test('authenticated patient can open the timeline', async ({ page }, testInfo) => {
  testInfo.skip(
    !hasWebConfiguration || !hasPatientCredentials,
    'Set web configuration plus E2E_PATIENT_EMAIL and E2E_PATIENT_PASSWORD to run this live smoke test.',
  );

  await page.goto('/');
  await page.getByLabel('Email address').fill(process.env.E2E_PATIENT_EMAIL!);
  await page.getByLabel('Password').fill(process.env.E2E_PATIENT_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  await page.getByRole('button', { name: 'View all' }).click();
  await expect(page.getByRole('heading', { name: 'Timeline' })).toBeVisible();
});
