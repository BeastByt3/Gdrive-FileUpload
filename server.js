const express = require('express');
const cors = require('cors'); // Import the CORS middleware
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// === IMPORTANT: Use CORS to allow requests from your Firebase website ===
app.use(cors()); 
app.use(express.json());

// Initialize Gemini AI Client
// You must set GEMINI_API_KEY in your Render environment variables.
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// === AI-POWERED ROUTE for the SHS Form ===
app.post('/submit-shs', async (req, res) => {
  try {
    const studentData = req.body;

    // We removed the Firestore part since this server doesn't have Firebase Admin access.
    // This server's only job is to call the AI.

    const prompt = `
        Analyze the following Senior High School student profile from the Philippines and generate a concise summary and a career path suggestion.

        Student Profile:
        - Name: ${studentData.firstName} ${studentData.lastName}
        - Location: ${studentData.city}, ${studentData.province}
        - Chosen Track: ${studentData.track}
        - Chosen Strand: ${studentData.strand}

        Tasks:
        1.  **Profile Summary:** Write a 2-3 sentence summary of the student's profile.
        2.  **Career Path Suggestions:** Based on their Track and Strand, suggest 3-5 potential college courses or jobs in the Philippines.

        Format the entire output in clean Markdown.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiProfile = response.text();

    console.log('Gemini Profile Generated successfully.');

    // Send the AI-generated profile back to the browser
    res.status(200).json({ 
        message: 'AI summary generated successfully.',
        aiProfile: aiProfile 
    });

  } catch (error) {
    console.error('Error in /submit-shs endpoint:', error);
    res.status(500).send({ error: 'Failed to process student profile.' });
  }
});

// Health check route for the root URL
app.get('/', (req, res) => {
  res.send('DSWD Case Management AI Server is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});