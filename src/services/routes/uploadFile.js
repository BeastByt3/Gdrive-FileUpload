// src/services/routes/uploadFile.js

const express = require('express');
const multer = require('multer');
const stream = require('stream');
const { google } = require('googleapis');
const { getGoogleAuthClient } = require('../googleAuth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/upload-file',
  upload.single('file'),
  async (req, res) => {
    try {
      const { location, fileType, email } = req.body;
      const file = req.file;

      if (!file || !location || !fileType || !email) {
        return res
          .status(400)
          .json({ success: false, message: 'Missing required fields.' });
      }

      // 1. Authenticate & connect to Drive
      const authClient = await getGoogleAuthClient([
        'https://www.googleapis.com/auth/drive.file'
      ]);
      const drive = google.drive({ version: 'v3', auth: authClient });

      // 2. Stream the buffer into Drive upload
      const bufferStream = new stream.PassThrough();
      bufferStream.end(file.buffer);

      const driveRes = await drive.files.create({
        requestBody: {
          name: file.originalname,
          mimeType: file.mimetype,
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
        },
        media: {
          mimeType: file.mimetype,
          body: bufferStream
        }
      });

      return res.status(200).json({
        success: true,
        message: 'File uploaded successfully.',
        fileId: driveRes.data.id
      });
    } catch (err) {
      console.error('Error in /upload-file:', err);
      return res
        .status(500)
        .json({ success: false, message: 'Upload failed.' });
    }
  }
);

module.exports = router;