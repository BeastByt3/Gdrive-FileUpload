const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const multer = require('multer');
// ... other requires

const app = express();
// ... app.use calls

// --- All your other endpoints like /upload-file can remain ---

// === THE NEW, SMART, DYNAMIC SUBMISSION ENDPOINT ===
app.post('/submit-form', async (req, res) => {
  console.log("--- New DYNAMIC form submission request ---");
  try {
    // We receive the full payload from the browser
    const { spreadsheetId, headers, submissionData } = req.body;

    if (!spreadsheetId || !headers || !submissionData) {
      return res.status(400).json({ success: false, error: 'Incomplete data received.' });
    }
    console.log(`Targeting Spreadsheet ID: ${spreadsheetId}`);

    // Dynamically create the data row IN THE CORRECT ORDER
    // by looping through the headers definition we received.
    const dataRow = headers.map(header => submissionData[header.name] || '');

    console.log('Final Ordered Data Row:', dataRow);

    // Connect to Google Sheets
    const authClient = await getGoogleAuthClient(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    
    // Check if headers exist. If not, create them.
    const headerCheck = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Sheet1!A1:Z1' });
    if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
        console.log("Sheet has no headers. Creating them now...");
        const headerRow = ['Timestamp', ...headers.map(h => h.label)];
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [headerRow] },
        });
    }

    // Append the new data row (with timestamp added at the front)
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [ [new Date().toISOString(), ...dataRow] ] },
    });

    console.log("Success! Data saved to Google Sheet correctly.");
    res.status(200).json({ success: true, message: 'Your submission has been saved.' });

  } catch (error) {
    console.error('--- CRITICAL ERROR in /submit-form endpoint ---', error);
    res.status(500).json({ success: false, error: 'A server error occurred.' });
  }
});

// ... app.listen and other routes