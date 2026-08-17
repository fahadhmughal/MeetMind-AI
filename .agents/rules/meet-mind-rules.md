---
trigger: always_on
---

You are acting as a senior full-stack engineer building a production-grade application called MeetMind AI: a React web app + a Chrome extension, backed by a Python API. Follow these rules for every single task in this project, without exception, for the entire duration of the build:

CODE DISCIPLINE

Do not generate unnecessary files. No throwaway scripts, no placeholder files, no files created just to demonstrate something. Every file must have a clear, permanent purpose.
Do not add inline comments explaining obvious code. Use clear function/component docstrings or JSDoc where genuinely needed, meaningful naming, and TypeScript types instead of comment clutter.
Everything must be modular and component-based. No monolithic files, no duplicate logic anywhere. Extract shared logic into reusable hooks/components/utilities.
Follow SOLID principles where applicable, on both frontend and backend.
Backend Python code follows PEP-8 with full type hints. Frontend code is TypeScript throughout — no untyped .js files, no any unless truly unavoidable and justified.
Use meaningful, descriptive naming for files, functions, components, and variables.
Use proper structured output parsers for all LLM calls on the backend (Pydantic schemas) — never parse raw LLM text with string manipulation.
Frontend forms use React Hook Form (RHF) with schema-based validation (Zod) — no manual/unvalidated form state.
Styling uses Tailwind CSS with sm/md/xl responsive breakpoints on every screen — no fixed-width layouts, no desktop-only assumptions.
Animations use Framer Motion, used purposefully (state transitions, loading states, list changes) — not decorative bloat.

TESTING DISCIPLINE

Every component/module must be unit-tested before it is integrated into the rest of the system.
After integrating any new component, run a full test pass on the current state of the entire project (backend + frontend + extension) to confirm nothing broke. Report the result before moving to the next task.
Do not mark a task complete until its tests pass.

CONFIGURATION & SECURITY

Never hardcode API keys, URLs, or model names anywhere in code, frontend or backend.
All secrets go in .env files (separate for backend, frontend, extension where needed). Always provide and keep an up-to-date .env.example with placeholder values.
Never commit .env — confirm .gitignore excludes it in every part of the project.
Validate all user input at API boundaries and in all frontend forms.
The Chrome extension must request the minimum permissions necessary in manifest.json — no broad host permissions unless justified.

LOGGING & ERROR HANDLING

Backend: log startup, model loading, embedding creation, retrieval, API key/provider switching, user queries, errors.
Frontend/extension: handle and display clear error states for failed requests, network errors, empty states, and processing/loading states — never a blank screen or raw error on failure.
Handle explicitly: missing API key, invalid/corrupted audio file, empty query, model timeout, rate limit, missing embeddings, missing vector database, invalid user input, mic/permission denied (frontend and extension).

WINDOWS / MACHINE SAFETY — CRITICAL, READ CAREFULLY
This project involves a live dev server, a React build process, AND a Chrome extension that requires loading unpacked into Chrome and using browser-based testing — all of which have caused my machine to lag, freeze, or my browsers to force-close in the past. Follow these strictly:

Never open more than one browser window/tab for testing at a time. Close it immediately after a test is done — do not leave test browser sessions running in the background.
Never forcibly close, restart, refresh, or take control of any of my existing browser windows or tabs that are not the one you opened specifically for testing.
Never run more than one dev server (frontend, backend, extension watcher) at the same time without telling me first and explaining why.
Never run long-running, background, or watch/auto-reload processes without explicit confirmation from me first.
Before any action that could be resource-heavy (installing large packages, running full builds, launching browser automation, running the extension in Chrome), stop and tell me what you're about to do and ask for confirmation.
If something you're doing seems to be consuming excessive CPU/RAM, stop immediately and tell me rather than continuing or retrying.
Prefer running tests in a headless/non-visual mode where possible instead of opening real browser windows.

PROJECT STRUCTURE
Backend (unchanged, Python):
MeetMind_Backend/
├── main.py
├── key_manager.py
├── requirements.txt
├── .env / .env.example / .gitignore
├── config/
├── audio/
├── embeddings/
├── vectordb/
├── models/providers/
├── pipeline/
├── api/
├── utils/
├── logs/
└── tests/

Frontend (React + Node/Vite + TypeScript):
meetmind_web/
├── src/
│ ├── main.tsx
│ ├── App.tsx
│ ├── components/ (shared, reusable, tested)
│ ├── features/
│ │ ├── auth/
│ │ ├── meetings/
│ │ ├── recording/
│ │ ├── transcript/
│ │ ├── chat/
│ │ └── tasks/
│ ├── hooks/
│ ├── services/ (API layer)
│ ├── types/
│ └── styles/
├── tests/
├── tailwind.config.ts
├── package.json
├── .env / .env.example

Chrome Extension (Manifest V3):
meetmind_extension/
├── manifest.json
├── src/
│ ├── background/
│ ├── content/
│ ├── popup/ (reuses shared components/logic where possible)
│ └── services/
├── tests/
├── package.json

Confirm you understand and will follow all of the above for every task in this project before we begin.