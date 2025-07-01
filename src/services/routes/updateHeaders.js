// src/services/routes/updateHeaders.js

const express = require('express');
const { google } = require('googleapis');
const { db } = require('../firebaseAdmin');
const { getGoogleAuthClient } = require('../googleAuth');

const router = express.Router();

router.post(
  '/update-sheet-headers',
  async (req, res) => {
    try {
      const { formId } = req.body;
      if (!formId) {
        return res
          .status(400)
          .json({ success: false, error: 'Missing formId.' });
      }

      // 1. Fetch form definition
      const formSnap = await db.collection('forms').doc(formId).get();
      if (!formSnap.exists) {
        return res
          .status(404)
          .json({ success: false, error: 'Form not found.' });
      }
      const formDef = formSnap.data();
      const spreadsheetId = formDef.spreadsheetId;
      if (!spreadsheetId) {
        return res.status(500).json({
          success: false,
          error: 'No Google Sheet ID assigned to this form.'
        });
      }

      // 2. Build headers
      const headers = formDef.fields.map(f => f.label);

      // 3. Authenticate & update header row
      const authClient = await getGoogleAuthClient([
        'https://www.googleapis.com/auth/spreadsheets'
      ]);
      const sheets = google.sheets({ version: 'v4', auth: authClient });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [['Timestamp', ...headers]] }
      });

      return res
        .status(200)
        .json({ success: true, message: 'Headers updated successfully.' });

    } catch (err) {
      console.error('Error in /update-sheet-headers:', err);
      return res
        .status(500)
        .json({ success: false, error: 'Failed to update headers.' });
    }
  }
);

module.exports = router;