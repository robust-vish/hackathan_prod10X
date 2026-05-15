import json
import re


def extract_json(text: str) -> dict:
    """Extract JSON from LLM response that may have markdown code blocks."""
    text = text.strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strip markdown code blocks
    pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
    match = re.search(pattern, text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Find first { and last }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract valid JSON from LLM response: {text[:200]}")


def clean_html(text: str) -> str:
    """Strip HTML tags from OpenProject description fields."""
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def format_ticket_context(ticket: dict, activities: list, attachments: list) -> str:
    """Compile all ticket data into a single context string for the LLM."""
    description = clean_html(
        ticket.get("description", {}).get("raw", "") or
        ticket.get("description", {}).get("html", "")
    )

    lines = [
        f"TICKET ID: {ticket.get('id', 'N/A')}",
        f"TITLE: {ticket.get('subject', 'N/A')}",
        f"TYPE: {ticket.get('_links', {}).get('type', {}).get('title', 'N/A')}",
        f"STATUS: {ticket.get('_links', {}).get('status', {}).get('title', 'N/A')}",
        f"PRIORITY: {ticket.get('_links', {}).get('priority', {}).get('title', 'N/A')}",
        f"PROJECT: {ticket.get('_links', {}).get('project', {}).get('title', 'N/A')}",
        f"ASSIGNEE: {ticket.get('_links', {}).get('assignee', {}).get('title', 'N/A')}",
        f"CREATED: {ticket.get('createdAt', 'N/A')}",
        "",
        "DESCRIPTION:",
        description or "(No description)",
        "",
    ]

    if activities:
        lines.append("COMMENTS / ACTIVITY:")
        for act in activities:
            comment = clean_html(
                act.get("comment", {}).get("raw", "") or
                act.get("comment", {}).get("html", "")
            )
            if comment:
                author = act.get("_links", {}).get("user", {}).get("title", "Unknown")
                created = act.get("createdAt", "")
                lines.append(f"  [{author} — {created}]: {comment}")
        lines.append("")

    if attachments:
        lines.append("ATTACHMENTS:")
        for att in attachments:
            lines.append(f"  - {att.get('fileName', 'unknown')} ({att.get('contentType', '')})")
        lines.append("")

    return "\n".join(lines)
