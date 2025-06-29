const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');

const app = express();
const PORT = process.env.PORT || 3000;

// Use multer to handle file uploads in memory
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Function to get authenticated sheets/drive service
async function getGoogleService(credentials, scopes) {
  const auth = new GoogleAuth({ credentials, scopes });
  return auth;
}

// NEW: Endpoint to handle file uploads
app.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    console.log('Received file upload request for:', req.file.originalname);

    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const auth = await getGoogleService(
      JSON.parse(process.env.GOOGLE_CREDENTIALS),
      ['https://www.googleapis.com/auth/drive.file']
    );
    
    const drive = google.drive({ version: 'v3', auth });

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


// Existing endpoint for SHS form submissions...
app.post('/submit-shs', async (req, res) => { /* ... your existing code ... */ });

// Existing endpoint for creating headers...
app.get('/create-headers', async (req, res) => { /* ... your existing code ... */ });


app.get('/', (req, res) => {
  res.send('DSWD Case Management AI Server is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});