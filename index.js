const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const fs = require("fs");
const cors = require("cors");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

const auth = new google.auth.GoogleAuth({
  keyFile: "service-account.json",
  scopes: ["https://www.googleapis.com/auth/drive"],
});
const drive = google.drive({ version: "v3", auth });

app.post("/upload", upload.single("file"), async (req, res) => {
  const { city, fileType, email } = req.body;
  const file = req.file;

  const fileMetadata = {
    name: `${fileType}_${file.originalname}`,
  };

  const media = {
    mimeType: file.mimetype,
    body: fs.createReadStream(file.path),
  };

  try {
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id",
    });

    fs.unlinkSync(file.path); // delete temp file
    res.status(200).send({ success: true, fileId: response.data.id });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to upload to Drive");
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
