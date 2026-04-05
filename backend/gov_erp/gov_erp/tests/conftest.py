"""Pytest configuration for gov_erp test suite.

Test layers:
    structural  – pure source-level checks (file existence, imports, AST).
                  No Frappe context needed. Run with: pytest -m structural
    service     – verify Frappe imports, hook integrity, permission engine.
                  Needs Frappe importable but not a running site.
                  Run with: pytest -m service
    runtime     – full integration tests (create/update/delete documents).
                  Requires `bench --site <site> run-tests` or Frappe test
                  bootstrapping. Run with: pytest -m runtime
    frontend    – skipped: these check React/Next.js source code and are
                  tracked in the frontend test suite.

Quick structural gate (CI default):
    pytest -m "structural or service" --ignore=gov_erp/tests/test_app_runtime.py --ignore=gov_erp/tests/test_execution_runtime.py

Full gate (requires bench site):
    bench --site dev.localhost run-tests --app gov_erp
"""

import pytest


def pytest_collection_modifyitems(config, items):
    """Auto-classify tests by filename convention when no explicit marker is set."""
    for item in items:
        if any(item.iter_markers()):
            continue

        path = str(item.fspath)

        if "test_app_runtime" in path or "test_execution_runtime" in path or "test_pm_dms_ph_runtime" in path:
            item.add_marker(pytest.mark.runtime)
        elif "test_service_smoke" in path:
            item.add_marker(pytest.mark.service)
        elif "_structure" in path:
            item.add_marker(pytest.mark.structural)
        elif "_logic" in path:
            item.add_marker(pytest.mark.structural)
        elif "test_api.py" in path:
            item.add_marker(pytest.mark.structural)
        elif "test_phase7_structure" in path:
            item.add_marker(pytest.mark.structural)
