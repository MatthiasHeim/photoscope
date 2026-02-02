import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure directories exist
await fs.mkdir(path.join(__dirname, 'uploads'), { recursive: true });
await fs.mkdir(path.join(__dirname, 'analyses'), { recursive: true });

// Multer config
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const id = uuidv4();
    req.uploadId = id;
    cb(null, id + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  },
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Gemini analysis
async function analyzeImage(imagePath, mimeType) {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const imageData = await fs.readFile(imagePath);
  const base64Image = imageData.toString('base64');

  const prompt = `Analyze this image in detail. Identify up to 30 distinct parts, regions, or elements worth discussing.

For each identified part, provide:
- A short label
- The type: "calculation", "text_block", "highlight", or "annotation"
- The region as percentage coordinates: { x, y, w, h } where x/y is top-left corner, w/h is width/height, all as percentages (0-100) of the image
- Whether it's "correct", "incorrect", or "neutral"
- A narration sentence explaining it (suitable for text-to-speech)
- Short overlay text to display on the image
- Whether to celebrate (true only for correct items)
- If incorrect, an errorHighlight sub-region

Respond ONLY with valid JSON in this exact format:
{
  "title": "Brief title for this image analysis",
  "summary": "One sentence summary",
  "steps": [
    {
      "id": 1,
      "label": "...",
      "type": "calculation|text_block|highlight|annotation",
      "region": { "x": 0, "y": 0, "w": 100, "h": 100 },
      "status": "correct|incorrect|neutral",
      "narration": "...",
      "overlayText": "...",
      "celebrate": true,
      "errorHighlight": null
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: prompt },
        ],
      },
    ],
  });

  const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  // Extract JSON from response (may be wrapped in ```json ... ```)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON in Gemini response');

  const analysis = JSON.parse(jsonMatch[0]);

  // Enforce max 30 steps
  if (analysis.steps && analysis.steps.length > 30) {
    analysis.steps = analysis.steps.slice(0, 30);
  }

  return analysis;
}

// Upload endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const id = req.uploadId || path.basename(req.file.filename, path.extname(req.file.filename));

    let analysis;
    if (process.env.GEMINI_API_KEY) {
      analysis = await analyzeImage(req.file.path, req.file.mimetype);
    } else {
      // Fallback demo analysis when no API key
      analysis = {
        title: 'Image Analysis',
        summary: 'Analysis complete. API key not configured — showing demo results.',
        steps: [
          {
            id: 1,
            label: 'Full Image',
            type: 'annotation',
            region: { x: 5, y: 5, w: 90, h: 90 },
            status: 'neutral',
            narration: 'This is the uploaded image. Configure a Gemini API key for real analysis.',
            overlayText: 'Configure GEMINI_API_KEY for real analysis',
            celebrate: false,
          },
        ],
      };
    }

    // Save analysis
    await fs.writeFile(
      path.join(__dirname, 'analyses', `${id}.json`),
      JSON.stringify(analysis, null, 2)
    );

    res.json({ url: `/view/${id}`, id });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// API to get analysis data
app.get('/api/analysis/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const analysisPath = path.join(__dirname, 'analyses', `${id}.json`);
    const analysis = JSON.parse(await fs.readFile(analysisPath, 'utf-8'));

    // Find the image file
    const files = await fs.readdir(path.join(__dirname, 'uploads'));
    const imageFile = files.find((f) => f.startsWith(id));

    if (!imageFile) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({
      analysis,
      imageUrl: `/uploads/${imageFile}`,
    });
  } catch {
    res.status(404).json({ error: 'Analysis not found' });
  }
});

// View route - serves viewer.html
app.get('/view/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

// Multer error handling
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 20MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

export { app, server, analyzeImage };
