import time
from pathlib import Path
from app.config import get_settings
from app.utils.parsers import extract_json

settings = get_settings()

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

# Groq model fallback chain — all free, best-to-worst quality
GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama3-70b-8192",
    "mixtral-8x7b-32768",
]

# Gemini model fallback chain
GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-flash-latest"]


def _load_prompt(filename: str) -> str:
    return (PROMPTS_DIR / filename).read_text(encoding="utf-8")


def _call_groq(prompt: str) -> str:
    from groq import Groq
    client = Groq(api_key=settings.groq_api_key)
    last_error = None
    for model_name in GROQ_MODELS:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
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
    generation_config = genai.GenerationConfig(
        temperature=0.3,
        response_mime_type="application/json",
    )
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
    raise last_error or RuntimeError("All Gemini models failed — Gemini free tier may not be available in your region. Use Groq instead.")


def _call_llm(prompt: str) -> str:
    # Priority: explicit provider setting → any available key
    if settings.llm_provider == "groq" and settings.groq_api_key:
        return _call_groq(prompt)
    if settings.llm_provider == "gemini" and settings.gemini_api_key:
        return _call_gemini(prompt)
    # Auto-detect: try whichever key is set
    if settings.groq_api_key:
        return _call_groq(prompt)
    if settings.gemini_api_key:
        return _call_gemini(prompt)
    raise ValueError(
        "No LLM API key found. Set GROQ_API_KEY (recommended, free at console.groq.com) "
        "or GEMINI_API_KEY in backend/.env and restart the server."
    )


def classify_ticket(ticket_context: str) -> str:
    """Classify ticket as Bug, Story, Task, or Improvement."""
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
    """Run full bug analysis using LLM."""
    template = _load_prompt("bug_analysis.txt")
    prompt = template.format(ticket_context=ticket_context)
    result = _call_llm(prompt)
    return extract_json(result)


def analyze_story_ticket(ticket_context: str) -> dict:
    """Run full story/A/B analysis using LLM."""
    template = _load_prompt("story_analysis.txt")
    prompt = template.format(ticket_context=ticket_context)
    result = _call_llm(prompt)
    return extract_json(result)


def extract_ticket_creation_data(
    user_prompt: str,
    projects: list,
    users: list,
) -> dict:
    """Extract structured ticket data from natural language prompt."""
    projects_list = "\n".join(
        f"- {p.get('name', '')} (id: {p.get('id', '')})" for p in projects[:50]
    )
    users_list = "\n".join(
        f"- {u.get('firstName', '')} {u.get('lastName', '')} (login: {u.get('login', '')})"
        for u in users[:100]
    )

    template = _load_prompt("ticket_creation.txt")
    prompt = template.format(
        user_prompt=user_prompt,
        projects_list=projects_list or "No projects available",
        users_list=users_list or "No users available",
    )
    result = _call_llm(prompt)
    return extract_json(result)
