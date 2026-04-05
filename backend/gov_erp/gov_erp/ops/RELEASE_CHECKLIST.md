# Gov ERP — Release Checklist

Version: 1.0  
Last updated: 2026-04-03

---

## Pre-Release Gate

All answers must be **yes** before tagging a release.

| # | Check | Command / How to verify | Pass? |
|---|-------|------------------------|-------|
| 1 | Structural tests pass | `cd frappe-bench && python -m pytest apps/gov_erp/gov_erp/tests/ --ignore=*test_app_runtime* --ignore=*test_execution_runtime* -k "not frontend" -q` | |
| 2 | Service smoke tests pass | `python -m pytest apps/gov_erp/gov_erp/tests/test_service_smoke.py -v` | |
| 3 | Runtime tests pass | `bench --site <SITE> run-tests --app gov_erp --module gov_erp.tests.test_app_runtime` | |
| 4 | Execution runtime tests pass | `bench --site <SITE> run-tests --app gov_erp --module gov_erp.tests.test_execution_runtime` | |
| 5 | py_compile passes on all modules | `find apps/gov_erp/gov_erp -name '*.py' -not -path '*/__pycache__/*' -exec python -m py_compile {} +` | |
| 6 | No unresolved migration patches | `bench --site <SITE> migrate --dry-run` (check output) | |
| 7 | Health endpoint returns success | `bench --site <SITE> execute gov_erp.api_utils.get_health_payload` | |

## Deploy Steps

Execute in this exact order.

```bash
# 1. Backup
bench --site <SITE> backup --with-files

# 2. Pull latest code
cd apps/gov_erp && git pull origin main

# 3. Install dependencies (if any new pip packages)
bench setup requirements --apps gov_erp

# 4. Run migrations
bench --site <SITE> migrate

# 5. Clear cache
bench --site <SITE> clear-cache
bench --site <SITE> clear-website-cache

# 6. Restart services
bench restart

# 7. Verify health
curl -s http://localhost:8000/api/method/gov_erp.api.health_check | python -m json.tool
# Expect: "success": true

# 8. Verify scheduler
bench --site <SITE> doctor
# Expect: scheduler is active, no stale workers

# 9. Spot-check recent error log
bench --site <SITE> execute frappe.client.get_count --args '["Error Log", {"creation": [">=", "2026-04-03"], "method": ["like", "%gov_erp%"]}]'
```

## Post-Deploy Verification

| # | Check | How |
|---|-------|-----|
| 1 | Login works for all demo roles | Each POC user can log in and reach their home route |
| 2 | Scheduler fires | Wait 2 minutes, check `bench --site <SITE> doctor` |
| 3 | Health endpoint healthy | `curl .../api/method/gov_erp.api.health_check` |
| 4 | No new error logs | Monitor Error Log for 15 minutes |

## Signoff

| Item | Verified by | Date |
|------|------------|------|
| Pre-release gate | | |
| Deploy completed | | |
| Post-deploy verification | | |
