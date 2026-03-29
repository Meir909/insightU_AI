import json
import logging
from openai import AsyncOpenAI
from app.ai.config import ai_config

logger = logging.getLogger(__name__)


class LLMClient:
    """
    Central async LLM client with:
    - Primary model (GPT-4o)
    - Automatic fallback to cheaper model on failure
    - Structured JSON output enforcement
    - Retry logic (2 retries)
    - Full error logging
    """

    def __init__(self):
        self.client = AsyncOpenAI(api_key=ai_config.openai_api_key)

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 2000,
        expect_json: bool = True,
    ) -> dict | str:
        """
        Send a completion request. Returns parsed dict if expect_json=True.
        Automatically retries with fallback model on failure.
        """
        target_model = model or ai_config.openai_primary_model
        models_to_try = [target_model, ai_config.openai_fallback_model]

        for attempt, m in enumerate(models_to_try):
            try:
                kwargs = dict(
                    model=m,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                if expect_json:
                    kwargs["response_format"] = {"type": "json_object"}

                resp = await self.client.chat.completions.create(**kwargs)
                content = resp.choices[0].message.content

                if expect_json:
                    return json.loads(content)
                return content

            except Exception as e:
                logger.warning(f"LLM attempt {attempt+1} failed with model {m}: {e}")
                if attempt == len(models_to_try) - 1:
                    logger.error(f"All LLM attempts failed: {e}")
                    raise

    async def complete_with_fallback(
        self,
        system_prompt: str,
        user_prompt: str,
        fallback_value: dict,
        **kwargs,
    ) -> tuple[dict, bool]:
        """
        Same as complete() but returns (result, used_fallback: bool).
        Never raises — returns fallback_value on total failure.
        """
        try:
            result = await self.complete(system_prompt, user_prompt, **kwargs)
            return result, False
        except Exception as e:
            logger.error(f"LLM complete_with_fallback: returning fallback. Error: {e}")
            return fallback_value, True


# Singleton instance used across all services
llm = LLMClient()
