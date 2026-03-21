# POC Login Guidance

> **This is NOT the canonical credential doc.** See [poc_login_list.md](poc_login_list.md) for the full user list and provisioning commands.

Frontend-backend linkage:

- frontend: `http://127.0.0.1:3010`
- backend: `http://127.0.0.1:8000`
- env file: [erp_frontend/.env.local](/workspace/development/Erp_code/erp_frontend/.env.local)
- required setting: `FRAPPE_URL=http://127.0.0.1:8000`

Important:

- `FRAPPE_URL` must match the live bench port.
- If it drifts to another port such as `8001`, frontend proxy routes and `/api/auth/login` return `fetch failed` while page shells may still render.

Credentials:

- No plaintext passwords in Git.
- Managed via `gov_erp.poc_setup.set_poc_password` (site config) or `GOV_ERP_POC_PASSWORD` env var.
- See [poc_login_list.md](poc_login_list.md) for the full provisioning workflow.
