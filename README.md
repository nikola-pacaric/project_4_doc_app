# Patient Research Tracking App

V1 is a private patient research tracking pilot with a web app, Android app, and shared Supabase backend.

## Project Rules

- Use `PLANNING.md` as the implementation source of truth.
- Do not inspect `Specification/` unless explicitly requested.
- Do not ship Supabase service-role credentials to web or mobile clients.
- Keep visible UI text behind translation keys.

## Common Commands

```bash
npm install
npm run dev:web
npm run dev:mobile
npm run typecheck
npm run lint
npm run test
```

## Mobile Preview Workflow

During UI implementation, run the web app locally and verify responsive layouts in browser device viewports such as Pixel 9 before considering a screen ready for handoff.
