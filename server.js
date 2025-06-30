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
    console.error("FATAL ERROR: Could not initialize Firebase Admin. Check GOOGLE_CREDENTIALS environment variable.", e);
}
const db = admin.firestore();


// --- HELPER FUNCTION ---
async function getGoogleAuthClient(scopes) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const auth = new GoogleAuth({ credentials, scopes });
  return auth.getClient();
}


// --- ROUTES ---

app.get('/', (req, res) => {
  res.send('Case Management Server is live and fully dynamic.');
});

// Your working file upload endpoint
app.post('/upload-file', multer({ storage: multer.memoryStorage() }).single('file'), async (req, res) => {
  // ... your existing working file upload code ...
});

// Your working header update endpoint
app.post('/update-sheet-headers', async (req, res) => {
    // ... your existing working header sync code ...
});

// The smart, dynamic Form Submission Endpoint
app.post('/submit-form', async (req, res) => {
  console.log("--- New DYNAMIC form submission request ---");
  try {
    const { formId, submissionData } = req.body;

    if (!formId || !submissionData) {
      return res.status(400).json({ success: false, error: 'Missing formId or submission data.' });
    }
    
    // 1. Fetch the correct form's definition from Firestore using the ID
    const formDoc = await db.collection('forms').doc(formId).get();
    if (!formDoc.exists) {
      return res.status(404).json({ success: false, error: 'Form definition not found.' });
    }
    const formDef = formDoc.data();

    // 2. THIS IS THE FIX: Get the spreadsheetId from the form definition, NOT from the environment
    const spreadsheetId = formDef.spreadsheetId;
    if (!spreadsheetId) {
        return res.status(500).json({ success: false, error: 'The form creator has not assigned a Google Sheet ID to this form.'});
    }
    console.log(`Data will be saved to Spreadsheet ID: ${spreadsheetId}`);

    const headers = formDef.fields.map(field => field.label);
    const dataRow = formDef.fields.map(field => submissionData[field.name] || '');
    
    // 3. Connect to Google Sheets and save the data
    const authClient = await getGoogleAuthClient(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    
    // This part to check and create headers remains the same and is already dynamic
    const headerCheck = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Sheet1!1:1' });
    if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [['Timestamp', ...headers]] },
        });
    }

    await sheets.spreadsheets.values.append({
	spreadsheetId,
	range: 'Sheet1',
	valueInputOption: 'USER_ENTERED',
	insertDataOption: 'INSERT_ROWS',
	resource: {
		values: [[
			new Date().toLocaleString("en-PH", {
				timeZone: "Asia/Manila",
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				hour12: false  // ✅ 24-hour format
			}),
			...dataRow
			]]
		},
	});



    console.log("Success! Data saved to the correct Google Sheet.");
    res.status(200).json({ success: true, message: 'Your submission has been saved.' });

  } catch (error) {
    console.error('--- CRITICAL ERROR in /submit-form endpoint ---', error);
    res.status(500).json({ success: false, error: 'A server error occurred.' });
  }
});


// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running and listening on port ${PORT}`);
});