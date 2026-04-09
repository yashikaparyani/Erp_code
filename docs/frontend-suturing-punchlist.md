# Frontend Suturing Punch List

Purpose: give a frontend developer a precise, low-ambiguity task sheet for closing the highest-value UX gaps against the current backend.

This list is intentionally “scalpel style”: each task is bounded, references the current frontend seam, points to the backend capability that already exists, and states what “done” should look like.

## 1. Add Site Bulk Upload UX

Why this matters:
- Backend now supports site template download and bulk XLSX/CSV upload, but there is no operator-facing UI for it.
- This is one of the clearest backend-to-frontend gaps right now.

Backend already available:
- `download_site_bulk_upload_template`
- `bulk_upload_sites`

Frontend seam:
- [execution/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/execution/page.tsx)
- [api/ops/route.ts](/workspace/development/Erp_code/erp_frontend/src/app/api/ops/route.ts)
- The backend methods are now exposed through the frontend ops allowlist, but there is still no visible operator-facing UI for them.

Task:
- Add `Download Template` and `Upload XLSX/CSV` actions in the execution/site management surface.
- Add upload modal with file picker, optional default project, optional default tender, and `dry_run`.
- Show row-level results: created, skipped, errors.

Done when:
- User can download the backend template.
- User can upload a workbook and preview validation errors before final submit.
- Success and error counts are shown in UI without opening logs.

## 2. Build a Real Site Register Workspace

Why this matters:
- There is now a top-level sites route, but it is not a real register workspace yet.
- That makes navigation and day-to-day site ops feel fragmented.

Backend already available:
- `get_sites`
- `get_site`
- `create_site`
- `update_site`
- `delete_site`

Frontend seam:
- [sites/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/sites/page.tsx)
- [execution/sites/[id]/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/execution/sites/[id]/page.tsx)
- [api/sites/route.ts](/workspace/development/Erp_code/erp_frontend/src/app/api/sites/route.ts)
- [sites/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/sites/page.tsx) currently redirects to `/projects`, and there is still no `execution/sites/page.tsx`.

Task:
- Create a proper site register page with search, filters, project filter, status filter, and create/edit actions.
- Link the register cleanly from Execution.
- Add entry points into site dossier and site detail.

Done when:
- A user can browse, filter, create, and open sites from one page without jumping through project detail first.

## 3. Upgrade Stores Dispatch Challan Form To Match Backend Schema

Why this matters:
- The stores page is currently too thin for real dispatch operations.
- Backend now accepts workbook-style `OUT` fields, but the frontend create form only captures bare minimum values.

Backend already available:
- `get_inventory_reference_schema`
- `create_dispatch_challan`
- `update_dispatch_challan`

Frontend seam:
- [inventory/page.tsx#L48](/workspace/development/Erp_code/erp_frontend/src/app/inventory/page.tsx#L48)
- [inventory/page.tsx#L139](/workspace/development/Erp_code/erp_frontend/src/app/inventory/page.tsx#L139)

Missing fields in UI today:
- challan reference
- issued-to name
- make
- model number
- serial number bundle
- remarks per item
- workbook-style `OUT` mapping awareness

Task:
- Expand the challan create/edit form and detail page to support the richer dispatch schema.
- Add line-item rows instead of a single item-only create flow.
- Surface `challan_reference` and `issued_to_name` in list/detail views.

Done when:
- A stores operator can create a challan that actually resembles the business workbook, not a stripped-down stub.

## 4. Add “IN Sheet” Guided Receipt UI For HO / Site Inventory

Why this matters:
- Backend now supports workbook-style inward header mapping, but frontend still behaves like a minimal manual register.
- This leaves the new inventory enhancements mostly invisible to users.

Backend already available:
- `get_inventory_reference_schema`
- `record_project_inventory_receipt`
- project inventory schema now supports `hsn_code`, `make`, `model_no`, `serial_no`, source/invoice/PO refs, purchase cost, and receipt date.

Frontend seam:
- [project-manager/inventory/page.tsx#L97](/workspace/development/Erp_code/erp_frontend/src/app/project-manager/inventory/page.tsx#L97)
- [project-manager/inventory/page.tsx#L239](/workspace/development/Erp_code/erp_frontend/src/app/project-manager/inventory/page.tsx#L239)

Missing fields in UI today:
- HSN code
- make
- model number
- serial number
- source reference
- invoice number
- purchase order
- purchase cost
- received date

Task:
- Expand PM receipt modal to expose the actual backend receipt fields.
- Show those fields in the project inventory register or a detail drawer.
- Use `get_inventory_reference_schema` to label the UI around the business workbook format.

Done when:
- PM/site inventory users can record receipts using the same detail model the business workbook expects.

## 5. Replace Raw Text IDs With Real Pickers In High-Risk Forms

Why this matters:
- Multiple surfaces still ask users to type IDs, project names, site names, item codes, customer names, and file URLs manually.
- That creates preventable operator errors.

High-priority examples:
- [inventory/page.tsx#L145](/workspace/development/Erp_code/erp_frontend/src/app/inventory/page.tsx#L145)
- [commercial/page.tsx#L151](/workspace/development/Erp_code/erp_frontend/src/app/finance/commercial/page.tsx#L151)
- [commercial/page.tsx#L175](/workspace/development/Erp_code/erp_frontend/src/app/finance/commercial/page.tsx#L175)
- [project-manager/inventory/page.tsx#L97](/workspace/development/Erp_code/erp_frontend/src/app/project-manager/inventory/page.tsx#L97)

Task:
- Replace free-text relational fields with searchable selectors or controlled dropdowns.
- Apply first to:
  - project
  - site
  - item
  - customer
  - invoice / record reference

Done when:
- Operators choose linked records from UI pickers instead of typing raw identifiers by memory.

## 6. Fix Commercial Document Exchange To Use Actual Uploads

Why this matters:
- Commercial document exchange currently asks the user for a raw `file_url`, which is not production-grade UX.
- It’s a backend-supported feature with a weak frontend wrapper.

Backend already available:
- `create_commercial_document`
- `get_commercial_documents`
- file upload routes already exist elsewhere in frontend patterns

Frontend seam:
- [commercial/page.tsx#L70](/workspace/development/Erp_code/erp_frontend/src/app/finance/commercial/page.tsx#L70)
- [commercial/page.tsx#L172](/workspace/development/Erp_code/erp_frontend/src/app/finance/commercial/page.tsx#L172)

Task:
- Replace `file_url` text entry with actual file upload.
- Reuse the existing upload patterns used by DMS and record document panels.
- Add upload progress, validation, and attachment preview.

Done when:
- Commercial users can attach and share a file from the browser without hand-entering a URL.

## 7. Rationalize Duplicate Finance Routes

Why this matters:
- Finance navigation feels split because some features exist in both top-level and finance-prefixed routes.
- That increases confusion and raises maintenance cost.

Examples:
- [payment-receipts/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/payment-receipts/page.tsx)
- [finance/payment-receipts/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/finance/payment-receipts/page.tsx)

Task:
- Pick one canonical route structure for finance features.
- Redirect or remove duplicate entry points.
- Ensure side nav and internal links always point to the same canonical workspace.

Done when:
- A user has one obvious path to each finance feature.
- Duplicate pages no longer drift in capability.

## 8. Add Admin Operations Console For System Jobs

Why this matters:
- The frontend `ops` allowlist already exposes scheduler actions, but there is no obvious operations UI for running or inspecting them.
- This is a backend-capable but frontend-hidden control.

Backend already available:
- `generate_system_reminders`
- `process_due_reminders`

Frontend seam:
- [api/system/reminders/route.ts](/workspace/development/Erp_code/erp_frontend/src/app/api/system/reminders/route.ts)
- [api/ops/route.ts](/workspace/development/Erp_code/erp_frontend/src/app/api/ops/route.ts)
- The backend-facing route exists, but there is still no dedicated admin screen for it.

Task:
- Create a small admin-only operations panel under Settings or Admin.
- Add buttons for reminder generation and reminder processing.
- Show last run result, counts, and error message if any.

Done when:
- An admin can trigger and inspect those maintenance actions from UI without falling back to manual API calls.

## 9. Add ANDA Import Workspace Or Remove It From Product Expectations

Why this matters:
- Backend has a full ANDA import surface, but I found no meaningful frontend wiring for it.
- If this feature is supposed to be used, it needs a UI. If not, it should stop being implied as ready.

Backend already available:
- `run_anda_import`
- `get_anda_import_logs`
- `get_anda_import_tabs`
- `load_anda_masters`
- `check_anda_master_integrity`
- `run_anda_orchestrated_import`

Frontend seam:
- [api/ops/route.ts](/workspace/development/Erp_code/erp_frontend/src/app/api/ops/route.ts)
- The methods are exposed through the generic ops allowlist, but I still do not see a real operator workspace/page for ANDA import.

Task:
- Either build an import workspace for ANDA data ingestion, or explicitly de-scope/hide it from product expectations.

Done when:
- The feature either has a real operator entry point or is consciously treated as backend-only tooling.

## 10. Deepen PM Inventory Visibility

Why this matters:
- PM inventory page exists, but it only exposes a subset of backend truth.
- It does not yet feel like a full project-material control panel.

Backend already available:
- `get_project_inventory_records`
- `get_project_receiving_summary`
- `get_project_indents`
- `create_project_indent`
- `create_material_consumption_report`

Frontend seam:
- [project-manager/inventory/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/project-manager/inventory/page.tsx)

Current weakness:
- good summary, but weak traceability per line item
- no richer receipt metadata visible
- no stronger linkage between dispatches, GRNs, and resulting balance changes

Task:
- Add line-item detail drawer or side panel.
- Show receipt metadata, source refs, invoice/PO refs, and audit trail hints.
- Make GRN and dispatch rows clickable into the relevant source record pages.

Done when:
- A PM can explain “how did this balance happen?” directly from the page.

## 11. Improve Detail Hydration For Approval And Costing Flows

Why this matters:
- Approval Hub and Costing Queue pages exist, but they still read as queue views rather than deeply operable decision screens.
- Reviewers often need better source hydration before approving or releasing.

Frontend seam:
- [project-head/approval/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/project-head/approval/page.tsx)
- [finance/costing-queue/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/finance/costing-queue/page.tsx)

Task:
- Enrich detail pages with:
  - source record summary
  - linked documents
  - remarks history
  - prior approvals / accountability context
- Add stronger “what happens next” messaging after approve/reject/release/hold.

Done when:
- A reviewer does not need to jump across multiple modules to make a confident decision.

## 12. Reduce Dependence On The Giant Generic Ops Route

Why this matters:
- The frontend currently relies heavily on one generic RPC-style route for many workflows.
- It works, but it weakens type safety, makes ownership blurry, and encourages thin UX wrappers.

Frontend seam:
- [api/ops/route.ts](/workspace/development/Erp_code/erp_frontend/src/app/api/ops/route.ts)

Task:
- For high-traffic workflows, introduce typed route wrappers instead of sending everything through generic `method + args`.
- Prioritize:
  - project inventory
  - commercial docs/comments
  - closeout
  - PM requests
  - scheduler/admin ops

Done when:
- High-value frontend surfaces have dedicated request contracts and are easier to test and maintain.

## Suggested Implementation Order

1. Site bulk upload UX
2. Stores dispatch + inward inventory schema upgrade
3. Commercial file upload fix
4. Site register page
5. PM inventory detail deepening
6. Finance route consolidation
7. Admin ops console
8. ANDA import decision
9. Approval/costing detail enrichment
10. Gradual typed-route cleanup
