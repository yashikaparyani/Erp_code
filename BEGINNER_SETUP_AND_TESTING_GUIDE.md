# ERP Project Analysis, Setup, and Testing Guide

## 1. What This Project Is

This repository is a government-project ERP split into two major parts:

1. Backend: Frappe v15 / ERPNext v15 custom app named `gov_erp`
2. Frontend: Next.js 14 application named `erp_frontend`

Business lifecycle covered by the repo:

Tender -> Survey -> BOQ -> Costing -> Procurement -> Stores -> Execution -> HR -> Billing -> O&M -> RMA -> Documents -> Dashboards

This is not a single standalone Node or Python app. It is a hybrid setup:

1. Frappe/ERPNext backend runs inside a Bench environment
2. Next.js frontend runs separately and talks to Frappe through API proxy routes

Recommended working style for this repo:

1. Backend on Ubuntu WSL
2. Frontend on Windows
3. MariaDB + Redis used through Frappe Bench

## 2. Repo Structure in Simple Words

### Backend area

Main backend app path:

- `backend/gov_erp`

Important backend files:

- `backend/gov_erp/gov_erp/api.py`: main whitelisted business APIs
- `backend/gov_erp/gov_erp/hooks.py`: app hooks and install wiring
- `backend/gov_erp/gov_erp/install.py`: install/migrate bootstrap hooks
- `backend/gov_erp/gov_erp/master_data.py`: seed helpers for departments and designations
- `backend/gov_erp/gov_erp/poc_setup.py`: provisions POC users
- `backend/gov_erp/gov_erp/tests/`: source and runtime tests

### Frontend area

Main frontend path:

- `erp_frontend`

Important frontend files:

- `erp_frontend/src/app/login/page.tsx`: login screen
- `erp_frontend/src/context/AuthContext.tsx`: session handling
- `erp_frontend/src/context/RoleContext.tsx`: role-based menu access
- `erp_frontend/src/app/api/auth/login/route.ts`: login proxy to Frappe
- `erp_frontend/src/app/api/auth/session/route.ts`: session validation proxy
- `erp_frontend/src/app/api/dashboards/[dashboard]/route.ts`: dashboard proxy endpoints

### Planning and status docs

Most useful docs already present:

- `backend_execution_guide.md`
- `backend.md`
- `remaining_todo.md`
- `DEMO_CREDENTIALS.md`
- `poc_login_list.md`

## 3. Current Project State

Based on the code and status docs, this repo already has a serious amount of implementation completed.

### Implemented backend domains

- Tendering
- Survey
- BOQ
- Cost Sheet
- Procurement and vendor comparison
- Dispatch and stores integration
- Execution and dependency engine
- HR onboarding and HR operations
- Billing and payment tracking
- O&M ticketing and SLA
- RMA tracking
- Document management
- Role dashboards

### Backend design pattern

The backend follows this model:

1. Reuse ERPNext built-ins where possible
2. Add custom `GE *` DocTypes only where domain-specific logic is needed
3. Expose business workflows through whitelisted APIs in `gov_erp.api`

Examples of ERPNext built-ins already reused:

- `Project`
- `Task`
- `Item`
- `Supplier`
- `Material Request`
- `Purchase Order`
- `Purchase Receipt`
- `Warehouse`
- `Bin`
- `Stock Entry`
- `Employee`

### Frontend design pattern

The frontend is not calling Frappe directly from browser pages. Instead it uses Next.js route handlers as a proxy layer.

Flow:

1. User opens frontend login page
2. Frontend sends request to `/api/auth/login`
3. Next.js route logs into Frappe
4. Frappe session cookie and CSRF token are preserved
5. Frontend fetches `/api/auth/session`
6. User is routed to role-based dashboard

### Important auth detail

This project uses Frappe session auth, not JWT.

That means:

1. Cookies matter
2. CSRF token matters for POST actions
3. Real Frappe users are required for proper login

## 4. Recommended Beginner Setup Architecture

Use this split setup:

### On Windows

- Run the Next.js frontend
- Open browser and test the UI
- Keep the repo clone for editing frontend files

### On Ubuntu WSL

- Run Frappe Bench
- Run MariaDB/Redis services required by Bench
- Install `gov_erp` into a site named `dev.localhost`

This split matches the repo design better than trying to run everything directly in native Windows.

## 5. Prerequisites

### Windows side

- Windows 10/11
- Node.js 18 or 20
- npm
- Git

### WSL side

- Ubuntu 22.04 or similar
- Python 3.10+
- pipx or pip
- Redis
- MariaDB
- Bench CLI
- ERPNext v15 compatible setup

## 6. Backend Setup in WSL

If you already have a working Bench, skip to section 6.5.

### 6.1 Install system packages in WSL

```bash
sudo apt update
sudo apt install -y git curl build-essential python3-dev python3.10-venv python3-pip redis-server mariadb-server mariadb-client libmysqlclient-dev
```

If `pipx` is not installed:

```bash
python3 -m pip install --user pipx
python3 -m pipx ensurepath
source ~/.bashrc
```

### 6.2 Install Bench CLI

```bash
pipx install frappe-bench
bench --version
```

### 6.3 Create a Bench for Frappe v15

```bash
cd ~
bench init --frappe-branch version-15 frappe-bench
cd frappe-bench
```

### 6.4 Create site and install ERPNext

```bash
bench new-site dev.localhost
bench get-app erpnext --branch version-15
bench --site dev.localhost install-app erpnext
```

During `bench new-site`, note down:

1. MariaDB root password
2. Administrator password

### 6.5 Clone this repo in WSL

Recommended because Windows path spaces can create avoidable issues.

```bash
cd ~
git clone https://github.com/yashikaparyani/Erp_code.git
```

### 6.6 Install the custom app into Bench

```bash
cd ~/frappe-bench
bench get-app ~/Erp_code/backend/gov_erp
bench --site dev.localhost install-app gov_erp
bench --site dev.localhost migrate
```

If `bench get-app` fails with a local path issue, fallback to copying the app:

```bash
cd ~/frappe-bench
cp -r ~/Erp_code/backend/gov_erp ./apps/gov_erp
bench --site dev.localhost install-app gov_erp
bench --site dev.localhost migrate
```

### 6.7 Start Bench

```bash
cd ~/frappe-bench
bench start
```

Expected default backend URL:

- `http://127.0.0.1:8000`

Site name used in project docs:

- `dev.localhost`

If site routing fails, add host mapping:

Linux or WSL hosts file entry:

```text
127.0.0.1 dev.localhost
```

Then use:

- `http://dev.localhost:8000`

### 6.8 Provision POC users

This repo does not store the demo password in Git.

Choose a password and provision all POC users with one command:

```bash
cd ~/frappe-bench
export GOV_ERP_POC_PASSWORD=YourStrongPasswordHere
bench --site dev.localhost execute gov_erp.poc_setup.create_poc_users
```

### 6.9 Verify backend quickly

Open in browser:

- `http://127.0.0.1:8000/api/method/gov_erp.api.health_check`

Expected response should contain:

- `success: true`
- `app: gov_erp`

## 7. Frontend Setup on Windows

### 7.1 Go to frontend folder

```powershell
cd "D:\erp final\Erp_code\erp_frontend"
```

### 7.2 Install packages

```powershell
npm install
```

### 7.3 Create environment file

Create `erp_frontend/.env.local` with at least:

```env
FRAPPE_URL=http://127.0.0.1:8000
```

This value must match the active bench port exactly. If the frontend points to the wrong backend port, Next.js proxy routes and `/api/auth/login` fail with `fetch failed` even when the frontend itself loads on `3000`.

If your bench works better through site host mapping, use:

```env
FRAPPE_URL=http://dev.localhost:8000
```

Optional service credentials supported by frontend proxy utility:

```env
FRAPPE_USERNAME=Administrator
FRAPPE_PASSWORD=your_admin_password
FRAPPE_API_KEY=
FRAPPE_API_SECRET=
```

Minimum practical value for this repo is still `FRAPPE_URL`.

### 7.4 Start frontend

```powershell
npm run dev
```

Expected frontend URL:

- `http://127.0.0.1:3000`

Login page:

- `http://127.0.0.1:3000/login`

### 7.5 Frontend build verification

```powershell
npm run build
```

This is an important sanity check because the repo status notes already mention successful frontend build validation.

## 8. Beginner Login Accounts

POC user IDs from the repo:

- `director@technosys.local`
- `dept.head@technosys.local`
- `project.head@technosys.local`
- `hr.manager@technosys.local`
- `presales.head@technosys.local`
- `presales.exec@technosys.local`
- `eng.head@technosys.local`
- `engineer@technosys.local`
- `proc.manager@technosys.local`
- `purchase@technosys.local`
- `store.manager@technosys.local`
- `stores.head@technosys.local`
- `project.manager@technosys.local`
- `accounts@technosys.local`
- `field.tech@technosys.local`
- `om.operator@technosys.local`
- `rma.manager@technosys.local`

All use the password you provisioned through `GOV_ERP_POC_PASSWORD`.

## 9. How the User Flow Works

### 9.1 Login flow

1. Open frontend login page
2. Enter a real Frappe user from the POC list
3. Frontend calls Next.js login route
4. Next.js login route logs into Frappe
5. Frontend fetches session context from backend
6. Primary role is selected
7. User lands on a role-based dashboard

### 9.2 Functional role flow

High-level business flow for testing:

1. Presales creates tender and survey data
2. Presales creates BOQ and cost sheet
3. Department Head or Project Head approves gated items
4. Purchase or Procurement creates vendor comparison and PO
5. Stores handles GRN and dispatch
6. Execution team tracks sites, milestones, DPR, dependencies
7. HR manages onboarding and employee sync
8. Accounts handles invoice and payment receipt tracking
9. O&M team manages tickets, SLA, RMA
10. Director or management reviews dashboards and reports

## 10. Recommended Testing Strategy

Use three layers:

1. Layer A: setup smoke checks
2. Layer B: automated backend and frontend build checks
3. Layer C: manual business workflow checks

## 11. Layer A: Basic Smoke Checks

### Backend smoke check

Open:

- `http://127.0.0.1:8000/api/method/gov_erp.api.health_check`

Pass condition:

- backend responds with success JSON

### Frontend smoke check

Open:

- `http://127.0.0.1:3000/login`

Pass condition:

- login page loads without crash

### Session smoke check

Login with `director@technosys.local`.

Pass condition:

1. Login succeeds
2. Dashboard opens
3. Sidebar shows multiple modules

## 12. Layer B: Automated Checks

### 12.1 Frontend build test

Run on Windows:

```powershell
cd "D:\erp final\Erp_code\erp_frontend"
npm run build
```

Pass condition:

- Next.js production build completes successfully

### 12.2 Backend focused test modules

Run these inside Bench from WSL:

```bash
cd ~/frappe-bench
bench --site dev.localhost run-tests --app gov_erp --module gov_erp.tests.test_api
bench --site dev.localhost run-tests --app gov_erp --module gov_erp.tests.test_boq_logic
bench --site dev.localhost run-tests --app gov_erp --module gov_erp.tests.test_cost_sheet_logic
bench --site dev.localhost run-tests --app gov_erp --module gov_erp.tests.test_procurement_logic
bench --site dev.localhost run-tests --app gov_erp --module gov_erp.tests.test_store_logic
bench --site dev.localhost run-tests --app gov_erp --module gov_erp.tests.test_execution_logic
bench --site dev.localhost run-tests --app gov_erp --module gov_erp.tests.test_hr_logic
bench --site dev.localhost run-tests --app gov_erp --module gov_erp.tests.test_billing_logic
```

### 12.3 Backend runtime workflow tests

These are stronger end-to-end workflow validations.

```bash
cd ~/frappe-bench
bench --site dev.localhost run-tests --app gov_erp --module gov_erp.tests.test_app_runtime
bench --site dev.localhost run-tests --app gov_erp --module gov_erp.tests.test_execution_runtime
```

Pass condition:

- All selected test modules pass

## 13. Layer C: Manual Beginner Happy-Path Testing

If you are a beginner, do not start by testing every page. First run this happy path in order.

### Step 1: Director login

Login with:

- `director@technosys.local`

Check:

1. Login succeeds
2. Dashboard loads
3. Sidebar renders main modules

### Step 2: Presales tender creation

Login with:

- `presales.head@technosys.local`

Test:

1. Open Pre-Sales module
2. Create a client or select existing client
3. Create a Tender in `DRAFT`
4. Confirm tender appears in list

Expected result:

- Tender saves and list updates

### Step 3: Survey completion

Login with:

- `eng.head@technosys.local` or `engineer@technosys.local`

Test:

1. Open Survey module
2. Create survey linked to the tender
3. Mark survey as `Completed`

Expected result:

- Survey is visible and status is completed

### Step 4: BOQ approval path

Login with:

- `presales.head@technosys.local`

Test:

1. Create BOQ with at least one item
2. Submit BOQ for approval

Then login with:

- `dept.head@technosys.local` or `project.head@technosys.local`

Test:

1. Approve BOQ

Expected result:

- BOQ status moves through draft to pending approval to approved

### Step 5: Cost sheet flow

Login with:

- `presales.head@technosys.local`

Test:

1. Create cost sheet from approved BOQ or create manually
2. Submit for approval

Then approve with:

- `dept.head@technosys.local` or `project.head@technosys.local`

Expected result:

- Cost sheet reaches approved state

### Step 6: Procurement flow

Login with:

- `proc.manager@technosys.local` or `purchase@technosys.local`

Test:

1. Create vendor comparison with 3 quotes
2. Submit and approve as allowed role
3. Create purchase order from comparison

Expected result:

- PO gets created successfully

### Step 7: Stores and dispatch flow

Login with:

- `store.manager@technosys.local` or `stores.head@technosys.local`

Test:

1. Create dispatch challan
2. Submit for approval
3. Approve dispatch challan
4. Mark dispatch as dispatched

Expected result:

- Status becomes `DISPATCHED`

### Step 8: HR onboarding flow

Login with:

- `hr.manager@technosys.local`

Test:

1. Create employee onboarding record
2. Upload required document entry
3. Submit, review, approve
4. Map onboarding to Employee

Expected result:

- Employee record gets created or linked

### Step 9: Accounts flow

Login with:

- `accounts@technosys.local`

Test:

1. Create invoice linked to project
2. Submit and approve invoice if page supports it
3. Add payment receipt
4. Mark invoice paid

Expected result:

- Invoice and payment receipt both exist and invoice shows paid state

### Step 10: O&M and RMA flow

Login with:

- `om.operator@technosys.local` and `rma.manager@technosys.local`

Test:

1. Create support ticket
2. Assign ticket
3. Start ticket
4. Create SLA profile and SLA timer
5. Pause and resume SLA timer
6. Resolve and close ticket
7. Create or convert to RMA
8. Move RMA through status progression and close it

Expected result:

- Ticket and RMA workflow complete without role errors

## 14. Manual Regression Checklist by Module

Use this when you want broader coverage after the happy path passes.

### Tender and Presales

- Tender list loads
- Tender create works
- Tender update works
- Tender stats load
- Tender can convert to project when status is `WON`

### Survey

- Survey list loads
- Survey create works
- Survey stats load
- BOQ submission is blocked if survey not completed

### BOQ and Costing

- BOQ create works
- BOQ approval works
- Cost sheet create works
- Cost sheet approval works
- Revision flow works

### Procurement and Stores

- Vendor comparison create works
- PO creation from comparison works
- GRN endpoints respond
- Dispatch challan approval and dispatch works
- Stock snapshot endpoints respond

### Execution

- Site list loads
- Milestones load
- DPR create works
- Dependency evaluation blocks incomplete prerequisites
- Dependency override removes blocker after approval

### HR

- Onboarding create works
- Review and approval work
- Employee sync works
- Attendance and travel sections load

### Billing

- Invoice create works
- Payment receipt create works
- Retention and penalty pages load if wired

### O&M and RMA

- Ticket create works
- Ticket lifecycle works
- SLA timer lifecycle works
- RMA lifecycle works

### Documents and Dashboards

- Document folders load
- Project documents upload or list works
- Role dashboard cards load without server error

## 15. Role Access Testing

This project relies heavily on role gates. Do not only test success cases. Also test denial cases.

Minimum denial tests:

1. Login as `hr.manager@technosys.local`
2. Try to create a tender
3. Confirm access is denied

And:

1. Login as `presales.exec@technosys.local`
2. Submit BOQ for approval
3. Try approval with same account
4. Confirm approval is denied
5. Approve with `dept.head@technosys.local` or `project.head@technosys.local`

## 16. Common Beginner Problems and Fixes

### Problem: frontend login page opens but login fails

Check:

1. Backend bench is running
2. `FRAPPE_URL` is correct in `erp_frontend/.env.local`
3. POC users were provisioned
4. Password matches `GOV_ERP_POC_PASSWORD`

### Problem: backend API returns site or host mismatch issues

Fix:

1. Add `127.0.0.1 dev.localhost` to hosts file
2. Try `FRAPPE_URL=http://dev.localhost:8000`

### Problem: permission error on page actions

This may be normal.

Check whether:

1. the role is actually allowed for that action
2. you are testing with the correct user

### Problem: frontend works but some lists are empty

Usually means one of these:

1. no records created yet
2. page is partially wired
3. role does not have read permission

### Problem: `bench --site dev.localhost install-app gov_erp` fails

Check:

1. ERPNext is already installed first
2. app is present in `~/frappe-bench/apps/gov_erp`
3. Bench is using Frappe v15 compatible environment

## 17. Best Order for a Full New Tester

If you want the smoothest first run, follow exactly this order:

1. Start Bench in WSL
2. Verify backend health check
3. Start frontend on Windows
4. Login as Director
5. Login as Presales Head and create a tender
6. Login as Engineer and complete survey
7. Login as Presales Head and create BOQ
8. Login as Department Head or Project Head and approve BOQ
9. Login as Purchase and create vendor comparison plus PO
10. Login as Stores and dispatch material
11. Login as HR and test onboarding
12. Login as Accounts and test invoice plus receipt
13. Login as OM Operator and test ticket plus SLA
14. Login as RMA Manager and test RMA progression

## 18. Bottom Line

This repo is not a raw prototype anymore. It already has a strong backend domain model, role-based security, runtime workflow tests, and a Next.js frontend shell with real API proxying.

For a beginner, the correct success path is:

1. Get Bench working first
2. Provision POC users
3. Point frontend `FRAPPE_URL` to the working backend
4. Test role-by-role using the happy path above

If you do only one serious validation cycle, run:

1. `npm run build`
2. backend `test_api`
3. backend `test_app_runtime`
4. backend `test_execution_runtime`
5. manual happy-path flow from Director to RMA

## 19. Final Values For This Current Machine

This section is the machine-specific final answer based on the current environment that was inspected.

### What is already present on this machine

Inside WSL `Ubuntu-22.04`:

1. `bench` is already installed
2. `~/frappe-bench` already exists
3. `mysite.local` already exists
4. `erpnext` is already installed on `mysite.local`
5. `gov_erp` is already installed on `mysite.local`
6. Bench is configured with `serve_default_site: true`
7. Bench serves on port `8000`

Because of that, you do not need to create a fresh Bench or a fresh `dev.localhost` site for this machine unless you want a clean rebuild.

### Exact WSL commands for this machine

Open PowerShell on Windows:

```powershell
wsl -d Ubuntu-22.04
```

Then in Ubuntu run:

```bash
cd ~/frappe-bench
bench start
```

If you want to recreate the POC role users on the already installed site:

```bash
cd ~/frappe-bench
export GOV_ERP_POC_PASSWORD='YourChosenPassword'
bench --site mysite.local execute gov_erp.poc_setup.create_poc_users
```

If you want to ensure schema is current before testing:

```bash
cd ~/frappe-bench
bench --site mysite.local migrate
```

If you want to run the most important backend validations on this machine:

```bash
cd ~/frappe-bench
bench --site mysite.local run-tests --app gov_erp --module gov_erp.tests.test_api
bench --site mysite.local run-tests --app gov_erp --module gov_erp.tests.test_app_runtime
bench --site mysite.local run-tests --app gov_erp --module gov_erp.tests.test_execution_runtime
```

### Exact frontend `.env.local` value for this machine

Use this exact file content:

```env
FRAPPE_URL=http://127.0.0.1:8000
```

Reason:

1. Bench on this machine is already configured to serve the default site
2. Default site is `mysite.local`
3. `serve_default_site` is enabled
4. Windows hosts file does not currently have a `dev.localhost` mapping, so `127.0.0.1:8000` is the simplest and safest value

### Exact frontend commands for this machine

In Windows PowerShell:

```powershell
cd "D:\erp final\Erp_code\erp_frontend"
npm run dev
```

Frontend URL:

- `http://127.0.0.1:3000`

Login URL:

- `http://127.0.0.1:3000/login`

### Exact testing order for this machine

1. Start WSL Bench from `~/frappe-bench`
2. Open `http://127.0.0.1:8000/api/method/gov_erp.api.health_check`
3. Start frontend with `npm run dev`
4. Open `http://127.0.0.1:3000/login`
5. Login with one POC user created on `mysite.local`

### Important machine-specific note

All project docs mention `dev.localhost`, but on this machine the actually available working site is `mysite.local`.

So for this machine:

1. use `mysite.local` for Bench commands
2. use `http://127.0.0.1:8000` in frontend `.env.local`
3. do not switch to `dev.localhost` unless you explicitly create that site