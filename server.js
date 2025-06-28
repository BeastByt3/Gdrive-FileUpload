const express = require('express');
const path = require('path');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin
initializeApp({
  credential: applicationDefault(),
});
const db = getFirestore();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Save upload settings (from admin.html)
app.post('/save-settings', async (req, res) => {
  const { cities, fileTypes, driveFolderId } = req.body;

  try {
    await db.collection('uploadSettings').doc('uploadSettings').set({
      cities,
      fileTypes,
      driveFolderId,
    });
    res.sendStatus(200);
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).send('Failed to save settings');
  }
});

// Get upload settings (used by upload.html)
app.get('/get-settings', async (req, res) => {
  try {
    const docRef = db.collection('uploadSettings').doc('uploadSettings');
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).send('No settings found');
    }
    res.status(200).json(docSnap.data());
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).send('Failed to fetch settings');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
