# Production Grade Readiness

Date: 2026-03-16

## Current Validation Snapshot

The current local stack has passed a focused smoke and sanity pass on the active dev setup:

- Backend health endpoint returned success on `http://127.0.0.1:8000/api/method/gov_erp.api.health_check`
- Frontend login page returned `200` on `http://127.0.0.1:3000/login`
- Frontend authenticated login via `/api/auth/login` returned success
- Core seeded business APIs returned `200` with real data:
  - tenders `22`
  - surveys `5`
  - BOQs `5`
  - cost sheets `1`
  - indents `1`
  - vendor comparisons `1`
  - dispatch challans `1`
  - invoices `1`
  - tickets `2`
  - RMA trackers `2`
  - document folders `2`
  - commissioning device registers `3`
  - commissioning test reports `1`
- Backend automated tests passed: `9/9`
- Frontend production build passed with exit code `0`
- Role-sensitive sanity checks passed for representative POC users:
  - Presales Tendering Head
  - Project Head
  - Field Technician
  - OM Operator

This means the app is locally usable for demo and functional QA. It does **not** mean it is production-ready.

## What Still Needs To Be Done

### 1. Environment And Configuration Hardening

- Move all production configuration out of local-only files and into a controlled environment strategy.
- Define canonical values for:
  - `FRAPPE_URL`
  - frontend base URL
  - site name
  - admin/service credentials
  - email/SMTP settings
  - file storage settings
  - database backup settings
- Add a documented production env template for frontend and backend.
- Prevent configuration drift between frontend target port/host and active bench runtime.

Why this matters:

- A stale `FRAPPE_URL` was enough to break `/api/auth/login` and all Next proxy routes with `fetch failed` while the frontend shell still loaded.

### 2. Authentication, Authorization, And Secrets Review

- Audit all whitelisted APIs for least-privilege access and role consistency.
- Review every `_require_*_access()` path against actual frontend navigation and dashboard usage.
- Remove any dependence on default credentials in runtime fallbacks before production.
- Ensure service credentials, API keys, and passwords are injected securely, not committed or copied across machines.
- Decide whether the frontend should use:
  - per-user session forwarding only, or
  - a service-user fallback for selected internal routes.

Why this matters:

- The role walkthrough exposed real mismatches that had to be corrected for presales, project manager, and field technician access.

### 3. Deployment Topology And Process Supervision

- Define the real production topology:
  - reverse proxy
  - HTTPS termination
  - app process manager
  - worker processes
  - scheduler
  - websocket/socketio
  - static asset serving
- Replace ad hoc dev-server assumptions with supervised production services.
- Add explicit startup, restart, and health-check procedures for:
  - Frappe web
  - workers
  - scheduler
  - websocket
  - Next app

### 4. Database, Migration, And Backup Safety

- Create a production migration runbook:
  - pre-migration backup
  - migration execution
  - post-migration verification
  - rollback procedure
- Define backup retention and restore verification for:
  - MariaDB
  - uploaded files / attachments
  - site config
- Test restore into a clean environment, not just backup generation.

### 5. File And Document Storage Strategy

- Decide whether production attachments remain on local disk or move to object storage.
- Validate large file handling, retention, and backup coverage for:
  - drawings
  - reports
  - project documents
  - tender attachments
- Add content-type, file-size, and storage quota policies.

### 6. Observability And Operations

- Add centralized application logging for frontend and backend.
- Add error monitoring and alerting.
- Add metrics and dashboards for:
  - request failures
  - worker queue backlog
  - scheduler health
  - database health
  - slow APIs
  - auth failures
- Add uptime probes for the key public and internal endpoints.

### 7. Frontend Runtime Cleanup For Production

- Review routes that currently emit Next build-time `Dynamic server usage` messages.
- Mark routes intentionally dynamic where appropriate instead of relying on implicit behavior.
- Review server-side fetch patterns that depend on `request.url` or `request.cookies` during rendering.
- Add a small production smoke pack for frontend after deploy:
  - login
  - dashboard load
  - tender list
  - costing list
  - execution pages
  - document module
  - RMA module

Current note:

- The build passes, but several routes are dynamically rendered due to request-bound values. That is acceptable in itself, but it should be explicit and intentional before production rollout.

### 8. Test Coverage Expansion

- Keep the current backend tests, but expand coverage to the areas most likely to regress in production:
  - permission matrix tests by role
  - dashboard aggregation tests
  - document and attachment flows
  - migration/data-seeding idempotency tests
  - commissioning workflow transitions
  - ticket to RMA lifecycle
- Add at least one browser-level E2E suite for the critical path:
  - login
  - tender list
  - BOQ/costing
  - procurement
  - dispatch
  - execution
  - billing
  - ticket/RMA

### 9. Performance And Scale Readiness

- Run load and concurrency testing for:
  - dashboard APIs
  - list endpoints
  - document-heavy pages
  - login/session routes
- Add query review and indexing for high-volume doctypes such as:
  - tenders
  - tickets
  - RMA trackers
  - documents
  - device registers
  - logs
- Establish acceptable response-time budgets per route class.

### 10. Data Governance And Demo/Production Separation

- Keep demo seed data isolated from production data paths.
- Ensure `demo_seed.py` is never auto-run in production.
- Decide on a controlled seed/fixture policy for staging only.
- Add environment guards if needed to block demo seeding outside approved sites.

### 11. Release Management And CI/CD

- Add a standard release pipeline that runs before deploy:
  - backend tests
  - frontend production build
  - lint/type checks
  - migration dry-run or staging migration
  - smoke checks
- Define versioning and release notes discipline.
- Add a deployment approval path for schema-affecting changes.

### 12. Security Review

- Run a focused security review on:
  - file upload endpoints
  - session and CSRF handling
  - permission bypass paths
  - exposed internal methods
  - dependency versions
- Add dependency scanning and patch cadence.
- Verify headers, HTTPS, cookie settings, and proxy behavior in the real deployment path.

## Recommended Production Readiness Gate

Do not call this production-ready until the following gate is green:

- Environment template and secrets process documented
- Deployment topology documented and reproducible
- Backup and restore proven
- E2E smoke suite automated
- Role/permission matrix verified on staging
- Monitoring and alerting in place
- Build warnings reviewed and intentional dynamic routes documented
- Staging deployment completed with real migration rehearsal
- Rollback plan tested

## Suggested Immediate Next Steps

1. Create a staging deployment checklist and env template.
2. Add a minimal automated E2E smoke suite for login plus the tender-to-RMA journey.
3. Add production-specific monitoring, backup, and restore runbooks.
4. Add environment guards around `demo_seed.py` so it cannot be run casually on a production site.