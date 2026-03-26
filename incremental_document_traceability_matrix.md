# Incremental Document Traceability Matrix

Date: 2026-03-26

## Purpose

Define how documents should accumulate across the ERP lifecycle instead of living as isolated uploads.

This matrix treats documents as a growing project dossier:

- documents begin at survey stage
- later stages add new documents to the same project/site chain
- every important record should be traceable by:
  - project
  - site
  - lifecycle stage
  - source doctype / source record
  - uploader
  - approver / reviewer where applicable
  - version / replacement history

## Core Rule

The document model should be incremental.

That means:

- survey documents do not disappear when BOQ starts
- BOQ documents do not replace the survey trail
- drawing documents build on survey + BOQ context
- procurement documents build on engineering outputs
- GRN and project inventory documents build on procurement records
- execution documents build on the full prior chain
- SLA and RMA documents continue the same traceability spine after execution

So the ERP should behave like a live project file, not a set of disconnected folders.

## Universal Document Linkage Model

Every critical document should support these links:

- `linked_project`
- `linked_site` where site-specific
- `linked_stage`
- `reference_doctype`
- `reference_name`
- `document_category`
- `document_status`
- `version_no`
- `supersedes_document`
- `uploaded_by`
- `reviewed_by`
- `approved_by`
- `valid_from`
- `valid_till`
- `is_mandatory`

## Universal Document Events

Each important document action should create a traceable event:

- uploaded
- replaced
- superseded
- reviewed
- approved
- rejected
- expired
- missing-required-document

These should feed both:

- the accountability ledger
- the alert / notification system

## Incremental Lifecycle Matrix

## 1. Survey Stage

This is the first real document layer.

Scope:

- site-level first
- aggregated to project level later

Required documents:

- survey form / survey sheet
- site photos
- measurements / dimensions sheet
- coordinates / location proof
- survey notes
- client-side site input if available

Recommended metadata:

- survey date
- surveyed by
- site name
- project
- survey revision

Ownership:

- uploader: Engineering / Survey side
- reviewer: Engineering Head / Project Head as policy requires

Blocks if missing:

- BOM
- BOQ
- drawing preparation

## 2. BOM / BOQ Stage

This stage adds quantified engineering and costing documents on top of survey context.

Required documents:

- BOM draft
- BOQ draft
- BOQ approved version
- calculation sheet / basis sheet if maintained
- commercial support sheet if applicable

Derived from:

- survey documents
- site measurements
- site photos

Ownership:

- uploader: Engineering
- reviewer: Engineering Head / approving authority

Blocks if missing:

- drawings release
- indent raising
- vendor comparison basis

## 3. Drawing Stage

This stage adds visual and execution-ready technical documentation.

Required documents:

- site drawing
- single line / layout drawing where applicable
- issued-for-review drawing
- issued-for-execution drawing
- revised drawing versions

Optional supporting documents:

- markups
- redlines
- drawing approval note

Derived from:

- survey
- BOQ / BOM

Ownership:

- uploader: Engineering
- reviewer: Engineering Head / Project Head as required

Blocks if missing:

- execution readiness
- some procurement actions where drawing-based quantities matter

## 4. Indent / Procurement Initiation Stage

This stage starts the commercial / sourcing document chain.

Required documents:

- indent support note
- item requirement sheet
- urgency / justification note where needed
- linked BOQ / drawing reference

Optional documents:

- PM remarks
- PH acknowledgement note

Ownership:

- uploader: Project Manager / Procurement depending on source
- reviewer: Project Head / Procurement Head depending on workflow

Blocks if missing:

- vendor RFQ
- approval trail quality
- procurement RCA later

## 5. Quotation / Vendor Comparison / PO Stage

This stage adds sourcing and approval records.

Required documents:

- vendor quotation 1
- vendor quotation 2
- vendor quotation 3
- vendor comparison sheet
- approval note / exception reason if lowest vendor not selected
- purchase order copy

Optional documents:

- negotiation record
- commercial deviation note
- approval memo

Ownership:

- uploader: Procurement
- reviewer: Procurement Head / Department Head / Director as per threshold

Blocks if missing:

- dispatch release
- clean procurement accountability chain

## 6. Dispatch / Transit Stage

This stage adds proof that ordered materials were actually released and moved.

Required documents:

- dispatch challan
- LR / transporter proof
- vendor invoice copy
- packing list if available

Optional documents:

- transit issue proof
- dispatch approval note

Ownership:

- uploader: Procurement / Stores / Vendor document intake side
- reviewer: Stores / Project side receiving team

Blocks if missing:

- GRN
- material receipt validation

## 7. GRN / Project Inventory Stage

This stage proves receipt and project-side stocking.

Required documents:

- GRN
- inward receipt proof
- received quantity proof
- site receipt photos where needed
- discrepancy note if received quantity differs

Optional documents:

- shortage / damage note
- rejection / return note

Ownership:

- uploader: Store / Project inventory side
- reviewer: Stores / Project Head / Procurement depending on process

Blocks if missing:

- project inventory correctness
- material consumption traceability
- vendor dispute handling

## 8. Execution / I&C Stage

This stage adds site work and installation evidence.

Required documents:

- DPR
- installation checklist
- test reports
- as-built notes where applicable
- site execution photos

Optional documents:

- blocker note
- deviation note
- material consumption report

Ownership:

- uploader: Project Manager / Execution team
- reviewer: Project Head / relevant functional head

Blocks if missing:

- commissioning
- billing support
- RCA of execution delay

## 9. Commissioning / Closure Stage

This stage proves completion and acceptance.

Required documents:

- commissioning report
- FAT / SAT / UAT report where applicable
- client signoff
- punch list closure note
- completion certificate if used

Optional documents:

- snag list
- final handover pack

Ownership:

- uploader: Execution / Project side
- reviewer: Project Head / client-facing approver

Blocks if missing:

- closure
- final billing support
- post-project dispute defense

## 10. O&M / SLA Stage

For O&M projects, documentation continues after commissioning.

Required documents:

- SLA profile
- preventive maintenance reports
- service visit reports
- uptime / downtime support docs
- complaint resolution proof

Optional documents:

- escalation logs
- penalty defense notes
- client review notes

Ownership:

- uploader: O&M side
- reviewer: O&M manager / Project Head / Department Head

Blocks if missing:

- SLA compliance visibility
- penalty defense
- service RCA

## 11. RMA Stage

This stage tracks faulty-material or return handling after deployment.

Required documents:

- issue / failure proof
- faulty item evidence
- return dispatch proof
- vendor acknowledgment
- replacement / repair receipt
- closure proof

Optional documents:

- warranty note
- rejection reason from vendor

Ownership:

- uploader: RMA / O&M / Project side depending on source
- reviewer: RMA manager / Department Head

Blocks if missing:

- warranty tracking
- vendor accountability
- failure RCA

## Document Inheritance Rule

Each later stage should be able to see relevant earlier-stage documents.

Example:

- a commissioning record should still be able to reference:
  - survey documents
  - BOQ
  - drawings
  - procurement docs
  - GRN proof
  - execution reports

So the UI should not isolate every stage into a blind folder.

It should allow:

- stage-local document view
- full project dossier view
- full site dossier view

## Mandatory-Document Gate Rule

Stage progression should optionally be blocked when required documents are missing.

Examples:

- BOQ should not move to approved baseline if survey docs are incomplete
- indent should not be raised without BOQ / requirement support
- PO should not proceed without quotation set + vendor comparison
- GRN should not close without receipt proof
- commissioning should not close without commissioning report + signoff
- SLA closure should not close without service proof
- RMA closure should not close without replacement / resolution proof

## Recommended Common Categories

Recommended top-level document categories:

- survey
- boq_bom
- drawings
- procurement
- dispatch
- grn_inventory
- execution
- commissioning
- sla
- rma
- commercial
- approvals

## Recommended Next Implementation Direction

## Phase 1

Make `GE Project Document` the common document spine instead of a side utility.

Must support:

- project linkage
- site linkage
- doctype linkage
- revision / supersede
- category
- stage

## Phase 2

Create required-document rules by stage.

This means a configuration layer like:

- stage
- document category
- mandatory yes/no
- site-level or project-level
- who uploads
- who reviews

## Phase 3

Wire document events into accountability:

- upload
- replace
- approve
- reject
- missing mandatory doc

## Phase 4

Expose three views in UI:

- project dossier
- site dossier
- record-specific document tab

## Phase 5

Add progression gates:

- warn if missing
- optionally block if mandatory

## Final Rule

Documents should accumulate with the lifecycle.

The ERP must show not just what happened, but the proof attached to what happened.

That means every major stage should leave behind:

- a workflow trail
- an accountability trail
- a document trail

All three together make RCA possible.
