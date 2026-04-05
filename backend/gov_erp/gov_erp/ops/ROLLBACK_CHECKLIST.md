# Gov ERP — Rollback Checklist

Version: 1.0  
Last updated: 2026-04-03

---

## When to Rollback

Trigger a rollback when **any** of these occur after deploy:

- Health endpoint returns `"success": false`
- Scheduler not running (`bench doctor` shows inactive)
- Login fails for authenticated users
- Critical API returns 500 (tender CRUD, project CRUD, session context)
- Migration left broken schema (missing columns, failed alter)

## Rollback Steps

```bash
# 1. Stop services immediately
bench stop

# 2. Restore code to previous version
cd apps/gov_erp
git log --oneline -5          # identify the previous good commit
git checkout <PREVIOUS_COMMIT>

# 3. Restore database from pre-deploy backup
bench --site <SITE> restore <BACKUP_SQL_PATH>
# If backup includes files:
# bench --site <SITE> restore <BACKUP_SQL_PATH> --with-private-files <FILES_PATH>

# 4. Run migrations on restored DB to ensure consistency
bench --site <SITE> migrate

# 5. Clear all caches
bench --site <SITE> clear-cache
bench --site <SITE> clear-website-cache

# 6. Restart services
bench restart

# 7. Verify health
curl -s http://localhost:8000/api/method/gov_erp.api.health_check | python -m json.tool

# 8. Verify scheduler
bench --site <SITE> doctor
```

## Post-Rollback Verification

| # | Check | How |
|---|-------|-----|
| 1 | Health endpoint healthy | `curl .../api/method/gov_erp.api.health_check` → `success: true` |
| 2 | Scheduler is active | `bench --site <SITE> doctor` |
| 3 | Login works | Test with at least 2 different roles |
| 4 | No new errors | Monitor Error Log for 10 minutes |

## Common Issues

| Problem | Fix |
|---------|-----|
| `bench restore` fails with encoding error | Add `--force` flag |
| Missing custom fields after restore | Run `bench --site <SITE> migrate` again |
| Scheduler stuck | `bench --site <SITE> scheduler disable && bench --site <SITE> scheduler enable` |
| Old .pyc cached | `find apps/gov_erp -name '*.pyc' -delete && find apps/gov_erp -name '__pycache__' -type d -exec rm -rf {} +` |

## Rollback Log

| Date | Reason | Rolled back to | Verified by |
|------|--------|----------------|-------------|
| | | | |
