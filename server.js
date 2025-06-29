const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
// We absolutely need firebase-admin to read the form definitions
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- CORRECT INITIALIZATION ---
// This uses the credentials to initialize BOTH Firebase and other Google Services
const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// --- All other working endpoints can stay ---
// ... (/upload-file, etc.)

// === THE FINAL, STABLE, DYNAMIC SUBMISSION ENDPOINT ===
app.post('/submit-form', async (req, res) => {
  console.log("--- New DYNAMIC form submission request ---");
  try {
    const { formId, submissionData } = req.body;
    if (!formId || !submissionData) {
      return res.status(400).json({ success: false, error: 'Missing formId or submission data.' });
    }
    console.log(`Processing submission for form ID: ${formId}`);

    // 1. Fetch the form's structure from our Firestore database
    const formDoc = await db.collection('forms').doc(formId).get();
    if (!formDoc.exists) {
      return res.status(404).json({ success: false, error: 'Form definition not found in database.' });
    }
    const formDef = formDoc.data();
    const spreadsheetId = formDef.spreadsheetId;
    console.log(`Targeting Spreadsheet ID: ${spreadsheetId}`);

    // 2. Dynamically create the data row IN THE CORRECT ORDER
    const headers = formDef.fields.map(field => field.label);
    const dataRow = formDef.fields.map(field => submissionData[field.name] || '');
    console.log('Ordered Data Row:', dataRow);

    // 3. Connect to Google Sheets using the same credentials
    const auth = new GoogleAuth({
        credentials: serviceAccount,
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });
    const sheets = google.sheets({ version: 'v4', auth });
    
    // 4. Check if headers exist. If not, create them.
    const headerCheck = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Sheet1!A1:Z1' });
    if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
        console.log("Sheet has no headers. Creating them now...");
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [['Timestamp', ...headers]] },
        });
    }

    // 5. Append the new data row
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[new Date().toISOString(), ...dataRow]] },
    });

    console.log("Success! Data saved to Google Sheet correctly.");
    res.status(200).json({ success: true, message: 'Your submission has been saved.' });

  } catch (error) {
    console.error('--- CRITICAL ERROR in /submit-form endpoint ---', error);
    res.status(500).json({ success: false, error: 'A server error occurred.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});