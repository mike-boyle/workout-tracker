# How to Ban a Malicious User

This document outlines the step-by-step procedure to ban a malicious user in both Firebase Authentication and Cloud Firestore, instantly stopping database access without incurring additional Firestore read costs.

---

## Banning Mechanics (Summary)

1. **Rule Enforcement (JWT Custom Claims)**: All Firestore reads, writes, and deletes are protected by checking if the user's Auth token contains a `banned: true` custom claim:
   ```javascript
   function isNotBanned() {
     return isAuthenticated() && (!('banned' in request.auth.token) || request.auth.token.banned != true);
   }
   ```
   Because security rules read the custom claims directly from the client's JWT payload, this verification is **completely free** and does not charge any database read operations.
2. **Account Disabling (Authentication Console)**: Disabling the account in the console prevents them from logging back in or generating new auth tokens.

---

## Action Plan: Banning a User

If you detect suspicious behavior (e.g., from Cloud Monitoring alerts or usage reports) and need to block a user:

### Step 1: Run the Ban Script (Instant Rule Block & Revoke)
You can run a script using the **Firebase Admin SDK** (either in Cloud Functions or via a local Node.js script) to update the user's custom claims and revoke their active login sessions. 

Create a script (e.g., `ban-user.js`) and run it:

```javascript
const admin = require('firebase-admin');

// Initialize the Admin SDK (Make sure your environment has service account credentials configured)
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

async function banUser(uid) {
  // 1. Set the 'banned' custom claim.
  // The moment the user's ID token is refreshed (or immediately once revoked), 
  // Firestore rules will block all their reads, writes, and deletes.
  await admin.auth().setCustomUserClaims(uid, { banned: true });
  console.log(`Successfully set banned claim for user: ${uid}`);

  // 2. Revoke active refresh tokens.
  // This invalidates the user's current session and forces the client to request a new ID token.
  // Because their session is revoked, the token refresh request will fail or return the new banned state.
  await admin.auth().revokeRefreshTokens(uid);
  console.log(`Revoked active sessions for user: ${uid}`);
}

// Replace with the malicious user's actual UID (found in Firebase Auth console)
const maliciousUid = 'MALICIOUS_USER_UID';
banUser(maliciousUid)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to ban user:', err);
    process.exit(1);
  });
```

To run this script locally:
```bash
# Set your Google Application Credentials to point to your Firebase Service Account JSON key
set GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
node ban-user.js
```

### Step 2: Disable the User Account in the Firebase Console
To ensure they can never sign in again:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: **Workout Tracker**.
3. Navigate to **Build** -> **Authentication** -> **Users**.
4. Search for the user using their email address or User ID (UID).
5. Click the three vertical dots (context menu) on the right side of the user's row.
6. Select **Disable account**.
