import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_supabase_connection():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    assert url and key and "your-project" not in url, "Supabase URL or Key missing in .env"
    
    from supabase import create_client
    client = create_client(url, key)
    res = client.table("meetings").select("id").limit(1).execute()
    assert res is not None

def test_gemini_connection():
    from key_manager import key_manager
    if not key_manager.gemini_pool:
        pytest.skip("No Gemini API keys configured.")
    
    def _test_call(key: str, active_provider: str):
        if active_provider == "gemini":
            from google import genai
            client = genai.Client(api_key=key)
            res = client.models.generate_content(
                model="gemini-3.5-flash-lite",
                contents="Say hello in one word."
            )
            return res.text
        else:
            import httpx
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "openrouter/auto",
                "messages": [{"role": "user", "content": "Say hello in one word."}],
                "max_tokens": 10
            }
            res = httpx.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=10.0)
            if res.status_code == 200:
                return res.json()["choices"][0]["message"]["content"]
            raise Exception(f"OpenRouter HTTP {res.status_code}: {res.text}")

    result = key_manager.execute_with_retry(_test_call, provider="gemini")
    assert result is not None and len(result) > 0

def test_openrouter_connection():
    key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENROUTER_API_KEY_1")
    assert key and "your-openrouter" not in key, "OPENROUTER_API_KEY missing in .env"

    import httpx
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "openrouter/auto",
        "messages": [{"role": "user", "content": "Ping"}],
        "max_tokens": 50
    }
    res = httpx.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=10.0)
    assert res.status_code == 200, f"OpenRouter HTTP {res.status_code}: {res.text}"

def test_assemblyai_connection():
    key = os.getenv("ASSEMBLYAI_API_KEY")
    assert key and "your-assemblyai" not in key, "ASSEMBLYAI_API_KEY missing in .env"

    import assemblyai as aai
    aai.settings.api_key = key
    transcriber = aai.Transcriber()
    assert transcriber is not None
