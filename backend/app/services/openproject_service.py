import httpx
import base64
from typing import Optional
from app.config import get_settings

settings = get_settings()

# Hardcoded fallback: known IndiaMART project IDs (from Excel export, 178 total)
# Used when the API token only returns a subset of projects.
_KNOWN_PROJECT_IDS: dict[str, int] = {
    "android": 3,
    "ios": 85,
    "ios native": 85,
    "im-ios native": 85,
    "iosnative": 85,
    "app webview": 476,
    "webview lead": 476,
    "webview lead manager": 476,
    "seller": 408,
    "trade": 80,
    "tender": 79,
    "desktop search": 47,
    "search ui": 47,
    "searchui": 47,
    "search": 124,
    "photo search": 461,
    "photo search im": 461,
    "lead manager": 447,
    "indiamart lead": 447,
    "indiamart lead manager": 447,
    "fcp": 54,
    "mdc": 54,
    "fcp/mdc": 54,
    "fcp mdc": 54,
    "buyer desktop": 14,
    "desktop ux": 14,
    "desktopux": 14,
    "product detail": 55,
    "product detail page": 55,
    "proddetail": 55,
    "pdp": 55,
    "desktop lead manager": 70,
    "desktop lead": 70,
    "ide": 70,
}


def _get_headers() -> dict:
    credentials = base64.b64encode(f"apikey:{settings.openproject_api_key}".encode()).decode()
    return {
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _base_url() -> str:
    return settings.openproject_base_url.rstrip("/")


async def get_ticket(ticket_id: int) -> dict:
    url = f"{_base_url()}/api/v3/work_packages/{ticket_id}"
    async with httpx.AsyncClient(verify=False, timeout=30) as client:
        response = await client.get(url, headers=_get_headers())
        response.raise_for_status()
        return response.json()


async def get_activities(ticket_id: int) -> list:
    url = f"{_base_url()}/api/v3/work_packages/{ticket_id}/activities"
    async with httpx.AsyncClient(verify=False, timeout=30) as client:
        response = await client.get(url, headers=_get_headers())
        response.raise_for_status()
        data = response.json()
        return data.get("_embedded", {}).get("elements", [])


async def get_attachments(ticket_id: int) -> list:
    url = f"{_base_url()}/api/v3/work_packages/{ticket_id}/attachments"
    async with httpx.AsyncClient(verify=False, timeout=30) as client:
        response = await client.get(url, headers=_get_headers())
        response.raise_for_status()
        data = response.json()
        return data.get("_embedded", {}).get("elements", [])


async def get_projects() -> list:
    all_projects = []
    page_size = 50
    offset = 1
    async with httpx.AsyncClient(verify=False, timeout=60) as client:
        while True:
            url = f"{_base_url()}/api/v3/projects?pageSize={page_size}&offset={offset}"
            response = await client.get(url, headers=_get_headers())
            response.raise_for_status()
            data = response.json()
            elements = data.get("_embedded", {}).get("elements", [])
            if not elements:
                break
            all_projects.extend(elements)
            total = data.get("total", 0)
            if len(all_projects) >= total:
                break
            offset += len(elements)  # advance by actual items received, not requested page size
    return all_projects


async def get_project_members(project_id: int) -> list:
    """
    Get members of a specific project via the memberships endpoint.
    Works with non-admin API tokens.
    Returns a normalized list compatible with _find_user_href().
    """
    import json
    from urllib.parse import urlencode

    filters = json.dumps([{"project": {"operator": "=", "values": [str(project_id)]}}])
    params = urlencode({"filters": filters, "pageSize": 200})
    url = f"{_base_url()}/api/v3/memberships?{params}"

    async with httpx.AsyncClient(verify=False, timeout=30) as client:
        response = await client.get(url, headers=_get_headers())
        response.raise_for_status()
        data = response.json()
        elements = data.get("_embedded", {}).get("elements", [])

    seen_hrefs = set()
    users = []
    for member in elements:
        principal = member.get("_links", {}).get("principal", {})
        href = principal.get("href", "")
        title = principal.get("title", "") or member.get("name", "")

        if not href or not title:
            continue
        if href in seen_hrefs:
            continue
        seen_hrefs.add(href)

        parts = title.strip().split(" ", 1)
        first = parts[0] if parts else ""
        last = parts[1] if len(parts) > 1 else ""

        users.append({
            "firstName": first,
            "lastName": last,
            "displayName": title,
            "login": title.lower().replace(" ", "."),
            "_links": {"self": {"href": href}},
        })
    return users


async def get_users() -> list:
    """
    Attempts to list all users (requires admin). Falls back silently to empty list on 403.
    Use get_project_members() for non-admin tokens.
    """
    url = f"{_base_url()}/api/v3/users?pageSize=200"
    async with httpx.AsyncClient(verify=False, timeout=30) as client:
        response = await client.get(url, headers=_get_headers())
        if response.status_code == 403:
            return []  # Not an admin — caller should use get_project_members()
        response.raise_for_status()
        data = response.json()
        return data.get("_embedded", {}).get("elements", [])


async def get_types(project_id: Optional[int] = None) -> list:
    if project_id:
        url = f"{_base_url()}/api/v3/projects/{project_id}/types"
    else:
        url = f"{_base_url()}/api/v3/types"
    async with httpx.AsyncClient(verify=False, timeout=30) as client:
        response = await client.get(url, headers=_get_headers())
        response.raise_for_status()
        data = response.json()
        return data.get("_embedded", {}).get("elements", [])


async def get_priorities() -> list:
    url = f"{_base_url()}/api/v3/priorities"
    async with httpx.AsyncClient(verify=False, timeout=30) as client:
        response = await client.get(url, headers=_get_headers())
        response.raise_for_status()
        data = response.json()
        return data.get("_embedded", {}).get("elements", [])


def _find_best_match(name: str, items: list, key: str = "name") -> Optional[str]:
    """Fuzzy match a name to items list, return the href."""
    if not name:
        return None
    name_lower = name.lower().strip()
    # Exact match first
    for item in items:
        if item.get(key, "").lower() == name_lower:
            return item.get("_links", {}).get("self", {}).get("href")
    # Partial match
    for item in items:
        item_val = item.get(key, "").lower()
        if name_lower in item_val or item_val in name_lower:
            return item.get("_links", {}).get("self", {}).get("href")
    return None


def find_project_href(name: str, api_projects: list) -> Optional[tuple[str, int, str]]:
    """
    Resolve a project name to (href, id, display_name).
    Tries API results first, then falls back to the hardcoded IndiaMART project list.
    Returns None if no match found.
    """
    if not name:
        return None
    name_lower = name.lower().strip()

    # Pass 1: try the live API list (exact then partial)
    for item in api_projects:
        if item.get("name", "").lower() == name_lower:
            href = item.get("_links", {}).get("self", {}).get("href", "")
            pid = item.get("id") or int(href.split("/")[-1])
            return href, pid, item.get("name", name)
    for item in api_projects:
        item_val = item.get("name", "").lower()
        if name_lower in item_val or item_val in name_lower:
            href = item.get("_links", {}).get("self", {}).get("href", "")
            pid = item.get("id") or int(href.split("/")[-1])
            return href, pid, item.get("name", name)

    # Pass 2: hardcoded fallback — strip noise words like "bucket", "project"
    clean = name_lower.replace("bucket", "").replace("project", "").strip()
    for key, pid in _KNOWN_PROJECT_IDS.items():
        if clean == key or clean in key or key in clean:
            href = f"/api/v3/projects/{pid}"
            return href, pid, name
    # Also try original (unstripped) against hardcoded keys
    for key, pid in _KNOWN_PROJECT_IDS.items():
        if name_lower == key or name_lower in key or key in name_lower:
            href = f"/api/v3/projects/{pid}"
            return href, pid, name

    return None


def _find_user_href(name: str, users: list) -> Optional[str]:
    """
    Fuzzy match a person's name against a list of normalized user/member objects.
    Handles both full user objects (firstName/lastName) and normalized member objects (displayName).
    """
    if not name:
        return None
    name_lower = name.lower().strip()
    for user in users:
        # Try displayName field (from normalized members)
        display = user.get("displayName", "").lower()
        # Try firstName + lastName combination
        full_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip().lower()
        login = user.get("login", "").lower()

        for candidate in [display, full_name, login]:
            if not candidate:
                continue
            if candidate == name_lower:
                return user.get("_links", {}).get("self", {}).get("href")
            if name_lower in candidate or candidate in name_lower:
                return user.get("_links", {}).get("self", {}).get("href")
    return None


async def create_ticket(
    subject: str,
    description: str,
    project_href: str,
    type_href: str,
    priority_href: Optional[str] = None,
    assignee_href: Optional[str] = None,
    accountable_href: Optional[str] = None,
) -> dict:
    url = f"{_base_url()}/api/v3/work_packages"

    payload: dict = {
        "subject": subject,
        "description": {
            "format": "markdown",
            "raw": description,
        },
        "_links": {
            "project": {"href": project_href},
            "type": {"href": type_href},
        },
    }

    if priority_href:
        payload["_links"]["priority"] = {"href": priority_href}
    if assignee_href:
        payload["_links"]["assignee"] = {"href": assignee_href}
    if accountable_href:
        payload["_links"]["responsible"] = {"href": accountable_href}

    async with httpx.AsyncClient(verify=False, timeout=30) as client:
        response = await client.post(url, headers=_get_headers(), json=payload)
        response.raise_for_status()
        return response.json()


async def upload_attachment(ticket_id: int, file_content: bytes, filename: str, content_type: str) -> dict:
    url = f"{_base_url()}/api/v3/work_packages/{ticket_id}/attachments"
    credentials = base64.b64encode(f"apikey:{settings.openproject_api_key}".encode()).decode()
    headers = {"Authorization": f"Basic {credentials}"}

    files = {"attachment": (filename, file_content, content_type)}
    metadata = {"fileName": filename, "contentType": content_type}

    async with httpx.AsyncClient(verify=False, timeout=60) as client:
        response = await client.post(
            url,
            headers=headers,
            files=files,
            data={"metadata": str(metadata)},
        )
        response.raise_for_status()
        return response.json()
