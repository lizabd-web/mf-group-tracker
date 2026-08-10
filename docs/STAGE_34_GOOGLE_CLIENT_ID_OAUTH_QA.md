# Stage 34 — Google Client ID OAuth QA

## Goal

Prepare real Google sign-in QA for BA Fox / MF Group Tracker without turning on full enforcement yet.

Target result:

- frontend can show real `Войти через Google`;
- Google Identity Services returns an ID token;
- frontend sends the token to Apps Script `route=profile` / `route=me`;
- Apps Script verifies the token through Google tokeninfo;
- Apps Script checks `@mfstream.io`;
- Apps Script maps the email to the `Users` sheet;
- Settings/Profile shows the verified registered user;
- Liza resolves as `admin`;
- dashboard and task creation still work in `profile_only` mode.

## Current Status Before Stage 34

Stage 33 is merged, manually deployed, and accepted in safe mode.

Current live state:

- dashboard loads;
- task creation works;
- success modal says `Задача добавлена`;
- Settings/Profile renders;
- `route=profile` and `route=me` work;
- `Users` sheet exists and has 10 users;
- `IDENTITY_ENFORCEMENT_MODE` is `profile_only`;
- backend enforcement status is `partial`;
- Google token verification exists through tokeninfo;
- without Google login, profile response has `identityMode: missing_token`;
- without Apps Script `GOOGLE_CLIENT_ID`, profile limitations say audience matching is not active;
- pilot with Andrey and Daniil remains paused.

## What Stage 34 Changes

Stage 34 does not enable full enforcement by default.

Changes in this stage:

- `web/config.example.js` now uses the preferred `window.BA_FOX_RUNTIME_CONFIG` name.
- Settings/Profile copy explicitly shows `Профиль не подтверждён` when Google verification has not completed.
- This document adds the manual Google Cloud Client ID setup and live OAuth QA checklist.

No OAuth secret is added.

## Google Cloud Client ID Setup

1. Open Google Cloud Console:

```text
https://console.cloud.google.com/
```

2. Create or select the project used for BA Fox / MF Group Tracker.

3. Open:

```text
APIs & Services → Credentials
```

4. If prompted, configure OAuth consent screen first:

- user type: internal if available for the Workspace;
- app name: BA Fox / MF Group Tracker;
- user support email: Liza's workspace email;
- developer contact email: Liza's workspace email;
- scopes: no extra API scopes are needed for Google Identity Services ID token sign-in.

5. Create the OAuth Client ID:

```text
Create Credentials → OAuth client ID
```

6. Application type:

```text
Web application
```

7. Name:

```text
BA Fox Web Dashboard
```

8. Authorized JavaScript origins:

Add the GitHub Pages origin used by the dashboard, for example:

```text
https://lizabd-web.github.io/mf-group-tracker/
```

For local/dev testing, add only if needed:

```text
http://127.0.0.1:8000
http://localhost:8000
```

Use origins only. Do not include paths.

9. Authorized redirect URIs:

For the current Google Identity Services ID token flow, redirect URIs are usually not required because the app uses the credential callback, not an authorization-code redirect.

If Google Cloud Console requires one for the selected setup, use the deployed dashboard URL exactly as documented by Google for the selected client type. Do not invent callback paths unless the app implements them.

10. Copy the Client ID.

It should look like:

```text
xxxxx.apps.googleusercontent.com
```

Do not copy or store a client secret.

## Frontend Runtime Config Setup

Set the Client ID in runtime config, not in source code.

Preferred runtime object:

```js
window.BA_FOX_RUNTIME_CONFIG = {
  APPS_SCRIPT_ENDPOINT: 'YOUR_APPS_SCRIPT_WEB_APP_URL',
  BA_FOX_ACTION_TOKEN: 'SET_OUTSIDE_REPO',
  GOOGLE_CLIENT_ID: 'xxxxx.apps.googleusercontent.com',
  GOOGLE_ALLOWED_DOMAIN: 'mfstream.io',
  IDENTITY_ENFORCEMENT_MODE: 'profile_only',
  VISIBILITY_ENFORCEMENT: false,
  USE_MOCK_DATA: false,
};
```

Keep:

```text
IDENTITY_ENFORCEMENT_MODE=profile_only
VISIBILITY_ENFORCEMENT=false
```

for first OAuth QA.

## Apps Script Script Properties Setup

In Apps Script:

```text
Project Settings → Script Properties
```

Add:

```text
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

The Apps Script `GOOGLE_CLIENT_ID` must match the frontend `GOOGLE_CLIENT_ID`.

If this property is missing:

- token verification can still call tokeninfo;
- email/domain/user checks can still work;
- audience matching is not active;
- profile response must continue to report that limitation honestly.

## Expected Profile Outputs

### Before Client ID

Expected UI:

```text
Google-вход готовится
Профиль не подтверждён
Backend enforcement: Не завершён
```

Expected profile/me:

```text
identityMode: missing_token
tokenVerification.error: MISSING_TOKEN
enforcementMode: profile_only
backendEnforcementStatus: partial
```

### After Client ID, Before Sign-In

Expected UI:

```text
Войти через Google
Профиль не подтверждён
```

Expected profile/me remains:

```text
identityMode: missing_token
tokenVerification.error: MISSING_TOKEN
```

### After Sign-In With Allowed Registered User

For Liza:

```text
identityMode: google_token_verified
profile.email: liza@mfstream.io
profile.accessRole: admin
profile.canSeeAll: true
permissions.canManageUsers: true
permissions.canCreateTasks: true
enforcementMode: profile_only
backendEnforcementStatus: partial
```

Expected UI:

```text
Профиль подтверждён
Проверено через Google
```

### Wrong Domain

For a non-`mfstream.io` account:

```text
identityMode: domain_not_allowed
profile.status: domain_not_allowed
permissions.canCreateTasks: false
```

Expected UI:

```text
Доступ запрещён: нужен аккаунт mfstream.io
```

### Unregistered User

For an `@mfstream.io` account missing from `Users`:

```text
identityMode: user_not_registered
profile.status: user_not_registered
permissions.canCreateTasks: false
```

Action:

- add the user to the `Users` sheet if they should participate;
- keep pilot paused until this is retested.

## Live OAuth QA Checklist

Run this only after the Client ID is set in both frontend runtime config and Apps Script Script Properties.

1. Open the deployed dashboard.
2. Open `Настройки`.
3. Confirm `Войти через Google` is enabled.
4. Click `Войти через Google`.
5. Choose Liza's `@mfstream.io` account.
6. Confirm Settings/Profile shows:

```text
Профиль подтверждён
Проверено через Google
admin
```

7. Open the Apps Script URL manually:

```text
<WEB_APP_URL>?route=profile
```

8. Confirm a no-token request still returns an honest non-verified state.
9. From the frontend, confirm the token-backed profile response shows `google_token_verified`.
10. Create a test task.
11. Confirm success modal says:

```text
Задача добавлена
```

12. Confirm the task appears in `Все задачи`.
13. Confirm owner and direction filters still work.
14. Confirm product attribution remains visible.
15. Confirm dashboard remains in safe mode:

```text
enforcementMode: profile_only
filteredByUser: false
```

## Rollback Plan

If Google sign-in breaks or causes confusion:

1. Remove `GOOGLE_CLIENT_ID` from frontend runtime config.
2. Remove or ignore `GOOGLE_CLIENT_ID` in Apps Script Script Properties.
3. Keep:

```text
IDENTITY_ENFORCEMENT_MODE=profile_only
VISIBILITY_ENFORCEMENT=false
```

4. Redeploy only if Apps Script source changed.
5. Confirm dashboard loads.
6. Confirm task creation still works with the existing action token.

## Performance Debt

There is a noticeable slow response after creating a new task.

Current likely causes:

- Apps Script write latency;
- Google Sheets append/audit latency;
- immediate live dashboard refresh after submit;
- JSONP/network round trip.

Do not make this the focus of Stage 34.

Recommended follow-up:

```text
Stage 35 or separate performance stage — createTask latency and post-submit refresh optimization.
```

## Pilot Status

Pilot with Andrey and Daniil remains paused.

Do not start the pilot until:

- Client ID is configured;
- Liza sign-in resolves as admin;
- Andrey and Daniil sign-in resolves as active `member`;
- wrong-domain account is rejected;
- task creation still works;
- dashboard behavior in `profile_only` is understood;
- future member visibility columns are planned.

## Next Stage Recommendation

Recommended Stage 35:

```text
Task identity schema and real member visibility.
```

Scope:

- `ownerEmail` or `ownerUserId`;
- `collaboratorEmails` or `collaboratorUserIds`;
- `createdByEmail` or `createdByUserId`;
- `visibility`;
- role-based dashboard filtering;
- QA with Liza before employee pilot.
