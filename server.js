const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
// We do not need firebase-admin on the server for this setup
// const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// --- All your other code for multer, file uploads, etc. remains here ---
// ...

// We will keep the generic /submit-form endpoint, but we cannot
// read the form definition from Firestore on the server without Firebase Admin.
// We will go back to a slightly less dynamic, but more stable approach for now.
app.post('/submit-shs', async (req, res) => {
  console.log("--- New SHS form submission request (Stable Version) ---");
  try {
    const studentData = req.body;
    console.log("Received form data for sheet.");

    // Connect to Google Sheets using GoogleAuth
    const auth = new GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // We go back to the hardcoded row order that we know works.
    // This assumes the form submitted is the SHS form.
    const newRow = [
      new Date().toISOString(), studentData.hhId || '', studentData.lastName || '', studentData.firstName || '',
      studentData.middleName || '', studentData.extName || '', studentData.birthday || '',
      studentData.sex || '', studentData.civilStatus || '', studentData.ipAffiliation || '',
      studentData.disability || '', studentData.attendingSchool || '', studentData.gradeLevel || '',
      studentData.track || '', studentData.strand || '', studentData.curriculumExit || ''
    ];
    
    console.log("Data row prepared. Appending to sheet...");

    await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID, // This still reads the ID from your environment
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [newRow] },
    });

    console.log("Success! Data saved to Google Sheet correctly.");
    res.status(200).json({ success: true, message: 'Your submission has been saved.' });

  } catch (error) {
    console.error('--- CRITICAL ERROR in /submit-shs endpoint ---', error);
    res.status(500).json({ success: false, error: 'A critical error occurred on the server.' });
  }
});


// All other endpoints and app.listen remain the same
app.listen(process.env.PORT || 3000, () => {
  console.log('Server is running.');
});