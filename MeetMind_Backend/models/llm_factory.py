"""LLM Factory enforcing structured Pydantic JSON parsing with KeyManager rotation."""

import json
from typing import Type, TypeVar, Any, Dict, Optional
from pydantic import BaseModel
import httpx
from google import genai
from google.genai import types

from key_manager import key_manager
from models.model_selector import ModelSelector
from utils.logger import get_logger

logger = get_logger(__name__)

T = TypeVar("T", bound=BaseModel)


class LLMParseError(Exception):
    """Raised when LLM output cannot be parsed into the target Pydantic schema."""
    pass


class LLMFactory:
    """Factory for executing structured LLM completions via Gemini and OpenRouter."""

    @staticmethod
    def generate_structured(
        prompt: str,
        response_schema: Type[T],
        provider: str = "gemini",
        max_parse_retries: int = 2
    ) -> T:
        """Generates a completion from an LLM and parses it into a target Pydantic model.

        Uses KeyManager to automatically handle key pool rotation and fallback.
        """
        def _call_llm(key: str, active_provider: str) -> str:
            params = ModelSelector.get_model_params(active_provider)
            logger.info(f"Calling LLM provider '{active_provider}' with model '{params['model_name']}'")

            if active_provider == "gemini":
                client = genai.Client(api_key=key)
                config = types.GenerateContentConfig(
                    temperature=params.get("temperature", 0.2),
                    max_output_tokens=params.get("max_tokens", 2048),
                    response_mime_type="application/json"
                )
                try:
                    response = client.models.generate_content(
                        model=params["model_name"],
                        contents=prompt,
                        config=config
                    )
                    return response.text or ""
                except Exception as exc:
                    fallback_model = params.get("fallback_model_name", "gemini-3.5-flash-lite")
                    logger.warning(f"Gemini model '{params['model_name']}' failed: {exc}. Trying fallback model '{fallback_model}'...")
                    response = client.models.generate_content(
                        model=fallback_model,
                        contents=prompt,
                        config=config
                    )
                    return response.text or ""

            else:
                # OpenRouter API call
                headers = {
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": params["model_name"],
                    "messages": [
                        {"role": "system", "content": "Respond strictly in JSON format."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": params["temperature"],
                    "max_tokens": 1000,
                    "response_format": {"type": "json_object"}
                }
                res = httpx.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=15.0
                )
                if res.status_code != 200:
                    raise RuntimeError(f"OpenRouter API HTTP {res.status_code}: {res.text}")

                data = res.json()
                choices = data.get("choices", [])
                if not choices:
                    raise RuntimeError("OpenRouter returned empty choices array.")
                return choices[0].get("message", {}).get("content", "")

        # Execute call via KeyManager for key rotation and fallback
        raw_output = key_manager.execute_with_retry(_call_llm, provider=provider)

        # Parse output into Pydantic schema
        try:
            cleaned_json = LLMFactory._clean_json_output(raw_output)
            data_obj = json.loads(cleaned_json)

            if isinstance(data_obj, list):
                if "tasks" in response_schema.model_fields:
                    data_dict = {"tasks": data_obj}
                elif "decisions" in response_schema.model_fields:
                    data_dict = {"decisions": data_obj}
                else:
                    data_dict = {"data": data_obj}
            elif isinstance(data_obj, dict):
                data_dict = data_obj
                # Normalize top-level array keys for TaskList
                if "tasks" in response_schema.model_fields and "tasks" not in data_dict:
                    for possible_key in ["action_items", "action_item_list", "task_list", "items", "extracted_tasks", "todo_list", "actionItems", "data", "results"]:
                        if possible_key in data_dict and isinstance(data_dict[possible_key], list):
                            data_dict["tasks"] = data_dict[possible_key]
                            break
                    if "tasks" not in data_dict:
                        for val in data_dict.values():
                            if isinstance(val, list) and (len(val) == 0 or isinstance(val[0], dict)):
                                data_dict["tasks"] = val
                                break

                # Normalize top-level array keys for DecisionList
                if "decisions" in response_schema.model_fields and "decisions" not in data_dict:
                    for possible_key in ["key_decisions", "decisions_made", "decision_list", "items", "extracted_decisions", "decisions_list", "keyDecisions", "data", "results"]:
                        if possible_key in data_dict and isinstance(data_dict[possible_key], list):
                            data_dict["decisions"] = data_dict[possible_key]
                            break
                    if "decisions" not in data_dict:
                        for val in data_dict.values():
                            if isinstance(val, list) and (len(val) == 0 or isinstance(val[0], dict)):
                                data_dict["decisions"] = val
                                break
            else:
                data_dict = {}

            # Map alias keys inside task and decision list items
            if isinstance(data_dict.get("tasks"), list):
                for item in data_dict["tasks"]:
                    if isinstance(item, dict):
                        if "task_title" in item and "title" not in item:
                            item["title"] = item["task_title"]
                        if "task" in item and "title" not in item:
                            item["title"] = item["task"]
                        if "assignee" in item and "assignee_name" not in item:
                            item["assignee_name"] = item["assignee"]

            if isinstance(data_dict.get("decisions"), list):
                for item in data_dict["decisions"]:
                    if isinstance(item, dict):
                        if "decision" in item and "decision_text" not in item:
                            item["decision_text"] = item["decision"]

            if "answer" in response_schema.model_fields and "answer" not in data_dict:
                if "response" in data_dict:
                    data_dict["answer"] = str(data_dict["response"])
                elif "summary" in data_dict:
                    data_dict["answer"] = str(data_dict["summary"])
                elif "tasks" in data_dict:
                    tasks_formatted = [
                        f"### {t.get('title', t.get('task', 'Task'))}\n- **Assignee**: {t.get('assignee_name', t.get('assignee', 'Unassigned'))}\n- **Deadline**: {t.get('due_date', 'Not specified')}\n"
                        if isinstance(t, dict) else f"• {t}\n"
                        for t in data_dict["tasks"]
                    ]
                    data_dict["answer"] = "\n".join(tasks_formatted)
                elif "data" in data_dict and isinstance(data_dict["data"], list):
                    items_formatted = [
                        f"### {t.get('title', t.get('task', 'Item'))}\n- **Details**: {t.get('description', t.get('priority', ''))}\n"
                        if isinstance(t, dict) else f"• {t}\n"
                        for t in data_dict["data"]
                    ]
                    data_dict["answer"] = "\n".join(items_formatted)
                else:
                    data_dict["answer"] = str(raw_output)

            if "sources" in response_schema.model_fields and "sources" not in data_dict:
                data_dict["sources"] = ["Meeting Transcript"]

                if "sources" in response_schema.model_fields and "sources" not in data_dict:
                    data_dict["sources"] = ["Meeting Transcript"]

                parsed_obj = response_schema.model_validate(data_dict)
                logger.info(f"Successfully parsed LLM response into schema '{response_schema.__name__}'")
                return parsed_obj

            parsed_obj = response_schema.model_validate(data_dict)
            logger.info(f"Successfully parsed LLM response into schema '{response_schema.__name__}'")
            return parsed_obj

        except Exception as parse_exc:
            logger.error(f"Failed to parse LLM output into schema '{response_schema.__name__}': {parse_exc}")
            logger.debug(f"Raw unparsed output: {raw_output}")
            raise LLMParseError(f"Malformed LLM JSON output: {parse_exc}") from parse_exc

    @staticmethod
    def _clean_json_output(raw_text: str) -> str:
        """Strips code block markdown fences from raw LLM output if present."""
        text = raw_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
