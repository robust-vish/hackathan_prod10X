import time
from pathlib import Path
from app.config import get_settings
from app.utils.parsers import extract_json

settings = get_settings()

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama3-70b-8192",
    "mixtral-8x7b-32768",
]
GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-flash-latest"]
CLAUDE_MODELS = ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"]


def _load_prompt(filename: str) -> str:
    return (PROMPTS_DIR / filename).read_text(encoding="utf-8")


def _call_claude(prompt: str) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    last_error = None
    for model in CLAUDE_MODELS:
        try:
            msg = client.messages.create(
                model=model,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )
            return msg.content[0].text
        except Exception as e:
            err = str(e)
            if "overloaded" in err.lower() or "529" in err:
                last_error = e
                time.sleep(3)
                continue
            raise
    raise last_error or RuntimeError("All Claude models failed")


def _call_groq(prompt: str) -> str:
    from groq import Groq
    client = Groq(api_key=settings.groq_api_key)
    last_error = None
    for model_name in GROQ_MODELS:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                response_format={"type": "json_object"},
                max_tokens=4096,
            )
            return response.choices[0].message.content
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "rate_limit" in err_str.lower():
                time.sleep(5)
                last_error = e
                continue
            elif "model_not_found" in err_str.lower() or "404" in err_str:
                last_error = e
                continue
            else:
                raise
    raise last_error or RuntimeError("All Groq models failed")


def _call_gemini(prompt: str) -> str:
    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)
    generation_config = genai.GenerationConfig(temperature=0.2, response_mime_type="application/json")
    primary = settings.gemini_model
    models_to_try = [primary] + [m for m in GEMINI_MODELS if m != primary]
    last_error = None
    for model_name in models_to_try:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt, generation_config=generation_config)
            return response.text
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "ResourceExhausted" in err_str:
                last_error = e
                continue
            elif "404" in err_str or "not found" in err_str.lower():
                last_error = e
                continue
            else:
                raise
    raise last_error or RuntimeError("All Gemini models failed")


def _call_llm(prompt: str) -> str:
    provider = settings.llm_provider.lower()
    if provider == "claude" and settings.anthropic_api_key:
        return _call_claude(prompt)
    if provider == "groq" and settings.groq_api_key:
        return _call_groq(prompt)
    if provider == "gemini" and settings.gemini_api_key:
        return _call_gemini(prompt)
    # Auto-detect: try best available
    if settings.anthropic_api_key:
        return _call_claude(prompt)
    if settings.groq_api_key:
        return _call_groq(prompt)
    if settings.gemini_api_key:
        return _call_gemini(prompt)
    raise ValueError(
        "No LLM API key found. Set ANTHROPIC_API_KEY (recommended), GROQ_API_KEY, "
        "or GEMINI_API_KEY in backend/.env and restart the server."
    )


def classify_ticket(ticket_context: str) -> str:
    prompt = f"""
You are a ticket classifier. Analyze the following ticket and classify it into exactly one category.

Ticket:
{ticket_context}

Return ONLY a JSON object like this:
{{"type": "Bug", "confidence": "High", "reasoning": "brief reason"}}

Type must be one of: Bug, Story, Task, Improvement, Feature
"""
    result = _call_llm(prompt)
    data = extract_json(result)
    return data.get("type", "Task")


def analyze_bug_ticket(ticket_context: str) -> dict:
    template = _load_prompt("bug_analysis.txt")
    prompt = template.format(ticket_context=ticket_context)
    result = _call_llm(prompt)
    return extract_json(result)


def analyze_story_ticket(ticket_context: str) -> dict:
    template = _load_prompt("story_analysis.txt")
    prompt = template.format(ticket_context=ticket_context)
    result = _call_llm(prompt)
    return extract_json(result)


def extract_ticket_creation_data(user_prompt: str, combined_projects: list) -> dict:
    """
    Extract structured ticket data from a natural language prompt.
    combined_projects: merged list of {id, name} dicts (API + hardcoded catalog).
    """
    projects_list = "\n".join(
        f"- {p['name']} [ID: {p['id']}]" for p in combined_projects
    )
    template = _load_prompt("ticket_creation.txt")
    prompt = template.format(
        user_prompt=user_prompt,
        projects_list=projects_list or "No projects available",
    )
    result = _call_llm(prompt)
    return extract_json(result)


def resolve_members(
    assignee_hint: str,
    accountable_hint: str,
    member_names: list[str],
) -> dict:
    """
    Use LLM to fuzzy-match extracted person names against the actual project member list.
    Returns {"assignee": <exact name or null>, "accountable": <exact name or null>}.
    """
    if not member_names:
        return {"assignee": None, "accountable": None}
    if not assignee_hint and not accountable_hint:
        return {"assignee": None, "accountable": None}

    members_str = "\n".join(f"- {n}" for n in member_names)
    hints = []
    if assignee_hint:
        hints.append(f'Assignee hint from user: "{assignee_hint}"')
    if accountable_hint:
        hints.append(f'Accountable hint from user: "{accountable_hint}"')

    prompt = f"""You are matching person names to actual project members.

Actual project members:
{members_str}

{chr(10).join(hints)}

Find the single closest match for each role from the member list above.
Rules:
- Ignore case differences (e.g. "vishal bairagi" → "Vishal Bairagi")
- Ignore trailing numbers if the name is otherwise identical (e.g. "soumya sarkar" → "Soumya Sarkar2")
- If no reasonable match exists, return null for that field
- Return ONLY raw JSON, no markdown

{{"assignee": "<exact name from list or null>", "accountable": "<exact name from list or null>"}}"""

    try:
        result = _call_llm(prompt)
        return extract_json(result)
    except Exception:
        return {"assignee": None, "accountable": None}
