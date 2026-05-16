# RCA + A/B Hypothesis + Ticket Management — AI Agent

## 1. Problem Statement

At IndiaMART, engineering, QA, PM, and product teams manage hundreds of tickets weekly in **OpenProject**. Tickets represent Bugs, UI/UX stories, product experiments, Tasks, or Improvements.

### Current Pain Points

**For Bug Tickets — teams manually:**
- Read ticket details, understand the issue, inspect comments and uploaded files
- Write test cases from scratch
- Identify root causes (RCA) through team discussion
- Suggest impacted modules, possible fixes, and regression areas
- Typical effort: **2–4 hours per bug ticket**

**For Product/Story Tickets — teams manually:**
- Analyze proposed UI/UX changes
- Think about whether A/B testing is feasible
- Decide experiment metrics, KPIs, and success criteria
- Typical effort: **1–2 hours per story ticket**

**For Ticket Creation — teams manually:**
- Open OpenProject, select project bucket, assign users, fill all fields
- Typical effort: **15–30 minutes per ticket**

### Business Impact
Engineering teams spend **20–30% of their time** on manual ticket management and analysis instead of building features.

---

## 2. Solution

Build an **AI-powered Engineering Productivity Copilot** for OpenProject that:

1. **Reads** OpenProject tickets by ID (title, description, comments, attachments)
2. **Classifies** ticket type automatically (Bug / Story / Task)
3. **Generates** comprehensive analysis instantly:
   - Bug: test cases, RCA, suggested fix, regression checklist
   - Story: A/B hypothesis, metrics, experiment design, expected impact
4. **Creates** tickets from natural language prompts + explicit dropdowns

---

## 3. Architecture

```
┌────────────────────────────────────────────────────┐
│                    FRONTEND                         │
│           React 18 + TypeScript + Vite             │
│       Tab 1: Analyze Ticket | Tab 2: Create        │
│              Tailwind CSS UI                        │
└──────────────────────┬─────────────────────────────┘
                       │ HTTP REST (localhost:8000)
┌──────────────────────▼─────────────────────────────┐
│                    BACKEND                          │
│              Python FastAPI + Uvicorn              │
│  POST /api/analyze     POST /api/create-ticket     │
│  GET  /api/projects    GET  /api/projects/{id}/members │
└──────────┬──────────────────────┬──────────────────┘
           │                      │
┌──────────▼──────────┐  ┌────────▼──────────────────┐
│   OpenProject API   │  │      AI / LLM Layer        │
│  project.intermesh  │  │    Groq — Llama 3.3 70B    │
│  .net/api/v3        │  │  (Free, works from India)  │
│  Basic Auth: apikey │  └───────────────────────────┘
└─────────────────────┘
```

---

## 4. Tech Stack

| Layer     | Technology                          | Why                                    |
|-----------|-------------------------------------|----------------------------------------|
| Frontend  | React 18 + TypeScript + Vite        | Fast dev, great ecosystem              |
| Styling   | Tailwind CSS                        | Rapid UI development                   |
| Backend   | Python FastAPI                      | Best AI/ML ecosystem                   |
| AI Model  | Groq — Llama 3.3 70B (Free)         | Gemini free tier blocked in India; Groq works |
| API Auth  | OpenProject API Token (Basic Auth)  | Secure, headless, reliable             |

---

## 5. Feature Details

### Feature 1 — Ticket Analysis Agent

**Input:** OpenProject Ticket ID (numeric)

**Flow:**
```
User enters Ticket ID
  → GET /api/v3/work_packages/{id}  (title, description, type, status)
  → GET /api/v3/work_packages/{id}/activities  (comments)
  → GET /api/v3/work_packages/{id}/attachments  (files)
  → LLM classifies: Bug / Story / Task
  → Run type-specific analysis prompt
  → Return structured JSON report
```

**Output for Bug:** Bug summary, 5+ test cases, edge cases, RCA, suggested fix, regression checklist, severity

**Output for Story/UI:** Story summary, A/B hypothesis, variant design, metrics, success criteria, risk analysis

---

### Feature 2 — AI Ticket Creation Agent

**Input:** Natural language description (mentioning project/bucket, assignee, accountable) + optional file attachments + Type and Priority dropdowns

**Flow:**
```
User types full description in prompt, e.g.:
  "Bug in Android bucket: tender page blank. Assign to Vishal, accountable Rahul. Priority High."
  → LLM extracts: subject, description, project_name ("Android"), assignee_name ("Vishal"), accountable_name ("Rahul")
  → Backend fetches all 178 projects, fuzzy-matches "Android" → Project ID 3
  → Backend fetches Project 3 members via /api/v3/memberships endpoint
  → Fuzzy-matches "Vishal" and "Rahul" against member list
  → POST /api/v3/work_packages  (with resolved project/user hrefs)
  → Return: Ticket ID + direct URL + AI extraction notes
```

**Why prompt-only (no dropdowns for project/assignee):** The senior reviewer's feedback was that an AI agent should understand context from the prompt — using dropdowns removes the intelligence of the agent. The AI is trained with explicit project-keyword mapping and person-name extraction rules in the prompt template.

---

## 6. Known Issues & Fixes Applied

| Issue | Root Cause | Fix Applied |
|-------|------------|-------------|
| Gemini API 404 | `gemini-1.5-flash` deprecated | Switched to `gemini-2.0-flash` |
| Gemini API 429 quota | Gemini free tier blocked in India (limit=0) | Switched to Groq (Llama 3.3 70B) — free, works in India |
| `GET /api/v3/users` → 403 | Requires admin token; regular token denied | Switched to `GET /api/v3/projects/{id}/members` |
| Wrong project selected | LLM guessing from text; 178 projects, partial match ambiguous | Added project dropdown — loads exact names from API |
| Assignee/Accountable not set | Members fetched from wrong project (cascaded from wrong project) | Dropdowns load members AFTER correct project is selected |
| `.env` blocked GitHub push | API keys in committed `.env` | Added `.gitignore`, removed `.env` from tracking, rewrote commit history |
| Only 20 projects loading; Android not found | `get_projects()` incremented `offset` by requested `pageSize=100` but server caps at 20 per page — skipped items 21–100, 121–200, etc. | Fixed: increment `offset += len(elements)` (actual received), not by requested page size |
| Android still not found after pagination fix | API token may only have membership access to a subset of projects; "Android" falls outside that set | Added `_KNOWN_PROJECT_IDS` hardcoded dict (from Excel export) + `find_project_href()` that tries API first, then fallback — Android, FCP/MDC, iOS, Search etc. always resolve |
| "No members found" in dropdowns | `/api/v3/projects/{id}/members` is not a valid endpoint on this OpenProject version | Switched to `/api/v3/memberships?filters=[{"project":{"operator":"=","values":["ID"]}}]` — deduped by href |

---

## 7. OpenProject Project List (from exported XLS, 178 total)

Key buckets relevant to IndiaMART engineering:

| ID | Identifier | Name |
|----|-----------|------|
| 3 | android | **Android** |
| 85 | iosnative | IM-iOS Native |
| 476 | app-webview-lead-manager | APP Webview Lead Manager |
| 408 | seller | Seller / Trade / Tender |
| 79 | tender | Tender |
| 80 | trade | Trade |
| 47 | searchui | Desktop search UI |
| 124 | search | Search |
| 461 | photo-search-im | Photo Search IM |
| 447 | indiamart-lead-manager | IndiaMART Lead Manager |
| 54 | fcp | FCP/MDC |
| 14 | desktopux | Buyer Desktop UX |
| 55 | proddetail | Product Detail Page |
| 70 | ide | Desktop Lead Manager |

---

## 8. Setup Instructions

### Step 1 — Get API Keys
1. **OpenProject API Key**: Login → Profile → Access Tokens → Generate API Token
2. **Groq API Key (free)**: https://console.groq.com → API Keys → Create

### Step 2 — Configure
```
cd backend
# Edit .env — fill in OPENPROJECT_API_KEY and GROQ_API_KEY
# Set LLM_PROVIDER=groq
```

### Step 3 — Run
```bash
# Backend
cd backend && pip install -r requirements.txt && python run.py
# → http://localhost:8000

# Frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

---

## 9. Project Structure

```
Hackathon/
├── wiki/project.md                      ← This file
├── skills/SKILL.md                      ← Agent skill definition
├── .gitignore                           ← Excludes .env, node_modules, __pycache__
├── start.bat                            ← Double-click to launch both servers
├── backend/
│   ├── app/
│   │   ├── main.py                      ← FastAPI app + CORS
│   │   ├── config.py                    ← Reads .env settings
│   │   ├── routes/
│   │   │   ├── analyze.py               ← POST /api/analyze
│   │   │   └── create_ticket.py         ← POST /api/create-ticket, GET /api/projects
│   │   ├── services/
│   │   │   ├── openproject_service.py   ← All OpenProject API calls
│   │   │   └── llm_service.py           ← Groq/Gemini LLM calls
│   │   ├── prompts/
│   │   │   ├── bug_analysis.txt
│   │   │   ├── story_analysis.txt
│   │   │   └── ticket_creation.txt
│   │   └── utils/parsers.py
│   ├── .env                             ← Local only, not in git
│   ├── .env.example                     ← Template for new developers
│   ├── requirements.txt
│   └── run.py
└── frontend/
    └── src/
        ├── App.tsx                      ← Tab navigation
        ├── components/
        │   ├── Header.tsx
        │   ├── TicketAnalyzer.tsx        ← Tab 1: analyze by ticket ID
        │   ├── TicketCreator.tsx         ← Tab 2: create with dropdowns + AI
        │   ├── BugAnalysisView.tsx       ← Bug analysis result display
        │   ├── StoryAnalysisView.tsx     ← Story/A/B result display
        │   └── LoadingSteps.tsx
        ├── services/api.ts
        └── types/index.ts
```

---

## 10. Implementation Status

- [x] Project structure + wiki initialized
- [x] skills/SKILL.md created (proper YAML format)
- [x] Backend: FastAPI app with CORS
- [x] Backend: OpenProject service (read tickets, activities, attachments, create, get project members)
- [x] Backend: Groq LLM service (with 4-model fallback chain)
- [x] Backend: Bug analysis route + prompts
- [x] Backend: Story/A/B analysis route + prompts
- [x] Backend: Ticket creation route (uses project_id + user hrefs directly)
- [x] Frontend: React + TypeScript + Vite + Tailwind
- [x] Frontend: Tab 1 — Ticket Analyzer with loading steps
- [x] Frontend: Tab 2 — Ticket Creator with project/member dropdowns
- [x] Frontend: Bug analysis display (collapsible sections)
- [x] Frontend: Story/A/B display (metrics, variants side-by-side)
- [x] GitHub repo: https://github.com/robust-vish/hackathan_prod10X
- [x] Fix: Groq as primary LLM (Gemini blocked in India)
- [x] Fix: Project members API instead of global users (403 fix)
- [x] Fix: `get_projects()` pagination — fetches all 178 projects (was capped at 20)
- [x] Fix: `get_project_members()` — switched to `/api/v3/memberships` endpoint (was using non-existent `/projects/{id}/members`)
- [x] Redesign: Removed project/assignee/accountable dropdowns — AI agent now extracts all from natural language prompt
- [x] Improved: `ticket_creation.txt` prompt with explicit bucket keyword mapping + person name extraction rules
- [x] Cleaned: `extract_ticket_creation_data()` now passes all 178 projects to LLM (removed 50-item limit)
