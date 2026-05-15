import httpx
import base64
from typing import Optional
from app.config import get_settings

settings = get_settings()


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
    url = f"{_base_url()}/api/v3/projects"
    async with httpx.AsyncClient(verify=False, timeout=30) as client:
        response = await client.get(url, headers=_get_headers())
        response.raise_for_status()
        data = response.json()
        return data.get("_embedded", {}).get("elements", [])


async def get_users() -> list:
    url = f"{_base_url()}/api/v3/users?pageSize=200"
    async with httpx.AsyncClient(verify=False, timeout=30) as client:
        response = await client.get(url, headers=_get_headers())
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
    name_lower = name.lower()
    for item in items:
        if item.get(key, "").lower() == name_lower:
            return item.get("_links", {}).get("self", {}).get("href")
    # Partial match
    for item in items:
        if name_lower in item.get(key, "").lower() or item.get(key, "").lower() in name_lower:
            return item.get("_links", {}).get("self", {}).get("href")
    return None


def _find_user_href(name: str, users: list) -> Optional[str]:
    if not name:
        return None
    name_lower = name.lower()
    for user in users:
        full_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip().lower()
        login = user.get("login", "").lower()
        if full_name == name_lower or login == name_lower or name_lower in full_name:
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
