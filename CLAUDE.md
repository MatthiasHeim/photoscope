# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Photoscope is an AI-powered interactive photo analysis app. Users upload images (homework, diagrams, documents), which are analyzed by Google's Gemini 2.0 Flash API to produce step-by-step narrated walkthroughs with highlighted regions, voice narration, and celebration animations.

## Commands

```bash
npm start              # Start server on port 3000 (or PORT env var)
npm run dev            # Same as start
npm test               # Run unit tests (Vitest)
npm run test:watch     # Unit tests in watch mode
npm run test:e2e       # E2E tests (Playwright, starts server on port 3456)
```

## Architecture

**Backend:** Express server in `server.js` — handles image upload (Multer, 20MB max), calls Gemini API, stores analysis JSON to `analyses/{id}.json`, serves static files from `public/`.

**Frontend:** Vanilla JS modules (no framework) loaded by two HTML pages:
- `public/index.html` + `upload.js` — drag-and-drop upload page
- `public/viewer.html` + viewer modules — interactive walkthrough player

**Viewer modules** (each is an IIFE exposing a global object):
- `viewer.js` — main controller, loads analysis, drives step-through, keyboard nav, auto-play
- `overlay.js` — renders color-coded highlight boxes on image regions
- `voice.js` — Web Speech API narration per step
- `timeline.js` — horizontal progress bar with clickable step dots
- `celebrations.js` — canvas-based confetti particles on "correct" steps

**Data flow:** Upload → `POST /api/upload` → Multer saves file → Gemini analyzes base64 image → JSON saved → redirect to `/view/{id}` → viewer fetches `/api/analysis/{id}` → modules render walkthrough.

## API Endpoints

- `POST /api/upload` — multipart form with image file, returns `{ url, id }`
- `GET /api/analysis/:id` — returns `{ analysis, imageUrl }`
- `GET /view/:id` — serves viewer.html

## Analysis JSON Schema

Steps have: `id`, `label`, `type` (calculation|text_block|highlight|annotation), `region` (x/y/w/h as 0-100 percentages), `status` (correct|incorrect|neutral), `narration`, `overlayText`, `celebrate` (boolean), `errorHighlight` (optional sub-region). Max 30 steps.

## Testing

- **Unit tests:** `tests/unit/*.test.js` — cover server endpoints, viewer logic, voice, overlay, timeline, celebrations
- **E2E tests:** `tests/e2e/*.spec.js` — cover upload flow, autoplay, navigation, voice controls, celebrations, error handling, responsive, sharing
- **Fixtures:** `tests/fixtures/` — sample analysis data

## Environment

Requires `GEMINI_API_KEY` in `.env`. Falls back to demo mode without it.
