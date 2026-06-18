# AGENTS.md - Development Agent Rules

## Role
- Work as a professional senior developer.
- Make conservative technical decisions that fit the existing project plan and codebase.
- Keep implementations clean, readable, easy to review, and maintainable.
- Use light comments only where they explain non-obvious behavior.

## Chat Startup
- At the first prompt of a new implementation session, read `AGENTS.md` and `PLANNING.md` before changing files.
- At the first prompt of a new implementation session, check recent GitHub/git commits and briefly show what has been done recently before starting work.
- Do not repeat markdown-file and commit startup checks on every prompt in the same chat.
- For implementation work, pick the next incomplete phase from `PLANNING.md` unless the user gives a different priority.
- For review, planning, debugging, or questions, answer the user's current request first.
- Do not enter or inspect `Specification/` unless the user explicitly says to do so.
- Use `PLANNING.md` as the main source for implementation guidance.
- Restate the immediate goal before making changes.

## Product Scope And Safety Discipline
- Follow `PLANNING.md` as the source for product scope, phases, acceptance criteria, and risks.
- Ask before changing V1 scope.
- Ask before adding paid services, iOS, doctor notes, patient revocation UI, or formal compliance claims.
- RLS, privacy, consent, exports, photos, offline-lite behavior, and service-role secrecy are release-gate safety requirements.
- Never weaken privacy, RLS, consent, export safety, photo safety, or offline-lite requirements for speed or convenience.
- Never ship Supabase service-role credentials to any web or mobile client.

## Code Organization
- Before creating a new architectural pattern, service, folder structure, state system, or dependency, inspect and follow the project's existing pattern.
- Introduce a new pattern only when the active slice requires it.
- Do not write an entire codebase, app, substantial feature, or workflow in one file.
- Split code by cohesive responsibility. Extract separate modules when behavior is reused, independently testable, or becoming difficult to navigate.
- Organize frontend apps around the project's existing route, screen, component, hook, state, service, and shared-utility patterns.
- Backend/database work must keep migrations, policies, RPC/functions, fixtures, and tests separated.
- Shared behavior belongs in shared packages when it must be reused by web and Android.
- Prefer small cohesive modules over large generic files.
- Keep file and folder names clear enough that their purpose is obvious.

## Dependencies And Services
- Use existing installed dependencies when they fit the requirement.
- Do not add new npm packages, Expo plugins, Supabase extensions, paid APIs, cloud services, or build tools without explaining why and asking first, unless they are explicitly approved in `PLANNING.md`.

## Secrets And Environment
- Keep secrets only in Git-ignored local `.env` files, Git-ignored `secrets/` folders, or approved secret stores.
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

## Supabase Standards
- Inspect or use Supabase only when the active slice requires database state, migrations, storage, authentication, RPC/functions, or RLS verification.
- Keep Supabase inspection targeted to the relevant tables, policies, functions, migrations, or logs; do not dump broad schemas or unrelated project state.
- Keep migrations, policies, RPC/functions, fixtures, and security tests explicit, reviewable, and separated according to the existing project structure.
- Test every exposed table and storage path for unauthenticated, owner, other-patient, linked-doctor, and unlinked-doctor behavior as applicable.
- Never weaken or bypass RLS to simplify application code or testing.
- Prefer focused local SQL/security tests while developing; reserve broad Supabase validation for meaningful integration and release checkpoints.

## App Preview Workflow
- Codex implements frontend code and runs code-oriented checks such as typechecking, linting, focused tests, and builds when required.
- The user performs browser-based visual and interaction review by default.
- Do not run Codex browser previews or browser automation unless the user explicitly requests it for the active slice.
- The user's frontend review should start with the Pixel 9-style view because Android is the primary product, then check web parity.
- For representative UI checkpoints, the user should review Pixel 9-style dimensions, at least one additional small/mobile viewport, and one wider/desktop viewport.
- When the user requests a mobile browser preview, present Android/mobile UI inside a realistic Pixel-style phone frame rather than as a bare webpage.
- Give mobile previews a polished native visual finish while preserving Android interaction conventions and the shared product design system.
- Treat the user's reported visual findings, screenshots, and interaction notes as the browser QA input for follow-up implementation.
- Record browser visual QA as user-verified, Codex-verified, or not run; never imply Codex performed the user's review.

## Huawei Standards
- Treat Huawei as an Android validation target with device-specific smoke testing when available.
- Do not assume Google Play Services are available on Huawei devices.
- Prefer browser/device-native and app-native capabilities that degrade gracefully.
- Record any Huawei-only limitation, workaround, or untested area clearly.

## Implementation Workflow
1. Choose and restate one bounded, testable slice from the active phase, including what is out of scope.
2. Inspect only files relevant to that slice, plus adjacent modules needed for contracts, dependencies, established patterns, or correctness.
3. Implement the smallest complete vertical behavior.
4. Add or update focused tests for the touched behavior.
5. Run relevant checks.
6. Record what passed, failed, was not run, and remains.
7. Do not skip required RLS, export, photo, or offline-lite validation when the slice touches those areas.
8. Stop at the agreed slice boundary unless the user asks to continue.
9. If the same blocker remains after two reasonable, materially different attempts, stop guessing. Summarize what was tried, show the exact error, and propose the smallest next step.

## Session Efficiency
- Keep each implementation session centered on one cohesive slice that reaches a useful, testable checkpoint.
- Reuse context already gathered in the current chat and do not reread unchanged files without a concrete need.
- Avoid unrelated refactoring, redesign, cleanup, and premature work on later slices.
- Avoid excessively tiny edit cycles that repeat setup and validation without producing a meaningful checkpoint.
- Run focused tests and checks while developing; reserve full builds, broad integration suites, and end-to-end checks for meaningful integration checkpoints.
- If correctness or safety requires expanding the agreed scope, explain the reason and keep the expansion as narrow as possible.
- Keep progress updates brief and decision-oriented.
- Record any deferred validation with the checkpoint where it must be completed.

## Testing And Validation
- Scale tests with risk and blast radius.
- Never claim that tests, builds, previews, migrations, RLS checks, or device checks passed unless they were actually run.
- State exactly what was run and what was not run.
- Test RLS/security behavior whenever exposed data access, schemas, policies, storage, or authorization boundaries change.
- Add schema/contract tests for touched forms, entries, photos, exports, and settings behavior.
- Add integration/e2e tests when the touched workflow affects patient flows, doctor flows, offline-lite, photos, invites, exports, language, theme, authentication, or RLS.
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
- Summarize changed files, checks run, and remaining risks.
- Be specific about anything not tested.
- Keep handoff notes short and useful for the next session.
