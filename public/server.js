const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const cors = require('cors');
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const CLIENT_ID = '801414896689-ijlb50s1j6savse7j5bpjs6lresheneh.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = '1//041PT4_LhCJOLCgYIARAAGAQSNwF-L9Irmfi7HY9s07mu8bDH7EXiV5XQFbFju2l6fPVU7SEnH8YA7_ECcPpuNpzn-nuXUycpGco';
const FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const response = await drive.files.create({
      requestBody: {
        name: req.file.originalname,
        parents: [FOLDER_ID]
      },
      media: {
        mimeType: req.file.mimetype,
        body: Buffer.from(req.file.buffer)
      }
    });
    res.send({ success: true, fileId: response.data.id });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
