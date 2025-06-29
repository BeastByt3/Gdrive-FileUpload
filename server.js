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

// This helper function is fine
async function getGoogleService(credentials, scopes) {
  const auth = new GoogleAuth({ credentials, scopes });
  return auth;
}

// === NEW: Endpoint to handle file uploads with Heavy Logging ===
app.post('/upload-file', upload.single('file'), async (req, res) => {
  console.log("--- New file upload request received ---");
  try {
    if (!req.file) {
      console.error("Step 1 Error: No file was received by the server.");
      return res.status(400).send('No file uploaded.');
    }
    console.log(`Step 1: File received successfully: ${req.file.originalname}, Size: ${req.file.size} bytes`);

    console.log("Step 2: Authenticating with Google Drive service...");
    const auth = await getGoogleService(
      JSON.parse(process.env.GOOGLE_CREDENTIALS),
      ['https://www.googleapis.com/auth/drive.file']
    );
    const drive = google.drive({ version: 'v3', auth });
    console.log("Step 3: Authentication successful.");

    const folderId = process.env.DRIVE_FOLDER_ID;
    console.log(`Step 4: Preparing to upload file to Drive Folder ID: ${folderId}`);
    if (!folderId) {
        throw new Error("DRIVE_FOLDER_ID environment variable is not set.");
    }
    
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    console.log("Step 5: Calling the Google Drive API to create the file...");
    const { data } = await drive.files.create({
      media: {
        mimeType: req.file.mimetype,
        body: bufferStream,
      },
      requestBody: {
        name: req.file.originalname,
        parents: [folderId],
      },
      fields: 'id,name',
    });

    console.log(`Step 6: File uploaded successfully to Google Drive. File ID: ${data.id}`);
    res.status(200).json({ success: true, message: `File "${data.name}" uploaded successfully.` });
    console.log("Step 7: Success response sent to user. Request finished.");

  } catch (error) {
    console.error('--- CRITICAL ERROR during file upload ---', error);
    res.status(500).json({ success: false, error: 'Error uploading file to Google Drive.' });
  }
});


// Your other endpoints (submit-shs, create-headers, etc.) remain here, unchanged.
// ...

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});