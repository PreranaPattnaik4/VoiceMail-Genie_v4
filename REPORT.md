# VoiceMail-Genie Technical Stack & Architecture Report

VoiceMail-Genie is an advanced agentic full-stack application that seamlessly captures audio/voice inputs, performs real-time multilingual transcription, analyzes content structure to identify intent, and translates or formats drafts before directly committing them to a user's Gmail Draft workspace.

---

## 1. System Architecture Overview
The application utilizes a **Full-Stack (Client-Server) Architecture** deployed on a secure containerized environment. This decoupled model separates browser interactions from sensitive third-party APIs and credentials, ensuring robust security.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (SPA)                              │
│  React 19 / Tailwind v4 / Motion / Firebase Auth / Web Media Stream   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         REST API (JSON / HTTPS)
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                            SERVER (Express)                            │
│  NodeJS ESM / esbuild / dotenv / @google/genai SDK                    │
└──────────┬──────────────────────────────────────────────────┬──────────┘
           │                                                  │
   Google Gemini API                                     Gmail API
┌──────────▼──────────┐                             ┌─────────▼──────────┐
│  gemini-3.5-flash   │                             │  Gmail Drafts SDK  │
│  Transcribe, Write  │                             │  compose/inject    │
└─────────────────────┘                             └────────────────────┘
```

---

## 2. Core Technology Stack

### A. Frontend Tier (Single Page Application)
* **Framework:** `React 19` (Functional component design, Hooks, State Engines, and local caches).
* **Styling Engine:** `Tailwind CSS v4` (providing next-generation styling, container queries, CSS variables, and rapid theme configuration).
* **Animations:** `motion/react` (providing declarative, fluid transitions, micro-interactions, pulse feedback, and drag-and-drop overlays).
* **Typography & Iconography:** 
  * Primary Font: `Inter` (sans-serif for ultra-clean readability)
  * Display Font: `Space Grotesk` (contemporary tech-inspired display spacing)
  * Font-Mono: `JetBrains Mono` (for data nodes, timers, and efficiency stats)
  * Icons: `lucide-react` (lightweight, highly custom vector SVGs)

### B. Backend Tier (API Gateway & Processing Node)
* **Application Framework:** `Express 4` (Routing layer, handling file streaming payloads up to `50mb`).
* **Language Compiler:** `TypeScript 5` (Shared structural types, interfaces, and strong safety models across client and server tiers).
* **Build System:** Custom Vite bundler utilizing `esbuild` to compile backend TypeScript paths into a single, highly-optimized, self-contained CommonJS target (`dist/server.cjs`), eliminating ESM import overhead on container startup.

---

## 3. Authentication & API Integrations

### A. Authentication Framework
* **Identity Platform:** `Firebase Authentication` (Client-side integration initializing federated Google Sign-in workflows).
* **OAuth Scope Orchestration:** 
  * Scope Requested: `https://www.googleapis.com/auth/gmail.compose`
  * Secure Token Caching: Upon a successful federated auth login flow, Google’s OAuth Access Token is securely captured client-side and saved in `localStorage` for seamless, non-blocking page refreshes.

### B. Google Workspace (Gmail) Integration
* **API Service:** Google RESTful Directory endpoint (`https://gmail.googleapis.com/gmail/v1/users/me/drafts`).
* **Format Delivery:** Standardized RFC 822 content streams compiled in HTML format with custom metadata fields (To, Subject, MIME-Version, Content-Type).
* **Payload Encoding:** Dynamic Base64url encoding (mapping standard `+` to `-`, `/` to `_`, and removing trailing padding `=` signs) before sending to Google Cloud endpoint.

---

## 4. Artificial Intelligence Models & Agent Pipelines

The application relies entirely on the latest generation **Google Gemini 3.5 Flash** model (`gemini-3.5-flash`) via the modern `@google/genai` (v2.4.0) SDK. AI tasks are structured as distinct pipelines using structured JSON responses (`responseMimeType: "application/json"`):

| Pipeline Stage | Model | Input Data Type | Output Structure | Core Action |
|---|---|---|---|---|
| **Transcription Engine** | `gemini-3.5-flash` | Multimodal Base64 Audio (`audio/webm` etc) | `{ text, detectedLanguage }` | Extracts word-for-word spoken details and auto-identifies dialects. |
| **Agentic Writer** | `gemini-3.5-flash` | Plaintext string, metadata context, Tone selection | `{ subject, body, intent, keyInfo, callToAction }` | Formulates structured, formatted HTML emails matching targeted business context. |
| **Contextual Translator** | `gemini-3.5-flash` | Formatted HTML blocks & Metadata | `{ subject, body }` | Translates content fluidly while retaining HTML structure (`<p>`, `<strong>`). |

---

## 5. Design Theme: The "Bento Grid"
VoiceMail-Genie utilizes a distinctive **Bento Grid** container layout system, segmenting tasks and states into visual blocks:
1. **Voice Input Block (Col 3, Row 2):** Real-time recording controls, waveform indicators, duration timers, and file drag-and-drop dropzones.
2. **Transcription Workspace (Col 3, Row 4):** Text outline display and quick scenario preset trays.
3. **Draft Composer (Col 6, Row 6):** Primary visual focal point featuring interactive text/HTML editing, active translation dropdowns, and sync buttons.
4. **Tone Selector (Col 3, Row 3):** Interactive mood controls paired with target languages and recipient fields.
5. **Efficiency Hub (Col 3, Row 3):** High-contrast dark Slate console showcasing calculated saved time, AI accuracy, intent models, and key metadata.

---

## 6. Project Directory Schema
```
├── .env.example                # Config Template for secrets (GEMINI_API_KEY)
├── package.json                # Project dependencies (React 19, Tailwind v4, Gemini GenAI)
├── metadata.json               # App credentials, permissions, and frame capabilities
├── server.ts                   # Custom Express backend and API proxy endpoints
├── REPORT.md                   # Complete Technical Report (This file)
└── src/
    ├── App.tsx                 # Core UI dashboard orchestrating the Bento layout
    ├── firebase-auth.ts        # OAuth scopes and Firebase sign-in setup
    ├── index.css               # Global Tailwind CSS directives and custom font tokens
    ├── types.ts                # App structural interface and typescript types
    └── data.ts                 # Preset templates, scenario libraries, and tone catalogs
```
