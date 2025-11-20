/**
 * Script to set admin custom claim for a Firebase user
 * Usage: node scripts/set-admin-claim.js <email-or-uid>
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

async function setAdminClaim(emailOrUid) {
  try {
    let uid;

    // Check if input is an email or UID
    if (emailOrUid.includes('@')) {
      console.log(`Looking up user by email: ${emailOrUid}`);
      const userRecord = await admin.auth().getUserByEmail(emailOrUid);
      uid = userRecord.uid;
      console.log(`Found user with UID: ${uid}`);
    } else {
      uid = emailOrUid;
      console.log(`Using provided UID: ${uid}`);
    }

    // Set the custom claim
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`✓ Successfully set admin claim for user: ${uid}`);

    // Verify the claim was set
    const user = await admin.auth().getUser(uid);
    console.log('\nUser details:');
    console.log(`  Email: ${user.email}`);
    console.log(`  UID: ${user.uid}`);
    console.log(`  Custom Claims:`, user.customClaims);

    console.log('\n✓ Done! The user must sign out and sign in again for the claim to take effect.');
  } catch (error) {
    console.error('Error setting admin claim:', error.message);
    process.exit(1);
  }
}

// Get email or UID from command line
const emailOrUid = process.argv[2];

if (!emailOrUid) {
  console.error('Usage: node scripts/set-admin-claim.js <email-or-uid>');
  console.error('Example: node scripts/set-admin-claim.js admin@example.com');
  process.exit(1);
}

setAdminClaim(emailOrUid)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
