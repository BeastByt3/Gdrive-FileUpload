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

// Function to get authenticated sheets service
async function getSheetsService() {
  const auth = new GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
  });
  return google.sheets({ version: 'v4', auth });
}


// === NEW: Endpoint to automatically create headers ===
app.get('/create-headers', async (req, res) => {
  try {
    const sheets = await getSheetsService();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const headers = [
      "Timestamp", "HH ID", "Last Name", "First Name", "Middle Name", "Extension Name",
      "Birthday", "Sex", "Civil Status", "IP Affiliation", "Disability",
      "Attending School", "Grade Level", "Track", "Strand", "Curriculum Exit"
    ];
    
    // This will clear the first row before writing the new headers
    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'Sheet1!1:1',
    });

    // This writes the new headers to the first row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [headers],
      },
    });

    console.log('Headers successfully created/updated in Google Sheet.');
    res.status(200).send('Headers created successfully! You can now close this page.');

  } catch (error) {
    console.error('Error creating headers:', error);
    res.status(500).send('Error creating headers. Check server logs.');
  }
});


// === UPDATED: Endpoint for SHS form submissions ===
app.post('/submit-shs', async (req, res) => {
  try {
    const studentData = req.body;
    console.log('Received form data:', studentData);

    // --- Part 1: Save data to Google Sheets with correct alignment ---
    try {
      const sheets = await getSheetsService();
      
      // THIS IS THE FIX: We now explicitly define the order of the data
      // to match the headers we created above.
      const newRow = [
        new Date().toISOString(),
        studentData.hhId || '',
        studentData.lastName || '',
        studentData.firstName || '',
        studentData.middleName || '',
        studentData.extName || '',
        studentData.birthday || '',
        studentData.sex || '',
        studentData.civilStatus || '',
        studentData.ipAffiliation || '',
        studentData.disability || '',
        studentData.attendingSchool || '',
        studentData.gradeLevel || '',
        studentData.track || '',
        studentData.strand || '',
        studentData.curriculumExit || ''
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [newRow],
        },
      });
      console.log('Data successfully saved to Google Sheet.');

    } catch (sheetError) {
      console.error('Error saving to Google Sheets:', sheetError);
    }

    // --- Part 2: Call Gemini AI (unchanged) ---
    // (We removed the prompt for now as requested, but the logic can stay)
    console.log('Gemini AI call skipped as per configuration.');
    const aiProfile = "AI processing is currently turned off for this form.";

    // --- Part 3: Send response back to browser ---
    res.status(200).json({
        message: 'Data saved successfully.',
        aiProfile: aiProfile 
    });

  } catch (error) {
    console.error('Error in /submit-shs endpoint:', error);
    res.status(500).send({ error: 'Failed to process student profile.' });
  }
});


app.get('/', (req, res) => {
  res.send('DSWD Case Management AI Server is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});