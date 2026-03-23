# POC Login List

> **Canonical credential reference** for the `dev.localhost` POC site.

Login URL: `http://127.0.0.1:3010/login`

Password: stored in site config — not committed to Git.  
To check/set:

```bash
# Check current credential state (safe — no secrets printed)
bench --site dev.localhost execute gov_erp.poc_setup.get_poc_credential_status

# Set or reset password and reprovision all users
bench --site dev.localhost execute gov_erp.poc_setup.set_poc_password --args "['<your-password>']"

# Or via env var (ephemeral)
export GOV_ERP_POC_PASSWORD=<your-password>
bench --site dev.localhost execute gov_erp.poc_setup.create_poc_users
```

Role-based logins:

- `director@technosys.local` - `Director`
-`dept.head@technosys.local` - `Department Head`
- `project.head@technosys.local` - `Project Head`
- `hr.manager@technosys.local` - `HR Manager`
- `presales.head@technosys.local` - `Presales Tendering Head`
- `presales.exec@technosys.local` - `Presales Executive`
- `eng.head@technosys.local` - `Engineering Head`
- `engineer@technosys.local` - `Engineer`
- `proc.manager@technosys.local` - `Procurement Manager`
- `purchase@technosys.local` - `Purchase`
- `store.manager@technosys.local` - `Store Manager`
- `stores.head@technosys.local` - `Stores Logistics Head`
- `project.manager@technosys.local` - `Project Manager`
- `accounts@technosys.local` - `Accounts`
- `field.tech@technosys.local` - `Field Technician`
- `om.operator@technosys.local` - `OM Operator`
- `rma.manager@technosys.local` - `RMA Manager`

Notes:

- These are POC-only accounts for the `dev.localhost` site.
- Frontend demo credentials are removed; use these real Frappe users instead.
