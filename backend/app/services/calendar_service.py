import httpx
from datetime import datetime, timedelta, timezone
from typing import Optional
from app.config import get_settings

settings = get_settings()

IST = timezone(timedelta(hours=5, minutes=30))


async def schedule_ticket_meeting(
    ticket_id: int,
    ticket_title: str,
    ticket_url: str,
    project: str,
    assignee_email: Optional[str] = None,
    accountable_email: Optional[str] = None,
) -> dict:
    """
    Create a Google Calendar event with Google Meet link via the teammate's
    Apps Script web app.  Meeting is always 2PM–3PM IST the next day.
    Never raises — returns error/skipped dict on failure.
    """
    if not settings.google_apps_script_url:
        return {"skipped": True, "reason": "GOOGLE_APPS_SCRIPT_URL not set in .env"}

    # Only @indiamart.com emails are accepted by the Apps Script domain filter
    attendees = [
        e for e in [assignee_email, accountable_email]
        if e and "@indiamart.com" in e
    ]
    if not attendees:
        return {"skipped": True, "reason": "No valid @indiamart.com attendees"}

    # Tomorrow 2PM–3PM IST
    now = datetime.now(IST)
    tomorrow = (now + timedelta(days=1)).replace(
        hour=14, minute=0, second=0, microsecond=0
    )
    end = tomorrow + timedelta(hours=1)

    payload = {
        "title": f"Ticket #{ticket_id} Discussion: {ticket_title}",
        "description": (
            f"Team sync to discuss ticket #{ticket_id} in the {project} project.\n\n"
            f"Ticket URL: {ticket_url}"
        ),
        "agenda": (
            f"• Review ticket #{ticket_id}: {ticket_title}\n"
            "• Identify root cause / blockers\n"
            "• Assign action items and next steps"
        ),
        "start": tomorrow.isoformat(),
        "end": end.isoformat(),
        "attendees": attendees,
        "doc_links": [ticket_url],
        "fallback_title": f"Discussion: {ticket_title}",
    }

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            response = await client.post(
                settings.google_apps_script_url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            result = response.json()
            # Backfill fields the Apps Script might not echo
            if not result.get("title"):
                result["title"] = payload["title"]
            if not result.get("attendees"):
                result["attendees"] = attendees
            result["meeting_time"] = tomorrow.strftime("%Y-%m-%d 2:00 PM – 3:00 PM IST")
            return result
    except Exception as e:
        return {"status": "error", "message": str(e)}
