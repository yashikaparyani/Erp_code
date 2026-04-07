#!/usr/bin/env python3
"""Extract whitelisted backend APIs from gov_erp backend modules."""

from __future__ import annotations

import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend" / "gov_erp" / "gov_erp"
OUTPUT_FILE = ROOT / "backend_apis.json"

READ_PREFIXES = ("get_", "check_", "download_", "list_", "fetch_")


def _is_frappe_whitelist(decorator: ast.expr) -> tuple[bool, bool, list[str] | None]:
    """Return (is_whitelist, allow_guest, methods)."""
    allow_guest = False
    methods = None

    if isinstance(decorator, ast.Attribute):
        if isinstance(decorator.value, ast.Name) and decorator.value.id == "frappe" and decorator.attr == "whitelist":
            return True, False, None

    if isinstance(decorator, ast.Call):
        fn = decorator.func
        if isinstance(fn, ast.Attribute) and isinstance(fn.value, ast.Name) and fn.value.id == "frappe" and fn.attr == "whitelist":
            for kw in decorator.keywords:
                if kw.arg == "allow_guest" and isinstance(kw.value, ast.Constant):
                    allow_guest = bool(kw.value.value)
                if kw.arg == "methods" and isinstance(kw.value, (ast.List, ast.Tuple)):
                    parsed = []
                    for elt in kw.value.elts:
                        if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
                            parsed.append(elt.value.upper())
                    if parsed:
                        methods = parsed
            return True, allow_guest, methods

    return False, False, None


def _guess_idempotent(name: str, methods: list[str] | None) -> bool:
    if methods and any(m in {"POST", "PUT", "PATCH", "DELETE"} for m in methods):
        # Some APIs still use POST for reads; fall back to prefix heuristic.
        return name.startswith(READ_PREFIXES)
    return name.startswith(READ_PREFIXES)


def extract_backend_apis() -> dict[str, dict]:
    apis: dict[str, dict] = {}

    if not BACKEND_DIR.exists() or not BACKEND_DIR.is_dir():
        raise FileNotFoundError(f"Backend directory not found: {BACKEND_DIR}")

    for py_file in sorted(BACKEND_DIR.glob("*.py")):
        if py_file.name.startswith("__"):
            continue
        module_name = py_file.stem
        try:
            source = py_file.read_text(encoding="utf-8")
            tree = ast.parse(source, filename=str(py_file))
        except (OSError, UnicodeDecodeError, SyntaxError) as exc:
            print(f"Skipping {py_file.name}: {exc}")
            continue

        for node in tree.body:
            if not isinstance(node, ast.FunctionDef):
                continue

            is_whitelisted = False
            allow_guest = False
            methods = None
            for dec in node.decorator_list:
                hit, guest, parsed_methods = _is_frappe_whitelist(dec)
                if hit:
                    is_whitelisted = True
                    allow_guest = guest
                    methods = parsed_methods
                    break

            if not is_whitelisted:
                continue

            args = [a.arg for a in node.args.args]
            if args and args[0] == "self":
                args = args[1:]

            doc = ast.get_docstring(node) or f"Whitelisted API: {node.name}"
            auth_role = "guest_or_authenticated" if allow_guest else "authenticated"

            apis[node.name] = {
                "module": module_name,
                "file": py_file.name,
                "whitelisted": True,
                "allow_guest": allow_guest,
                "methods": methods or ["POST"],
                "arguments": args,
                "docstring": doc.splitlines()[0] if doc else "",
                "auth_role": auth_role,
                "idempotent": _guess_idempotent(node.name, methods),
            }

    return dict(sorted(apis.items(), key=lambda item: item[0]))


def main() -> None:
    data = extract_backend_apis()
    OUTPUT_FILE.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Extracted {len(data)} backend whitelisted APIs -> {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
