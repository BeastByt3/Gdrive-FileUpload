const express = require('express');
const path = require('path');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// === INITIALIZATION ===
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

// Initialize Gemini AI Client (reads key from Render environment variables)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// === ROUTES ===

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Your existing settings routes can remain here...
app.post('/save-settings', async (req, res) => { /* ... */ });
app.get('/get-settings', async (req, res) => { /* ... */ });


// === NEW AI-POWERED ENDPOINT for the SHS Form ===
app.post('/submit-shs', async (req, res) => {
  try {
    const studentData = req.body;

    // Step 1: Save the student's data to a new Firestore collection
    const docRef = await db.collection('shs_profiles').add(studentData);
    console.log('SHS Profile saved with ID:', docRef.id);

    // Step 2: Create a detailed prompt for Gemini AI
    const prompt = `
        Analyze the following Senior High School student profile from the Philippines and generate a concise summary and a career path suggestion.

        Student Profile:
        - Name: ${studentData.firstName} ${studentData.lastName}
        - Location: ${studentData.city}, ${studentData.province}
        - Chosen Track: ${studentData.track}
        - Chosen Strand: ${studentData.strand}

        Tasks:
        1.  **Profile Summary:** Write a 2-3 sentence summary of the student's profile, highlighting their chosen academic path.
        2.  **Career Path Suggestions:** Based on their Track and Strand (${studentData.track} - ${studentData.strand}), suggest 3-5 potential college courses or immediate job opportunities in the Philippines that align with their specialization. Provide a brief one-line reason for each suggestion.

        Format the entire output in clean Markdown.
    `;

    // Step 3: Call the Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiProfile = response.text();

    console.log('Gemini Profile Generated:', aiProfile);

    // Step 4: Send the AI-generated profile back to the browser
    res.status(200).json({ 
        message: 'Profile saved and AI summary generated.',
        firestoreId: docRef.id,
        aiProfile: aiProfile 
    });

  } catch (error) {
    console.error('Error in /submit-shs endpoint:', error);
    res.status(500).send({ error: 'Failed to process student profile.' });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});