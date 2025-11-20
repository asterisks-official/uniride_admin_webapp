/**
 * Script to list all Firebase users
 * Usage: node scripts/list-users.js
 */

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function listUsers() {
  try {
    console.log('Fetching users from Firebase Authentication...\n');

    const listUsersResult = await admin.auth().listUsers(100);
    
    if (listUsersResult.users.length === 0) {
      console.log('No users found.');
      return;
    }

    console.log(`Found ${listUsersResult.users.length} user(s):\n`);
    console.log('─'.repeat(80));

    listUsersResult.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email || 'No email'}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Created: ${user.metadata.creationTime}`);
      console.log(`   Admin: ${user.customClaims?.admin ? '✓ Yes' : '✗ No'}`);
      console.log('─'.repeat(80));
    });

    console.log(`\nTo make a user admin, run:`);
    console.log(`node scripts/set-admin-claim.js <email-or-uid>`);
  } catch (error) {
    console.error('Error listing users:', error.message);
    process.exit(1);
  }
}

listUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
