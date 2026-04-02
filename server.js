require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// Multer setup
const upload = multer({ storage: multer.memoryStorage() });

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


// ---------------------------------------------------------
// HEALTH CHECK (IMPORTANT for Railway)
// ---------------------------------------------------------
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});


// ---------------------------------------------------------
// 1. EXTRACT API
// ---------------------------------------------------------
app.post("/api/extract", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    let extractedText = "";

    if (req.file.mimetype === "application/pdf") {
      const pdfData = await pdfParse(req.file.buffer);
      extractedText = pdfData.text;
    } else if (req.file.mimetype.startsWith("image/")) {
      const result = await model.generateContent([
        "Extract all readable text from this image",
        {
          inlineData: {
            data: req.file.buffer.toString("base64"),
            mimeType: req.file.mimetype,
          },
        },
      ]);
      extractedText = result.response.text();
    }

    const conceptPrompt = `
    Extract key concepts and summarize simply:
    ${extractedText}
    `;

    const conceptResult = await model.generateContent(conceptPrompt);

    res.json({
      rawText: extractedText,
      concepts: conceptResult.response.text(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Extraction failed" });
  }
});


// ---------------------------------------------------------
// 2. GENERATE QUESTIONS
// ---------------------------------------------------------
app.post("/api/generate-questions", async (req, res) => {
  try {
    const { topic, num = 5, difficulty = "Medium", type = "MCQ" } = req.body;

    const prompt = `
    Generate ${num} ${difficulty} ${type} questions on "${topic}".
    Return JSON array:
    [
      {
        "question": "",
        "options": [],
        "correctAnswer": "",
        "explanation": ""
      }
    ]
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json|```/g, "");

    const questions = JSON.parse(text);

    res.json(questions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Question generation failed" });
  }
});


// ---------------------------------------------------------
// 3. HINGLISH EXPLAIN
// ---------------------------------------------------------
app.post("/api/explain", async (req, res) => {
  try {
    const { concept } = req.body;

    const prompt = `
    Explain in Hinglish (Hindi + English mix, very simple):
    ${concept}
    `;

    const result = await model.generateContent(prompt);

    res.json({ explanation: result.response.text() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Explanation failed" });
  }
});


// ---------------------------------------------------------
// START SERVER (Railway compatible)
// ---------------------------------------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});