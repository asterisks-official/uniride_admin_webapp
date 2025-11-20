# Admin User Setup Guide

## Quick Start

You now have two convenient npm scripts to manage admin users:

### 1. List All Users

```bash
npm run list-users
```

This will show all Firebase users with their:
- Email
- UID
- Creation date
- Admin status (✓ Yes or ✗ No)

### 2. Set Admin Claim

```bash
npm run set-admin <email-or-uid>
```

Examples:
```bash
# Using email
npm run set-admin superadmin@uniride.com

# Using UID
npm run set-admin 6Mi23TyhsGWOA5ayh0viQ3Rzsrt1
```

## Current Admin Users

✓ **superadmin@uniride.com** (UID: 6Mi23TyhsGWOA5ayh0viQ3Rzsrt1)

## Important Notes

1. **Sign Out Required**: After setting the admin claim, the user MUST sign out and sign in again for the claim to take effect.

2. **Password**: Make sure you know the password for the admin account. If you don't, you can reset it in the Firebase Console:
   - Go to Firebase Console > Authentication > Users
   - Find the user and click the three dots menu
   - Select "Reset password"

3. **Testing**: To test the admin portal:
   ```bash
   npm run dev
   ```
   Then navigate to `http://localhost:3000/login` and sign in with the admin credentials.

## Troubleshooting

### "User does not have admin privileges" error
- Make sure you ran the `set-admin` script successfully
- Sign out completely and sign in again
- Check that the custom claim was set by running `npm run list-users`

### Can't find the user
- Run `npm run list-users` to see all available users
- Make sure the email is spelled correctly

### Script errors
- Make sure `.env.local` file exists with Firebase credentials
- Verify that `dotenv` package is installed: `npm install dotenv`

## Alternative Methods

### Using Firebase Console
1. Go to Firebase Console > Authentication > Users
2. Click on a user
3. Scroll to "Custom claims"
4. Add: `{"admin": true}`

### Using Firebase CLI
```bash
firebase auth:set-custom-user-claims <uid> '{"admin": true}'
```

### Using Firebase Admin SDK (in code)
```javascript
admin.auth().setCustomUserClaims(uid, { admin: true });
```
