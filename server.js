const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000; // Render will provide the PORT

app.use(cors());
app.use(express.json());

// --- INITIALIZATION ---
try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized successfully.");
} catch (e) {
    console.error("FATAL ERROR: Could not initialize Firebase Admin. Check GOOGLE_CREDENTIALS environment variable.", e);
}
const db = admin.firestore();

// --- All of your endpoints are the same ---
// (/upload-file, /submit-form, etc.)
// ...

app.post('/submit-form', async (req, res) => {
  // ... your existing, correct submission logic ...
});

app.post('/upload-file', multer({ storage: multer.memoryStorage() }).single('file'), async (req, res) => {
  // ... your existing, correct upload logic ...
});

// ... and so on for other routes.


// === THIS IS THE ONLY LINE THAT CHANGES ===
// We explicitly tell the server to listen on host '0.0.0.0'
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running and listening on port ${PORT}`);
});