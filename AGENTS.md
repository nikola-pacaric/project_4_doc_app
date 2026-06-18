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
- Do not write an entire codebase, app, feature, or workflow in one file.
- Each entity, screen, panel, service, schema, hook, utility, and test area should have its own file.
- Frontend apps must be split by users, panels, routes, components, hooks, state, services, and shared utilities.
- Backend/database work must keep migrations, policies, RPC/functions, fixtures, and tests separated.
- Shared behavior belongs in shared packages when it must be reused by web and Android.
- Prefer small cohesive modules over large generic files.
- Keep file and folder names clear enough that their purpose is obvious.

## Web Standards
- Build the web app with React, TypeScript, and Vite unless the user changes the stack.
- Use shared contracts, schemas, i18n, Supabase wrappers, photo helpers, sync helpers, and UI tokens.
- Keep UI mobile-first, accessible, readable, medical-style, and older-user friendly.
- Put all visible UI text behind translation keys.
- Keep light and dark themes consistent through shared tokens.
- Keep forms schema-driven where possible and validate before persistence.

## Android Standards
- Build the Android app with React Native and TypeScript, preferably Expo with prebuild support.
- Match web behavior for roles, forms, workflows, Serbian/English UI, voice language, theme, and backend data.
- Keep native/mobile-specific concerns isolated from shared domain logic.
- Validate APK behavior with mobile smoke tests before considering Android work complete.

## App Preview Workflow
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
2. Restate the immediate goal.
3. Inspect only files relevant to that phase.
4. Implement the smallest complete vertical behavior.
5. Add or update focused tests.
6. Run relevant checks.
7. Record what passed, failed, and remains.
8. Do not skip RLS, export, photo, or offline validation.

## Testing And Validation
- Scale tests with risk and blast radius.
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
