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
    # Step 1: Fetch projects from API (paginated)
    try:
        api_projects = await op.get_projects()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")

    # Build combined list (API results + full hardcoded catalog)
    combined_projects = op.build_combined_project_list(api_projects)

    # Step 2: LLM extracts subject, description, project_name, assignee_name, accountable_name
    try:
        extracted = llm.extract_ticket_creation_data(prompt, combined_projects)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM extraction failed: {str(e)}")

    # Step 3: Resolve project — combined list (API + catalog), then keyword aliases
    project_name_raw = extracted.get("project_name", "")
    match = op.find_project_href(project_name_raw, api_projects)
    if not match:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Could not match project '{project_name_raw}' to any OpenProject bucket. "
                f"Mention the bucket name explicitly, e.g. 'Android bucket', 'IM-iOS Native', 'FCP/MDC'. "
                f"API returned {len(api_projects)} projects; {len(combined_projects)} total known."
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

    # Step 6: Load project members and resolve assignee/accountable via LLM
    notes = []
    if extracted.get("extraction_notes"):
        notes.append(extracted["extraction_notes"])

    assignee_href = None
    accountable_href = None
    assignee_display = None
    accountable_display = None

    assignee_hint = (extracted.get("assignee_name") or "").strip()
    accountable_hint = (extracted.get("accountable_name") or "").strip()

    if assignee_hint or accountable_hint:
        try:
            members = await op.get_project_members(project_id)
            member_names = [m["displayName"] for m in members]

            # LLM-powered fuzzy match against actual member list
            resolved = llm.resolve_members(assignee_hint, accountable_hint, member_names)

            resolved_assignee = resolved.get("assignee")
            resolved_accountable = resolved.get("accountable")

            if resolved_assignee:
                assignee_href = op._find_user_href(resolved_assignee, members)
                assignee_display = resolved_assignee
                if not assignee_href:
                    # Fallback: try original hint directly
                    assignee_href = op._find_user_href(assignee_hint, members)
                    assignee_display = assignee_hint if assignee_href else None
            if not assignee_href and assignee_hint:
                notes.append(f"'{assignee_hint}' not found in {project_name} members — assignee not set.")

            if resolved_accountable:
                accountable_href = op._find_user_href(resolved_accountable, members)
                accountable_display = resolved_accountable
                if not accountable_href:
                    accountable_href = op._find_user_href(accountable_hint, members)
                    accountable_display = accountable_hint if accountable_href else None
            if not accountable_href and accountable_hint:
                notes.append(f"'{accountable_hint}' not found in {project_name} members — accountable not set.")

        except Exception as e:
            notes.append(f"Could not fetch {project_name} members: {str(e)}")

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
