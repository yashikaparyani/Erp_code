# POC Login Guidance

This file replaces the old demo-only login sheet.

The previous hardcoded demo usernames and passwords are no longer valid.

Use the real POC users listed in [poc_login_list.md](/workspace/development/Erp_code/poc_login_list.md).

Current login URL:

- `http://127.0.0.1:3000/login`

Frontend-backend linkage:

- frontend: `http://127.0.0.1:3000`
- backend: `http://127.0.0.1:8000`
- env file: [erp_frontend/.env.local](/workspace/development/Erp_code/erp_frontend/.env.local)
- required setting:
  - `FRAPPE_URL=http://127.0.0.1:8000`

Current username format:

- `director@technosys.local`
- `project.head@technosys.local`
- `presales.head@technosys.local`
- `hr.manager@technosys.local`
- `project.manager@technosys.local`

Password:

- Not stored in Git.
- Current POC users are provisioned through `GOV_ERP_POC_PASSWORD`.
- If password drift happens, reprovision with:
  - `env GOV_ERP_POC_PASSWORD=<password> bench --site dev.localhost execute gov_erp.poc_setup.create_poc_users`

Notes:

- Frontend demo quick-login credentials were removed.
- Authentication now uses real Frappe users on `dev.localhost`.
