"""Shared utilities for structural tests that inspect API source code.

After the monolith extraction, api.py is a thin re-export layer.
The actual API code lives in *_api.py domain modules and api_utils.py.
"""

import ast
from pathlib import Path

_APP_ROOT = Path(__file__).resolve().parents[1]


def combined_api_source(app_root=None):
    """Return the concatenated source of all API domain modules."""
    root = app_root or _APP_ROOT
    parts = []
    utils = root / "api_utils.py"
    if utils.exists():
        parts.append(utils.read_text())
    for p in sorted(root.glob("*_api.py")):
        parts.append(p.read_text())
    parts.append((root / "api.py").read_text())
    return "\n".join(parts)


def combined_api_whitelist_names(app_root=None):
    """Return the set of all @frappe.whitelist() function names across domain modules."""
    root = app_root or _APP_ROOT
    names = []
    for api_path in sorted(root.glob("*_api.py")):
        tree = ast.parse(api_path.read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                for dec in node.decorator_list:
                    if "whitelist" in ast.dump(dec):
                        names.append(node.name)
                        break
    return set(names)
