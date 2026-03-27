Integrated Tender-to-Delivery ERP" — Phase 1

Stack: ERPNext Framework (Python/Frappe backend, Vue.js frontend, MariaDB)

Scope: Government projects, multi-site, O&M ready

🔄 Complete Lifecycle Jo Cover Hogi:
Tender → Survey → BOQ → Costing → Approval → Procurement → 
Delivery → Installation → Commissioning → Billing → Payment → Ticketing
👥 Users & Roles
Role	Kya Karta Hai
Superadmin	Full system access, user management, permissions
Department Head	Approve, override dependencies with justification
Presales/Tendering	Create tenders, track EMD/PBG, compliance
Engineering Head + Engineers	Drawings, network plans, deviation logs
Purchase	Indents, POs, vendor quotations
Stores/Logistics	GRN, dispatch, inventory
Project Manager	Milestones, tasks, DPR, dependencies
Accounts	Invoices, payment receipts, retention, penalties
Field Technician	DPR updates, installation, commissioning
O&M Operator	Tickets, SLA timer, RMA
Top Management	Dashboards, read-only analytics
📦 11 Modules — Phase 1
Module 1: 📋 Tender & Presales
Tender create/edit (number, client, submission date, status)
RFP document attachment
Compliance checklist (line-level)
Clarification tracker (Q&A dates)
EMD/PBG tracker (bank, instrument no, amount, expiry)
Tender → Project conversion (only when WON)
Module 2: 🗺️ Survey
Survey per tender → per site
Survey MUST be "completed" before BOQ approval
Photos + site notes upload
Module 3: 📊 BOQ & Costing
BOQ = site-wise + project-level aggregation
Revisions/versioning (history retain karna)
Costing = margin-on-cost model
BOQ approval workflow
Line items: Item Master linked + ad-hoc description lines
Module 4: 🛒 Procurement & Vendor
Vendor master
Indent per project/site
Mandatory 3-quotation compliance (exception with approval)
Quotation comparison sheet generator
PO: one PO → multiple indents, indent lines split across multiple POs
PO amendments tracked as revisions
Module 5: 🏬 Stores & Logistics
GRN: partial deliveries, accept/reject qty
Attach packing list / warranty / MIR
Dispatch: HO → Project Store → Site OR Vendor → Site direct
No negative stock allowed
Ledger-based movements (audit trail)
Serialized tracking for IP devices (cameras, servers etc.)
Module 6: 🔨 Project Execution + Dependency Engine
Project types: erp / Surveillance / Solar / O&M / AMC
Sites per project with status
Milestones + Tasks (planned vs actual dates)
Dependency Engine: Block progress if prerequisites incomplete → show blocking reason → override only by Dept Head with justification
DPR: daily, per site, photos + summary
Module 7: ✏️ Engineering & Design
Drawing preparation status + revision history + client approval
Technical deviation log
Change request tracker
Deliverables: drawings, network plans, design reports, FAT/SAT/UAT
Module 8: 🌐 Network & Commissioning
Device register per site (serial-based)
IP pool + allocation log per project/site
Commissioning checklist completion
Test report upload
Client signoff required for camera FOV + commissioning complete
Module 9: 💰 Billing & Accounts (Tracking only)
Invoice types: Milestone / RA / O&M
Payment receipt tracking (date, amount, TDS, remarks)
Retention ledger per project
Penalties at payment stage (LD/SLA/Other)
Module 10: 🎫 O&M + Ticketing
Ticket linked to project/site/asset
SLA timer: 24×7×365, pause/resume with role restrictions
Penalty model per ticket + monthly aggregate
RMA tracker
Module 11: 🔔 Alerts & Notifications
In-app + Email notifications
Milestone due reminders (configurable days)
Payment overdue alerts
Dependency block alerts
Document expiry reminders
Escalation chain (hierarchical upward)
🗄️ Database Schema — MongoDB Collections (14 Groups)
Group	Collections
A) Foundation/Security	orgs, branches, departments, users, roles, approval_workflows, approval_instances, approval_actions, audit_events
B) Parties	parties (CLIENT/VENDOR/BOTH)
C) Tendering	tenders, tender_compliance_items, tender_clarifications, emd_pbg_instruments
D) Survey	surveys
E) BOQ & Costing	items (master), boqs, boq_lines, cost_sheets, cost_lines
F) Projects/Sites	project_types, projects, sites, project_team
G) Procurement	indents, indent_lines, rfqs, vendor_quotations, vendor_quotation_lines, comparison_sheets, purchase_orders, po_lines
H) Stores/Inventory	stores, grns, grn_lines, serial_numbers, dispatch_challans, dispatch_lines, stock_ledger
I) Execution	milestones, tasks, dependency_rules, dependency_overrides, dprs
J) Network/Commissioning	devices, ip_pools, ip_allocations, commissionings, commissioning_checklist_templates, commissioning_checklist_items, test_reports
K) Billing/Payments	invoices, invoice_lines, payment_receipts, retention_ledger, penalty_deductions
L) O&M/Ticketing	tickets, ticket_actions, sla_profiles, sla_timers, sla_penalty_rules, sla_penalty_records
M) DMS/Files	files, document_types, documents, document_approvals
N) Alerts	alert_rules, alert_instances, notification_logs
⚠️ Important: ERPNext vs Custom MongoDB
Tu ERPNext framework use karna chahta hai — lekin FRS mein MongoDB schema define kiya gaya hai. Yahan ek critical decision hai:

Option A: ERPNext (Frappe Framework) — Recommended
ERPNext = Python + Frappe framework + MariaDB (SQL)
Frappe ke DocTypes banate hain (har collection ek DocType)
Built-in: Role-based permissions, Workflows, File Manager, Notifications, Audit logs
ERPNext pehle se ye modules deta hai: Item Master, Purchase Order, GRN, Invoice
Customize karna hai — upar se apne Govt project specific fields add karo
Option B: Custom Node.js + MongoDB
Exactly FRS ki MongoDB schema follow karo
Zyada flexibility, lekin sab scratch se banana padega
Meri recommendation: ERPNext choose karo — 70% work already done hai, tujhe sirf customization karni hai.

🚀 ERPNext Par Kaise Start Karen — Step by Step
Step 1: ERPNext Install Karo
bash
# Recommended: WSL-native bench setup
bench init frappe-bench --frappe-branch version-15
cd frappe-bench
bench new-site your_site.local
bench get-app erpnext --branch version-15
bench --site your_site.local install-app erpnext
bench start
Ya ERPNext Cloud (paid). Docker ko default dev path mat rakho.

Step 2: Custom App Banao (Frappe App)
bash
bench new-app govt_project_erp
bench --site your_site.local install-app govt_project_erp
Step 3: DocTypes create karo (har MongoDB collection = 1 DocType)
Example: Tender DocType:

tender_number (Data, unique)
title (Data)
client (Link → Party)
submission_date (Date)
status (Select: DRAFT/SUBMITTED/WON/LOST)
emd_required (Check)
pbg_required (Check)
linked_project (Link → Project)
Step 4: Workflow Configure karo
Frappe mein built-in Workflow feature hai:

Tender → BOQ → Approval → Project conversion
Indent → Quotation → Comparison → PO
Invoice → Payment
Step 5: Role Permissions Set karo
Frappe mein Role Permission Manager se har DocType ke liye role-wise read/write/submit/cancel permissions set karo.

Step 6: Custom Dashboards banao
Frappe mein Dashboard aur Report Builder built-in hai — role-wise dashboards configure karo.

📅 Recommended Build Sequence (Phase 1)
Week 1-2:  Setup + Foundation (Org, Users, Roles, DocTypes A+B)
Week 3-4:  Tendering Module (Tender, EMD/PBG, Compliance, Survey)
Week 5-6:  BOQ & Costing Module
Week 7-8:  Procurement Module (Indent → RFQ → PO)
Week 9-10: Stores & Inventory (GRN, Dispatch, Stock Ledger, Serial tracking)
Week 11-12: Project Execution + Dependency Engine
Week 13-14: Engineering + Network + Commissioning
Week 15-16: Billing + Payments + Retention
Week 17-18: O&M + Ticketing + SLA
Week 19-20: DMS + Alerts + Dashboards + Testing
🎯 Summary — Ek Line Mein
Tu ek Govt Project specific ERP bana raha hai jisme Tender se leke Commissioning aur O&M ticketing tak ka poora lifecycle cover hoga — ERPNext framework par custom DocTypes/Workflows use karke, primarily apni company ke CCTV/erp/Surveillance government projects manage karne ke liye.
