---
name: rca-ab-ticket-agent
description: Use this skill whenever a user wants to analyze an OpenProject ticket, generate QA test cases, predict root cause (RCA) for bugs, suggest code fixes, create A/B testing hypotheses for product/UI story tickets, or create a new OpenProject ticket from a natural language prompt. Trigger on: ticket analysis, test case generation, RCA, A/B hypothesis, bug investigation, experiment planning, ticket creation, OpenProject automation.
---

# RCA + A/B Hypothesis + Ticket Management Agent

This skill enables AI-powered ticket analysis and creation for IndiaMART's OpenProject platform.

## When To Use

- User provides an OpenProject ticket ID and wants it analyzed
- User asks to generate test cases for a bug
- User asks for Root Cause Analysis (RCA) of an issue
- User asks about A/B testing possibilities for a UI/product story
- User wants to create a new OpenProject ticket from a description
- User wants to automate any OpenProject ticket workflow

---

## Feature 1 — Analyze an Existing Ticket

### Input
- OpenProject ticket ID (e.g., `663865`)
- Base URL: `https://project.intermesh.net`

### Steps

1. **Fetch ticket data** using the backend API:
   ```
   POST http://localhost:8000/api/analyze
   Body: { "ticket_id": 663865 }
   ```

2. **The backend will**:
   - Call `GET https://project.intermesh.net/api/v3/work_packages/{id}` (with API key auth)
   - Call `GET .../activities` for comments
   - Call `GET .../attachments` for files
   - Classify ticket as Bug, Story, or Task
   - Run LLM analysis

3. **For Bug tickets**, the agent generates:
   - Bug summary
   - Functional test cases (minimum 5, with steps, expected vs actual)
   - Edge cases
   - Root Cause Analysis (probable cause, impacted modules, data flow)
   - Suggested fix with implementation steps and effort estimate
   - Regression checklist
   - Severity/priority assessment

4. **For Story/UI tickets**, the agent generates:
   - Story summary
   - A/B testing recommendation (applicable or not, with justification)
   - Experiment hypothesis
   - Variant design (Control A vs Treatment B, additional variants if needed)
   - Metrics to track (primary, secondary, guardrail)
   - Success criteria (MDE, statistical significance, duration)
   - Risk analysis and rollback plan
   - Expected business impact (traffic, transactions, UX)

### Output Format
Structured JSON rendered as a formatted report in the UI.

---

## Feature 2 — Create a Ticket from Natural Language

### Input
Natural language prompt describing the ticket — mention project/bucket, assignee, and accountable in the text:
> "Bug in Android bucket: tender page blank screen when navigating from bookmarks. Assign to Vishal Gupta, accountable Rahul Mehta. Priority High."

Optionally: file attachments (screenshots, logs), and Type/Priority dropdowns as overrides.

### Steps

1. **User writes a natural language prompt** — no dropdowns for project or people

2. **Backend calls LLM** with the full prompt and all 178 OpenProject project names:
   - LLM extracts: `subject`, `description`, `project_name`, `assignee_name`, `accountable_name`, `type`, `priority`
   - LLM uses explicit keyword rules: e.g. "android bucket" → "Android", "fcp/mdc" → "FCP/MDC"

3. **Backend resolves project**: fuzzy-matches `project_name` against all 178 projects → gets `project_id`

4. **Backend fetches project members** via `/api/v3/memberships?filters=[{"project":...}]`

5. **Backend resolves people**: fuzzy-matches `assignee_name` and `accountable_name` against project members

6. **Creates ticket** via `POST /api/v3/work_packages` with resolved hrefs

7. **Returns**: Ticket ID, direct URL, AI extraction notes (if any ambiguity)

---

## Configuration

Required environment variables (set in `backend/.env`):
```
OPENPROJECT_BASE_URL=https://project.intermesh.net
OPENPROJECT_API_KEY=<your_api_token>
GEMINI_API_KEY=<your_gemini_api_key>
```

To get the OpenProject API key:
- Login to OpenProject → Profile → Access Tokens → Generate API Token

To get Gemini API key (free):
- Visit https://ai.google.dev → Get API Key

---

## Running the Service

```bash
# Backend (Python FastAPI)
cd backend
pip install -r requirements.txt
python run.py

# Frontend (React)
cd frontend
npm install
npm run dev
```

---

## Ticket Type Classification Rules

| Ticket Type | Keywords / Signals                              | Analysis Mode   |
|-------------|------------------------------------------------|-----------------|
| Bug         | "bug", "error", "crash", "not working", actual vs expected behavior | RCA + Test Cases |
| Story       | "story", "UI change", "improve", "experiment", "feature", "enhance" | A/B Hypothesis  |
| Task        | "task", "chore", "setup", "configure", "deploy" | Summary + Steps |
| Improvement | "improvement", "optimization", "performance"   | A/B or RCA      |

---

## References

- Backend code: `backend/app/`
- LLM prompts: `backend/app/prompts/`
- Frontend: `frontend/src/`
- Project docs: `wiki/project.md`
