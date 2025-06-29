const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const stream = require('stream');

const app = express();
const PORT = process.env.PORT || 3000;

// --- INITIALIZATIONS ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use multer to handle file uploads in memory
const upload = multer({ storage: multer.memoryStorage() });

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());


// --- GOOGLE AUTH HELPER FUNCTIONS ---

// Function to get authenticated sheets service
async function getSheetsService() {
  const auth = new GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
  });
  return google.sheets({ version: 'v4', auth });
}

// Function to get authenticated drive service
async function getDriveService() {
    const auth = new GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
        scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    return google.drive({ version: 'v3', auth });
}


// --- API ENDPOINTS ---

// Endpoint to create spreadsheet headers
app.get('/create-headers', async (req, res) => {
  try {
    const sheets = await getSheetsService();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const headers = [
      "Timestamp", "HH ID", "Last Name", "First Name", "Middle Name", "Extension Name",
      "Birthday", "Sex", "Civil Status", "IP Affiliation", "Disability",
      "Attending School", "Grade Level", "Track", "Strand", "Curriculum Exit"
    ];
    
    // Clear the first row before writing headers
    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'Sheet1!1:1',
    });

    // Write the new headers to the first row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [headers],
      },
    });

    console.log('Headers successfully created/updated in Google Sheet.');
    res.status(200).send('Headers created successfully! You can now close this page.');

  } catch (error) {
    console.error('Error creating headers:', error);
    res.status(500).send('Error creating headers. Check server logs.');
  }
});

// Endpoint for SHS form submissions to Google Sheets
app.post('/submit-shs', async (req, res) => {
  try {
    const studentData = req.body;
    console.log('Received form data:', studentData);

    // --- Part 1: Save data to Google Sheets ---
    try {
      const sheets = await getSheetsService();
      
      // Ensure data order matches the headers
      const newRow = [
        new Date().toISOString(),
        studentData.hhId || '',
        studentData.lastName || '',
        studentData.firstName || '',
        studentData.middleName || '',
        studentData.extName || '',
        studentData.birthday || '',
        studentData.sex || '',
        studentData.civilStatus || '',
        studentData.ipAffiliation || '',
        studentData.disability || '',
        studentData.attendingSchool || '',
        studentData.gradeLevel || '',
        studentData.track || '',
        studentData.strand || '',
        studentData.curriculumExit || ''
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [newRow],
        },
      });
      console.log('Data successfully saved to Google Sheet.');

    } catch (sheetError) {
      console.error('Error saving to Google Sheets:', sheetError);
      // Decide if you want to stop or continue if sheet fails
    }

    // --- Part 2: Call Gemini AI (currently disabled) ---
    console.log('Gemini AI call skipped as per configuration.');
    const aiProfile = "AI processing is currently turned off for this form.";

    // --- Part 3: Send response back to browser ---
    res.status(200).json({
        message: 'Data saved successfully.',
        aiProfile: aiProfile 
    });

  } catch (error) {
    console.error('Error in /submit-shs endpoint:', error);
    res.status(500).send({ error: 'Failed to process student profile.' });
  }
});

// Endpoint to handle file uploads to Google Drive
app.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    console.log('Received file upload request for:', req.file.originalname);

    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    
    const drive = await getDriveService();

    // Create a buffer stream for the file
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    const { data } = await drive.files.create({
      media: {
        mimeType: req.file.mimetype,
        body: bufferStream,
      },
      requestBody: {
        name: req.file.originalname,
        parents: [process.env.DRIVE_FOLDER_ID], // The folder ID from environment variables
      },
      fields: 'id,name',
    });

    console.log(`File uploaded successfully. File ID: ${data.id}, Name: ${data.name}`);
    res.status(200).json({ success: true, message: `File "${data.name}" uploaded successfully.` });

  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    res.status(500).send('Error uploading file.');
  }
});


// --- SERVER START ---

app.get('/', (req, res) => {
  res.send('DSWD Case Management AI Server is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});