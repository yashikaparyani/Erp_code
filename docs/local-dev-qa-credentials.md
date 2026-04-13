# Local Dev QA Credentials

Purpose: provide a verified local `dev.localhost` login sheet for QA on this machine.

## Verification Basis

- Shared POC password is stored in site config at `/workspace/development/frappe-bench/sites/dev.localhost/site_config.json` under `gov_erp_poc_password`.
- POC user roster is defined in `/workspace/development/Erp_code/backend/gov_erp/gov_erp/poc_setup.py`.
- The `@technosys.local` accounts below were verified as present and enabled in the local MariaDB-backed `tabUser` table on `dev.localhost`.

## Shared Password

- Password for the POC users on this local dev site: `Technosys@2026`

## Core QA Logins

These are the main accounts most useful for frontend QA:

| Role | Email | Status |
| --- | --- | --- |
| Director | `director@technosys.local` | Verified enabled in local DB |
| Project Head | `project.head@technosys.local` | Verified enabled in local DB |
| Project Manager | `project.manager@technosys.local` | Verified enabled in local DB |
| Accounts / Finance | `accounts@technosys.local` | Verified enabled in local DB |
| HR Manager | `hr.manager@technosys.local` | Verified enabled in local DB |
| Procurement Manager | `proc.manager@technosys.local` | Verified enabled in local DB |
| Purchase | `purchase@technosys.local` | Verified enabled in local DB |
| Store Manager | `store.manager@technosys.local` | Verified enabled in local DB |
| Stores Logistics Head | `stores.head@technosys.local` | Verified enabled in local DB |

## Full POC User Set

The following user-to-primary-role mapping comes from `/workspace/development/Erp_code/backend/gov_erp/gov_erp/poc_setup.py`.
Each email below was also verified as enabled in the local DB.

| Email | Primary role from code |
| --- | --- |
| `director@technosys.local` | Director |
| `dept.head@technosys.local` | Department Head |
| `project.head@technosys.local` | Project Head |
| `hr.manager@technosys.local` | HR Manager |
| `presales.head@technosys.local` | Presales Tendering Head |
| `presales.exec@technosys.local` | Presales Executive |
| `eng.head@technosys.local` | Engineering Head |
| `engineer@technosys.local` | Engineer |
| `proc.manager@technosys.local` | Procurement Manager |
| `purchase@technosys.local` | Purchase |
| `store.manager@technosys.local` | Store Manager |
| `stores.head@technosys.local` | Stores Logistics Head |
| `project.manager@technosys.local` | Project Manager |
| `accounts@technosys.local` | Accounts |
| `field.tech@technosys.local` | Field Technician |
| `om.operator@technosys.local` | OM Operator |
| `rma.manager@technosys.local` | RMA Manager |

## Notes

- This sheet is for the local dev site `dev.localhost`, not a claim about staging or production.
- I verified user existence and `enabled = 1` in the local DB.
- I did not complete a full per-user role join from the DB because shell quoting around the Frappe role table name was noisy in this environment; the role labels above are taken from the app's provisioning source of truth in `poc_setup.py`.
- If needed, the most reliable reprovisioning entry point is `gov_erp.poc_setup.create_poc_users`.
