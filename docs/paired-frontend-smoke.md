# Paired web and Android smoke foundation

This foundation keeps the first shared checks deliberately small and safe. It verifies the same behavior on the web and Android client: unauthenticated role routing, followed by an authenticated patient opening their timeline. It does not create, edit, or delete medical data.

## Scenario inventory

| Scenario                          | Web                                | Android                          | Account/data requirement            |
| --------------------------------- | ---------------------------------- | -------------------------------- | ----------------------------------- |
| Unauthenticated role entry        | `e2e/web/auth-routing.spec.ts`     | `.maestro/auth-routing.yaml`     | Configured client only              |
| Patient sign-in and timeline      | `e2e/web/patient-timeline.spec.ts` | `.maestro/patient-timeline.yaml` | Dedicated consented patient account |
| Patient form save/reload          | Planned                            | Planned                          | Isolated resettable test data       |
| Offline note queue/reconnect      | Planned                            | Planned                          | Network-control test environment    |
| Doctor linking/read-only timeline | Planned                            | Planned                          | Isolated doctor/patient pair        |
| Doctor exports                    | Planned                            | Planned                          | Isolated linked patient data        |
| Settings, language, and theme     | Planned                            | Planned                          | Configured client only              |

## Web

Playwright is pinned in the root dev dependencies. Browser binaries are intentionally not installed by this repository. Install them only in the machine or CI environment that will execute browser tests.

Use `e2e/.env.example` as the list of required variable names, and export those variables in the shell or CI job that runs Playwright. The runner does not automatically load an `e2e/.env.local` file. `E2E_WEB_BASE_URL` targets a deployed/preview client. Without it, Playwright starts local Vite on port 4173; provide the normal `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to that process.

`npm run test:e2e:web:list` discovers tests without credentials or browser binaries. `npm run test:e2e:web` skips both flows when no configured web target is present, and skips the authenticated timeline flow unless both patient credentials are supplied.

## Android

Maestro is intentionally an externally installed CLI, not an application dependency. Use a freshly built, Supabase-configured Android app with package ID `com.patientresearchtracking.app` on an attached emulator/device. The flows assume clean app data and English as the default locale.

`npm run test:smoke:mobile:list` lists the available flows without Maestro, an APK, device, or credentials. `npm run test:smoke:mobile:validate` parses and checks their YAML formatting without Maestro. `npm run test:smoke:mobile:auth` executes the no-credential role-routing flow. `npm run test:smoke:mobile` returns a clear skip when the dedicated patient credentials are absent; when present it invokes Maestro for the authenticated timeline flow.

Use a dedicated consented patient with no sensitive or production study data. Do not place actual credentials in tracked files. This foundation does not replace browser visual review, APK installation testing, or Huawei device smoke testing.
