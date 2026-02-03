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

// JSON body parsing
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Gemini analysis
async function analyzeImage(imagePath, mimeType) {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const imageData = await fs.readFile(imagePath);
  const base64Image = imageData.toString('base64');

  const prompt = `You are a warm, encouraging homework tutor. Analyze this student's worksheet image and provide step-by-step pedagogical feedback.

IMPORTANT INSTRUCTIONS:
1. Detect the language of the worksheet (e.g. German if you see "Rechne aus", "Berechne", etc.) and provide ALL feedback in that same language. If unsure, default to German.
2. Use 2nd person ("Du hast...", "You wrote...") with a warm, supportive teacher tone.
3. Step 1 MUST be an overall summary: congratulate the student, state their score (e.g. "14 von 16 richtig!"), set an encouraging tone.
4. Group by correctness: correct sections get brief praise ("Super gemacht bei der Addition!"). Incorrect sections get detailed pedagogical feedback explaining WHY the mistake happened and HOW to fix it.
5. If multiple mistakes share a root cause (e.g. decimal place errors, carrying errors), group them and explain the underlying concept.
6. Maximum 30 steps total.

For each identified part, provide:
- A short label
- The type: "calculation", "text_block", "highlight", or "annotation"
- The region as percentage coordinates: { x, y, w, h } where x/y is top-left corner, w/h is width/height, all as percentages (0-100) of the image
- Whether it's "correct", "incorrect", or "neutral"
- A narration sentence for text-to-speech (warm, teacher-like, 2nd person)
- Short overlay text to display on the image
- Whether to celebrate (true only for correct items)
- If incorrect, an errorHighlight sub-region pointing to the specific error

Respond ONLY with valid JSON in this exact format:
{
  "title": "Brief title for this image analysis",
  "summary": "One sentence encouraging summary with score",
  "steps": [
    {
      "id": 1,
      "label": "Zusammenfassung",
      "type": "annotation",
      "region": { "x": 0, "y": 0, "w": 100, "h": 100 },
      "status": "neutral",
      "narration": "Overall encouraging summary with score...",
      "overlayText": "14/16 richtig!",
      "celebrate": false,
      "errorHighlight": null
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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

// TTS endpoint — Gemini TTS
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing text parameter' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'TTS not available — no API key' });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ role: 'user', parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
          },
        },
      },
    });

    const audioData =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
      return res.status(500).json({ error: 'No audio data in TTS response' });
    }

    const pcmBuffer = Buffer.from(audioData, 'base64');

    // Convert raw PCM (24kHz, 16-bit, mono) to WAV
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmBuffer.length;
    const headerSize = 44;

    const wav = Buffer.alloc(headerSize + dataSize);
    wav.write('RIFF', 0);
    wav.writeUInt32LE(36 + dataSize, 4);
    wav.write('WAVE', 8);
    wav.write('fmt ', 12);
    wav.writeUInt32LE(16, 16); // subchunk1 size
    wav.writeUInt16LE(1, 20); // PCM format
    wav.writeUInt16LE(numChannels, 22);
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(byteRate, 28);
    wav.writeUInt16LE(blockAlign, 32);
    wav.writeUInt16LE(bitsPerSample, 34);
    wav.write('data', 36);
    wav.writeUInt32LE(dataSize, 40);
    pcmBuffer.copy(wav, headerSize);

    res.set('Content-Type', 'audio/wav');
    res.set('Content-Length', wav.length);
    res.send(wav);
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: err.message || 'TTS failed' });
  }
});

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

// Library API
app.get('/api/library', async (req, res) => {
  try {
    const analysesDir = path.join(__dirname, 'analyses');
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = await fs.readdir(analysesDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const items = [];
    for (const file of jsonFiles) {
      try {
        const id = path.basename(file, '.json');
        const filePath = path.join(analysesDir, file);
        const analysis = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        const stat = await fs.stat(filePath);

        // Find matching upload image
        const uploadFiles = await fs.readdir(uploadsDir);
        const imageFile = uploadFiles.find((f) => f.startsWith(id));

        items.push({
          id,
          title: analysis.title || 'Untitled',
          summary: analysis.summary || '',
          imageUrl: imageFile ? `/uploads/${imageFile}` : null,
          createdAt: stat.birthtime.toISOString(),
        });
      } catch {
        // Skip invalid files
      }
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ items });
  } catch {
    res.json({ items: [] });
  }
});

// Library page
app.get('/library', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'library.html'));
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
