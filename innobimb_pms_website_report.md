# Innobimb PMS Website Report

Website reviewed: `https://innobimbinfotech.com/pms/index.php/signin`
Review date: `2026-03-19`

## 1. Executive summary

This website is a branded deployment of **RISE - Ultimate Project Manager and CRM**.

That is directly visible from the public login and signup pages:

- Page title shows `RISE - Ultimate Project Manager and CRM`
- Frontend asset version shows `v=3.5.3`
- Base app path is `https://innobimbinfotech.com/pms/`
- The branding is customized with Innobimb logo and favicon

So, in simple terms:

- `Innobimb PMS` is not just a basic login page
- It is a full **Project Management + CRM + Client Portal** system
- Innobimb is using it with its own branding

## 2. What was directly verified

The following points were directly confirmed from the public pages and route behavior.

### Public pages available

- `Sign in`
- `Forgot password`
- `Sign up`

### Login page behavior

The login page contains:

- Email field
- Password field
- Sign in button
- Forgot password link
- Sign up link

Login form posts to:

- `index.php/signin/authenticate`

This means the authentication flow is:

1. User opens sign-in page
2. Enters email and password
3. Form submits to backend authentication endpoint
4. On valid login, user is redirected to the requested internal page

### Redirect behavior observed

When protected routes are opened without login, the site redirects back to sign-in and preserves the requested URL in a hidden `redirect` field.

Verified protected routes:

- `index.php/dashboard`
- `index.php/projects`

So the system uses a standard protected-session flow:

1. User tries to open a protected module
2. If not logged in, site sends user to sign in
3. After successful login, user is sent back to the requested page

### Signup page behavior

The signup page allows creation of a **new client account**.

Visible fields:

- First name
- Last name
- Type: `Organization` or `Individual`
- Company name
- Email
- Password
- Retype password

Signup posts to:

- `index.php/signup/create_account`

This shows that the product supports an external/client-facing portal, not only internal employee login.

## 3. What this website contains

Because the authenticated pages are protected, the internal modules cannot be fully seen without credentials.
However, this deployment clearly identifies itself as **RISE v3.5.3**, so the internal structure can be mapped with high confidence from the product base.

### Core system type

This website is a combination of:

- Project Management System
- CRM
- Client Portal
- Team Collaboration Platform
- Timesheet and Billing Support
- File and Communication Workspace

### Major functional areas the system typically contains

Based on the verified product identity (`RISE v3.5.3`), the platform generally contains these sections:

- Dashboard
- Projects
- Tasks
- Timesheets
- Clients
- Team members
- Invoices
- Payments
- Expenses
- Estimates
- Proposals
- Contracts
- Tickets / Support
- Messages / Chat
- Notes
- Files / Documents
- Events / Calendar
- Leads / CRM
- Reports
- Notifications
- Roles and permissions
- Client portal access

## 4. How this website works

At a high level, the website works like this:

1. Admin, team member, or client signs in
2. System loads a role-based dashboard
3. User navigates to business modules such as Projects, Tasks, Clients, Invoices, Tickets, or Reports
4. Data is managed inside record-based workspaces
5. Team members collaborate through tasks, notes, files, comments, and timesheets
6. Clients can be given limited visibility to their own projects, invoices, tickets, and communication

### Role model

From the public signup message `Create an account as a new client`, it is clear the system supports at least:

- Internal users / staff
- Client users

That usually means:

- Internal users manage work
- Clients see only shared items
- Access depends on permissions and role settings

## 5. Projects section: working flow

This is the most relevant part for ERP comparison and workflow mapping.

Since `/projects` is a protected route and the app is a RISE deployment, the project flow can be described as follows.

### Project section main purpose

The `Projects` module is the central workspace where project planning, task execution, collaboration, time tracking, billing linkage, and supporting records are connected together.

### Typical project lifecycle flow

1. User opens `Projects`
2. User sees project list such as all projects or assigned projects
3. User creates a new project or opens an existing one
4. Project basic details are defined
5. Members are assigned
6. Tasks are created under the project
7. Milestones are set to group deadlines
8. Team updates progress through task status, comments, files, and timesheets
9. Project progress is monitored through list view, milestone view, and Gantt chart
10. Related financial records like expenses, invoices, and payments can be linked
11. Client-facing visibility can be enabled where needed
12. Project is closed or marked completed after delivery

## 6. Projects section: likely subtabs and internal workspace structure

In RISE, a project usually opens into a **project workspace** with multiple tabs/subtabs.
The exact visible tabs may vary by permissions and admin settings, but these are the standard ones most likely available in this site.

### A. Project list level

Common project-level entry points:

- All Projects
- My Projects
- Open Projects
- Completed Projects
- Project Templates

### B. Inside a single project workspace

Common project subtabs:

- Overview
- Tasks
- Milestones
- Gantt Chart
- Timesheets
- Members
- Files
- Comments / Discussions
- Notes
- Expenses
- Invoices
- Payments
- Tickets
- Contracts

## 7. Projects section: what each subtab usually does

### Overview

- Shows project summary
- Project status, start date, deadline, progress
- Quick metrics such as open tasks, completed tasks, logged time, milestones

### Tasks

- Create and assign tasks
- Set priority, status, deadline, assignee
- Supports comments, files, checklist, reminders
- Often supports list view and Kanban-style management

### Milestones

- Create project checkpoints
- Group tasks by major delivery stages
- Track whether key target dates are met

### Gantt Chart

- Visual timeline of project plan
- Shows task duration and milestone sequencing
- Helps with schedule tracking and delivery planning

### Timesheets

- Log hours against project tasks
- Track effort by member and date
- Useful for productivity, costing, and billing

### Members

- Add or remove project team members
- Controls collaboration scope inside that project

### Files

- Upload project documents
- Share specifications, designs, reports, attachments

### Comments / Discussions

- Internal or shared discussion thread around the project
- Used for updates, clarifications, and communication history

### Notes

- Structured project notes
- Useful for observations, meeting points, decisions, reminders

### Expenses

- Track project-related costs
- Helps compare execution effort vs financial outcome

### Invoices

- Generate or link invoices related to the project
- Useful for client billing

### Payments

- Track payments received against invoices
- Helps finance visibility for project billing status

### Tickets

- Link support or issue tickets with project work
- Useful after deployment or during issue tracking

### Contracts

- Store project agreements / legal records
- Useful for delivery terms and client commitments

## 8. Simplified project working flow

Below is the simplest practical flow of how `Projects` usually works in this PMS:

1. `Projects` list opens
2. User clicks `Add Project`
3. Project master data is saved
4. Team members are assigned
5. Milestones are created
6. Tasks are created under milestones or directly under project
7. Team logs work in tasks and timesheets
8. Files, comments, and notes are added during execution
9. Progress is tracked in overview and Gantt
10. Expenses and invoices are attached as project moves commercially
11. Payments and support tickets continue post-delivery if needed

## 9. How client-facing working may happen

Because public client signup is enabled, this system likely supports client-side visibility such as:

- Client sees own projects
- Client sees invoices and payment status
- Client can access tickets
- Client can review shared files or updates
- Client can give feedback on project progress

Exact client access still depends on role permissions configured by Innobimb.

## 10. Important observations for ERP mapping

If this website is being studied for rebuilding inside ERP, these are the most important takeaways:

- It is a **workspace-driven system**, not only a data-entry system
- `Projects` is the central operational object
- Tasks, milestones, timesheets, files, comments, and finance are all linked around the project
- Client access is built in
- Role-based permissions are core to how the system works
- The product is modular, so visible subtabs can be enabled, disabled, or permission-controlled

## 11. Confidence note

### Directly confirmed

- Brand/product identity: `RISE - Ultimate Project Manager and CRM`
- Asset version: `3.5.3`
- Public pages: sign in, sign up, forgot password
- Protected routes: dashboard and projects
- Client account signup is enabled
- Redirect-based login flow is in use

### Inferred with high confidence from verified product identity

- Internal module set
- Project workspace style
- Standard project subtabs
- Role-based project and client workflow

### Not directly confirmed without login

- Innobimb's exact left menu order after login
- Which project tabs are hidden or enabled in their specific setup
- Their exact custom fields, statuses, or naming
- Their exact project creation form fields

## 12. Final one-line conclusion

`Innobimb PMS` is a branded deployment of **RISE v3.5.3**, and its `Projects` section is best understood as a central project workspace that connects project overview, tasks, milestones, Gantt planning, timesheets, files, notes, discussions, and finance-related records in one flow.
