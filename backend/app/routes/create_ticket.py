from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional, List
from app.services import openproject_service as op
from app.services import llm_service as llm

router = APIRouter()


@router.post("/create-ticket")
async def create_ticket(
    prompt: str = Form(...),
    files: Optional[List[UploadFile]] = File(None),
):
    # Step 1: Fetch all projects (paginated — up to 178 at IndiaMART)
    try:
        projects = await op.get_projects()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")

    # Step 2: LLM extracts subject, description, project_name, assignee_name, accountable_name
    try:
        extracted = llm.extract_ticket_creation_data(prompt, projects)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM extraction failed: {str(e)}")

    # Step 3: Resolve project — API results first, then hardcoded IndiaMART fallback
    project_name_raw = extracted.get("project_name", "")
    match = op.find_project_href(project_name_raw, projects)
    if not match:
        available_sample = [p.get("name") for p in projects[:20]]
        raise HTTPException(
            status_code=400,
            detail=(
                f"Could not match project '{project_name_raw}' to any OpenProject bucket. "
                f"Mention the project name explicitly, e.g. 'Android bucket', 'FCP/MDC', 'Search UI'. "
                f"API returned {len(projects)} projects. Sample: {available_sample}"
            ),
        )
    project_href, project_id, project_name = match

    # Step 4: Resolve ticket type
    try:
        types = await op.get_types(project_id)
    except Exception:
        types = []
    if not types:
        try:
            types = await op.get_types()
        except Exception:
            types = []

    resolved_type = extracted.get("type", "Task")
    type_href = op._find_best_match(resolved_type, types)
    if not type_href and types:
        type_href = types[0].get("_links", {}).get("self", {}).get("href")
    if not type_href:
        raise HTTPException(status_code=400, detail="No ticket types found in this project.")

    # Step 5: Resolve priority
    try:
        priorities = await op.get_priorities()
    except Exception:
        priorities = []
    resolved_priority = extracted.get("priority", "Normal")
    priority_href = op._find_best_match(resolved_priority, priorities)

    # Step 6: Resolve assignee and accountable from project members
    notes = []
    if extracted.get("extraction_notes"):
        notes.append(extracted["extraction_notes"])

    assignee_href = None
    accountable_href = None
    assignee_display = None
    accountable_display = None

    assignee_name = extracted.get("assignee_name") or ""
    accountable_name = extracted.get("accountable_name") or ""

    if assignee_name or accountable_name:
        try:
            members = await op.get_project_members(project_id)
            if assignee_name:
                assignee_href = op._find_user_href(assignee_name, members)
                if assignee_href:
                    matched = next((m for m in members if m["_links"]["self"]["href"] == assignee_href), None)
                    assignee_display = matched["displayName"] if matched else assignee_name
                else:
                    notes.append(f"'{assignee_name}' not found in project members — assignee not set.")
            if accountable_name:
                accountable_href = op._find_user_href(accountable_name, members)
                if accountable_href:
                    matched = next((m for m in members if m["_links"]["self"]["href"] == accountable_href), None)
                    accountable_display = matched["displayName"] if matched else accountable_name
                else:
                    notes.append(f"'{accountable_name}' not found in project members — accountable not set.")
        except Exception as e:
            notes.append(f"Could not fetch project members: {str(e)}")

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

    # Step 8: Upload attachments
    uploaded_files = []
    if files:
        for f in files:
            if f and f.filename:
                try:
                    content = await f.read()
                    await op.upload_attachment(
                        ticket_id, content, f.filename,
                        f.content_type or "application/octet-stream"
                    )
                    uploaded_files.append(f.filename)
                except Exception as err:
                    uploaded_files.append(f"FAILED: {f.filename} — {str(err)}")

    return {
        "success": True,
        "ticket_id": ticket_id,
        "ticket_url": ticket_url,
        "subject": extracted.get("subject"),
        "project": project_name,
        "type": resolved_type,
        "priority": resolved_priority,
        "assignee": assignee_display,
        "accountable": accountable_display,
        "uploaded_files": uploaded_files,
        "extraction_notes": " | ".join(notes) if notes else "",
    }


@router.get("/projects")
async def list_projects():
    try:
        projects = await op.get_projects()
        return {
            "projects": [
                {"id": p.get("id"), "name": p.get("name")}
                for p in projects
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/members")
async def list_project_members(project_id: int):
    try:
        members = await op.get_project_members(project_id)
        return {"members": members, "count": len(members)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
