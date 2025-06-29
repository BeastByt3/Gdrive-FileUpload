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

// This helper function is stable and works for all Google services
async function getGoogleAuthClient(scopes) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const auth = new GoogleAuth({ credentials, scopes });
  return auth.getClient();
}

// Endpoint for File Uploads to Google Drive (This is working)
app.post('/upload-file', multer({ storage: multer.memoryStorage() }).single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('No file uploaded.');
    const authClient = await getGoogleAuthClient(['https://www.googleapis.com/auth/drive.file']);
    const drive = google.drive({ version: 'v3', auth: authClient });
    const bufferStream = new stream.PassThrough().end(req.file.buffer);
    const { data } = await drive.files.create({
      media: { mimeType: req.file.mimetype, body: bufferStream },
      requestBody: { name: req.file.originalname, parents: [process.env.DRIVE_FOLDER_ID] },
    });
    res.status(200).json({ success: true, message: `File "${data.name}" uploaded successfully.` });
  } catch (error) {
    console.error('--- ERROR during file upload ---', error);
    res.status(500).json({ success: false, error: 'Error uploading file.' });
  }
});


// Endpoint for Form Submissions to Google Sheets
app.post('/submit-shs', async (req, res) => {
  console.log("--- New SHS form submission request ---");
  try {
    const studentData = req.body;
    const authClient = await getGoogleAuthClient(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    
    // This is the stable, hardcoded row order for the SHS form
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
    
    console.log("Success! Data saved to Google Sheet.");
    res.status(200).json({ success: true, message: 'Your submission has been saved.' });
  } catch (error) {
    console.error('--- ERROR saving to Google Sheets ---', error);
    res.status(500).json({ success: false, error: 'A server error occurred.' });
  }
});


// Root URL to confirm server is running
app.get('/', (req, res) => {
  res.send('Case Management Server is live and running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});