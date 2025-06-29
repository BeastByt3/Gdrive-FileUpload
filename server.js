const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// --- INITIALIZATION ---
app.use(cors());
app.use(express.json()); // <--- THIS IS THE MISSING LINE THAT FIXES THE BUG

const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();


// --- ALL YOUR ENDPOINTS ---

// File Upload Endpoint
app.post('/upload-file', multer({ storage: multer.memoryStorage() }).single('file'), async (req, res) => {
    // ... your working file upload code here ...
});

// Dynamic Form Submission Endpoint
app.post('/submit-form', async (req, res) => {
  console.log("--- New DYNAMIC form submission request ---");
  try {
    // This line was failing because express.json() was missing
    const { formId, submissionData, headers } = req.body; 

    if (!formId || !submissionData || !headers) {
      console.error("Incomplete data received by server:", req.body);
      return res.status(400).json({ success: false, error: 'Missing formId, headers, or submission data.' });
    }
    console.log(`Processing submission for form ID: ${formId}`);

    const formDoc = await db.collection('forms').doc(formId).get();
    if (!formDoc.exists) {
      return res.status(404).json({ success: false, error: 'Form definition not found in database.' });
    }
    const formDef = formDoc.data();
    const spreadsheetId = formDef.spreadsheetId;

    const dataRow = formDef.fields.map(field => submissionData[field.name] || '');
    console.log('Ordered Data Row:', dataRow);

    const auth = new GoogleAuth({
        credentials: serviceAccount,
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Check/Create Headers
    const headerCheck = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Sheet1!A1:Z1' });
    if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
        const headerRow = ['Timestamp', ...formDef.fields.map(h => h.label)];
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [headerRow] },
        });
    }

    // Append Data
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

// Root URL
app.get('/', (req, res) => {
  res.send('Case Management Server is live and running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});