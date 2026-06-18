# AGENTS.md - Development Agent Rules

## Role
- Work as a professional senior developer.
- Make conservative technical decisions that fit the existing project plan and codebase.
- Keep implementations clean, readable, visible, and maintainable.
- Use light comments only where they help explain non-obvious behavior.

## Chat Startup
- At the first prompt of a new chat/session, read `AGENTS.md` and `PLANNING.md`.
- At the first prompt of a new chat/session, check recent GitHub/git commits and show what has been done recently before starting work.
- Do not repeat the markdown-file and commit startup checks on every prompt in the same chat.
- Pick the next incomplete phase from `PLANNING.md` unless the user gives a different priority.
- Do not enter or inspect `Specification/` unless the user explicitly says to do so.
- Use `PLANNING.md` for implementation guidance instead of specification files.
- Restate the immediate goal before making changes.
- Inspect only files relevant to the current phase.

## Product Scope Discipline
- Follow `PLANNING.md` as the source for product scope, phases, acceptance criteria, and risks.
- Ask before changing V1 scope.
- Ask before adding paid services, iOS, doctor notes, patient revocation UI, or formal compliance claims.
- Never weaken privacy, RLS, consent, export safety, photo safety, or offline-lite requirements.
- Never ship Supabase service-role credentials to any web or mobile client.

## Code Organization
- Before creating a new architectural pattern, service, folder structure, state system, or dependency, inspect and follow the project's existing pattern. Introduce a new pattern only when the active slice requires it.
- Do not write an entire codebase, app, feature, or workflow in one file.
- Each entity, screen, panel, service, schema, hook, utility, and test area should have its own file.
- Frontend apps must be split by users, panels, routes, components, hooks, state, services, and shared utilities.
- Backend/database work must keep migrations, policies, RPC/functions, fixtures, and tests separated.
- Shared behavior belongs in shared packages when it must be reused by web and Android.
- Prefer small cohesive modules over large generic files.
- Keep file and folder names clear enough that their purpose is obvious.

## Dependencies And Services
- Use existing installed dependencies when they fit the requirement.
- Do not add new npm packages, Expo plugins, Supabase extensions, paid APIs, cloud services, or build tools without explaining why and asking first, unless they are explicitly approved in `PLANNING.md`.

## Secrets And Environment
- Keep secrets only in local `.env` files, `secrets/` folders, or approved secret stores.
- Do not commit `.env`, service-role keys, access tokens, API keys, database passwords, private keys, certificates, keystores, or generated credentials.
- Use `.env.example` and `*.example.json` files only for required variable names and safe placeholder values, never real secrets.
- Before committing, verify that no secret, certificate, key, or credential file is staged.

## Web Standards
- Build the web app with React, TypeScript, and Vite unless the user changes the stack.
- Use shared contracts, schemas, i18n, Supabase wrappers, photo helpers, sync helpers, and UI tokens.
- Keep UI mobile-first, accessible, readable, medical-style, and older-user friendly.
- Put all visible UI text behind translation keys.
- Keep light and dark themes consistent through shared tokens.
- Keep forms schema-driven where possible and validate before persistence.

## Android Standards
- Treat the Android app as the primary product and implementation target; the web app is a companion/extra surface.
- Implement new user-facing workflows on Android first, then add matching web behavior, unless the user explicitly sets a different priority.
- Build the Android app with React Native and TypeScript, preferably Expo with prebuild support.
- Match web behavior for roles, forms, workflows, Serbian/English UI, voice language, theme, and backend data.
- Keep native/mobile-specific concerns isolated from shared domain logic.
- Validate APK behavior with mobile smoke tests before considering Android work complete.

## App Preview Workflow
- Use the Pixel 9-style preview because Android is the primary product; frontend decisions should be reviewed first as Android/mobile interactions, then checked for web parity.
- During actual app UI implementation, run the app locally and inspect it in the Codex/browser preview when feasible.
- Use mobile-sized browser views, including Pixel 9-style dimensions, plus at least one additional small/mobile and one wider/desktop viewport for responsive checks.
- When presenting Android/mobile UI in the Codex browser preview, never show it as a bare web page. Display it inside a realistic original Google Pixel 9-style phone frame with a camera cutout, Android status bar, hardware buttons, and gesture navigation bar.
- Give mobile previews a polished native visual finish comparable to high-quality Swift app design while preserving Android interaction conventions and the shared product design system.
- Keep the preview visible or easy to surface when the user wants to review what is being developed.
- Use these previews to catch layout, readability, spacing, overflow, theme, and interaction issues before considering a UI workflow complete.
- Record which preview viewports were checked in completion notes for app UI work.

## Huawei Standards
- Treat Huawei as an Android validation target with device-specific smoke testing when available.
- Do not assume Google Play Services are available on Huawei devices.
- Prefer browser/device-native and app-native capabilities that degrade gracefully.
- Record any Huawei-only limitation, workaround, or untested area clearly.

## Implementation Workflow
1. Pick the next incomplete phase.
2. Choose and restate one bounded, testable slice from that phase, including what is out of scope.
3. Inspect only files relevant to that phase.
4. Implement the smallest complete vertical behavior.
5. Add or update focused tests.
6. Run relevant checks.
7. Record what passed, failed, and remains.
8. Do not skip RLS, export, photo, or offline validation.
9. Stop at the agreed slice boundary unless the user asks to continue.
10. If the same blocker remains after two reasonable, materially different attempts, stop guessing. Summarize what was tried, show the exact error, and propose the smallest next step.

## Session Efficiency
- Improve token efficiency by reducing repeated inspection, unnecessary context, and overly broad work; never trade away correctness, maintainability, privacy, security, accessibility, or required validation.
- Keep each implementation session centered on one cohesive slice that reaches a useful, testable checkpoint.
- Reuse context already gathered in the current chat and do not reread unchanged files without a concrete need.
- Inspect adjacent modules only when required for contracts, dependencies, established patterns, or correctness.
- Avoid unrelated refactoring, redesign, cleanup, and premature work on later slices.
- Avoid excessively tiny edit cycles that repeat setup and validation without producing a meaningful checkpoint.
- Run focused tests and checks while developing; reserve full builds, broad integration suites, and end-to-end checks for meaningful integration checkpoints.
- Run browser previews only for UI-affecting slices, and perform the required representative viewport review once the workflow is stable rather than after every styling edit.
- Inspect Supabase only when the active slice requires database state, migrations, storage, authentication, RPC, or RLS verification. Never reduce database security testing for efficiency.
- If correctness or safety requires expanding the agreed scope, explain the reason and keep the expansion as narrow as possible.
- Keep progress updates brief and decision-oriented, and record any deferred validation with the checkpoint where it must be completed.

## Testing And Validation
- Scale tests with risk and blast radius.
- Never claim that tests, builds, previews, migrations, RLS checks, or device checks passed unless they were actually run. State exactly what was not run.
- Always test RLS/security behavior for exposed app data.
- Add schema/contract tests for forms, entries, photos, exports, and settings.
- Add integration tests for patient flows, doctor flows, offline-lite, photos, invites, exports, language, and theme.
- Run web e2e and mobile smoke/e2e when the touched workflow requires it.
- Treat RLS, export, photo, and offline-lite behavior as high-risk release gates.

## GitHub Workflow
- Do not add, commit, or push until the user explicitly says to do so.
- When the user requests a push, always do a full push to `main`.
- Full push means: `git add .`, commit with a detailed message, then `git push origin main`.
- Always include all intended files in the push because the user works on two PCs and must not miss files.
- Before committing, review status and diff so unrelated or accidental changes are not hidden from the user.
- Never rewrite history, reset hard, or discard user work unless the user explicitly requests it.

## Completion Notes
- Summarize changed files, checks run, and any remaining risks.
- Be specific about anything not tested.
- Keep handoff notes short and useful for the next session.
