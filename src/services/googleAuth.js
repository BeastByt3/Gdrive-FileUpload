// src/services/googleAuth.js

const { GoogleAuth } = require('google-auth-library');

async function getGoogleAuthClient(scopes = []) {
  // GOOGLE_CREDENTIALS should be the same JSON string used for Firebase Admin
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

  const auth = new GoogleAuth({
    credentials,
    scopes
  });

  // Returns an authenticated client you can pass to google.sheets() or google.drive()
  return auth.getClient();
}

module.exports = { getGoogleAuthClient };