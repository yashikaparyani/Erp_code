"""Phase 9 — Operational Readiness structural tests.

Verify:
- Health endpoint returns correct structure (both lightweight and full modes)
- Scheduler background jobs have per-item error handling
- Demo seed has production safety guard
- Operational docs (release / rollback checklists) exist
- hooks.py doc_events reference importable modules
"""

import ast
import os
import re
from pathlib import Path

import pytest

APP_ROOT = Path(__file__).resolve().parents[1]
OPS_DIR = APP_ROOT / "ops"


# ---------------------------------------------------------------------------
# 1. Health endpoint shape (lightweight / no-DB mode)
# ---------------------------------------------------------------------------


def test_health_payload_lightweight_has_required_keys():
    """get_health_payload() without DB returns success, app, message."""
    from gov_erp.api_utils import get_health_payload

    result = get_health_payload()
    assert result["success"] is True
    assert result["app"] == "gov_erp"
    assert "message" in result


def test_health_payload_function_has_full_diagnostics_branch():
    """The source of get_health_payload must contain checks for DB, doctypes,
    rbac, scheduler, and recent_errors_24h in the full-diagnostics branch."""
    src = (APP_ROOT / "api_utils.py").read_text()
    for keyword in ["database", "doctypes", "rbac", "scheduler", "recent_errors_24h"]:
        assert keyword in src, f"Health payload missing check for '{keyword}'"


# ---------------------------------------------------------------------------
# 2. Scheduler error handling
# ---------------------------------------------------------------------------


def _parse_function_body(filepath: Path, func_name: str) -> ast.FunctionDef:
    tree = ast.parse(filepath.read_text())
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == func_name:
            return node
    raise AssertionError(f"{func_name} not found in {filepath}")


def test_generate_system_reminders_has_per_item_error_handling():
    """Each for-loop in generate_system_reminders must contain a Try node."""
    func = _parse_function_body(APP_ROOT / "system_api.py", "generate_system_reminders")
    for_loops = [n for n in ast.walk(func) if isinstance(n, ast.For)]
    assert len(for_loops) >= 3, "Expected at least 3 for-loops (milestones, docs, approvals)"
    for loop in for_loops:
        try_nodes = [n for n in ast.walk(loop) if isinstance(n, ast.Try)]
        assert len(try_nodes) >= 1, (
            f"for-loop at line {loop.lineno} has no try/except (per-item error handling)"
        )


def test_process_due_reminders_has_per_item_error_handling():
    """process_due_reminders must have try/except inside its for-loop."""
    doctype_dir = APP_ROOT / "gov_erp" / "doctype" / "ge_user_reminder" / "ge_user_reminder.py"
    if not doctype_dir.exists():
        pytest.skip("ge_user_reminder doctype not found")
    func = _parse_function_body(doctype_dir, "process_due_reminders")
    for_loops = [n for n in ast.walk(func) if isinstance(n, ast.For)]
    assert for_loops, "Expected at least one for-loop in process_due_reminders"
    for loop in for_loops:
        try_nodes = [n for n in ast.walk(loop) if isinstance(n, ast.Try)]
        assert try_nodes, "process_due_reminders for-loop missing try/except"


# ---------------------------------------------------------------------------
# 3. Demo seed production guard
# ---------------------------------------------------------------------------


def test_demo_seed_has_production_guard():
    """demo_seed.py must define _assert_dev_environment."""
    src = (APP_ROOT / "demo_seed.py").read_text()
    assert "_assert_dev_environment" in src


def test_demo_seed_guard_called_in_entry_points():
    """Both seed_demo_operational_data and purge_seeded_data must call the guard."""
    tree = ast.parse((APP_ROOT / "demo_seed.py").read_text())
    entry_points = {"seed_demo_operational_data", "purge_seeded_data"}
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name in entry_points:
            calls = [
                n.func.id
                for n in ast.walk(node)
                if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
            ]
            assert "_assert_dev_environment" in calls, (
                f"{node.name} does not call _assert_dev_environment"
            )
            entry_points.discard(node.name)
    # If entry_points isn't empty, those functions weren't found at all
    assert not entry_points, f"Entry points not found in demo_seed.py: {entry_points}"


# ---------------------------------------------------------------------------
# 4. Operational docs exist
# ---------------------------------------------------------------------------


def test_release_checklist_exists():
    path = OPS_DIR / "RELEASE_CHECKLIST.md"
    assert path.exists(), "ops/RELEASE_CHECKLIST.md missing"
    content = path.read_text()
    assert len(content) > 200, "Release checklist is too short to be useful"


def test_rollback_checklist_exists():
    path = OPS_DIR / "ROLLBACK_CHECKLIST.md"
    assert path.exists(), "ops/ROLLBACK_CHECKLIST.md missing"
    content = path.read_text()
    assert len(content) > 200, "Rollback checklist is too short to be useful"


# ---------------------------------------------------------------------------
# 5. hooks.py doc_events reference importable modules
# ---------------------------------------------------------------------------


def test_hooks_doc_events_importable():
    """Every dotted path in hooks.py doc_events must be importable."""
    hooks_src = (APP_ROOT / "hooks.py").read_text()
    tree = ast.parse(hooks_src)

    # Find the doc_events assignment
    doc_events_node = None
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "doc_events":
                    doc_events_node = node.value
                    break

    if doc_events_node is None:
        pytest.skip("No doc_events found in hooks.py")

    # Collect all string values (dotted paths)
    dotted_paths = []
    for n in ast.walk(doc_events_node):
        if isinstance(n, ast.Constant) and isinstance(n.value, str) and "." in n.value:
            dotted_paths.append(n.value)

    assert dotted_paths, "No dotted paths found in doc_events"

    import importlib
    for path in dotted_paths:
        mod_path, _, func_name = path.rpartition(".")
        try:
            mod = importlib.import_module(mod_path)
            assert hasattr(mod, func_name), f"{path}: function '{func_name}' not found in {mod_path}"
        except ImportError:
            pytest.fail(f"{path}: module '{mod_path}' cannot be imported")
