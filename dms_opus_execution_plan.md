# DMS Execution Plan For Opus

Last updated: 2026-03-21

## Purpose

This document is the execution handoff for the next major ERP block: DMS.

The business request is straightforward:

- support `pdf`
- support `doc` / `docx`
- support `xls` / `xlsx`
- support `jpg` / `jpeg`

The ERP already has a partial DMS foundation, but it is not yet a real end-to-end managed file system. The main gap is that the custom DMS flow still behaves more like metadata entry plus file-path storage than a true upload, validation, preview, and governed document lifecycle.

This plan tells Opus exactly what to implement next.

## Current State

### What already exists

- `GE Project Document` DocType exists
- `GE Document Folder` DocType exists
- backend read/list/create APIs for folders and project documents exist
- document expiry logic exists
- version numbering already exists at record level
- document access is already role-gated
- frontend pages for documents already exist
- Frappe file upload helper already exists in the Next.js layer

### Current source locations

- Backend DocType: `backend/gov_erp/gov_erp/gov_erp/doctype/ge_project_document/ge_project_document.json`
- Backend folder DocType: `backend/gov_erp/gov_erp/gov_erp/doctype/ge_document_folder/ge_document_folder.json`
- Backend APIs: `backend/gov_erp/gov_erp/api.py`
- DMS page: `erp_frontend/src/app/documents/page.tsx`
- Project workspace files tab: `erp_frontend/src/components/project-workspace/WorkspaceShell.tsx`
- Next.js Frappe upload helper: `erp_frontend/src/app/api/_lib/frappe.ts`

### What is incomplete

- custom DMS upload flow does not reliably upload binary files end to end
- frontend still uses weak path-string style upload behavior in key places
- allowed file-type policy is not formalized for the DMS requirement
- file-size limits are not enforced in a business-visible way
- preview behavior is not intentionally designed by file type
- Word/Excel documents are not treated as first-class supported formats
- replace/new-version workflow is not a proper guided flow yet
- there is no explicit acceptance matrix for supported document formats

## Compliance Target

The DMS should be considered complete only when all of the following are true:

1. A user can upload a real file from the browser, not just submit a file path.
2. The system accepts only approved file types for this phase:
   - `pdf`
   - `doc`
   - `docx`
   - `xls`
   - `xlsx`
   - `jpg`
   - `jpeg`
3. The system stores document metadata in `GE Project Document` and the actual file in Frappe `File`.
4. The document record stores and exposes:
   - project
   - optional site
   - folder
   - category
   - uploader
   - uploaded time
   - file URL
   - version
   - remarks
   - optional expiry date
5. Image and PDF files can be previewed directly in the UI.
6. Word and Excel files can be downloaded/opened cleanly.
7. Upload, view, replace, and delete are role-gated.
8. Re-uploading the same logical document creates a controlled new version.
9. Validation errors are user-facing and understandable.
10. The flow is tested for all required formats.

## Recommended Build Strategy

Do not rewrite the DMS model.

Use the existing model and strengthen it:

- keep `GE Project Document`
- keep `GE Document Folder`
- keep Frappe `File` as the actual stored file object
- make `GE Project Document.file` store the real uploaded file URL returned from Frappe

This is the fastest path to a usable DMS without unnecessary schema churn.

## Phase Breakdown

## Phase 1: Real Upload Pipeline

### Goal

Turn the current custom DMS flow into a true binary upload flow.

### Tasks

- change the DMS upload UI to use a real file input
- change the workspace files tab upload UI to use a real file input
- send the selected file through the existing `uploadFrappeFile(...)` helper
- after upload succeeds, capture `file_url`
- call `upload_project_document` only after file upload succeeds
- persist the returned `file_url` into `GE Project Document.file`

### Important rule

Do not ask users to paste `/files/...` paths manually for the main DMS flow.

### Done means

- PDF/JPEG/DOC/XLS family files can actually be selected from disk and uploaded
- `GE Project Document` records point to real uploaded files

## Phase 2: File Type And Size Validation

### Goal

Make supported formats explicit and enforceable.

### Tasks

- add backend allowlist validation in `upload_project_document`
- validate by extension at minimum
- if practical, also validate MIME type from uploaded file metadata
- define size limit policy
- reject unsupported formats with a clear error message
- reject oversized files with a clear error message

### Initial allowlist

- `.pdf`
- `.doc`
- `.docx`
- `.xls`
- `.xlsx`
- `.jpg`
- `.jpeg`

### Optional extension for the same phase

- `.png`

### Done means

- backend rejects unsupported file types
- backend rejects oversized files
- frontend shows the rejection message cleanly

## Phase 3: Preview And Open Behavior

### Goal

Make file support visible to users, not just technically stored.

### Tasks

- detect file type in the frontend from `file_url` or file name
- show inline preview for:
  - `pdf`
  - `jpg`
  - `jpeg`
  - optional `png`
- show file-type badge or icon for:
  - Word files
  - Excel files
- provide `Open` / `Download` action for non-previewable files
- keep preview modal simple and reliable

### Done means

- users can preview PDFs and images in-app
- users can open/download Word and Excel documents without confusion

## Phase 4: Version-Controlled Replacement

### Goal

Make document revision history usable.

### Tasks

- define logical uniqueness as:
  - `document_name`
  - `linked_project`
  - optional `linked_site`
- on re-upload of the same logical document:
  - increment version
  - preserve older versions
  - keep newest version first in UI
- add explicit `Replace / Upload New Version` action in UI
- show version history clearly

### Done means

- replacing a file does not overwrite history
- latest and historical versions are both accessible

## Phase 5: Folder And Metadata UX

### Goal

Make DMS organized enough for real operations.

### Tasks

- strengthen folder creation flow
- ensure folder filtering works by project and department
- require or strongly guide category selection
- improve category labels for actual business usage
- show project, site, folder, category, uploaded by, uploaded on, expiry, and version in listings
- add document-type badges so users can visually distinguish PDF/Excel/Word/Image entries

### Done means

- documents are not just uploaded; they are navigable

## Phase 6: Security And Governance

### Goal

Make DMS safe for real use.

### Tasks

- confirm view/upload/delete permissions are enforced in backend APIs
- confirm document access follows project/document permission rules
- decide private vs public file policy
- prefer private files for sensitive documents unless a business case says otherwise
- add or confirm audit behavior for:
  - upload
  - replacement
  - deletion
- ensure expiry alert logic still works after the upload refactor

### Done means

- DMS does not become a bypass around project/document permissions

## Phase 7: Test Coverage And UAT

### Goal

Make the format-support claim defensible.

### Backend test cases

- upload allowed `pdf`
- upload allowed `docx`
- upload allowed `xlsx`
- upload allowed `jpeg`
- reject unsupported extension
- reject oversized file
- create new version on re-upload
- enforce role-gated upload
- enforce role-gated read

### Frontend / integration test cases

- user can upload a PDF from the DMS page
- user can upload a JPEG from the project workspace files tab
- PDF preview opens
- JPEG preview opens
- DOCX entry shows correct type and opens/downloads
- XLSX entry shows correct type and opens/downloads
- version history appears after replacement

### UAT sign-off matrix

Use at least these user journeys:

- Project Manager uploads engineering PDF
- Project Head reviews and opens uploaded PDF
- Department Head uploads Excel tracker/document
- Accounts opens finance document
- unauthorized role cannot upload if DMS upload capability is absent

## Exact Implementation Order

Opus should implement in this order:

1. wire binary upload on DMS page
2. wire binary upload on workspace files tab
3. patch backend validation for extension and size
4. verify `GE Project Document.file` stores real Frappe file URLs
5. add preview/open behavior by file type
6. add replace/new-version UX
7. add tests
8. run UAT on required formats

## Files Most Likely To Change

- `backend/gov_erp/gov_erp/api.py`
- `backend/gov_erp/gov_erp/gov_erp/doctype/ge_project_document/ge_project_document.py`
- `backend/gov_erp/gov_erp/gov_erp/doctype/ge_project_document/ge_project_document.json`
- `erp_frontend/src/app/documents/page.tsx`
- `erp_frontend/src/components/project-workspace/WorkspaceShell.tsx`
- `erp_frontend/src/app/api/documents/route.ts`
- `erp_frontend/src/app/api/_lib/frappe.ts`
- tests under `backend/gov_erp/gov_erp/tests/`

## Recommended Non-Goals For This Slice

Do not expand scope yet into:

- OCR
- document text extraction
- full-text indexing
- PDF annotation
- image editing
- Office-like in-browser editors
- approval workflows inside DMS itself

Those can be future phases. They are not needed to satisfy the current requirement.

## Final Definition Of Done

This DMS phase is complete when:

- the system accepts real uploads for PDF, Word, Excel, and JPEG
- unsupported formats are blocked
- PDF and image preview work
- Word and Excel open/download cleanly
- files are linked to project/site/folder/category metadata
- versioning works on replacement
- permissions are enforced
- automated tests exist
- business users can say the system now supports PDF, Excel, DOC, and JPEG in a real operational sense

## Short Instruction To Opus

Do not redesign the DMS from scratch.

Take the existing `GE Project Document` and `GE Document Folder` foundation, convert the upload flow into a real file-upload pipeline, enforce the approved format list, then add preview/open/version behavior until the module is operationally credible.
