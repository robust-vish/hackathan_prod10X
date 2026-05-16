import httpx
from typing import Optional
from app.config import get_settings

settings = get_settings()


async def send_ticket_notifications(
    ticket_id: int,
    ticket_title: str,
    ticket_url: str,
    project: str,
    assignee_email: Optional[str] = None,
    assignee_name: Optional[str] = None,
    accountable_email: Optional[str] = None,
    accountable_name: Optional[str] = None,
) -> dict:
    """
    Send Google Chat DM + Gmail notifications to assignee and accountable
    via the Google Apps Script web app.
    Returns a dict with status info (never raises — notification failure
    should not block ticket creation).
    """
    if not settings.apps_script_url:
        return {"skipped": True, "reason": "APPS_SCRIPT_URL not set in .env"}

    payload: dict = {
        "ticket_id": ticket_id,
        "ticket_title": ticket_title,
        "ticket_url": ticket_url,
        "project": project,
    }

    if assignee_email and assignee_name:
        payload["assignee_email"] = assignee_email
        payload["assignee_name"] = assignee_name

    if accountable_email and accountable_name:
        payload["accountable_email"] = accountable_email
        payload["accountable_name"] = accountable_name

    if "assignee_email" not in payload and "accountable_email" not in payload:
        return {"skipped": True, "reason": "No email resolved for either assignee or accountable"}

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            response = await client.post(
                settings.apps_script_url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            return response.json()
    except Exception as e:
        return {"error": str(e)}
