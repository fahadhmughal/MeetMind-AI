"""Model selector logic determining LLM provider and model parameters."""

from typing import Dict, Any

DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"
DEFAULT_OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct"


class ModelSelector:
    """Selects and configures LLM models and parameters based on task and provider."""

    @staticmethod
    def get_model_params(provider: str, task: str = "general") -> Dict[str, Any]:
        """Returns model name and hyperparameter configurations based on provider and task."""
        provider = provider.lower()

        if provider == "gemini":
            model_name = DEFAULT_GEMINI_MODEL
            temperature = 0.2 if task in ["extraction", "structured"] else 0.7
            return {
                "provider": "gemini",
                "model_name": model_name,
                "temperature": temperature,
                "max_tokens": 2048,
            }

        elif provider == "openrouter":
            model_name = DEFAULT_OPENROUTER_MODEL
            temperature = 0.2 if task in ["extraction", "structured"] else 0.7
            return {
                "provider": "openrouter",
                "model_name": model_name,
                "temperature": temperature,
                "max_tokens": 1500,
            }

        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")
