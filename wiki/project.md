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
- Open OpenProject, select project bucket, assign users
- Fill all fields, upload files, structure description
- Typical effort: **15–30 minutes per ticket**

### Business Impact
Engineering teams spend **20–30% of their time** on manual ticket management and analysis instead of building features. At scale across 50+ engineers, this is **thousands of hours per month**.

---

## 2. Solution

Build an **AI-powered Engineering Productivity Copilot** for OpenProject that:

1. **Reads** OpenProject tickets by ID (title, description, comments, attachments)
2. **Classifies** ticket type automatically (Bug / Story / Task)
3. **Generates** comprehensive analysis instantly:
   - Bug: test cases, RCA, suggested fix, regression checklist
   - Story: A/B hypothesis, metrics, experiment design, expected impact
4. **Creates** tickets from natural language prompts via AI

### Expected Productivity Impact
- 70% reduction in manual QA test-case writing effort
- Faster RCA identification (minutes vs. hours)
- Faster A/B experiment planning
- Reduced ticket creation overhead
- Improved cross-team consistency in ticket quality

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
│  GET  /api/projects    GET  /api/users             │
└──────────┬──────────────────────┬──────────────────┘
           │                      │
┌──────────▼──────────┐  ┌────────▼──────────────────┐
│   OpenProject API   │  │      AI / LLM Layer        │
│  project.intermesh  │  │  Google Gemini 1.5 Flash   │
│  .net/api/v3        │  │     (Free Tier)            │
│  Basic Auth: apikey │  │  Fallback: Groq Llama      │
└─────────────────────┘  └───────────────────────────┘
```

---

## 4. Tech Stack

| Layer     | Technology                          | Why                                    |
|-----------|-------------------------------------|----------------------------------------|
| Frontend  | React 18 + TypeScript + Vite        | Fast dev, great ecosystem              |
| Styling   | Tailwind CSS                        | Rapid UI development                   |
| Backend   | Python FastAPI                      | Best AI/ML ecosystem                   |
| AI Model  | Google Gemini 1.5 Flash (Free)      | Vision + text, generous free tier      |
| API Auth  | OpenProject API Token (Basic Auth)  | Secure, headless, reliable             |
| HTTP      | httpx (Python) / axios (JS)         | Async HTTP clients                     |

---

## 5. Feature Details

### Feature 1 — Ticket Analysis Agent

**Input:** OpenProject Ticket ID (numeric)

**Agent Flow:**
```
User enters Ticket ID
        ↓
Backend calls GET /api/v3/work_packages/{id}
        ↓
Fetch activities: GET /api/v3/work_packages/{id}/activities
Fetch attachments: GET /api/v3/work_packages/{id}/attachments
        ↓
Compile full ticket context (title + desc + comments + file names)
        ↓
LLM classifies ticket type (Bug / Story / Task)
        ↓
Run type-specific analysis prompt
        ↓
Parse structured JSON response
        ↓
Return formatted analysis to frontend
```

**Output for Bug:**
- Bug Summary, Functional Test Cases (5+), Edge Cases
- Root Cause Analysis (probable cause, impacted modules, data flow)
- Suggested Fix (approach, code areas, effort estimate, steps)
- Regression Checklist, Severity Assessment

**Output for Story/UI:**
- Story Summary, A/B Testing Recommendation
- Experiment Hypothesis, Variant Design (Control vs Treatment)
- Metrics (primary, secondary, guardrail)
- Success Criteria, Risk Analysis, Expected Business Impact

---

### Feature 2 — AI Ticket Creation Agent

**Input:** Natural language prompt (+ optional file attachments)

**Example prompt:**
> "Create a bug ticket in Android bucket for tender listing issue. Assign to Vishal. Add Anjali as accountable. Priority High."

**Agent Flow:**
```
User types natural language prompt
        ↓
LLM extracts: title, description, project bucket, assignee,
              accountable, type, priority
        ↓
Backend fetches available projects & users from OpenProject API
        ↓
Fuzzy-match extracted names to actual project/user IDs
        ↓
POST /api/v3/work_packages with structured payload
        ↓
Return: Ticket ID + Direct URL
```

---

## 6. Project Structure

```
Hackathon/
├── wiki/
│   └── project.md              ← This file (continuously updated)
├── skills/
│   └── SKILL.md                ← Agent skill definition
├── backend/
│   ├── app/
│   │   ├── main.py             ← FastAPI app entry
│   │   ├── config.py           ← Environment config
│   │   ├── routes/
│   │   │   ├── analyze.py      ← Ticket analysis endpoint
│   │   │   └── create_ticket.py← Ticket creation endpoint
│   │   ├── services/
│   │   │   ├── openproject_service.py ← OpenProject API calls
│   │   │   └── llm_service.py        ← Gemini AI integration
│   │   ├── prompts/
│   │   │   ├── bug_analysis.txt      ← Bug analysis prompt
│   │   │   ├── story_analysis.txt    ← Story/A/B prompt
│   │   │   └── ticket_creation.txt   ← Ticket creation prompt
│   │   └── utils/
│   │       └── parsers.py            ← Response parsers
│   ├── requirements.txt
│   ├── .env.example
│   └── run.py
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── Header.tsx
    │   │   ├── TicketAnalyzer.tsx
    │   │   ├── TicketCreator.tsx
    │   │   ├── BugAnalysisView.tsx
    │   │   ├── StoryAnalysisView.tsx
    │   │   └── LoadingSteps.tsx
    │   ├── services/api.ts
    │   └── types/index.ts
    ├── package.json
    └── vite.config.ts
```

---

## 7. Setup Instructions

### Step 1 — Get API Keys
1. **OpenProject API Key**: Login → Profile (top right) → Access Tokens → Click "Generate" next to API → Copy key
2. **Gemini API Key**: Visit https://ai.google.dev → Sign in → "Get API key" → Create key (Free)

### Step 2 — Configure Backend
```bash
cd backend
cp .env.example .env
# Edit .env and fill in your API keys
```

### Step 3 — Run Backend
```bash
cd backend
pip install -r requirements.txt
python run.py
# Server starts at http://localhost:8000
```

### Step 4 — Run Frontend
```bash
cd frontend
npm install
npm run dev
# App opens at http://localhost:5173
```

---

## 8. Implementation Status

- [x] Project structure created
- [x] wiki/project.md initialized
- [x] skills/SKILL.md created
- [x] Backend: FastAPI app with CORS
- [x] Backend: OpenProject service (read tickets, activities, attachments, create)
- [x] Backend: Gemini LLM service (bug analysis, story analysis, ticket creation)
- [x] Backend: Analysis routes
- [x] Backend: Create ticket route
- [x] Backend: Structured prompts for all ticket types
- [x] Frontend: React + TypeScript + Vite + Tailwind setup
- [x] Frontend: Tab-based dashboard
- [x] Frontend: Ticket Analyzer component
- [x] Frontend: Ticket Creator component
- [x] Frontend: Bug analysis display
- [x] Frontend: Story/A/B analysis display
- [x] Frontend: Loading animation with steps
