## BMD Tendering Port Plan

This file tracks the selective migration of client-shaped tendering features that were previously referenced from `BMD/gov_erp` into the main `backend/gov_erp` app.

### Source of truth

- Runtime backend: `backend/gov_erp`
- Reference app: absorbed and removed after port planning

### Porting rules

- Reuse only tendering/business concepts that the frontend or client workflow actually needs.
- Do not copy BMD's guest access, `ignore_permissions=True`, or broad System Manager-only model.
- Keep all new work inside the main `backend/gov_erp` app.
- Leave `BMD` untouched except as reference.

### Port order

1. `GE Organization` master + `GE Tender.organization`
2. `GE Tender Result` + `GE Tender Result Bidder`
3. `GE Tender Checklist` + `GE Tender Checklist Item`
4. `GE Tender Reminder`
5. `GE Competitor`

### Explicitly not being ported as-is

- BMD audit/approval scaffolding
- BMD guest endpoints
- BMD app/module layout
- BMD duplicate core masters that conflict with ERPNext or current `gov_erp`

### Current status

- `GE Organization`: ported
- `GE Tender.organization`: ported
- `GE Tender Result` + `GE Tender Result Bidder`: ported
- `GE Tender Checklist` + `GE Tender Checklist Item`: ported
- `GE Tender Reminder`: ported
- `GE Competitor`: ported

### Verification

- Live app migrated successfully on `dev.localhost`
- Focused runtime test suite passed
- Repo copy mirrored from live app after verification
