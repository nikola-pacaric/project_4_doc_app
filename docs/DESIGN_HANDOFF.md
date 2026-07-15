# Design Handoff - Patient Research Tracking App

## Purpose

This document gives a design agent the product context, screen list, forms, logic, and user flows needed to design the Android mobile app and companion web app.

The app is a private 3-month patient research tracking pilot. Patients record daily medical and lifestyle data. Each patient can have one active linked doctor, while each doctor can have many actively linked patients. Doctors review read-only patient timelines and create JSON exports. The app is not a diagnosis tool and should not look or sound like one.

## Design Priorities

- Android mobile is the primary product surface.
- Web is a companion portal with the same data and workflows, adapted to responsive web layout.
- The UI should feel calm, readable, medical, private, and older-user friendly.
- Use mobile-first layouts, large touch targets, clear form grouping, readable type, and strong error states.
- Support Serbian and English text.
- Support light and dark themes.
- All patient data should feel private by default.
- Do not use design language that implies diagnosis, treatment recommendation, emergency triage, or formal medical-device certification.
- Doctor views are read-only for patient data.

## Product Boundaries

Build/design for V1:

- Patient signup and login.
- Doctor login.
- Consent/privacy gate before patient workflows.
- Patient baseline profile.
- Daily progress home.
- Full daily, food, symptom, stool, medication, exercise, menstruation, note, and custom text entry flows.
- Timeline with create, read, update timestamp, and delete for patient-owned entries.
- Offline-lite state for cached own history and pending text/note entries.
- Photo upload only for meals, other fluids, and medication.
- Voice input helper only for text fields where device/browser support exists.
- Patient doctor-invite redemption.
- Doctor dashboard with invite creation/revocation and linked patients.
- Linked patient read-only timeline.
- Doctor JSON exports.
- Settings for app language, voice language, and theme.

Do not design for V1:

- Doctor notes.
- Patient revocation UI.
- Paid transcription.
- Raw audio storage.
- Full offline sync.
- Multi-device conflict resolution UI.
- Offline photo upload.
- Automatic deletion/post-research cleanup.
- iOS-specific release.
- Formal compliance certification claims.

## Roles

### Patient

- Creates and manages own entries, baseline profile, photos, consent, and settings.
- Redeems a doctor invite code only when no active doctor link exists.
- Can have at most one active linked doctor at a time.
- Can view cached own history offline.
- Can create pending text/note entries offline.

### Doctor

- Logs in through a doctor account provisioned manually by an operator.
- Creates single-use invite codes.
- Revokes unused invite codes.
- Can be actively linked to many patients through separate redeemed invite codes.
- Views only those actively linked patients.
- Reviews linked patient timelines/photos.
- Creates JSON exports.
- Cannot edit or delete patient data.

### Unauthenticated User

- Can access auth and basic pre-app controls only.
- Cannot access any app data.

## Master Screen List

### Shared / System Screens

1. Launch/loading screen
2. Missing configuration/error screen
3. Authentication choice screen
4. Patient signup form
5. Patient login form
6. Doctor login form
7. Profile load error/retry screen
8. Settings screen
9. Light/dark theme state
10. Serbian/English language state

### Patient Screens

1. Consent/privacy gate
2. Daily progress home
3. Recent timeline
4. Timeline day detail
5. Text/note entry editor
6. Entry timestamp editor
7. Baseline profile form
8. Daily form
9. Food and hydration form
10. Meal subform
11. Other fluids subform
12. Photo attachment screen for meals
13. Photo attachment screen for other fluids
14. Symptom form
15. Symptom detail card/subscreen
16. Stool form
17. No-stool-today confirmation
18. Medication form
19. Medication photo attachment screen
20. Exercise form
21. Menstruation form
22. Doctor invite redemption screen/panel
23. Offline cached timeline state
24. Pending sync state
25. Voice input active/listening state
26. Voice unsupported/unavailable fallback state

### Doctor Screens

1. Doctor account ready/pending state
2. Doctor dashboard
3. Create invite code panel
4. Invite code list
5. Revoke unused invite confirmation/state
6. Linked patients list
7. Linked patient read-only timeline
8. Linked patient timeline day detail
9. Patient photo read-only view
10. Export setup panel
11. Export status/result panel
12. Export error/unauthorized state

## Navigation Model

### Unauthenticated

```text
Launch
  -> Auth choice
      -> Patient signup
      -> Patient login
      -> Doctor login
```

### Patient

```text
Login/signup
  -> Consent/privacy gate, if not accepted
  -> Daily progress home
      -> Recent timeline / full timeline
      -> Baseline profile
      -> Daily form
      -> Food and hydration
      -> Symptoms
      -> Stool
      -> Medication
      -> Exercise
      -> Menstruation, only when applicable
      -> Notes/text entry
      -> Redeem doctor invite
      -> Settings
```

### Doctor

```text
Doctor login
  -> Doctor dashboard
      -> Create invite code
      -> Revoke unused invite code
      -> Open linked patient
          -> Read-only patient timeline
          -> Export selected day
          -> Export selected/current partial month
      -> Settings
```

## Key UI States

- Loading data
- Empty state
- Save success
- Save failure
- Validation errors
- Offline detected
- Online-only actions disabled
- Cached data displayed
- Pending sync marker
- Sync success after reconnect
- Photo permission denied
- Photo prepare/upload error
- Voice listening
- Voice transcript added
- Voice unsupported/unavailable
- Doctor unlinked/unauthorized
- Invite expired/revoked/redeemed
- Export running
- Export complete
- Export failed

## Form Specifications

### Auth Choice

Goal: Calm entry point for patient or doctor.

Fields/controls:

- Patient signup button
- Patient login button
- Doctor login button
- Optional language selector
- Optional theme selector

Logic:

- No patient data is visible before authentication.
- Doctor signup is not public.

### Patient Signup

Goal: Create a patient account with immutable patient role.

Fields:

- Display name: text
- Email: email
- Password: password

Logic:

- Successful signup creates a patient role account.
- After account confirmation/login, patient must pass consent gate before app workflows.

### Patient Login

Goal: Authenticate an existing patient.

Fields:

- Email: email
- Password: password

Logic:

- If account role is not patient, show role mismatch.
- If consent is missing, route to consent gate.
- If consent exists, route to patient home.

### Doctor Login

Goal: Authenticate an existing manually provisioned doctor.

Fields:

- Email: email
- Password: password

Logic:

- If account role is not doctor, show role mismatch.
- Doctor accounts are not self-service signup in V1.
- Route to doctor dashboard after login.

### Consent / Privacy Gate

Goal: Capture required consent before patient workflows.

Fields:

- Consent acknowledgement: checkbox/toggle
- Accept button
- Sign out button

Content requirements:

- Private research pilot.
- Not a diagnosis tool.
- Does not replace medical advice.
- Data is visible only to the patient and that patient's one actively linked doctor.

Logic:

- Blocks all patient workflows until accepted.
- Store accepted state on the profile.

### Patient Daily Progress Home

Goal: Give patient a clear daily starting point and quick actions.

Main content:

- Greeting
- Date/current tracked day
- Daily progress indicator
- Required/optional action statuses
- Recent entries
- Offline/pending sync banner

Actions:

- Daily
- Food
- Symptoms
- Stool
- Medication
- Exercise
- Period/menstruation, only for applicable female patients
- Notes
- Baseline profile
- Timeline
- Link doctor
- Settings
- Sign out

Logic:

- Show "required", "optional", and "completed" states for daily panels.
- If Daily says physical activity happened, Exercise becomes required for that day.
- If Daily says medication outside chronic therapy happened, Medication becomes required for that day.
- If Daily says menstruation happened, Menstruation becomes required for that day.
- Menstruation controls appear only when baseline recorded sex is female.
- Offline: online-only medical forms are disabled; notes and cached timeline remain available.

### Timeline / History

Goal: Show patient entries by day, with sync and status clarity.

Fields/controls:

- Date selector
- Refresh button
- Entry list
- Entry type labels
- Entry timestamp
- Entry preview text/details
- Status chip: synced or pending
- Edit timestamp action
- Delete action for patient-owned entries
- Open detail action

Entry kinds:

- Text
- Daily
- Meal
- Fluid
- Symptom
- Stool
- Medication
- Exercise
- Menstruation
- Note
- Custom

Logic:

- Patients can edit/delete their own entries.
- Doctors can only read linked patient entries.
- Pending offline entries must be visually distinct.
- Cached/offline timeline must clearly say it is showing saved cached data.

### Text / Note Entry

Goal: Fast, low-friction entry for observations.

Fields:

- Date: date picker
- Time: time picker
- Text: textarea
- Voice input button for text field

Logic:

- Text is required.
- Date/time must be valid and not malformed.
- Offline creation is allowed for notes/text entries and should show pending sync.
- Voice transcript appends to the text field and remains editable before save.

### Baseline Profile

Goal: Capture stable patient research background.

Fields:

- Recorded sex: dropdown/segmented control
  - female
  - male
  - other
  - prefer not to say
- Birth year: number
- Occupation: text
- Chronic diseases: text or repeatable disease rows
- Chronic therapy: text or repeatable medication rows
- Menstrual history: textarea, optional and shown only when recorded sex is female
- Height: number, centimeters
- Weight: number, kilograms
- Recent major weight change: yes/no
- Recent major weight change description: textarea

Logic:

- Required: sex, birth year, occupation, weight, height, recent major weight change.
- Birth year must be between 1900 and current year.
- Weight must be greater than 0 and not more than 500 kg.
- Height must be between 50 and 250 cm.
- If recent major weight change is yes, description is required.
- If recorded sex is female, show menstrual history and enable menstruation tracking.
- If recorded sex is male, hide menstruation fields/tracking.
- A 3-month weight reminder exists in the product plan; design can include a subtle reminder state.

### Daily Form

Goal: Record one complete set of daily research responses.

Fields:

- Tracked day: date
- Wake time: time
- Sleep last night: duration/time duration
- Appetite: low/usual/high
- Physical activity today: yes/no
- Activity notes: textarea
- Took chronic therapy today: yes/no, only if chronic therapy exists in baseline
- Medication outside chronic therapy: yes/no
- Medication outside chronic therapy details: text/textarea
- Menstruation today: yes/no, only for applicable female patients
- Menstruation notes/details: textarea
- Naps today: yes/no
- Nap details: textarea
- Stress level: 1/2/3 scale
- Energy level: 1/2/3 scale
- Describe your day: textarea

Logic:

- Required: wake time, sleep duration, appetite, physical activity answer, medication outside chronic answer, naps answer, stress level, energy level, day description.
- If baseline has chronic therapy, chronic therapy taken answer is required.
- If baseline has no chronic therapy, chronic therapy taken should default or remain disabled as no.
- If naps is yes, nap details are required.
- If menstruation applies, menstruation yes/no is required.
- Daily form can save draft progress.
- Final completion requires every applicable required field.
- If physical activity is yes, the day's Exercise panel is required.
- If medication outside chronic therapy is yes, the day's Medication panel is required.
- If menstruation is yes, the day's Menstruation panel is required.

### Food And Hydration

Goal: Record water, other fluids, and meals for a tracked day.

Fields:

- Water amount: number in liters, two decimals max
- Other fluids: yes/no
- Other fluids list: repeatable rows
- Meals list: repeatable rows

Logic:

- Water amount is required.
- Water must be between 0 and 20 liters and use at most two decimals.
- Other fluids yes/no is required.
- If other fluids is yes, at least one complete other fluid row is required.
- At least one complete meal is required for the food form to be complete.
- Photo upload is allowed for meals and other fluids only.

### Meal Row / Meal Entry

Goal: Record a meal or snack.

Fields:

- Meal time: date/time or time within tracked day
- Meal type: dropdown
  - breakfast
  - lunch
  - dinner
  - snack
  - other
- Meal name: text
- Meal description: textarea, optional
- Photo: optional upload/take picture

Logic:

- Time, type, and name are required for each started meal.
- Description is optional.
- Photo is optional.
- Photo is compressed and thumbnailed before upload.

### Other Fluid Row

Goal: Record non-water drinks.

Fields:

- Fluid time: date/time or time within tracked day
- Fluid name: text
- Photo: optional upload/take picture

Logic:

- If a fluid row is started, time and name are required.
- Photo is optional.
- Photo is compressed and thumbnailed before upload.

### Photo Attachment

Goal: Add a private compressed photo to an allowed entry.

Allowed contexts:

- Meal photo
- Other fluid photo
- Medication photo

Fields/controls:

- Choose photo
- Take picture on mobile if available
- Preview image
- Replace photo
- Upload photo
- Saved photos list
- Storage warning text

Logic:

- Do not design photo input for daily, symptom, stool, exercise, menstruation, note, or custom-note entries.
- Do not upload original full-resolution image.
- Resize main image to max width 1280 px.
- Encode JPEG around quality 0.8.
- Create thumbnail.
- Target main size: 250-500 KB where possible.
- Target thumbnail size: 20-60 KB.
- Store paths/metadata only, never base64.
- Offline photo upload is not supported in V1.

### Symptom Form

Goal: Record one or more symptoms with structured details.

Symptom selector:

- bloating
- pain
- gas
- stomach burning
- heartburn
- regurgitation
- early satiety
- belching
- nausea
- vomiting
- blood present
- stomach heaviness
- difficulty swallowing
- painful swallowing
- false urge to defecate
- other
- none

Per-symptom fields:

- Symptom type: dropdown/checkbox
- Custom symptom name: text
- Start date/time: datetime
- End date/time: datetime, optional if ongoing
- Intensity: 1/2/3
- Modifying factors: textarea, optional
- Woke from sleep: yes/no

Additional fields when symptom type is pain:

- Pain location: dropdown
  - upper abdomen
  - lower abdomen
  - left abdomen
  - right abdomen
  - whole abdomen
  - chest
  - throat
  - other
- Custom pain location: text
- Pain radiates: yes/no
- Pain radiation location/details: text
- Pain description: dropdown
  - cramping
  - burning
  - sharp
  - dull
  - pressure
  - stabbing
  - throbbing
  - other
- Custom pain description: text

Logic:

- At least one symptom selection is required.
- If "none" is selected, it must be the only symptom and no extra details are needed.
- If "other" symptom is selected, custom symptom name is required.
- For each non-none symptom, start date/time, intensity, and woke-from-sleep answer are required.
- End date/time is optional, but if entered it must be after start date/time.
- For pain, pain location, pain radiates, and pain description are required.
- If pain location is other, custom location is required.
- If pain radiates is yes, radiation details are required.
- If pain description is other, custom description is required.

### Stool Form

Goal: Record one bowel movement using Bristol scale, or mark no stool today.

Fields:

- Bristol stool scale: 1-7 selector
- Urgency: none/mild/moderate/severe
- Pain/cramping: yes/no
- Mucus: yes/no
- Blood: yes/no
- Fatty/oily stool: yes/no
- Black/tarry stool: yes/no
- Notes: textarea, optional

Special action:

- No stool today

Logic:

- Bristol type is required and must be 1-7.
- Urgency is required.
- All yes/no symptom checkmarks are required.
- Notes are optional.
- User can add another stool entry for the same day after saving.
- "No stool today" saves a special note-like marker for the day.
- Do not collect stool photos in V1.

### Medication Form

Goal: Record medication dose and optional package/pill photo.

Fields:

- Medication name: text
- Dose: text
- Time taken: date/time or date plus HH:MM
- Is chronic therapy: yes/no
- Reason or notes: textarea, optional
- Photo: optional upload/take picture

Logic:

- Name, dose, taken time, and chronic-therapy answer are required.
- Reason is optional.
- Photo is optional and allowed for medication only.
- Photo must use the V1 compressed/private photo workflow.

### Exercise Form

Goal: Record physical activity.

Fields:

- Activity: text
- Duration: number, minutes
- Intensity: light/moderate/vigorous
- Date/time: datetime
- Notes: textarea, optional

Logic:

- Activity, duration, intensity, and date/time are required.
- Duration must be a whole number greater than 0 and no more than 1440 minutes.
- After saving, user can add another exercise or return home.
- If Daily physical activity is yes, at least one exercise entry is required for day completion.

### Menstruation Form

Goal: Record menstrual flow and pain where applicable.

Fields:

- Flow: light/moderate/heavy
- Pain level: 1/2/3
- Date/time: datetime
- Notes: textarea, optional

Logic:

- Show this form only when recorded sex is female.
- Flow, pain level, and date/time are required.
- Notes are optional.
- If Daily menstruation is yes, menstruation entry is required for day completion.

### Doctor Invite Redemption

Goal: Let a patient link a doctor by invite code.

Fields:

- Invite code: text
- Redeem/link doctor button

Logic:

- Invite codes are single-use.
- Invite codes expire after 7 days.
- Revoked codes fail.
- Redeemed/used codes fail on reuse.
- Offline redemption is not supported; show "try again online".
- Success links the patient timeline to that doctor.

### Doctor Dashboard

Goal: Let doctor manage invites and open linked patient timelines.

Sections:

- Doctor profile/status
- Patient invite panel
- Recent invite codes
- Linked patients list

Fields/controls:

- Create invite code button
- Current active invite code display
- Expiration date
- Invite status chip: active, used, expired, revoked
- Revoke button for unused active invites
- Linked patient rows
- Open patient button

Logic:

- Doctor can create invite codes.
- Doctor can revoke unused active invite codes.
- Doctor cannot revoke already used/expired/revoked invites.
- Linked patients appear after redeeming a doctor invite code.
- A patient who already has an active doctor link cannot redeem another doctor's code.
- A doctor can have many linked patient rows; the one-doctor limit applies to each patient, not to the doctor.
- Doctor sees only active linked patients.

### Linked Patient Read-Only Timeline

Goal: Doctor reviews linked patient history without editing it.

Fields/controls:

- Patient display/name/code
- Linked date/access status
- Date selector
- Entry list
- Entry details
- Photo thumbnails where allowed
- Read-only badge
- Export action

Logic:

- No edit/delete controls.
- If doctor is unlinked or access is revoked, patient data must be hidden.
- Use clear read-only visual language.

### Doctor Export Panel

Goal: Create JSON exports for active linked patients.

Fields:

- Patient: selected linked patient
- Range type: selected day or partial month
- Selected day: date
- Partial month: month selector/current month
- Export mode: dropdown/radio
  - all data
  - all data with images
  - images only with labels
- Create export button

Logic:

- Only active linked doctors can export.
- Unlinked doctor export fails.
- Export ranges are selected day or selected/current partial month.
- JSON must never embed base64 image data.
- Export should show running, success, failure, and unavailable states.
- Expected pilot exports should finish in under 30 seconds.

### Settings

Goal: Control personal app preferences.

Fields:

- App language: Serbian/English
- Voice language: sr-RS/en-US
- Theme: light/dark/system if desired
- Sign out

Logic:

- Language applies to patient and doctor core flows.
- Voice language affects speech input only.
- Theme uses shared light/dark tokens.

## Important Cross-Screen Behaviors

### Offline-Lite

Design states:

- Offline banner
- Online-only action disabled state
- Cached timeline notice
- Pending sync chip/marker
- Sync retry/refresh
- Reconnected/synced state

Rules:

- Cached own recent history and opened days can be viewed offline.
- Pending text/note creation and timestamp edits can be queued offline.
- Pending items sync on reconnect.
- Fresh doctor/patient fetches are not supported offline.
- Fresh exports are not supported offline.
- Photo upload is not supported offline.

### Voice Input

Design states:

- Use voice button
- Listening state
- Transcript added
- Permission/unavailable state
- Unsupported fallback

Rules:

- Use free device/browser voice support only.
- Voice applies to text fields where useful.
- Transcript is appended to the field.
- User can edit before saving.
- No raw audio storage.

### Privacy And Safety

Design implications:

- Keep security/privacy status visible but not alarmist.
- Avoid public-looking social/dashboard patterns.
- Avoid anything that suggests doctor can edit patient data.
- Avoid diagnosis language such as "detected", "risk score", "treatment", "recommendation", or "urgent".
- Use "research tracking", "record", "review", "timeline", and "export".

## Mobile And Web Layout Guidance

### Android Mobile

- Primary design target.
- Phone-first navigation.
- Large touch targets.
- Single-column forms.
- Sticky or easy-to-reach save actions where appropriate.
- Bottom/action navigation can be used if it improves daily workflows.
- Pixel 9-style dimensions are the first visual review target.
- Also check a smaller phone viewport.

### Web Companion App

- Same workflows and data, adapted to responsive web.
- Do not simply show the mobile app inside a phone frame as the production web layout.
- Use wider space for timeline + detail, doctor dashboard columns, and export panels.
- Maintain the same medical privacy tone.
- Must remain readable and usable on mobile web widths too.

## Suggested Information Architecture

### Patient Mobile Primary Tabs / Areas

- Today
- Timeline
- Add / Log
- Profile
- Settings

The actual implementation may use buttons instead of tabs, but the design should make these areas clear.

### Patient Daily Quick Actions

- Daily
- Food
- Symptoms
- Stool
- Medication
- Exercise
- Period, only if applicable
- Notes

### Doctor Main Areas

- Dashboard
- Invites
- Linked patients
- Patient timeline
- Exports
- Settings

## Data And Security Notes For Designers

- Patient owns patient-created data.
- Doctor access depends on active doctor-patient link.
- Each patient has at most one active doctor link; each doctor may have many active patient links.
- Changing a patient's doctor requires operator deactivation/revocation of the current link in V1.
- Revoked access must hide patient data from doctor.
- No app data for unauthenticated users.
- Photos are private.
- Export JSON must not include base64 images.
- Service-role/admin credentials never appear in client UI.

## Acceptance Criteria Relevant To Design

- Patient can log in, accept consent, create a timestamped text entry, reload, and see it on timeline.
- Full baseline and daily medical/symptom forms save and reload without required field loss.
- Offline pending text/note entry syncs after reconnect.
- Photos are compressed, thumbnailed, private, and limited to meals, other fluids, and medication.
- Voice works where supported and typing fallback works elsewhere.
- Doctor invite code links one patient, rejects reuse and second-active-doctor redemption, allows the doctor to link additional patients through separate codes, and hides unlinked patients.
- Doctor exports selected day and selected/current partial month JSON in all three modes.
- Serbian/English and light/dark theme work in core flows.

## Current Implementation Status Context

Recent implementation checkpoints before this handoff:

- Phase 6 photo and voice workflows were implemented and stabilized.
- Phase 6 photo storage was hardened.
- Phase 7 invite redemption checkpoint was completed.

This means the design agent should treat patient forms, offline-lite, photo/voice, and invite redemption as real product surfaces, not speculative extras.
