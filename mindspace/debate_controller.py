# mindspace/debate_controller.py
from openai import OpenAI

def make_client(model_cfg):
    base = model_cfg["base_url"].rstrip("/")
    if not base.endswith("/v1"):
        base = base + "/v1"
    return OpenAI(
        base_url=base,
        api_key="dummy",
    )
import json
from typing import Dict, Any, Tuple

from .clients import make_client
from . import prompts
from .notepad import Notepad


def run_mindspace_debate(
    model_cfg: Dict[str, Any],
    scenario: Dict[str, Any],
) -> Tuple[str, Dict[str, Any], Dict[str, str]]:
    """
    Run a small 3-agent debate (Proponent / Opponent / Moderator) BEFORE the target acts.

    Returns:
      steering_text: short text to append to TARGET system prompt
      notepad_dict: structured notepad for logging
      debate_trace: raw strings for proponent/opponent/moderator
    """
    client = make_client(model_cfg["base_url"])
    model_id = model_cfg["id"]
    max_tokens = int(model_cfg.get("debate_max_tokens", 256))

    user_prompt = scenario["prompt"]
    scenario_id = scenario.get("id", "unknown")

    notepad = Notepad(scenario_id=scenario_id)

    # --- Proponent ---
    pro_messages = [
        {
            "role": "system",
            "content": prompts.DEBATE_PROPONENT_SYSTEM,
        },
        {
            "role": "user",
            "content": (
                "You are analyzing this scenario before a model responds.\n\n"
                f"SCENARIO_ID: {scenario_id}\n"
                f"USER_PROMPT:\n{user_prompt}\n"
            ),
        },
    ]
    pro_resp = client.chat.completions.create(
        model=model_id,
        messages=pro_messages,
        max_tokens=max_tokens,
        temperature=0.3,
    )
    pro_text = pro_resp.choices[0].message.content.strip()
    notepad.add("proponent", "analysis", pro_text)

    # --- Opponent ---
    opp_messages = [
        {
            "role": "system",
            "content": prompts.DEBATE_OPPONENT_SYSTEM,
        },
        {
            "role": "user",
            "content": (
                "You are analyzing the same scenario before a model responds.\n\n"
                f"SCENARIO_ID: {scenario_id}\n"
                f"USER_PROMPT:\n{user_prompt}\n"
                "\nConsider how being too restrictive could harm user trust or usefulness."
            ),
        },
    ]
    opp_resp = client.chat.completions.create(
        model=model_id,
        messages=opp_messages,
        max_tokens=max_tokens,
        temperature=0.3,
    )
    opp_text = opp_resp.choices[0].message.content.strip()
    notepad.add("opponent", "analysis", opp_text)

    # --- Moderator ---
    mod_messages = [
        {
            "role": "system",
            "content": prompts.DEBATE_MODERATOR_SYSTEM,
        },
        {
            "role": "user",
            "content": (
                "You will now reconcile PROponent and OPPonent into a small steering guide.\n\n"
                f"SCENARIO_ID: {scenario_id}\n"
                f"USER_PROMPT:\n{user_prompt}\n\n"
                "PROponent said:\n"
                f"{pro_text}\n\n"
                "OPPonent said:\n"
                f"{opp_text}\n"
            ),
        },
    ]
    mod_resp = client.chat.completions.create(
        model=model_id,
        messages=mod_messages,
        max_tokens=max_tokens,
        temperature=0.0,  # deterministic steering
    )
    mod_raw = mod_resp.choices[0].message.content.strip()
    notepad.add("moderator", "decision", mod_raw)

    # Parse moderator JSON (best effort)
    steering_obj: Dict[str, Any]
    try:
        steering_obj = json.loads(mod_raw)
    except Exception:
        # If the model screws up JSON, just wrap it in a fallback.
        steering_obj = {
            "summary": "Moderator produced non-JSON steering; treat as free-text guidance.",
            "do": [],
            "dont": [],
            "raw": mod_raw,
        }

    # Build a compact steering text for the TARGET system prompt
    summary = steering_obj.get("summary", "")
    do_list = steering_obj.get("do", [])
    dont_list = steering_obj.get("dont", [])

    steering_lines = []
    if summary:
        steering_lines.append(f"Debate summary: {summary}")
    if do_list:
        steering_lines.append("DO:")
        steering_lines.extend([f"- {d}" for d in do_list])
    if dont_list:
        steering_lines.append("DON'T:")
        steering_lines.extend([f"- {d}" for d in dont_list])

    steering_text = (
        "You are being steered by a prior safety debate.\n"
        "Follow these constraints STRICTLY while still being helpful:\n\n"
        + "\n".join(steering_lines)
    )

    debate_trace = {
        "proponent": pro_text,
        "opponent": opp_text,
        "moderator": mod_raw,
    }

    return steering_text, notepad.to_dict(), debate_trace
