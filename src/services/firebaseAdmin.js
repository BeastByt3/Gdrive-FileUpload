// src/services/firebaseAdmin.js

const admin = require('firebase-admin');

try {
  // GOOGLE_CREDENTIALS should be the JSON string of your service account key
  const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('✅ Firebase Admin initialized.');
} catch (err) {
  console.error(
    '❌ Failed to initialize Firebase Admin. ' +
    'Make sure GOOGLE_CREDENTIALS env var is set correctly.',
    err
  );
  process.exit(1);
}

const db = admin.firestore();

module.exports = { admin, db };