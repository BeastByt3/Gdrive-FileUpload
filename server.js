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
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const auth = new GoogleAuth({ credentials, scopes });
    return auth.getClient();
  } catch (error) {
    console.error('FATAL: Could not parse GOOGLE_CREDENTIALS. Check the environment variable on Render.', error);
    throw new Error('Authentication setup failed.');
  }
}

// === STABLE ENDPOINT FOR ALL FORM SUBMISSIONS ===
app.post('/submit-form', async (req, res) => {
  console.log("--- Received a new form submission ---");
  try {
    const { submissionData, spreadsheetId, headers } = req.body;

    if (!submissionData || !spreadsheetId || !headers) {
      console.error("Missing submissionData, spreadsheetId, or headers.");
      return res.status(400).json({ success: false, error: 'Incomplete request from the website.' });
    }

    console.log(`Targeting Spreadsheet ID: ${spreadsheetId}`);

    // Dynamically create the data row in the correct order based on the headers
    const dataRow = headers.map(header => submissionData[header.name] || '');
    console.log('Formatted Data Row:', dataRow);

    // Connect to Google Sheets
    const authClient = await getGoogleAuthClient(['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // Check if headers exist, if not, create them
    const headerCheck = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sheet1!1:1',
    });
    
    if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
        console.log("No headers found. Creating them...");
        const headerRow = ['Timestamp', ...headers.map(h => h.label)];
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [headerRow] },
        });
    }

    // Append the new data row
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [ [new Date().toISOString(), ...dataRow] ] },
    });

    console.log("Success! Data saved to Google Sheet.");
    res.status(200).json({ success: true, message: 'Your submission has been saved.' });

  } catch (error) {
    console.error('--- ERROR in /submit-form endpoint ---', error);
    res.status(500).json({ success: false, error: 'A server error occurred.' });
  }
});


// All your other working endpoints like /upload-file can remain here.
// ...


// Root URL to confirm server is running
app.get('/', (req, res) => {
  res.send('Case Management Server is live and running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});