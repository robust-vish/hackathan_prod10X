from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional, List
from app.services import openproject_service as op
from app.services import llm_service as llm

router = APIRouter()

TYPE_MAP = {
    "bug": "Bug",
    "story": "Story",
    "task": "Task",
    "feature": "Feature",
    "epic": "Epic",
    "improvement": "Improvement",
}

PRIORITY_MAP = {
    "immediate": "Immediate",
    "high": "High",
    "normal": "Normal",
    "low": "Low",
}


@router.post("/create-ticket")
async def create_ticket(
    prompt: str = Form(...),
    files: Optional[List[UploadFile]] = File(None),
):
    # Step 1: Fetch available projects and users
    try:
        projects = await op.get_projects()
        users = await op.get_users()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch OpenProject data: {str(e)}")

    # Step 2: Extract structured data from prompt using LLM
    try:
        extracted = llm.extract_ticket_creation_data(prompt, projects, users)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM extraction failed: {str(e)}")

    # Step 3: Resolve project href
    project_name = extracted.get("project_name", "")
    project_href = op._find_best_match(project_name, projects)
    if not project_href:
        raise HTTPException(
            status_code=400,
            detail=f"Could not match project '{project_name}' to any available project. Available: {[p.get('name') for p in projects[:10]]}"
        )

    # Get project ID from href
    project_id = int(project_href.split("/")[-1]) if project_href else None

    # Step 4: Resolve type href
    try:
        types = await op.get_types(project_id)
    except Exception:
        types = await op.get_types()

    extracted_type = extracted.get("type", "Task")
    type_href = op._find_best_match(extracted_type, types)
    if not type_href:
        # Fallback to first available type
        type_href = types[0].get("_links", {}).get("self", {}).get("href") if types else None
    if not type_href:
        raise HTTPException(status_code=400, detail="No ticket type found in project")

    # Step 5: Resolve priority href
    try:
        priorities = await op.get_priorities()
    except Exception:
        priorities = []

    extracted_priority = extracted.get("priority", "Normal")
    priority_href = op._find_best_match(extracted_priority, priorities)

    # Step 6: Resolve assignee/accountable hrefs
    assignee_href = op._find_user_href(extracted.get("assignee_name", ""), users)
    accountable_href = op._find_user_href(extracted.get("accountable_name", ""), users)

    # Step 7: Create the ticket
    try:
        created = await op.create_ticket(
            subject=extracted.get("subject", prompt[:100]),
            description=extracted.get("description", prompt),
            project_href=project_href,
            type_href=type_href,
            priority_href=priority_href,
            assignee_href=assignee_href,
            accountable_href=accountable_href,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create ticket: {str(e)}")

    ticket_id = created.get("id")
    ticket_url = f"{op._base_url()}/work_packages/{ticket_id}"

    # Step 8: Upload attachments if any
    uploaded_files = []
    if files:
        for f in files:
            if f and f.filename:
                try:
                    content = await f.read()
                    await op.upload_attachment(ticket_id, content, f.filename, f.content_type or "application/octet-stream")
                    uploaded_files.append(f.filename)
                except Exception as upload_err:
                    uploaded_files.append(f"FAILED: {f.filename} — {str(upload_err)}")

    return {
        "success": True,
        "ticket_id": ticket_id,
        "ticket_url": ticket_url,
        "subject": extracted.get("subject"),
        "project": project_name,
        "type": extracted_type,
        "priority": extracted_priority,
        "assignee": extracted.get("assignee_name"),
        "accountable": extracted.get("accountable_name"),
        "uploaded_files": uploaded_files,
        "extraction_notes": extracted.get("extraction_notes", ""),
    }


@router.get("/projects")
async def list_projects():
    try:
        projects = await op.get_projects()
        return {"projects": [{"id": p.get("id"), "name": p.get("name")} for p in projects]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users")
async def list_users():
    try:
        users = await op.get_users()
        return {
            "users": [
                {
                    "id": u.get("id"),
                    "name": f"{u.get('firstName', '')} {u.get('lastName', '')}".strip(),
                    "login": u.get("login"),
                }
                for u in users
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
