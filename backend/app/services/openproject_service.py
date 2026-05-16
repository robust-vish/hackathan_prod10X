import httpx
import base64
from typing import Optional
from app.config import get_settings

settings = get_settings()

# Known IndiaMART projects (from Excel export, 178 total).
# Format: (project_id, canonical_name, [keyword aliases — lowercase])
# Primary buckets the user works in most often are listed first.
_KNOWN_PROJECTS_CATALOG: list[tuple[int, str, list[str]]] = [
    (3,   "Android",                    ["android", "android bucket", "android project"]),
    (85,  "IM-iOS Native",              ["ios", "ios native", "iosnative", "im-ios", "im ios", "ios bucket", "iphone", "ipad"]),
    (476, "APP Webview Lead Manager",   ["app webview", "webview lead", "webview lead manager", "webview"]),
    (408, "Seller / Trade / Tender",    ["seller", "seller bucket", "seller trade"]),
    (79,  "Tender",                     ["tender"]),
    (80,  "Trade",                      ["trade"]),
    (47,  "Desktop search UI",          ["desktop search", "search ui", "searchui", "desktop search ui"]),
    (124, "Search",                     ["search"]),
    (461, "Photo Search IM",            ["photo search", "photo search im", "image search"]),
    (447, "IndiaMART Lead Manager",     ["lead manager", "indiamart lead", "indiamart lead manager", "lms"]),
    (54,  "FCP/MDC",                    ["fcp", "mdc", "fcp/mdc", "fcp mdc", "fcp-mdc"]),
    (14,  "Buyer Desktop UX",           ["buyer desktop", "desktop ux", "desktopux", "buyer ux"]),
    (55,  "Product Detail Page",        ["product detail", "pdp", "product detail page", "proddetail"]),
    (70,  "Desktop Lead Manager",       ["desktop lead manager", "desktop lead", "ide"]),
]

# Flat keyword → id map derived from catalog (for fast lookup)
_KNOWN_PROJECT_IDS: dict[str, int] = {}
for _pid, _pname, _kws in _KNOWN_PROJECTS_CATALOG:
    _KNOWN_PROJECT_IDS[_pname.lower()] = _pid
    for _kw in _kws:
        _KNOWN_PROJECT_IDS[_kw] = _pid


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


def build_combined_project_list(api_projects: list) -> list[dict]:
    """
    Merge live API projects with the hardcoded known-projects catalog.
    Returns a deduplicated list of {id, name} dicts — API names take priority.
    This is the full list passed to the LLM so it can pick the exact project.
    """
    seen: dict[int, str] = {}
    # API projects first (most up-to-date names)
    for p in api_projects:
        pid = p.get("id")
        if pid:
            seen[pid] = p.get("name", "")
    # Add known projects not returned by API
    for pid, pname, _ in _KNOWN_PROJECTS_CATALOG:
        if pid not in seen:
            seen[pid] = pname
    return [{"id": pid, "name": name} for pid, name in seen.items()]


def find_project_href(name: str, api_projects: list) -> Optional[tuple[str, int, str]]:
    """
    Resolve a project name string to (href, project_id, canonical_name).
    Search order:
      1. Exact name match in combined list (API + hardcoded catalog)
      2. Partial name match in combined list
      3. Keyword alias match in the hardcoded catalog
    Returns None if nothing found.
    """
    if not name:
        return None

    combined = build_combined_project_list(api_projects)
    raw = name.lower().strip()
    # Strip noise words the user or LLM might add
    clean = raw.replace("bucket", "").replace("project", "").replace("module", "").strip()

    # Pass 1 — exact name match
    for p in combined:
        if p["name"].lower() == raw or p["name"].lower() == clean:
            pid = p["id"]
            return f"/api/v3/projects/{pid}", pid, p["name"]

    # Pass 2 — partial name match (either direction)
    for p in combined:
        pname_lower = p["name"].lower()
        if clean in pname_lower or pname_lower in clean:
            pid = p["id"]
            return f"/api/v3/projects/{pid}", pid, p["name"]

    # Pass 3 — keyword alias match in catalog
    for pid, pname, keywords in _KNOWN_PROJECTS_CATALOG:
        for kw in keywords:
            if clean == kw or clean in kw or kw in clean:
                return f"/api/v3/projects/{pid}", pid, pname

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
