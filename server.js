const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// This helper function is stable
async function getGoogleAuthClient(scopes) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const auth = new GoogleAuth({ credentials, scopes });
  return auth.getClient();
}

// Your working file upload endpoint
app.post('/upload-file', multer({ storage: multer.memoryStorage() }).single('file'), async (req, res) => {
  // ... all the working file upload code ...
});


// A simple, stable endpoint specifically for the SHS form
app.post('/submit-shs-form', async (req, res) => {
  console.log("--- New SHS form submission ---");
  try {
    const studentData = req.body;
    console.log("Received data. Saving to sheet...");

    const authClient = await getGoogleAuthClient(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    
    // The stable, hardcoded row order
    const newRow = [
      new Date().toISOString(), studentData.hhId || '', studentData.lastName || '', studentData.firstName || '',
      studentData.middleName || '', studentData.extName || '', studentData.birthday || '',
      studentData.sex || '', studentData.civilStatus || '', studentData.ipAffiliation || '',
      studentData.disability || '', studentData.attendingSchool || '', studentData.gradeLevel || '',
      studentData.track || '', studentData.strand || '', studentData.curriculumExit || ''
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [newRow] },
    });
    
    console.log("Success! Data saved.");
    res.status(200).json({ success: true, message: 'Your submission has been saved.' });
  } catch (error) {
    console.error('--- ERROR saving to Google Sheets ---', error);
    res.status(500).json({ success: false, error: 'A server error occurred.' });
  }
});

app.get('/', (req, res) => {
  res.send('Case Management Server is live and running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});