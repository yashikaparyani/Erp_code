# Phase 6: DMS Governance In Context — Comprehensive Audit

## Executive Summary

The DMS has a **strong foundation**: standalone Documents page with full CRUD, version history, expiry badges, and folder management; a project workspace FilesTab with stage readiness + progression gates; a DossierTab with per-stage completeness overlays; and a reusable `RecordDocumentsPanel` embedded in 30+ detail pages. The backend provides 16 dedicated DMS methods covering upload, versioning, expiry, requirements, dossier, and progression gates.

**Primary Phase 6 goal**: Strengthen document linkage, surface expiry/versions/required-vs-uploaded consistently, and enable PH/PM/dept leads to use DMS in live workflows without leaving context.

---

## Area 1: Standalone Documents Page

### Current State
- **File**: `src/app/documents/page.tsx` (~900+ lines)
- Full-featured global DMS page with:
  - **Folders view** via `get_document_folders` / `create_document_folder`
  - **Upload modal** with ALL fields: `document_name`, `linked_project`, `linked_site`, `folder`, `category`, `stage`, `subcategory`, `reference_doctype`, `reference_name`, `supersedes_document`, `is_mandatory`, `valid_from`, `valid_till`, `expiry_date`, `status`, `source_document`, `assigned_to`, etc.
  - **Document Register table** with columns: Document, Context (project/site/stage/ref), Version button, Workflow Status, Expiry Badge, Uploaded info, Actions
  - **Version History drawer** via `get_document_versions`
  - **Attention Queue** showing expired + expiring documents
  - **ExpiryBadge** and **StatusBadge** inline components
  - **Stat cards**: folders count, latest docs, linked projects, controlled docs
  - **Filters**: project, category, site, stage, latest-only toggle

### Gaps for Phase 6

| # | Gap | Code Location | Impact |
|---|-----|---------------|--------|
| 1.1 | **No status update actions** (Approve/Reject/Close) from this page — status column is display-only | `documents/page.tsx` — table row renders `StatusBadge` but no action buttons | PH/PM must go elsewhere to approve documents |
| 1.2 | **No required-vs-uploaded overlay** — page shows ALL documents but doesn't highlight which mandatory requirements are unsatisfied | `documents/page.tsx` — no call to `check_stage_document_completeness` or `get_document_requirements` | No visibility into missing mandatory docs at global level |
| 1.3 | **No bulk operations** — no multi-select for bulk status change, bulk download, or bulk assignment | `documents/page.tsx` — single-row actions only | Governance at scale is slow |
| 1.4 | **No reviewer/approver assignment flow** — `assigned_to`, `reviewed_by`, `approved_by` fields exist in doctype but upload modal doesn't route to a reviewer | `documents/page.tsx` upload form + `upload_project_document` backend | Documents are uploaded but not routed for review |

---

## Area 2: Project Workspace Files Tab

### Current State
- **File**: `src/app/project-workspace/WorkspaceShell.tsx` (lines ~1542–2200)
- Inline `FilesTab` component within the monolithic WorkspaceShell:
  - **DMS Stats row**: total, multi-version, expired, expiring, controlled
  - **Stage Readiness panel**: calls `check_stage_document_completeness` + `check_progression_gate`, shows gate status (clear/blocked) with missing mandatory docs listed
  - **Record-linked Documents panel**: groups docs by `reference_doctype`/`reference_name` bundles via `get_record_documents`
  - **Category filter pills**, upload form, document table with version drawer
  - **ExpiryBadge** inline component
  - **Permission-aware**: `wp.can_upload_files`, `wp.can_delete_files`

### Gaps for Phase 6

| # | Gap | Code Location | Impact |
|---|-----|---------------|--------|
| 2.1 | **Simplified upload form** — missing `stage`, `subcategory`, `reference_doctype`, `reference_name`, `supersedes_document`, `is_mandatory` fields that standalone Documents page has | `WorkspaceShell.tsx` ~line 1700+ (upload form only sends `document_name`, `category`, `linked_site`, `expiry_date`, `remarks`) | Docs uploaded from workspace lack critical metadata for completeness checks |
| 2.2 | **No status update actions** (Approve/Reject) within FilesTab | `WorkspaceShell.tsx` — document table has download + delete but no status transition buttons | PM/PH must navigate to standalone Documents page to change status |
| 2.3 | **No version upload** — can upload new docs but cannot upload a new version of an existing doc from within FilesTab | `WorkspaceShell.tsx` — no "Upload New Version" action on existing doc rows | Versioning workflow breaks context |
| 2.4 | **Stage Readiness** only shows for the current project stage — no cross-stage document completeness panorama | `WorkspaceShell.tsx` ~line 1580 — `PROJECT_TO_DOCUMENT_STAGE` maps only the active stage | No forward-looking view of what stages ahead still need docs |
| 2.5 | **Record-linked docs panel is read-only** — shows bundles but no "attach doc to this record" action | `WorkspaceShell.tsx` ~line 1850+ — bundles rendered with doc rows but no upload linkage | Cannot contextually attach a document to a PO/indent/GRN from workspace |

---

## Area 3: Project Workspace Dossier Tab

### Current State
- **File**: `src/app/project-workspace/WorkspaceShell.tsx` (lines ~3965–4100)
- Inline `DossierTab` component:
  - Calls `get_project_dossier` for stage-grouped document inventory
  - Calls `check_stage_document_completeness` per stage for completeness overlay
  - `DossierStageSection` shows: docs per stage, mandatory count, satisfied count, missing count
  - Each doc row: name, category, subcategory, reference_doctype, is_mandatory badge, expiry_date, status badge, version, download link
  - Missing mandatory documents highlighted in **rose panel**
  - Summary header: total docs, mandatory missing count

### Gaps for Phase 6

| # | Gap | Code Location | Impact |
|---|-----|---------------|--------|
| 3.1 | **No upload from Dossier** — shows what's missing but no "Upload Now" button next to missing requirements | `WorkspaceShell.tsx` ~line 4050 — missing mandatory panel has no upload action | User sees gap but must navigate to FilesTab or Documents page to fill it |
| 3.2 | **No site-level dossier within workspace** — workspace dossier is project-level only; site dossier is a separate standalone page | `WorkspaceShell.tsx` DossierTab calls `get_project_dossier` only; site dossier at `src/app/sites/[id]/dossier/page.tsx` is separate | No site-scoped dossier view in workspace for multi-site projects |
| 3.3 | **No version history** in Dossier view — only shows latest version number, no drawer/modal to see all versions | `WorkspaceShell.tsx` ~line 4080 — renders `doc.version` as text but no `openVersions()` | Cannot inspect document history from dossier |
| 3.4 | **No expiry highlighting** in Dossier — has `expiry_date` column but no ExpiryBadge like FilesTab/Documents page | `WorkspaceShell.tsx` DossierStageSection — renders `expiry_date` as plain text | Expired docs in dossier don't visually stand out |
| 3.5 | **No export/print** — Dossier is a key compliance artifact but cannot be exported as PDF or printed | `WorkspaceShell.tsx` DossierTab — no export action | Cannot generate dossier report for auditors or client handover |

---

## Area 4: Backend DMS Methods

### Current State
- **File**: `backend/gov_erp/gov_erp/api.py` (lines 9044–9650+)
- 16 methods:

| Method | Line | Purpose |
|--------|------|---------|
| `_annotate_project_documents` | 9044 | Adds `file_url`, `version_count`, `is_latest_version`, `days_until_expiry` |
| `get_project_documents` | 9078 | Full query with filters (folder, project, category, site, stage, reference_doctype, subcategory) |
| `get_document_folders` | 9146 | Returns GE Document Folder or File folders with counts |
| `create_document_folder` | 9213 | Creates GE Document Folder |
| `upload_project_document` | 9224 | Creates GE Project Document with auto-versioning, accountability logging |
| `update_document_status` | 9278 | Status transitions (In Review → Approved/Rejected/Closed) with accountability |
| `delete_uploaded_project_file` | ~9340 | Cleanup helper |
| `get_document_versions` | 9353 | Returns all versions by document_name+project+site |
| `get_expiring_documents` | ~9400 | Returns docs expiring within N days |
| `_process_expiring_documents` | scheduler | Emits alerts for docs expiring within 7 days |
| `get_document_requirements` | 9459 | Returns GE Document Requirement rules |
| `check_stage_document_completeness` | 9479 | Required vs uploaded comparison |
| `get_project_dossier` | 9541 | Docs grouped by stage |
| `get_site_dossier` | 9571 | Docs for a site grouped by stage |
| `get_record_documents` | 9605 | Docs by reference_doctype/reference_name |
| `check_progression_gate` | ~9630 | Checks prior stages' mandatory docs before advancing |

### Gaps for Phase 6

| # | Gap | Code Location | Impact |
|---|-----|---------------|--------|
| 4.1 | **No document assignment/routing API** — `update_document_status` changes status but doesn't assign to a reviewer/approver | `api.py:9278` — sets status + accountability log but no `assigned_to` update | No workflow routing for document review |
| 4.2 | **No document requirement CRUD** — `get_document_requirements` is read-only; no API to create/update requirements | `api.py:9459` — only `frappe.get_all("GE Document Requirement")` | Admin cannot configure requirements from frontend |
| 4.3 | **No bulk document operations** — no batch status update, batch download, or batch assignment endpoint | Not present | Governance at scale requires bulk actions |
| 4.4 | **Expiry scheduler only alerts at 7 days** — no configurable threshold, no escalation for already-expired docs | `_process_expiring_documents` — hardcoded 7-day window | Docs that expired > 7 days ago generate no alerts |
| 4.5 | **No document accountability trail query** — accountability records are created but no dedicated API to retrieve document-specific audit trail | `upload_project_document` and `update_document_status` create accountability records but no `get_document_audit_trail` | Cannot show "who uploaded, who approved, when" timeline per document |
| 4.6 | **`check_progression_gate` doesn't account for expiry** — checks mandatory docs exist but not whether they're expired | `api.py:~9630` — only checks `is_mandatory` + uploaded count | Expired mandatory doc still allows stage progression |

---

## Area 5: Document Context in Other Pages

### Current State
- **RecordDocumentsPanel**: `src/components/ui/RecordDocumentsPanel.tsx`
  - Reusable component calling `get_record_documents`
  - Shows: status badge (approved/reviewed/rejected/expired), download link, expiry info
  - **Used in 30+ detail pages** across: engineering (drawings, BOQ, survey, change-requests, deviations), pre-sales (bids, EMD tracking), procurement (PO, indents, vendor comparisons), stores (GRN), finance (retention, proformas, estimates, follow-ups), execution (commissioning test-reports, devices, checklists, client-signoffs, sites), HR (onboarding, travel-logs, leave, technician-visits, regularizations, overtime), PM (DPR, requests), milestones, SLA profiles, petty cash, RMA, O&M helpdesk, comm-logs
- **Cross-page dossier links**: procurement list page (line 399), finance list page (line 212), execution project-structure page (lines 140, 170) have text links to `?tab=dossier`
- **PM Cockpit Ops tab**: shows `document_expiry` section (expired + expiring_soon cards, up to 3 each) at `WorkspaceShell.tsx` lines 2800-3020
- **Site Dossier page**: `src/app/sites/[id]/dossier/page.tsx` — standalone page calling `get_site_dossier` with completeness overlay

### Gaps for Phase 6

| # | Gap | Code Location | Impact |
|---|-----|---------------|--------|
| 5.1 | **RecordDocumentsPanel is read-only** — shows docs but no upload action to attach a document to a record from context | `RecordDocumentsPanel.tsx` — renders list + download, no upload form/modal | Users must navigate away to attach docs to POs, indents, GRNs, etc. |
| 5.2 | **RecordDocumentsPanel lacks version history** — shows single version, no drawer to view all versions | `RecordDocumentsPanel.tsx` — no `get_document_versions` call | Cannot inspect document version trail from detail pages |
| 5.3 | **RecordDocumentsPanel has no expiry badge** — shows expiry info as text but no visual ExpiryBadge component | `RecordDocumentsPanel.tsx` — no `ExpiryBadge` component like Documents page has | Expired docs on records don't visually alert users |
| 5.4 | **PM Cockpit document_expiry section has no actions** — shows names of expired/expiring docs but no "Upload Replacement" or "Navigate to Document" buttons | `WorkspaceShell.tsx` ~lines 2970-3020 — renders doc names as text only | PM sees expiring docs but cannot act without navigating |
| 5.5 | **Procurement/Finance list pages only have text dossier links** — no inline document status indicators | `procurement/page.tsx:399`, `finance/page.tsx:212` — plain `<Link>` to dossier tab | No at-a-glance document health on list views |
| 5.6 | **No document completeness indicator on milestone/site detail pages** — these are key execution checkpoints but have no doc status | `milestones/[id]`, `execution/sites/[id]` — use RecordDocumentsPanel but no completeness check | Milestones can be marked complete without verifying document readiness |

---

## Area 6: Document Versioning

### Current State
- **Backend**: `upload_project_document` auto-increments version by checking `max(version)` for same `document_name+project+site`. Logs `DOC_SUPERSEDED` when version > 1.
- **`_annotate_project_documents`** adds `version_count`, `is_latest_version` to each row.
- **`get_document_versions`** returns all versions of a document grouped by `document_name+project+site`.
- **Documents page**: Version button on each row opens a version history drawer.
- **FilesTab**: Has version drawer via `openVersions()`.
- **DossierTab**: Shows `doc.version` number as plain text.
- **RecordDocumentsPanel**: Shows single row per doc, no version info.

### Gaps for Phase 6

| # | Gap | Code Location | Impact |
|---|-----|---------------|--------|
| 6.1 | **No "Upload New Version" action** from version drawer — drawer shows history but no upload button | `documents/page.tsx` version drawer, `WorkspaceShell.tsx` version drawer — display-only | Must close drawer → use upload form → manually set supersedes |
| 6.2 | **`supersedes_document` field not enforced** — upload allows setting it but backend doesn't validate chain integrity | `api.py:9224` — stores `supersedes_document` but no validation that it references a real doc | Version chains can be broken |
| 6.3 | **DossierTab shows no version history** — only latest version number | `WorkspaceShell.tsx` DossierTab ~line 4080 | No document evolution visible in compliance dossier |
| 6.4 | **RecordDocumentsPanel shows no version info** — neither version number nor history access | `RecordDocumentsPanel.tsx` | Record-linked docs appear to have no versioning |
| 6.5 | **No diff/comparison between versions** — version drawer lists versions but no side-by-side comparison | Version drawer in `documents/page.tsx` and `WorkspaceShell.tsx` | Cannot quickly assess what changed between versions |

---

## Area 7: Required-vs-Uploaded State

### Current State
- **`GE Document Requirement`** doctype defines rules: `stage`, `document_category`, `document_subcategory`, `is_mandatory`, `scope_level`, `uploader_role`, `reviewer_role`, `description`
- **`check_stage_document_completeness`** (`api.py:9479`): Compares requirements vs uploaded, returns per-requirement `satisfied` status, `all_mandatory_satisfied`, `satisfied_count`, `missing_mandatory_count`
- **`check_progression_gate`** (`api.py:~9630`): Checks all prior stages' mandatory docs before advancing, returns `can_proceed` + `missing_mandatory`
- **FilesTab Stage Readiness panel**: Calls both methods, shows gate status + missing mandatory docs
- **DossierTab**: Calls `check_stage_document_completeness` per stage, shows completeness overlay with rose panel for missing
- **Site Dossier page**: Same completeness overlay pattern

### Gaps for Phase 6

| # | Gap | Code Location | Impact |
|---|-----|---------------|--------|
| 7.1 | **No global required-vs-uploaded dashboard** — completeness checks are only per-project or per-stage, no cross-project view | No dedicated page or API for org-wide document compliance status | Director/PH cannot see which projects have doc gaps without opening each workspace |
| 7.2 | **No front-end for managing Document Requirements** — `get_document_requirements` is read-only, no admin UI to create/edit/delete requirement rules | `api.py:9459` — read-only; no corresponding page in `erp_frontend/` | Requirements can only be managed via Frappe desk backend |
| 7.3 | **Completeness check doesn't match on `subcategory`** — requirement has `document_subcategory` but matching logic may only check `category` + `stage` | `api.py:9479` — need to verify matching logic includes subcategory | False "satisfied" if a doc of correct category but wrong subcategory is uploaded |
| 7.4 | **No auto-assignment of uploader based on requirement** — `uploader_role` and `reviewer_role` fields exist on requirement but aren't used to route tasks | `GE Document Requirement` has fields but no consumption in `upload_project_document` or `update_document_status` | Document requirements define who should upload/review but this isn't enforced |
| 7.5 | **Progression gate doesn't check expiry** — a mandatory doc that exists but is expired still counts as "satisfied" | `api.py:~9630` `check_progression_gate` and `api.py:9479` `check_stage_document_completeness` | Expired mandatory docs allow stage progression |
| 7.6 | **No "required-vs-uploaded" view on standalone Documents page** — the page shows all docs but never surfaces which requirements are unsatisfied | `documents/page.tsx` — no call to `get_document_requirements` or `check_stage_document_completeness` | Global DMS page lacks completeness context |

---

## Priority Matrix

### P0 — Blocks governance workflows
| Gap | Area | Effort |
|-----|------|--------|
| 2.1 | FilesTab upload missing metadata | Small — add fields to upload form |
| 5.1 | RecordDocumentsPanel read-only (no upload) | Medium — add upload modal to component |
| 7.5 | Progression gate ignores expiry | Small — add expiry check in `check_stage_document_completeness` and `check_progression_gate` |
| 4.1 | No document assignment/routing API | Medium — extend `update_document_status` or add `assign_document_reviewer` |
| 3.1 | No upload from Dossier missing panel | Small — add "Upload Now" button next to missing requirements |

### P1 — Degrades in-context experience
| Gap | Area | Effort |
|-----|------|--------|
| 1.1 / 2.2 | No status update actions on Documents page / FilesTab | Medium — add approve/reject buttons with modal |
| 5.4 | PM Cockpit doc expiry has no actions | Small — add navigation links + upload action |
| 5.3 | RecordDocumentsPanel no ExpiryBadge | Small — reuse ExpiryBadge component |
| 5.2 | RecordDocumentsPanel no version history | Small — add version drawer trigger |
| 6.1 | No "Upload New Version" from version drawer | Medium — add upload action in drawer |
| 3.4 | Dossier no ExpiryBadge | Small — reuse ExpiryBadge component |
| 3.3 | Dossier no version history | Small — add version drawer trigger |

### P2 — Administrative & reporting gaps
| Gap | Area | Effort |
|-----|------|--------|
| 7.1 | No cross-project document compliance dashboard | Large — new page + aggregation API |
| 7.2 | No Document Requirements admin UI | Medium — new admin page for CRUD |
| 4.2 | No document requirement CRUD API | Medium — add create/update/delete endpoints |
| 3.5 | Dossier no export/print | Medium — PDF generation |
| 4.5 | No document audit trail API | Small — add query endpoint |
| 1.2 | Documents page no required-vs-uploaded overlay | Medium — integrate completeness data |

### P3 — Nice to have
| Gap | Area | Effort |
|-----|------|--------|
| 1.3 | No bulk operations on Documents page | Medium |
| 4.3 | No bulk backend operations | Medium |
| 4.4 | Expiry scheduler hardcoded at 7 days | Small |
| 5.5 | List pages only have text dossier links | Small |
| 5.6 | No doc completeness on milestone/site detail | Medium |
| 6.2 | supersedes_document not validated | Small |
| 6.5 | No version diff/comparison | Large |
| 3.2 | No site-level dossier in workspace | Medium |
| 7.3 | Completeness subcategory matching | Small — verify and fix |
| 7.4 | Auto-assignment from requirement roles | Medium |

---

## Quick Reference: Key Files

| Component | File | Lines |
|-----------|------|-------|
| Documents page | `src/app/documents/page.tsx` | 1–900+ |
| FilesTab | `src/app/project-workspace/WorkspaceShell.tsx` | 1542–2200 |
| DossierTab | `src/app/project-workspace/WorkspaceShell.tsx` | 3965–4100 |
| PM Cockpit Ops (doc expiry) | `src/app/project-workspace/WorkspaceShell.tsx` | 2800–3020 |
| RecordDocumentsPanel | `src/components/ui/RecordDocumentsPanel.tsx` | Full file |
| Site Dossier | `src/app/sites/[id]/dossier/page.tsx` | Full file |
| Backend DMS methods | `backend/gov_erp/gov_erp/api.py` | 9044–9650 |
| API routes | `src/app/api/documents/route.ts` | (route handlers) |
| API ops routes | `src/app/api/ops/route.ts` | (whitelist dispatch) |

---

## GE Project Document Field Inventory

All fields on the doctype (inferred from backend):

```
document_name, folder, linked_project, linked_site, linked_stage,
source_document, category, document_subcategory, reference_doctype,
reference_name, supersedes_document, is_mandatory, file, version,
uploaded_by, uploaded_on, submitted_by, submitted_on, valid_from,
valid_till, expiry_date, status, assigned_to, accepted_by, due_date,
blocker_reason, escalated_to, reviewed_by, approved_by,
approved_rejected_by, closure_note, remarks
```

**Computed by `_annotate_project_documents`:**
```
file_url, version_count, is_latest_version, days_until_expiry
```
