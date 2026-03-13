# ERP Backend Implementation Roadmap

## Current State Analysis
- **Backend**: Frappe Framework (WSL Ubuntu) with gov_erp app
- **Frontend**: Next.js 14 (TypeScript + Tailwind)
- **Database**: MariaDB
- **DocTypes Created**: ~30 (mostly Tendering module)
- **APIs Implemented**: Only Tender CRUD + Stats
- **Completion**: ~25% of Phase 1

## What's Missing (Critical)
1. Dependency Engine (core blocker logic)
2. Approval Workflows
3. Project/Site/Milestone management
4. Procurement flow (Indent → RFQ → PO)
5. Stores & Inventory (GRN, Serial, Dispatch)
6. Billing & Payments
7. O&M Ticketing + SLA Timer

---

## Phase 1 Complete Roadmap (10 Sprints)

### Sprint 1: Foundation Cleanup (Week 1)
**Focus**: Fix existing, standardize patterns

### Sprint 2: Tender → Project Conversion (Week 2)
**Focus**: Complete tendering, enable project creation

### Sprint 3: Survey + BOQ Module (Week 3)
**Focus**: Survey completion gates BOQ approval

### Sprint 4: Procurement - Part 1 (Week 4)
**Focus**: Vendor, Indent, RFQ

### Sprint 5: Procurement - Part 2 (Week 5)
**Focus**: PO, 3-Quote Compliance

### Sprint 6: Stores & Inventory (Week 6)
**Focus**: GRN, Serial, Dispatch, Stock Ledger

### Sprint 7: Project Execution (Week 7)
**Focus**: Projects, Sites, Milestones, Tasks

### Sprint 8: Dependency Engine (Week 8)
**Focus**: Prerequisite blocking + Override audit

### Sprint 9: Billing & Finance (Week 9)
**Focus**: Invoice, Payments, Retention, Penalties

### Sprint 10: O&M + Alerts (Week 10)
**Focus**: Ticketing, SLA Timer, Notifications
