# gov_erp Test Suite Guide

## Test Layers

| Layer | Marker | What it tests | Needs Frappe site? |
|-------|--------|---------------|--------------------|
| **Structural** | `structural` | File existence, AST checks, JSON schema, pure function logic | No |
| **Service** | `service` | Import integrity, hook resolution, permission engine structure | No (needs Frappe on path) |
| **Runtime** | `runtime` | Full CRUD workflows, approval chains, role-gated access | Yes |
| **Frontend** | `frontend` | React/Next.js source (skipped in backend gate) | N/A |

## Quick Commands

### Structural + Service gate (no site needed)

```bash
cd frappe-bench/apps/gov_erp
python -m pytest gov_erp/tests/ \
  --ignore=gov_erp/tests/test_app_runtime.py \
  --ignore=gov_erp/tests/test_execution_runtime.py \
  --override-ini="addopts="
```

### Service smoke only

```bash
python -m pytest gov_erp/tests/test_service_smoke.py -v
```

### Runtime tests (requires bench site)

```bash
bench --site dev.localhost run-tests --app gov_erp --module gov_erp.tests.test_execution_runtime
bench --site dev.localhost run-tests --app gov_erp --module gov_erp.tests.test_app_runtime
```

### Full release gate script

```bash
# Quick (structural + service only):
bash apps/gov_erp/gov_erp/tests/run_test_gate.sh

# Full (includes runtime):
bash apps/gov_erp/gov_erp/tests/run_test_gate.sh --full
```

## File Classification

### Structural tests (pytest, no Frappe site)

- `test_api.py` — API surface, hooks, doctype permissions, role lists
- `test_phase7_structure.py` — DPR, team, ANDA, ticket, RMA, billing, SLA structures
- `test_*_structure.py` — Feature-specific structural checks
- `test_*_logic.py` — Pure function unit tests (billing, BOQ, HR, procurement, stores, OM, etc.)

### Service smoke (pytest, Frappe importable)

- `test_service_smoke.py` — Hook import integrity, permission engine, RBAC seed, core module canaries

### Runtime tests (bench run-tests)

- `test_app_runtime.py` — Full integration: tender→project, workflow, DMS, HR, billing, OM, RMA, role-gated
- `test_execution_runtime.py` — Dependency evaluation, override approval

## Minimum Passing Gate

Before any release candidate ships:

1. `py_compile` passes on `api.py`, `permission_engine.py`, `hooks.py`
2. All structural tests pass (234+ tests, 7 frontend-scope skipped)
3. All 13 service smoke tests pass
4. Runtime dependency tests pass (2 tests)
5. Runtime app integration tests pass (10 tests)

## Adding New Tests

- **Pure functions** → `test_<domain>_logic.py`, no imports from `frappe`
- **Schema/AST checks** → `test_<feature>_structure.py`, use `pathlib` + `json`/`ast`
- **Import canaries** → add to `test_service_smoke.py`
- **CRUD/workflow integration** → add to `test_app_runtime.py` or create new `test_<domain>_runtime.py`

## Marker Auto-Classification

Tests are auto-classified by `conftest.py` based on filename:
- `*_runtime*` → `runtime`
- `*_structure*` or `*_logic*` → `structural`
- `test_service_smoke*` → `service`

Override with explicit markers: `@pytest.mark.runtime`, `@pytest.mark.structural`, `@pytest.mark.service`
