const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/submit-shs', async (req, res) => {
  try {
    const studentData = req.body;
    console.log('Received form data:', studentData);

    const spreadsheetId = process.env.SPREADSHEET_ID;
    const targetRange = 'Sheet1!A1'; // We will append to the first empty row of 'Sheet1'

    // --- Part 1: Save data to Google Sheets ---
    try {
      // --- NEW LOGGING ADDED HERE ---
      console.log(`Preparing to write to Spreadsheet ID: ${spreadsheetId}`);
      console.log(`Targeting range: ${targetRange}`);
      
      if (!spreadsheetId) {
        throw new Error("SPREADSHEET_ID environment variable is not set.");
      }

      const auth = new GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
      });
      const sheets = google.sheets({ version: 'v4', auth });

      const newRow = [ new Date().toISOString(), studentData.hhId || '', studentData.lastName || '', studentData.firstName || '' /* ... and so on */ ];
      
      // --- NEW LOGGING ADDED HERE ---
      console.log('Data prepared for new row:', newRow);

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: targetRange,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [newRow],
        },
      });

      // --- NEW LOGGING ADDED HERE ---
      console.log('Successfully wrote to Google Sheet. Server response:', response.statusText);

    } catch (sheetError) {
      console.error('--- ERROR SAVING TO GOOGLE SHEETS ---', sheetError);
    }

    // --- Part 2: Call Gemini AI (This part is working well) ---
    console.log('Proceeding to Gemini AI...');
    const prompt = `Analyze the following Senior High School student profile...`;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent(prompt);
    const aiProfile = (await result.response).text();
    console.log('Gemini Profile Generated successfully.');

    // --- Part 3: Send response back to browser ---
    res.status(200).json({
        message: 'Data saved and AI summary generated.',
        aiProfile: aiProfile
    });

  } catch (error) {
    console.error('--- CRITICAL ERROR in /submit-shs endpoint ---', error);
    res.status(500).send({ error: 'Failed to process student profile.' });
  }
});

app.get('/', (req, res) => {
  res.send('DSWD Case Management AI Server is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});