const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');

const app = express();
const PORT = process.env.PORT || 3000;

// Use multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// This helper function creates an authenticated Google client for a specific service
async function getGoogleAuthClient(scopes) {
  const auth = new GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: scopes,
  });
  return auth.getClient();
}


// === Endpoint for File Uploads to Google Drive ===
app.post('/upload-file', upload.single('file'), async (req, res) => {
  console.log("--- New file upload request ---");
  try {
    if (!req.file) { return res.status(400).send('No file uploaded.'); }
    console.log(`Receiving file: ${req.file.originalname}`);

    const authClient = await getGoogleAuthClient(['https://www.googleapis.com/auth/drive.file']);
    const drive = google.drive({ version: 'v3', auth: authClient });
    
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

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


// === Endpoint for Form Submissions to Google Sheets ===
app.post('/submit-shs', async (req, res) => {
  console.log("--- New SHS form submission request ---");
  try {
    const studentData = req.body;
    console.log("Received form data for sheet.");

    const authClient = await getGoogleAuthClient(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth: authClient });

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
    res.status(200).json({ message: 'Data saved to Google Sheet successfully.' });

  } catch (error) {
    console.error('--- ERROR saving to Google Sheets ---', error);
    res.status(500).send({ error: 'A critical error occurred on the server.' });
  }
});


// === Your other utility endpoints ===
app.get('/create-headers', async (req, res) => { /* ... your existing code ... */ });
app.get('/', (req, res) => { res.send('DSWD Case Management AI Server is running.'); });


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});