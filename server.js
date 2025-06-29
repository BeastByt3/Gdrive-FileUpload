const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
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

// Root URL to confirm server is running
app.get('/', (req, res) => {
  res.send('Case Management Server is live and running.');
});


// File Upload Endpoint
app.post('/upload-file', multer({ storage: multer.memoryStorage() }).single('file'), async (req, res) => {
  console.log("--- New file upload request ---");
  try {
    if (!req.file) {
      console.log("Upload failed: No file found in request.");
      return res.status(400).send('No file uploaded.');
    }
    console.log(`Receiving file: ${req.file.originalname}`);

    const authClient = await getGoogleAuthClient(['https://www.googleapis.com/auth/drive.file']);
    const drive = google.drive({ version: 'v3', auth: authClient });
    
    const bufferStream = new stream.PassThrough().end(req.file.buffer);

    const { data } = await drive.files.create({
      media: { mimeType: req.file.mimetype, body: bufferStream },
      requestBody: { name: req.file.originalname, parents: [process.env.DRIVE_FOLDER_ID] },
      fields: 'id,name',
    });

    console.log(`Success! Uploaded File ID: ${data.id}`);
    res.status(200).json({ success: true, message: `File "${data.name}" uploaded successfully.` });
  } catch (error) {
    console.error('--- ERROR during file upload ---', error);
    res.status(500).json({ success: false, error: 'Error uploading file to Google Drive.' });
  }
});


// Dynamic Form Submission Endpoint
app.post('/submit-form', async (req, res) => {
  console.log("--- New DYNAMIC form submission request ---");
  try {
    const { formId, submissionData, headers } = req.body;
    
    console.log("Step 1: Received Payload:", JSON.stringify(req.body, null, 2));

    if (!formId || !submissionData || !headers) {
      console.error("Step 1 FAILED: Missing formId, headers, or submission data.");
      return res.status(400).json({ success: false, error: 'Incomplete request from the website.' });
    }
    console.log(`Step 2: Processing submission for form ID: ${formId}`);

    // Fetch the correct spreadsheet ID from the form definition
    const formDoc = await db.collection('forms').doc(formId).get();
    if (!formDoc.exists) {
      console.error(`Step 2 FAILED: Form with ID ${formId} not found in Firestore.`);
      return res.status(404).json({ success: false, error: 'Form definition not found in database.' });
    }
    const spreadsheetId = formDoc.data().spreadsheetId;
    console.log(`Step 3: Target Spreadsheet ID is ${spreadsheetId}`);

    // Dynamically create the data row in the correct order
    const dataRow = headers.map(header => submissionData[header.name] || '');
    console.log('Step 4: Ordered Data Row:', dataRow);

    // Connect to Google Sheets
    const authClient = await getGoogleAuthClient(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    
    console.log("Step 5: Checking for headers in the sheet...");
    const headerCheck = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Sheet1!1:1' });
    if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
        console.log("Step 5a: No headers found. Creating them now...");
        const headerRow = ['Timestamp', ...headers.map(h => h.label)];
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [headerRow] },
        });
    } else {
        console.log("Step 5b: Headers already exist.");
    }

    // Append the new data row
    console.log("Step 6: Appending data to the sheet...");
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[new Date().toISOString(), ...dataRow]] },
    });

    console.log("Step 7: Success! Data saved to Google Sheet correctly.");
    res.status(200).json({ success: true, message: 'Your submission has been saved.' });

  } catch (error) {
    console.error('--- CRITICAL ERROR in /submit-form endpoint ---', error.message);
    res.status(500).json({ success: false, error: 'A critical server error occurred.' });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});