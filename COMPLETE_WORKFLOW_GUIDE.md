tf# 🎯 Complete ERP Workflow Guide — Beginner Friendly

> **Last Updated:** March 11, 2026  
> **Project:** Government Project ERP (Tender to O&M Lifecycle)  
> **Company:** Technosys Security Solutions

---

## 📚 Table of Contents
1. [Project Kya Hai?](#1-project-kya-hai)
2. [Tech Stack](#2-tech-stack)
3. [Users & Roles](#3-users--roles)
4. [Complete Business Flow](#4-complete-business-flow)
5. [Module-wise Workflow](#5-module-wise-workflow)
6. [DocTypes (Database Tables)](#6-doctypes-database-tables)
7. [API Structure](#7-api-structure)
8. [Frontend Pages](#8-frontend-pages)
9. [Current Progress](#9-current-progress)
10. [Sprint Roadmap](#10-sprint-roadmap)

---

## 1. Project Kya Hai?

### Simple Explanation
Teri company **Government CCTV/Surveillance projects** execute karti hai. Abhi sab kaam:
- Excel mein hota hai
- WhatsApp pe discussions hote hain
- Email pe documents share hote hain
- Koi ek jagah data nahi hai

**Problem:** Data scattered hai, tracking mushkil hai, delays hote hain.

**Solution:** Ek **custom ERP system** banana hai jisme:
- Tender aane se leke O&M ticket close hone tak — sab ek jagah
- Har step ka record
- Role-based access (sabko sab nahi dikhega)
- Approval workflows
- Automatic alerts/reminders

### Real Example
```
Punjab Police ne CCTV tender nikala (₹2 Crore)
    ↓
Tumne tender download kiya, EMD submit kiya
    ↓
Survey kiya (kitne cameras chahiye, kahan lagenge)
    ↓
BOQ banaya (100 cameras × ₹8000 = ₹8 Lakh)
    ↓
Costsheet banaya (cost + margin = quote price)
    ↓
Bid submit kiya → WON! 🎉
    ↓
Project create hua → Sites add kiye
    ↓
Material order kiya (Indent → PO → Vendor)
    ↓
Material aaya (GRN), install kiya, commission kiya
    ↓
Invoice bheji, payment mili
    ↓
5 saal O&M: ticket aaya, solve kiya
```

Yeh **PURA FLOW** ek system mein track hoga!

---

## 2. Tech Stack

### Backend (Server + Database)
| Component | Technology | Kya Karta Hai |
|-----------|------------|---------------|
| Framework | **Frappe** (Python) | Server-side logic, APIs |
| Database | **MariaDB** (SQL) | Data store karta hai |
| Server | **WSL Ubuntu** | Linux environment on Windows |
| Site | `mysite.local:8000` | Backend URL |

### Frontend (User Interface)
| Component | Technology | Kya Karta Hai |
|-----------|------------|---------------|
| Framework | **Next.js 14** (React) | UI pages |
| Styling | **Tailwind CSS** | Design/colors |
| Language | **TypeScript** | Type-safe JavaScript |
| URL | `localhost:3000` | Frontend URL |

### How They Connect
```
┌─────────────────┐         ┌─────────────────┐
│   FRONTEND      │  HTTP   │    BACKEND      │
│   (Next.js)     │◄───────►│    (Frappe)     │
│   localhost:3000│  API    │   localhost:8000│
└─────────────────┘         └─────────────────┘
        │                           │
        │                           ▼
        │                   ┌─────────────────┐
        │                   │    DATABASE     │
        │                   │   (MariaDB)     │
        └──────────────────►│   Tables/Docs   │
                            └─────────────────┘
```

---

## 3. Users & Roles

### Roles Explained (Kaun Kya Karega)

| Role | Hindi Mein | Kya Access Hai |
|------|-----------|----------------|
| **Director** | Director/Owner | Sab dekh sakta hai, final approvals |
| **Department Head** | Vibhag Pramukh | Apne department ka sab, approvals |
| **Presales Tendering Head** | Tender Incharge | Tender create/edit, BOQ, submission |
| **Engineering Head** | Engineering Incharge | Drawings, technical, commissioning |
| **Engineer** | Engineer | Site work, DPR, installation |
| **Purchase** | Kharid Vibhag | Indent, PO, vendor management |
| **Stores Logistics Head** | Godown Incharge | GRN, dispatch, inventory |
| **Project Manager** | Project Manager | Milestones, tasks, team |
| **Accounts** | Accounts | Invoice, payment, retention |
| **Field Technician** | Field Technician | Site visit, DPR, photos |
| **OM Operator** | O&M Operator | Tickets, SLA, RMA |

### Permission Matrix (Kaun Kya Kar Sakta Hai)

| Module | Director | Dept Head | Presales | Engineering | Purchase | Stores | Accounts |
|--------|----------|-----------|----------|-------------|----------|--------|----------|
| Tender | ✅ Full | ✅ Full | ✅ Full | 👁️ View | ❌ | ❌ | 👁️ View |
| BOQ | ✅ Full | ✅ Full | ✅ Full | 👁️ View | ❌ | ❌ | ❌ |
| Project | ✅ Full | ✅ Full | 👁️ View | ✅ Full | 👁️ View | 👁️ View | 👁️ View |
| Procurement | ✅ Full | ✅ Approve | ❌ | 👁️ View | ✅ Full | 👁️ View | ❌ |
| Inventory | ✅ Full | ✅ Approve | ❌ | ❌ | 👁️ View | ✅ Full | ❌ |
| Invoice | ✅ Full | ✅ Approve | ❌ | ❌ | ❌ | ❌ | ✅ Full |
| O&M | ✅ Full | ✅ Full | ❌ | 👁️ View | ❌ | ❌ | ❌ |

---

## 4. Complete Business Flow

### Master Flow Diagram
```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           GOVERNMENT PROJECT LIFECYCLE                          │
└────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │ TENDER  │  Govt ne tender nikala, humne download kiya
    │ RECEIVED│
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │ CREATE  │  System mein tender entry karo
    │ TENDER  │  (number, title, client, dates, EMD info)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │ SURVEY  │  Site visit karo, photos lo, notes likho
    │         │  (kitne cameras, pole conditions, power)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │  BOQ    │  Bill of Quantities banao
    │ CREATE  │  (item × quantity × rate = amount)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │  BOQ    │  Presales Head → Dept Head → Director
    │APPROVAL │  (3-step approval workflow)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │COSTSHEET│  Cost + Margin = Final Quote
    │ CREATE  │  (material, labour, overhead, profit)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │ TENDER  │  Document upload, compliance fill
    │ SUBMIT  │  (govt portal pe submit)
    └────┬────┘
         │
         ▼
    ┌───────────────────────────────────────┐
    │           TENDER RESULT               │
    │   ┌──────┐         ┌──────┐          │
    │   │ WON  │         │ LOST │          │
    │   └──┬───┘         └──────┘          │
    └──────┼────────────────────────────────┘
           │
           ▼
    ┌─────────┐
    │ CREATE  │  Tender → Project conversion
    │ PROJECT │  (sites, milestones, team assign)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │ CREATE  │  Material chahiye, indent raise karo
    │ INDENT  │  (item, qty, required date)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │  RFQ &  │  Minimum 3 vendors se quote lo
    │ COMPARE │  (comparison sheet generate)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │ CREATE  │  Best vendor select, PO create
    │   PO    │  (terms, delivery, payment)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │  GRN    │  Material aaya, check karo, accept/reject
    │ CREATE  │  (serial numbers capture)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │DISPATCH │  HO → Site pe material bhejo
    │         │  (challan, tracking)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │INSTALL  │  Camera lagao, cable do
    │  TION   │  (DPR daily, photos)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │COMMISSN │  Testing, IP assign, client signoff
    │  ING    │  (checklist complete)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │ INVOICE │  Milestone complete, bill raise
    │  RAISE  │  (amount, GST, submit)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │ PAYMENT │  Client ne pay kiya
    │RECEIVED │  (TDS deducted, retention held)
    └────┬────┘
         │
         ▼
    ┌─────────────────────────────────────┐
    │        O&M PHASE (5 YEARS)          │
    │  ┌─────────┐                        │
    │  │ TICKET  │  Complaint aaya        │
    │  │ CREATE  │                        │
    │  └────┬────┘                        │
    │       │                             │
    │       ▼                             │
    │  ┌─────────┐                        │
    │  │  SLA    │  Timer start           │
    │  │ TIMER   │  (4hr response)        │
    │  └────┬────┘                        │
    │       │                             │
    │       ▼                             │
    │  ┌─────────┐                        │
    │  │ RESOLVE │  Fix karo, close karo  │
    │  │ & CLOSE │                        │
    │  └─────────┘                        │
    └─────────────────────────────────────┘
```

---

## 5. Module-wise Workflow

### Module 1: 📋 Pre-Sales (Tendering)

**Purpose:** Tender track karna from download to submission

**Workflow:**
```
DRAFT → BOQ_PENDING → BOQ_APPROVED → SUBMITTED → WON/LOST
```

**Key Entities:**
| Entity | Kya Hai | Example |
|--------|---------|---------|
| Tender | Main tender record | "Punjab CCTV Project" |
| EMD | Earnest Money Deposit | ₹5 Lakh bank guarantee |
| PBG | Performance Bank Guarantee | ₹10 Lakh (after winning) |
| Compliance | Technical requirements checklist | "ISO certified: Yes" |
| Clarification | Questions to client | "Cable spec?" → "Cat6" |

**Business Rules:**
- ❌ Tender submit nahi ho sakta without BOQ approval
- ❌ BOQ approve nahi ho sakta without Survey completion
- ✅ EMD expiry pe alert aana chahiye

---

### Module 2: 🗺️ Survey

**Purpose:** Site visit record karna before BOQ

**Workflow:**
```
SCHEDULED → IN_PROGRESS → COMPLETED
```

**Key Fields:**
- Survey Date
- Site Name
- Engineer (who did it)
- Photos (multiple)
- Notes (observations)
- Checklist items

**Business Rules:**
- ❌ BOQ create nahi ho sakta without Survey COMPLETED
- ✅ One survey per site per tender

---

### Module 3: 📊 BOQ & Costing

**Purpose:** Bill of Quantities + Final pricing

**BOQ Workflow:**
```
DRAFT → PENDING_APPROVAL → APPROVED/REJECTED
```

**BOQ Line Item Example:**
| Item | Qty | Unit | Rate | Amount |
|------|-----|------|------|--------|
| Hikvision 4MP Dome | 50 | Nos | ₹8,000 | ₹4,00,000 |
| Cat6 Cable | 2000 | Mtr | ₹15 | ₹30,000 |
| Installation Labour | 1 | LS | ₹1,00,000 | ₹1,00,000 |

**Costsheet Example:**
| Category | Amount |
|----------|--------|
| Material Cost | ₹25,00,000 |
| Labour Cost | ₹5,00,000 |
| Overhead (5%) | ₹1,50,000 |
| **Total Cost** | **₹31,50,000** |
| Margin (15%) | ₹4,72,500 |
| **Quote Price** | **₹36,22,500** |

---

### Module 4: 🔨 Project Execution

**Purpose:** Won tender → Project management

**Project Workflow:**
```
NOT_STARTED → IN_PROGRESS → COMPLETED → CLOSED
```

**Hierarchy:**
```
PROJECT (Punjab CCTV)
├── SITE 1 (Ludhiana)
│   ├── Milestone: Survey Complete
│   ├── Milestone: Material Received
│   ├── Milestone: Installation Done
│   └── Milestone: Commissioned
├── SITE 2 (Amritsar)
│   └── ...
└── SITE 3 (Jalandhar)
    └── ...
```

**Dependency Engine:**
```
Task: "Install Camera"
Prerequisites:
  ✅ Survey completed
  ✅ Drawing approved
  ✅ Material received (GRN done)
  ❌ IP assigned ← BLOCKED!

Result: Task blocked until IP assigned
Override: Only Dept Head can override with reason
```

---

### Module 5: 🛒 Procurement

**Purpose:** Material purchase karna

**Workflow:**
```
INDENT → RFQ → QUOTATIONS (3) → COMPARISON → PO → GRN
```

**Flow Diagram:**
```
Engineer needs material
        │
        ▼
┌───────────────┐
│ CREATE INDENT │  Item: 50 cameras
│               │  Required by: 15 March
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  SEND RFQ     │  3 vendors ko request bhejo:
│  TO 3 VENDORS │  Vendor A, Vendor B, Vendor C
└───────┬───────┘
        │
        ▼
┌───────────────┐
│   RECEIVE     │  A: ₹8000/unit
│   QUOTES      │  B: ₹7500/unit ← Lowest
│               │  C: ₹8200/unit
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  COMPARISON   │  Auto-generate comparison sheet
│    SHEET      │  Recommend: Vendor B
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  APPROVAL     │  Purchase Head → Dept Head
│               │  (if > ₹1 Lakh: Director)
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  CREATE PO    │  PO-2026-001 to Vendor B
│               │  50 cameras × ₹7500 = ₹3,75,000
└───────────────┘
```

**Business Rules:**
- ❌ PO create nahi ho sakta without 3 quotes (exception with approval)
- ✅ PO amendment creates new version (history retained)

---

### Module 6: 🏬 Stores & Inventory

**Purpose:** Material receive, store, dispatch, track

**GRN Workflow:**
```
PO Created → Material Arrived → GRN Created → QC Check → Accepted/Rejected
```

**GRN Example:**
```
PO: PO-2026-001 (50 cameras)
GRN: GRN-2026-001
Received: 45 cameras
Accepted: 43 cameras ✅
Rejected: 2 cameras ❌ (damaged)
Pending: 5 cameras (next delivery)
```

**Serial Number Tracking:**
```
Camera 1: SN-HIK-001 → Location: Warehouse → Status: IN_STOCK
Camera 2: SN-HIK-002 → Location: Ludhiana Site → Status: INSTALLED
Camera 3: SN-HIK-003 → Location: Vendor (RMA) → Status: RMA
```

**Dispatch Flow:**
```
HO Warehouse
      │
      ▼ (Dispatch Challan DC-001)
Project Store (Ludhiana)
      │
      ▼ (Issue to Site)
Site Location (Camera installed)
```

---

### Module 7: 🌐 Network & Commissioning

**Purpose:** Device install, IP assign, client signoff

**Commissioning Checklist:**
```
□ Camera mounted correctly
□ Cable connected
□ IP assigned: 192.168.1.101
□ NVR recording verified
□ Live view working
□ FOV (Field of View) correct
□ Client signoff taken
```

**IP Pool Management:**
```
Project: Punjab CCTV
Site: Ludhiana
Network: 192.168.1.0/24
Gateway: 192.168.1.1
Available IPs: 192.168.1.2 - 192.168.1.254

Allocated:
- 192.168.1.10 → Camera-001 (PTZ)
- 192.168.1.11 → Camera-002 (Dome)
- 192.168.1.50 → NVR-001
```

---

### Module 8: 💰 Billing & Finance

**Purpose:** Invoice raise, payment track

**Invoice Types:**
| Type | Kab Raise Hoti Hai |
|------|-------------------|
| MILESTONE | Milestone complete hone pe |
| RA (Running Account) | Monthly progress pe |
| O&M | Monthly maintenance bill |

**Payment Flow:**
```
Invoice Raised (₹10,00,000)
        │
        ▼
Client Received
        │
        ▼
Payment Processed
├── Amount Received: ₹8,50,000
├── TDS Deducted (2%): ₹20,000
├── Retention Held (10%): ₹1,00,000
└── LD Penalty: ₹30,000 (delay)
```

---

### Module 9: 🎫 O&M Ticketing

**Purpose:** 5-year maintenance ke tickets manage karna

**Ticket Workflow:**
```
OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
```

**SLA Timer:**
```
Ticket Created: 10:00 AM
├── Response SLA: 4 hours (respond by 2:00 PM)
├── Resolution SLA: 24 hours (resolve by next day 10:00 AM)
│
├── Technician Responded: 11:30 AM ✅ (within SLA)
├── Technician Visited: 3:00 PM
├── Issue Resolved: 5:00 PM ✅ (within SLA)
└── Ticket Closed: 5:30 PM

Result: No penalty
```

**Penalty Calculation:**
```
If response > 4 hours: ₹500 per hour
If resolution > 24 hours: ₹1000 per hour

Monthly aggregate → deducted from O&M invoice
```

---

## 6. DocTypes (Database Tables)

### Currently Created: 96 DocTypes

#### Foundation (8)
| DocType | Purpose |
|---------|---------|
| GE Organization | Company master |
| GE Branch | Office locations |
| GE Department | Departments |
| GE Designation | Job titles |
| GE Approval Workflow | Approval chain definition |
| GE Approval Instance | Actual approval in progress |
| GE Approval Action | Approve/Reject actions |
| GE Audit Event | Audit trail |

#### Tendering (15)
| DocType | Purpose |
|---------|---------|
| GE Tender | Main tender |
| GE Tender Checklist | Documents checklist |
| GE Tender Checklist Item | Checklist items |
| GE Tender Compliance Item | Technical compliance |
| GE Tender Clarification | Q&A with client |
| GE Tender Result | Win/Loss record |
| GE Tender Result Bidder | Competitor bids |
| GE EMD PBG Instrument | EMD/PBG tracking |
| GE Tender Keyword | Search tags |
| GE Tender Activity Log | Activity history |
| GE Tender Assignment Log | Assignment changes |
| GE Tender Reminder | Due date reminders |
| GE Competitor | Competitor companies |
| GE Missed Opportunity | Lost tender analysis |
| GE Company Profile | Our company profiles |

#### Survey (1)
| DocType | Purpose |
|---------|---------|
| GE Survey | Site survey records |

#### BOQ & Costing (5)
| DocType | Purpose |
|---------|---------|
| GE Item Master | Product catalog |
| GE BOQ | Bill of Quantities |
| GE BOQ Line | BOQ line items |
| GE Cost Sheet | Pricing sheet |
| GE Cost Line | Cost breakdown |

#### Project Execution (9)
| DocType | Purpose |
|---------|---------|
| GE Project | Project master |
| GE Project Type | Templates (CCTV, Solar) |
| GE Project Team | Team members |
| GE Site | Project locations |
| GE Milestone | Project milestones |
| GE Task | Individual tasks |
| GE DPR | Daily Progress Report |
| GE Dependency Rule | Prerequisites |
| GE Dependency Override | Override with reason |

#### Procurement (11)
| DocType | Purpose |
|---------|---------|
| GE Party | Clients/Vendors |
| GE OEM | Manufacturers |
| GE Dealer | Distributors |
| GE Indent | Material request |
| GE Indent Line | Request items |
| GE Vendor Quotation | Vendor quotes |
| GE Vendor Quotation Line | Quote line items |
| GE Comparison Sheet | Quote comparison |
| GE Purchase Order | PO |
| GE PO Line | PO items |
| GE PO Indent Reference | PO-Indent link |

#### Stores & Inventory (8)
| DocType | Purpose |
|---------|---------|
| GE Store | Warehouse locations |
| GE GRN | Goods Receipt |
| GE GRN Line | Receipt items |
| GE Serial Number | Device serials |
| GE Dispatch Challan | Shipment |
| GE Dispatch Line | Shipment items |
| GE Stock Ledger | Inventory movements |
| GE Installation Report | Install records |

#### Engineering (3)
| DocType | Purpose |
|---------|---------|
| GE Drawing | Design documents |
| GE Engineering Task | Engineering work |
| GE Technical Deviation | Change requests |

#### Network & Commissioning (5)
| DocType | Purpose |
|---------|---------|
| GE Device | Installed devices |
| GE IP Pool | IP ranges |
| GE IP Allocation | IP assignments |
| GE Commissioning | Site commissioning |
| GE Commissioning Checklist Item | Checklist items |

#### Billing & Finance (8)
| DocType | Purpose |
|---------|---------|
| GE Invoice | Bills |
| GE Invoice Line | Bill items |
| GE Payment Receipt | Payments received |
| GE Retention Ledger | Retention tracking |
| GE Penalty Deduction | Penalties applied |
| GE Bank Guarantee | BG tracking |
| GE Security Deposit | SD tracking |
| GE Finance Request | Fund requests |

#### O&M Ticketing (4)
| DocType | Purpose |
|---------|---------|
| GE Ticket | Support tickets |
| GE Ticket Action | Ticket updates |
| GE SLA Profile | SLA rules |
| GE SLA Timer | Time tracking |

#### DMS & Alerts (10)
| DocType | Purpose |
|---------|---------|
| GE Document | Files |
| GE Document Type | File categories |
| GE Document Folder | Folders |
| GE Document Briefcase | User briefcase |
| GE Alert Rule | Alert definitions |
| GE Alert Instance | Active alerts |
| GE Alert Target Role | Who gets alerts |
| GE Alert Escalation Step | Escalation chain |
| GE Notification Log | Sent notifications |
| GE Bulk Upload Log | Batch upload tracking |

---

## 7. API Structure

### Backend API Location
```
/home/system/frappe-bench/apps/gov_erp/gov_erp/api/
├── __init__.py
├── foundation.py    ← Organization, Branch, Dept APIs
├── workflow.py      ← Approval Workflow APIs
└── audit.py         ← Audit Log APIs
```

### API Pattern
```python
# Base URL
http://localhost:8000/api/method/gov_erp.api.{module}.{function}

# Examples
GET  /api/method/gov_erp.api.foundation.get_organizations
POST /api/method/gov_erp.api.foundation.create_organization
POST /api/method/gov_erp.api.workflow.create_approval_instance
POST /api/method/gov_erp.api.workflow.approve_instance
```

### Standard Response Format
```json
{
  "success": true,
  "message": "Created successfully",
  "data": { ... }
}
```

---

## 8. Frontend Pages

### Current UI Structure
```
d:\erp\erp_frontend\src\app\
├── page.tsx              ← Dashboard (home)
├── layout.tsx            ← Main layout with sidebar
├── globals.css           ← Styles
│
├── pre-sales/
│   └── page.tsx          ← Tender list + Create form
│
├── engineering/
│   └── page.tsx          ← Projects & Sites
│
├── procurement/
│   └── page.tsx          ← Indent, PO management
│
├── inventory/
│   └── page.tsx          ← GRN, Stock, Dispatch
│
├── finance/
│   └── page.tsx          ← Invoice, Payments
│
├── execution/
│   └── page.tsx          ← Milestones, Tasks, DPR
│
├── survey/
│   └── page.tsx          ← Survey records
│
├── documents/
│   └── page.tsx          ← Document management
│
├── om-helpdesk/
│   └── page.tsx          ← Tickets, SLA
│
├── reports/
│   └── page.tsx          ← Reports & Analytics
│
├── master-data/
│   └── page.tsx          ← Masters (Org, Users, Items)
│
└── api/
    └── tenders/
        ├── route.ts      ← Tender API proxy
        └── stats/
            └── route.ts  ← Tender stats API
```

### Components
```
d:\erp\erp_frontend\src\components\
├── Header.tsx           ← Page headers
├── Sidebar.tsx          ← Navigation sidebar
├── TopHeader.tsx        ← Top bar with role selector
└── CreateTenderModal.tsx ← Tender creation form
```

---

## 9. Current Progress

### What's DONE ✅

| Category | Item | Status |
|----------|------|--------|
| **Backend** | Frappe setup on WSL | ✅ |
| **Backend** | 96 DocTypes created | ✅ |
| **Backend** | Foundation APIs (org, branch, dept) | ✅ |
| **Backend** | Workflow APIs (create, approve, reject) | ✅ |
| **Backend** | Audit APIs | ✅ |
| **Frontend** | Next.js setup | ✅ |
| **Frontend** | Sidebar navigation | ✅ |
| **Frontend** | Role-based UI switching | ✅ |
| **Frontend** | Pre-Sales page (basic) | ✅ |
| **Frontend** | Create Tender form | ✅ |
| **Seed Data** | 1 Organization | ✅ |
| **Seed Data** | 1 Branch | ✅ |
| **Seed Data** | 3 Departments | ✅ |
| **Seed Data** | 11 Roles (names defined) | ✅ |
| **Seed Data** | 2 Workflows | ✅ |

### What's PENDING 🔄

| Category | Item | Priority |
|----------|------|----------|
| **Seed Data** | OEMs (Hikvision, Dahua, etc.) | High |
| **Seed Data** | Dealers/Vendors | High |
| **Seed Data** | Test users with roles | High |
| **Seed Data** | Checklist templates | Medium |
| **APIs** | Tender CRUD API | High |
| **APIs** | BOQ CRUD API | High |
| **APIs** | Project conversion API | High |
| **APIs** | Procurement APIs | Medium |
| **APIs** | Inventory APIs | Medium |
| **Frontend** | BOQ form | High |
| **Frontend** | Costsheet form | High |
| **Frontend** | Engineering page | Medium |
| **Frontend** | All other module pages | Medium |

---

## 10. Sprint Roadmap

### Sprint 1: Foundation ✅ DONE
- DocTypes structure
- Foundation APIs
- Seed data (basic)
- Frontend skeleton

### Sprint 2: Pre-Sales Complete (Current)
- BOQ DocType + API
- Costsheet DocType + API
- Project DocType + API
- Tender → Project conversion
- Frontend: BOQ form, Costsheet form

### Sprint 3: Survey + Dependency
- Survey enforced before BOQ
- Dependency engine implementation
- Block/Override logic

### Sprint 4: Procurement Part 1
- Indent creation
- RFQ to vendors
- Vendor quotation capture

### Sprint 5: Procurement Part 2
- 3-quote comparison
- PO creation
- Approval workflows

### Sprint 6: Stores & Inventory
- GRN receipt
- Serial number tracking
- Dispatch challan
- Stock ledger

### Sprint 7: Project Execution
- Milestones & Tasks
- DPR daily entry
- Progress tracking

### Sprint 8: Engineering & Commissioning
- Drawings management
- IP pool & allocation
- Commissioning checklist
- Client signoff

### Sprint 9: Billing & Finance
- Invoice generation
- Payment tracking
- Retention ledger
- Penalty deductions

### Sprint 10: O&M + Alerts
- Ticket management
- SLA timer
- Notifications
- Dashboard reports

---

## Quick Reference Commands

### Start Backend (Frappe)
```bash
wsl -d Ubuntu-22.04 bash -c "cd /home/system/frappe-bench && source env/bin/activate && /home/system/.local/bin/bench start"
```

### Start Frontend (Next.js)
```bash
cd d:\erp\erp_frontend
npm run dev
```

### Access URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Frappe Desk: http://localhost:8000/app

---

> **Remember:** Yeh ERP specifically Government Projects ke liye hai — CCTV, ITMS, Surveillance. Normal ERP se different hai kyunki:
> - Tender-driven workflow
> - Site-based execution
> - Compliance tracking mandatory
> - SLA-based O&M with penalties
> - Multi-level approvals required

---

*Document Created: March 11, 2026*
