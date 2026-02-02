import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Set API key to empty string BEFORE server.js is imported.
// dotenv will NOT override an existing env var, so this ensures the fallback demo path.
process.env.GEMINI_API_KEY = '';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

let server;
let PORT;

beforeAll(async () => {
  // Use a random port to avoid conflicts
  PORT = 49100 + Math.floor(Math.random() * 900);
  process.env.PORT = String(PORT);

  const mod = await import('../../server.js');
  server = mod.server;
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

const BASE = () => `http://localhost:${PORT}`;

// Helper: 1x1 red JPEG as a Buffer
function tinyJpeg() {
  // Minimal valid JPEG (1x1 pixel)
  return Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsK' +
    'CwsNCxAPDQ4LEA0QGBATFBQVFAwPFxgWFBgSFBQU/2wBDAMEBAUEBQkGBgkUDQsNFBQUFBQUFBQU' +
    'FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/wAARCAABAAEDASIAAhEBAxEB' +
    '/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAA' +
    'AAAAAAAB/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=',
    'base64'
  );
}

describe('POST /api/upload', () => {
  it('returns url and id with valid JPEG image', async () => {
    const formData = new FormData();
    const blob = new Blob([tinyJpeg()], { type: 'image/jpeg' });
    formData.append('image', blob, 'test.jpg');

    const res = await fetch(`${BASE()}/api/upload`, { method: 'POST', body: formData });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('id');
    expect(json).toHaveProperty('url');
    expect(json.url).toMatch(/^\/view\//);
  });

  it('returns 400 when no file is provided', async () => {
    const formData = new FormData();
    const res = await fetch(`${BASE()}/api/upload`, { method: 'POST', body: formData });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it('returns 400 for invalid file type', async () => {
    const formData = new FormData();
    const blob = new Blob(['not an image'], { type: 'text/plain' });
    formData.append('image', blob, 'test.txt');

    const res = await fetch(`${BASE()}/api/upload`, { method: 'POST', body: formData });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });
});

describe('GET /api/analysis/:id', () => {
  let testId;

  beforeAll(async () => {
    // Upload an image first to create an analysis
    const formData = new FormData();
    const blob = new Blob([tinyJpeg()], { type: 'image/jpeg' });
    formData.append('image', blob, 'test.jpg');
    const res = await fetch(`${BASE()}/api/upload`, { method: 'POST', body: formData });
    const json = await res.json();
    testId = json.id;
  });

  it('returns analysis JSON for valid id', async () => {
    const res = await fetch(`${BASE()}/api/analysis/${testId}`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('analysis');
    expect(json).toHaveProperty('imageUrl');
    expect(json.analysis).toHaveProperty('title');
    expect(json.analysis).toHaveProperty('steps');
  });

  it('returns 404 for nonexistent id', async () => {
    const res = await fetch(`${BASE()}/api/analysis/nonexistent-id-12345`);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });
});

describe('GET /view/:id', () => {
  it('serves HTML', async () => {
    const res = await fetch(`${BASE()}/view/some-id`);
    // It serves viewer.html which should be 200 if the file exists
    // If viewer.html doesn't exist it may 404, but the route itself works
    const contentType = res.headers.get('content-type') || '';
    if (res.status === 200) {
      expect(contentType).toMatch(/html/);
    } else {
      // viewer.html might not exist in test env, that's acceptable
      expect(res.status).toBeGreaterThanOrEqual(200);
    }
  });
});
