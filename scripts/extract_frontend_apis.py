#!/usr/bin/env python3
"""Extract frontend API method invocations from erp_frontend/src."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_SRC = ROOT / "erp_frontend" / "src"
OUTPUT_FILE = ROOT / "frontend_apis.json"

PATTERNS = [
    re.compile(r"callFrappeMethod\(\s*['\"](?:gov_erp\.api\.)?([a-zA-Z0-9_\.]+)['\"]", re.MULTILINE),
    re.compile(r"callPresalesMethod\(\s*['\"](?:gov_erp\.presales_api\.)?([a-zA-Z0-9_\.]+)['\"]", re.MULTILINE),
    re.compile(r"callRbacMethod\(\s*['\"](?:gov_erp\.rbac_api\.)?([a-zA-Z0-9_\.]+)['\"]", re.MULTILINE),
    re.compile(r"callOps(?:<[^>]+>)?\(\s*['\"]([a-zA-Z0-9_\.]+)['\"]", re.MULTILINE),
    re.compile(r"/api/method/(?:gov_erp\.api\.)?([a-zA-Z0-9_\.]+)", re.MULTILINE),
    re.compile(r"method\s*:\s*['\"](?:gov_erp\.api\.)?([a-zA-Z0-9_\.]+)['\"]", re.MULTILINE),
]

SET_BLOCK_PATTERN = re.compile(r"new\s+Set\s*\(\s*\[(.*?)\]\s*\)", re.DOTALL)
STRING_LITERAL_PATTERN = re.compile(r"['\"]([a-zA-Z0-9_\.]+)['\"]")

VALID_EXTS = {".ts", ".tsx", ".js", ".jsx"}
HTTP_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
IGNORE_METHODS = {"login", "upload_file", "logout"}


def _normalize(name: str) -> str:
    candidate = name.strip()
    for prefix in (
        "gov_erp.api.",
        "gov_erp.presales_api.",
        "gov_erp.rbac_api.",
        "gov_erp.poc_setup.",
    ):
        if candidate.startswith(prefix):
            candidate = candidate.split(prefix, 1)[1]
            break
    return candidate


def extract_frontend_apis() -> dict[str, list[dict]]:
    seen: dict[str, set[tuple[str, int]]] = defaultdict(set)

    if not FRONTEND_SRC.exists() or not FRONTEND_SRC.is_dir():
        raise FileNotFoundError(f"Frontend source directory not found: {FRONTEND_SRC}")

    for file in sorted(FRONTEND_SRC.rglob("*")):
        if not file.is_file() or file.suffix.lower() not in VALID_EXTS:
            continue

        try:
            content = file.read_text(encoding="utf-8", errors="ignore")
        except OSError as exc:
            print(f"Skipping unreadable file {file}: {exc}")
            continue

        if not content:
            continue

        for pattern in PATTERNS:
            for match in pattern.finditer(content):
                api_name = _normalize(match.group(1).strip())
                if not api_name:
                    continue
                if api_name.endswith("."):
                    continue
                if api_name.upper() in HTTP_METHODS:
                    continue
                if api_name in IGNORE_METHODS:
                    continue
                line_no = content.count("\n", 0, match.start()) + 1
                # Keep frappe.client methods in output for diagnostics; filter later in verification.
                seen[api_name].add((str(file.relative_to(ROOT)).replace("\\", "/"), line_no))

        # Capture API methods listed in explicit Set-based allowlists such as CONNECTED_METHODS.
        for block in SET_BLOCK_PATTERN.finditer(content):
            block_content = block.group(1)
            block_start = block.start(1)
            for literal in STRING_LITERAL_PATTERN.finditer(block_content):
                api_name = _normalize(literal.group(1).strip())
                if not api_name:
                    continue
                if "." in api_name:
                    continue
                if "_" not in api_name:
                    continue
                if api_name != api_name.lower():
                    continue
                if api_name.upper() in HTTP_METHODS:
                    continue
                if api_name in IGNORE_METHODS:
                    continue
                absolute_pos = block_start + literal.start()
                line_no = content.count("\n", 0, absolute_pos) + 1
                seen[api_name].add((str(file.relative_to(ROOT)).replace("\\", "/"), line_no))

    result = {}
    for api_name in sorted(seen):
        refs = sorted(seen[api_name], key=lambda r: (r[0], r[1]))
        result[api_name] = [{"file": f, "line": ln} for f, ln in refs]

    return result


def main() -> None:
    data = extract_frontend_apis()
    OUTPUT_FILE.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Extracted {len(data)} frontend API method references -> {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
