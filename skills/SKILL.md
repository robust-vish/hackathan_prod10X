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
Natural language prompt describing the ticket:
> "Create a bug ticket in Android bucket for tender listing issue. Assign to Vishal. Add Anjali as accountable. Priority High."

Optionally: file attachments (screenshots, logs)

### Steps

1. **Send prompt to backend**:
   ```
   POST http://localhost:8000/api/create-ticket
   Body: { "prompt": "...", "attachments": [...] }
   ```

2. **The backend will**:
   - Use LLM to extract: title, description, project bucket, assignee, accountable, type, priority
   - Fetch available projects from OpenProject API
   - Fetch available users from OpenProject API
   - Fuzzy-match extracted names to actual IDs
   - Create the ticket via `POST /api/v3/work_packages`
   - Upload any provided attachments

3. **Return**:
   - Newly created ticket ID
   - Direct URL to the ticket

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
