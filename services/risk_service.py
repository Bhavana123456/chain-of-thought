"""
Zero-Trust risk scoring for every AI interaction.
Analyses prompts and responses for policy violations.
"""

import re

# Patterns that raise risk score
RISK_RULES: list[tuple[str, float, str]] = [
    (r"ignore (previous|all|prior) instructions", 0.9, "prompt_injection"),
    (r"jailbreak|dan mode|developer mode|unrestricted", 0.85, "jailbreak_attempt"),
    (r"(password|secret|api.?key|token|credential)s?\b", 0.5, "credential_leak"),
    (r"(ssn|social security|credit.?card|cvv|iban)", 0.7, "pii_detected"),
    (r"(execute|run|eval)\s+(shell|bash|cmd|powershell|python)", 0.8, "code_execution"),
    (r"how.{0,20}(hack|exploit|bypass|crack|phish)", 0.75, "malicious_intent"),
    (r"(bomb|weapon|explosive|malware|ransomware)", 0.95, "harmful_content"),
    (r"(rm -rf|drop table|format c:|del /f)", 0.9, "destructive_command"),
]


def compute_risk(prompt: str, response: str | None = None) -> tuple[float, list[str]]:
    """
    Returns (risk_score 0–1, list_of_flags).
    Checks both prompt and response.
    """
    combined = (prompt + " " + (response or "")).lower()
    flags: list[str] = []
    max_score = 0.0

    for pattern, score, flag in RISK_RULES:
        if re.search(pattern, combined, re.IGNORECASE):
            flags.append(flag)
            max_score = max(max_score, score)

    # Additional heuristics
    if len(prompt) > 4000:
        flags.append("long_prompt")
        max_score = max(max_score, 0.3)

    if re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", combined):
        flags.append("control_characters")
        max_score = max(max_score, 0.4)

    return round(max_score, 3), list(set(flags))


def risk_label(score: float) -> str:
    if score >= 0.7:
        return "high"
    if score >= 0.3:
        return "medium"
    return "low"
