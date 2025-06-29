const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
// We are not using Gemini in the SHS form, so we can remove this for now
// const { GoogleGenerativeAI } = require('@google/generative-ai'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// This function is fine
async function getSheetsService() {
  const auth = new GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
  });
  return google.sheets({ version: 'v4', auth });
}


// === UPDATED /submit-shs Endpoint with Heavy Logging ===
app.post('/submit-shs', async (req, res) => {
  console.log("--- New SHS form submission request received ---");
  try {
    const studentData = req.body;
    console.log("Step 1: Received form data:", studentData);

    // --- Part 1: Save data to Google Sheets ---
    try {
      console.log("Step 2: Authenticating with Google Sheets service...");
      const sheets = await getSheetsService();
      console.log("Step 3: Authentication successful. Preparing data row...");
      
      const newRow = [
        new Date().toISOString(),
        studentData.hhId || '', studentData.lastName || '', studentData.firstName || '',
        studentData.middleName || '', studentData.extName || '', studentData.birthday || '',
        studentData.sex || '', studentData.civilStatus || '', studentData.ipAffiliation || '',
        studentData.disability || '', studentData.attendingSchool || '', studentData.gradeLevel || '',
        studentData.track || '', studentData.strand || '', studentData.curriculumExit || ''
      ];
      console.log("Step 4: Data row prepared. Attempting to append to sheet...");

      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [newRow],
        },
      });
      console.log("Step 5: Data successfully saved to Google Sheet.");

    } catch (sheetError) {
      console.error("--- ERROR during Google Sheets operation ---", sheetError);
      // Even if sheets fail, we will still send a response to the user
    }

    // --- Part 2: Prepare Final Response ---
    console.log("Step 6: Preparing success response for the user.");
    const responseMessage = "Data saved to Google Sheet successfully.";

    // --- Part 3: Send response back to browser ---
    res.status(200).json({
        message: responseMessage,
        aiProfile: "AI processing is not active for this form." 
    });
    console.log("Step 7: Success response sent to user. Request finished.");

  } catch (error) {
    console.error("--- CRITICAL ERROR in /submit-shs endpoint ---", error);
    res.status(500).send({ error: 'A critical error occurred on the server.' });
  }
});


// All other endpoints and the app.listen part remain the same
// ...

app.get('/', (req, res) => {
  res.send('DSWD Case Management AI Server is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});