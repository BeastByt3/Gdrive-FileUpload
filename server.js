const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

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
    console.error("FATAL ERROR: Could not initialize Firebase Admin.", e);
}
const db = admin.firestore();

// --- HELPER FUNCTION ---
async function getGoogleAuthClient(scopes) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const auth = new GoogleAuth({ credentials, scopes });
  return auth.getClient();
}

// --- ROUTES ---

app.get('/', (req, res) => { /* ... */ });
app.post('/upload-file', multer({ storage: multer.memoryStorage() }).single('file'), async (req, res) => { /* ... */ });
app.post('/submit-form', async (req, res) => { /* ... */ });

// === NEW ENDPOINT TO AUTOMATICALLY CREATE/UPDATE HEADERS ===
app.post('/update-sheet-headers', async (req, res) => {
    console.log("--- Received request to update sheet headers ---");
    try {
        const { spreadsheetId, fields } = req.body;
        if (!spreadsheetId || !fields) {
            return res.status(400).json({ success: false, error: 'Missing spreadsheetId or fields data.' });
        }

        console.log(`Updating headers for Spreadsheet ID: ${spreadsheetId}`);
        const authClient = await getGoogleAuthClient(['https://www.googleapis.com/auth/spreadsheets']);
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        const headers = ['Timestamp', ...fields.map(field => field.label)];

        // Clear the first row to ensure clean update
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'Sheet1!1:1',
        });

        // Write the new headers
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [headers] },
        });

        console.log("Headers updated successfully.");
        res.status(200).json({ success: true, message: 'Sheet headers updated successfully.' });

    } catch (error) {
        console.error('--- ERROR updating sheet headers ---', error);
        res.status(500).json({ success: false, error: 'A server error occurred while updating headers.' });
    }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});