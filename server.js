const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// A simple test endpoint
app.post('/submit-form', (req, res) => {
  // If this message appears in your Render logs, we have succeeded!
  console.log("SUCCESS! The /submit-form endpoint was reached!");
  
  // It receives the data and logs it
  console.log("Data received:", req.body);

  // It sends a simple success message back
  res.status(200).json({ success: true, message: 'Server received the request!' });
});

// A simple root endpoint to prove the server is running
app.get('/', (req, res) => {
  res.send('Simple Test Server is LIVE.');
});

app.listen(PORT, () => {
  console.log(`Simple Test Server is running on port ${PORT}`);
});