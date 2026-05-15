from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services import openproject_service as op
from app.services import llm_service as llm
from app.utils.parsers import format_ticket_context

router = APIRouter()


class AnalyzeRequest(BaseModel):
    ticket_id: int


@router.post("/analyze")
async def analyze_ticket(req: AnalyzeRequest):
    ticket_id = req.ticket_id

    # Step 1: Fetch ticket data from OpenProject
    try:
        ticket = await op.get_ticket(ticket_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Could not fetch ticket {ticket_id}: {str(e)}")

    # Step 2: Fetch activities and attachments
    try:
        activities = await op.get_activities(ticket_id)
    except Exception:
        activities = []

    try:
        attachments = await op.get_attachments(ticket_id)
    except Exception:
        attachments = []

    # Step 3: Compile context
    context = format_ticket_context(ticket, activities, attachments)

    # Step 4: Classify ticket type
    try:
        ticket_type = llm.classify_ticket(context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM classification failed: {str(e)}")

    # Step 5: Run type-specific analysis
    try:
        if ticket_type in ("Bug",):
            analysis = llm.analyze_bug_ticket(context)
        elif ticket_type in ("Story", "Feature", "Improvement"):
            analysis = llm.analyze_story_ticket(context)
        else:
            # Default: treat as bug for now
            analysis = llm.analyze_bug_ticket(context)
            ticket_type = "Task (Bug Analysis)"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM analysis failed: {str(e)}")

    # Step 6: Return structured result
    ticket_summary = {
        "id": ticket.get("id"),
        "title": ticket.get("subject"),
        "status": ticket.get("_links", {}).get("status", {}).get("title"),
        "priority": ticket.get("_links", {}).get("priority", {}).get("title"),
        "assignee": ticket.get("_links", {}).get("assignee", {}).get("title"),
        "project": ticket.get("_links", {}).get("project", {}).get("title"),
        "type": ticket.get("_links", {}).get("type", {}).get("title"),
        "created_at": ticket.get("createdAt"),
        "url": f"{op._base_url()}/work_packages/{ticket_id}",
        "activity_count": len(activities),
        "attachment_count": len(attachments),
    }

    return {
        "ticket_type": ticket_type,
        "ticket_summary": ticket_summary,
        "analysis": analysis,
        "analysis_mode": "bug" if ticket_type == "Bug" else "story",
    }
