// src/services/server.js

const express = require('express');
const cors = require('cors');

const submitFormRoute    = require('./routes/submitForm');
const uploadFileRoute    = require('./routes/uploadFile');
const updateHeadersRoute = require('./routes/updateHeaders');

const app = express();
const PORT = process.env.PORT || 3000;

// allow cross-origin requests and JSON bodies
app.use(cors());
app.use(express.json());

// health-check endpoint
app.get('/', (req, res) => {
  res.send('🚀 Case Management Server is live and fully modular.');
});

// mount modular routes
app.use(submitFormRoute);
app.use(uploadFileRoute);
app.use(updateHeadersRoute);

// start listening
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});