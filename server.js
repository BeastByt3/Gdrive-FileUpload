const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
// IMPORTANT: We need Firebase Admin on the server to read form definitions
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// --- INITIALIZATION ---
// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.GOOGLE_CREDENTIALS))
});
const db = admin.firestore();

// ... (multer setup and other endpoints like /upload-file can remain) ...

// === THE NEW, SMART, DYNAMIC SUBMISSION ENDPOINT ===
app.post('/submit-form', async (req, res) => {
  console.log("--- New DYNAMIC form submission request ---");
  try {
    const { formId, submissionData } = req.body;
    if (!formId || !submissionData) {
      return res.status(400).json({ success: false, error: 'Missing formId or submission data.' });
    }
    console.log(`Processing submission for form ID: ${formId}`);

    // 1. Fetch the form's structure from Firestore
    const formDoc = await db.collection('forms').doc(formId).get();
    if (!formDoc.exists) {
      return res.status(404).json({ success: false, error: 'Form not found.' });
    }
    const formDef = formDoc.data();
    const spreadsheetId = formDef.spreadsheetId;
    console.log(`Targeting Spreadsheet ID: ${spreadsheetId}`);

    // 2. Dynamically create the header and data rows IN ORDER
    const headers = ['Timestamp'];
    const dataRow = [new Date().toISOString()];
    
    formDef.fields.forEach(field => {
      headers.push(field.label); // The human-readable label for the header
      dataRow.push(submissionData[field.name] || ''); // The data, matched by the machine-readable name
    });

    console.log('Ordered Headers:', headers);
    console.log('Ordered Data Row:', dataRow);

    // 3. Connect to Google Sheets
    const auth = new GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });
    const sheets = google.sheets({ version: 'v4', auth });
    
    // 4. Check if headers exist. If not, create them.
    const headerCheck = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sheet1!A1:Z1',
    });
    
    if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
        console.log("Sheet has no headers. Creating them now...");
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [headers] },
        });
    }

    // 5. Append the new data row
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [dataRow] },
    });

    console.log("Success! Data saved to Google Sheet correctly.");
    res.status(200).json({ success: true, message: 'Your submission has been saved.' });

  } catch (error) {
    console.error('--- CRITICAL ERROR in /submit-form endpoint ---', error);
    res.status(500).json({ success: false, error: 'A critical error occurred on the server.' });
  }
});

// You can now remove the old /submit-shs and /create-headers endpoints if you wish

app.listen(process.env.PORT || 3000, () => {
  console.log('Server is running.');
});