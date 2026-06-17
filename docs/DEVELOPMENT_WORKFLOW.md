# Development Workflow

## Responsive Preview

During UI implementation, keep the web app available in a local browser and validate screens in phone-sized viewports before handoff.

Primary mobile viewport:

- Pixel-style phone: `412 x 915`

Additional useful checks:

- Narrow Android phone: `360 x 800`
- Small tablet: `768 x 1024`
- Desktop baseline: default browser viewport

Workflow:

1. Start the web app with `npm run dev:web`.
2. Open the local Vite URL in the in-app browser.
3. Set the browser viewport to the target device size.
4. Verify layout, readable text, accessible controls, and no overlapping UI.
5. Mention checked viewports in completion notes.

The native Android app still needs APK/device smoke tests later. Browser phone view is an early layout aid, not a replacement for Android validation.
