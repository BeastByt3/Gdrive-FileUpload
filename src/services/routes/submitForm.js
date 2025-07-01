// src/services/routes/submitForm.js

const express = require('express');
const { google } = require('googleapis');
const { db } = require('../firebaseAdmin');
const { getGoogleAuthClient } = require('../googleAuth');

const router = express.Router();

router.post('/submit-form', async (req, res) => {
  try {
    const { formId, submissionData } = req.body;
    if (!formId || !submissionData) {
      return res
        .status(400)
        .json({ success: false, error: 'Missing formId or submission data.' });
    }

    // 1. Fetch form definition
    const formSnap = await db.collection('forms').doc(formId).get();
    if (!formSnap.exists) {
      return res
        .status(404)
        .json({ success: false, error: 'Form definition not found.' });
    }
    const formDef = formSnap.data();
    const spreadsheetId = formDef.spreadsheetId;
    if (!spreadsheetId) {
      return res.status(500).json({
        success: false,
        error: 'No Google Sheet ID assigned to this form.'
      });
    }

    // 2. Build header row and data row
    const headers = formDef.fields.map(f => f.label);
    const values = formDef.fields.map(f => submissionData[f.name] || '');

    // 3. Authenticate & connect to Sheets
    const authClient = await getGoogleAuthClient([
      'https://www.googleapis.com/auth/spreadsheets'
    ]);
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // 4. Ensure headers exist
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!1:1'
    });
    if (!existing.data.values || existing.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [['Timestamp', ...headers]] }
      });
    }

    // 5. Append the new row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[
          // timestamp in PH timezone
          new Date().toLocaleString('en-PH', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }),
          ...values
        ]]
      }
    });

    return res
      .status(200)
      .json({ success: true, message: 'Form submitted successfully.' });

  } catch (err) {
    console.error('Error in /submit-form:', err);
    return res.status(500).json({ success: false, error: 'Server error.' });
  }
});

module.exports = router;