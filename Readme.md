# MeetMind AI

**Turn meeting audio into actionable team intelligence.**

MeetMind AI is an AI-powered meeting assistant built for the meetings most tools ignore — physical, in-person, bilingual (Urdu/English) conversations where decisions, tasks, and deadlines are agreed to verbally and then almost never reliably captured. It records, transcribes, and understands a meeting automatically, then makes every past meeting conversational through a grounded Retrieval-Augmented Generation (RAG) pipeline.

![Demo](documentation/MeetMind_AI_Complete_Workflow.gif)

---

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Pipeline Walkthrough](#pipeline-walkthrough)
- [Engineering Challenges & Fixes](#engineering-challenges--fixes)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Overview

Physical meetings generate real organizational knowledge — who owns what, by when, and what was decided — but almost none of it survives past the meeting itself. MeetMind AI closes that gap:

1. Record a meeting from the **web app** or the companion **Chrome extension** (mic or browser-tab audio).
2. Audio is transcribed and **diarized** (speaker-attributed), with mixed Urdu/English speech supported end-to-end.
3. An AI pipeline generates an **executive summary**, **structured action items** (owner, deadline, priority, status), and **key decisions**.
4. Every meeting is embedded and stored, so you can **chat with a single meeting or your entire meeting history** in natural language — with answers strictly grounded in what was actually said, and an explicit refusal when the answer isn't in the retrieved content.

## Key Features

- **Speaker-attributed transcription** — diarized, timestamped transcripts via AssemblyAI, with manual speaker renaming.
- **Bilingual support** — handles mixed Urdu/English speech and Roman Urdu queries throughout the pipeline.
- **Grounded RAG chat** — hybrid (vector + keyword) retrieval, local reranking, and a strict "answer from context only" policy to prevent hallucination.
- **Structured insight extraction** — action items and decisions returned as schema-validated data, not freeform text.
- **Noise handling** — browser-level noise suppression during recording plus a server-side denoising pass before transcription.
- **Multi-provider resilience** — 5-key rotation fallback across Gemini and OpenRouter with retry/backoff, so the assistant stays available under free-tier rate limits.
- **Web app + Chrome extension** — record from a browser tab (e.g. Google Meet) or a physical room via mic.

## Architecture

![Architecture Diagram](documentation/preview.webp)

**Client Layer** (React web app, Chrome extension) → **API & Orchestration** (FastAPI + LangChain) → **AI Processing Pipeline** (ingest/denoise → transcribe/diarize → cleanup → summarize/extract → embed) → **Storage & Retrieval** (Supabase for relational data + audio, Chroma for vector search) → **Grounded RAG Chat**, looping back to the client.

Each pipeline stage uses a **separate, single-purpose prompt** rather than one overloaded prompt — this was a deliberate design choice to reduce hallucination risk and keep each model call auditable in isolation.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Hook Form + Zod, Framer Motion |
| Browser Extension | Chrome Extension (Manifest V3) |
| Backend | Python, FastAPI, LangChain |
| Transcription & Diarization | AssemblyAI |
| LLM | Google Gemini (primary), OpenRouter (fallback) — 5-key rotation per provider |
| Embeddings | BGE-M3 (local, multilingual) |
| Reranking | BGE-reranker-v2-m3 (local) |
| Vector Database | Chroma |
| Relational DB / Auth / Storage | Supabase (PostgreSQL, Auth, Object Storage) |
| Audio Pre-processing | Browser `getUserMedia` constraints + `ffmpeg` (`afftdn`, highpass filter) |
| Hosting | Free-tier cloud (Render / Railway / Fly.io) |

## Getting Started

### Prerequisites
- Node.js (LTS) and npm
- Python 3.11+
- A [Supabase](https://supabase.com) project (Postgres + Auth + Storage)
- API keys: [Gemini](https://aistudio.google.com/), [OpenRouter](https://openrouter.ai/), [AssemblyAI](https://www.assemblyai.com/)

### Installation

```bash
# Clone
git clone https://github.com/<your-username>/meetmind-ai.git
cd meetmind-ai

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt --break-system-packages
cp .env.example .env   # fill in your keys
uvicorn main:app --reload

# Frontend
cd ../frontend
npm install
cp .env.example .env   # fill in API base URL + Supabase public keys
npm run dev

# Chrome Extension
cd ../extension
npm install
npm run build
# then load /extension/dist as an unpacked extension in chrome://extensions
```

### Environment Variables

See `.env.example` in each package for the full list. At minimum you'll need:
`GEMINI_API_KEY_1..5`, `OPENROUTER_API_KEY_1..5`, `ASSEMBLYAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Project Structure

```
meetmind-ai/
├── backend/
│   ├── main.py
│   ├── key_manager.py
│   ├── config/
│   ├── audio/
│   ├── embeddings/
│   ├── vectordb/
│   ├── models/providers/
│   ├── pipeline/
│   │   ├── prompts/          # one file per prompt: summarization, extraction, query normalization, RAG answer
│   │   ├── ingestion/
│   │   ├── retrieval/
│   │   └── generation/
│   ├── api/
│   ├── utils/
│   └── tests/
├── frontend/
│   └── src/
│       ├── features/         # auth, meetings, recording, transcript, chat, tasks
│       ├── components/
│       ├── services/
│       └── hooks/
├── extension/
│   └── src/
│       ├── background/
│       ├── popup/
│       └── services/
└── docs/
    ├── architecture_diagram.png
    └── demo.gif
```

## Pipeline Walkthrough

1. **Capture** — audio recorded client-side, auto-chunked locally for crash resilience.
2. **Ingest & Denoise** — uploaded to Supabase Storage, chunked to fit provider limits, denoised via `ffmpeg`.
3. **Transcribe & Diarize** — AssemblyAI returns a speaker-labeled, timestamped transcript; chunks are stitched into one continuous transcript.
4. **Cleanup** — a conservative pass removes ASR noise artifacts without altering meaning.
5. **Summarize & Extract** — separate prompts generate the executive summary, detailed summary, action items, and decisions as structured, schema-validated output.
6. **Embed & Store** — content is embedded (BGE-M3) and stored in Chroma with metadata (meeting, speaker, org, timestamp) alongside Supabase's relational records.
7. **Retrieve & Chat** — queries are language-normalized (Roman Urdu handled explicitly), retrieved via hybrid search, reranked, and answered strictly from context — with a defined refusal message when nothing relevant is found.

## Engineering Challenges & Fixes

Real issues found and resolved during testing, not just a feature list:

- **Duplicate action items on repeated runs** — extraction was additive rather than idempotent; fixed by replacing prior results per meeting instead of appending.
- **Silent summary-generation failures** — the summarization call could fail with no visible error; added explicit error handling and a visible retry state.
- **Missing deadlines in structured extraction** — action items lacked dates even though the same info was retrievable via chat; fixed by explicitly instructing date extraction in the prompt.
- **Incorrect transcript script rendering** — Urdu speech was at one point transcribed into Devanagari (Hindi) script instead of Roman Urdu/English; fixed via explicit output-script constraints in the normalization prompt.
- **Background noise affecting transcription** — addressed with both client-side noise suppression and a server-side `ffmpeg` denoising pass, with raw audio preserved as an audit trail and graceful fallback if denoising fails.

## Roadmap

- [ ] Multi-organization accounts with role-based access control (RBAC)
- [ ] Calendar, Slack, and Jira integrations
- [ ] Live/real-time transcription
- [ ] Automated deadline reminders
- [ ] Formal accuracy benchmarking against a labeled dataset

## Contributing

Issues and PRs are welcome. Please open an issue describing the change before submitting a large PR.

## License

[MIT](LICENSE) — or update to whatever license fits your use case.

## Acknowledgments

Built during a Generative AI engineering internship at the **National Center of Artificial Intelligence (NCAI), Pakistan**, at the **Generative AI Research Lab (GAIR)**, Al-Khawarizmi Institute of Computer Science (KICS), UET Lahore.