---
name: indiamart-project-planner
description: Use this skill when the user wants to automate any OpenProject ticket workflow at IndiaMART — create a new bug, story, task, or improvement ticket from a natural language prompt (with optional file attachments, auto-assigned team members, email notifications, and a scheduled Google Meet); analyse an existing ticket by ID to get a full bug RCA, functional test cases, regression checklist, suggested code fix, or A/B experiment design for product/UI stories; or ask about ticket status, QA planning, or experiment metrics. Trigger on: create ticket, raise bug, log issue, new story, analyse ticket, ticket RCA, root cause, test cases, A/B hypothesis, experiment design, schedule meeting, send notification, OpenProject, IndiaMART ticket workflow.
license: Proprietary — IndiaMART Internal Use
compatibility: Designed for Claude Code. Requires Python 3.11+ backend running on localhost:8000 with valid OPENPROJECT_API_KEY and GROQ_API_KEY in backend/.env. Google Meet scheduling requires GOOGLE_APPS_SCRIPT_URL. Email notifications require APPS_SCRIPT_URL. Access to project.intermesh.net must be available.
metadata:
  author: IndiaMART Hackathon 2026 Team
  version: "2.0"
  project: IndiaMART Project Planner
---

# IndiaMART Project Planner — AI Productivity Copilot

An AI agent that eliminates manual ticket management overhead for engineering, QA, and product teams at IndiaMART. A single natural language prompt replaces 15–30 minutes of manual work across OpenProject, Gmail, and Google Calendar.

---

## Overview

This agent supports two core capabilities:

| Capability | Input | What Gets Automated |
|---|---|---|
| **Ticket Creation** | Natural language prompt + optional file | Creates OpenProject ticket, uploads attachments, resolves assignee/accountable, sends Gmail notifications, schedules Google Meet |
| **Ticket Analysis** | OpenProject ticket ID | Fetches full ticket context, classifies type, generates RCA + test cases (bug) or A/B hypothesis + experiment design (story) |

---

## Capability 1 — Ticket Analysis

### When to use
- User provides a ticket ID and asks for analysis, RCA, test cases, or A/B testing ideas
- Example prompts: `"Analyse ticket #664712"`, `"What's the RCA for 663865?"`, `"Generate test cases for ticket 664745"`

### Steps

1. Call the backend analysis endpoint:
   ```
   POST http://localhost:8000/api/analyze
   Body: { "ticket_id": <number> }
   ```

2. The backend automatically:
   - Fetches ticket title, description, type, and status via OpenProject API
   - Fetches all activity comments
   - Fetches attached files list
   - Classifies the ticket as **Bug**, **Story**, or **Task** using the LLM
   - Runs the appropriate deep-analysis prompt

3. For **Bug tickets**, the agent returns:
   - Bug summary and severity (Critical / High / Medium / Low) with business impact
   - Minimum 5 functional test cases (each with preconditions, steps, expected result, actual result, priority)
   - Edge cases with reasoning and how to test
   - Root Cause Analysis: probable cause, technical explanation, impacted modules, data flow impact
   - Suggested fix: approach, code areas to change, implementation steps, estimated effort
   - Regression checklist: areas to verify after the fix

4. For **Story / UI tickets**, the agent returns:
   - Story summary
   - A/B testing recommendation (applicable or not, with justification)
   - Experiment hypothesis statement
   - Variant design: Control (A) vs Treatment (B), additional variants if needed
   - Metrics: primary metric, secondary metrics, guardrail metrics (each with measurement method and baseline)
   - Success criteria: MDE, statistical significance, minimum sample size, recommended duration, traffic split
   - Target audience segment with exclusions and size estimate
   - Risk analysis: potential negatives, rollback plan, risk level, mitigation
   - Expected business impact: traffic, transactions, UX, timeline to results

### Ticket Classification Rules

| Signals in Ticket | Analysis Mode |
|---|---|
| "bug", "error", "crash", "not working", actual vs expected behavior | Bug → RCA + Test Cases |
| "story", "UI change", "redesign", "improve UX", "experiment", "feature" | Story → A/B Hypothesis |
| "task", "chore", "setup", "configure", "deploy", "migrate" | Task → Summary + Steps |
| "improvement", "optimization", "performance" | Context-dependent: RCA or A/B |

---

## Capability 2 — Ticket Creation

### When to use
- User wants to create a new OpenProject ticket from a natural language description
- Example prompts:
  - `"Create a High priority bug in Android bucket — tender page goes blank on load. Assign to Vishal Bairagi, accountable Braj Mohan."`
  - `"New story in iOS bucket: redesign profile screen for better UX. Medium priority, assign Priyanshu Gaurav, accountable Soumya Sarkar."`

### What a single prompt automates

1. **OpenProject ticket creation** — subject, structured description (Actual Behavior, Expected Behavior, Steps to Reproduce, Test Environment), ticket type, priority
2. **Assignee and accountable resolution** — fuzzy-matched against real project members via LLM
3. **File attachment upload** — screenshots or logs go directly into the ticket's FILES section
4. **Gmail notification** — sent to both assignee and accountable with ticket details, direct link, and meeting info
5. **Google Meet scheduling** — calendar invite created for the next day at 2 PM–3 PM IST, with a real Meet link sent to all parties

### Steps

1. User types a natural language prompt (attach files via the paperclip button if needed)

2. Call the backend:
   ```
   POST http://localhost:8000/api/create-ticket
   Content-Type: multipart/form-data
   Body: prompt=<text>&files=<optional uploads>
   ```

3. The backend pipeline (in order):
   - **LLM extraction** — parses subject, description, project name, assignee name, accountable name, type, priority from the free-text prompt
   - **Project resolution** — fuzzy-matches project name against all 178 OpenProject project buckets; uses hardcoded catalog for key buckets (Android, iOS, FCP/MDC, Search, etc.)
   - **Type & priority lookup** — resolves against actual project types and global priority list
   - **Member resolution** — fetches project members, runs a second LLM call to fuzzy-match person names (handles partial names, initials, and typos)
   - **Ticket creation** — `POST /api/v3/work_packages` with fully resolved hrefs
   - **Attachment upload** — each file posted to `POST /api/v3/work_packages/{id}/attachments` with correct `file` field and JSON metadata; files appear in the FILES tab of the ticket
   - **Google Meet scheduling** — `POST` to `GOOGLE_APPS_SCRIPT_URL` with IST timestamps; returns a real Meet link via Calendar API Advanced Service
   - **Email notification** — `POST` to `APPS_SCRIPT_URL` (Gmail Apps Script) with ticket details, ticket URL, Meet link, and meeting time

4. Response includes: ticket ID, direct OpenProject URL, subject, project, type, priority, assignee, accountable, uploaded file list, meeting details, email delivery status

### Project Bucket Keyword Aliases

| Keyword in Prompt | Resolves To |
|---|---|
| "android", "android bucket" | Android (ID 3) |
| "ios", "ios native", "iphone" | IM-iOS Native (ID 85) |
| "fcp", "fcp/mdc", "mdc" | FCP/MDC (ID 54) |
| "search" | Search (ID 124) |
| "tender" | Tender (ID 79) |
| "trade" | Trade (ID 80) |
| "seller" | Seller / Trade / Tender (ID 408) |
| "desktop ux", "buyer desktop" | Buyer Desktop UX (ID 14) |
| "lead manager" | IndiaMART Lead Manager (ID 447) |

---

## Environment Setup

### Required `.env` variables (in `backend/.env`)

```
OPENPROJECT_BASE_URL=https://project.intermesh.net
OPENPROJECT_API_KEY=<your_openproject_api_token>

GROQ_API_KEY=<your_groq_api_key>
LLM_PROVIDER=groq

APPS_SCRIPT_URL=<your_email_apps_script_web_app_url>
GOOGLE_APPS_SCRIPT_URL=<your_calendar_apps_script_web_app_url>
EMAIL_DOMAIN=indiamart.com
```

### Getting API keys
- **OpenProject**: Login → Profile → Access Tokens → Generate API Token
- **Groq (free, works from India)**: https://console.groq.com → API Keys → Create API Key
- **Apps Script URLs**: See `references/apps-script.js` — deploy as a Web App on https://script.google.com

### Running locally

```bash
# Backend (Python FastAPI)
cd backend
pip install -r requirements.txt
python run.py
# Starts on http://localhost:8000

# Frontend (React + Vite)
cd frontend
npm install
npm run dev
# Starts on http://localhost:5173
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/analyze` | Analyse existing ticket by ID |
| `POST` | `/api/create-ticket` | Create ticket from natural language + files |
| `GET` | `/api/projects` | List all OpenProject projects |
| `GET` | `/api/projects/{id}/members` | List members of a specific project |

---

## LLM Fallback Chain

The agent uses Groq as primary (free, no IP block in India) with automatic fallback:

1. `llama-3.3-70b-versatile` (primary — best reasoning)
2. `llama-3.1-8b-instant` (faster, lower token cost)
3. `compound-beta-mini` (last resort)

On rate-limit (429) the agent waits 5 seconds and retries the next model. Decommissioned models are skipped automatically.

---

## Reference Files

| File | Purpose |
|---|---|
| `references/apps-script.js` | Google Apps Script for Google Calendar + Meet — deploy at script.google.com. Handles date validation, domain filtering, and Meet link generation via Calendar API Advanced Service. |
| `references/calendar.js` | Node.js client module that calls the Apps Script Web App. Handles IST timezone, past-date guard (auto-corrects to tomorrow), attendee domain filtering, and response normalisation. |

---

## Reuse Potential

This skill is structured for reuse across IndiaMART workflows:

- **Swap OpenProject** → any project management API (Jira, Linear, Asana) by updating `openproject_service.py`
- **Swap email Apps Script** → any SMTP or SendGrid integration by updating `notification_service.py`
- **Add new ticket types** → extend `bug_analysis.txt` or `story_analysis.txt` prompts in `backend/app/prompts/`
- **Add new projects** → append to `_KNOWN_PROJECTS_CATALOG` in `openproject_service.py` — no LLM changes needed
- **Add new team members** → update `_KNOWN_EMAILS` dict for correct email resolution
