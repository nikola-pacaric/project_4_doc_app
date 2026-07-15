# Android release build

The production application ID is `com.patientresearchtracking.app`. Treat it as permanent after the first published build because changing it creates a different Android application.

Release builds never use the repository's debug key. Configure these values either as environment variables or in your user-level Gradle properties file (outside this repository):

```properties
PATIENT_RELEASE_STORE_FILE=C:/secure/path/patient-research-tracking-release.jks
PATIENT_RELEASE_STORE_PASSWORD=replace-with-secret
PATIENT_RELEASE_KEY_ALIAS=patient-research-tracking
PATIENT_RELEASE_KEY_PASSWORD=replace-with-secret
```

The keystore and passwords are release credentials. Back them up securely and never add them to Git. A release build fails before packaging when any signing value is missing or when the keystore path does not exist.

The default release version is code `2`, name `0.1.0`. Override either value for later releases without editing source:

```properties
PATIENT_VERSION_CODE=3
PATIENT_VERSION_NAME=0.1.1
```

From `apps/mobile/android`, build the signed APK with:

```powershell
.\gradlew.bat assembleRelease
```

For Play Store distribution, build the signed Android App Bundle with:

```powershell
.\gradlew.bat bundleRelease
```
