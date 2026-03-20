# Commercial Bookkeeping Flow Task List

Date: 2026-03-20

## Target Flow

`Customer -> Estimate -> Costing -> Proforma -> Invoice -> Payment Receipt -> Statement -> Follow-up`

## Simplified Scope

Primary finance workflow retained:

- `Customer`
- `Estimate / Quote`
- `Costing`
- `Invoice / Proforma`
- `Statement`
- `Receivables / Payment Follow-up`

Legacy finance tabs kept:

- `Payment Receipts`
- `Retention Ledger`
- `Penalty Deductions`

Removed from the new bookkeeping slice:

- `Credit Notes`
- `Debit Notes`
- `Customer Dashboard`
- `Project Dashboard`
- `Tax Summary`
- `Advance & Retention Adjustments`

## Phase 1: Core Backbone

- [x] Define implementation scope and target flow
- [x] Add commercial master/data docs:
  - [x] `GE Estimate`
  - [x] `GE Proforma Invoice`
  - [x] `GE Payment Follow Up`
- [x] Reuse and align existing finance docs:
  - [x] `GE Invoice`
  - [x] `GE Payment Receipt`
  - [x] `GE Retention Ledger`
- [x] Add customer linkage across the commercial lane

## Phase 2: Backend Workflows

- [x] Estimate CRUD + status flow
- [x] Estimate to proforma conversion
- [x] Proforma CRUD + status flow
- [x] Proforma to invoice conversion
- [x] Payment follow-up CRUD + status flow
- [x] Statement summary API
- [x] Receivable aging API

## Phase 3: Frontend Surfaces

- [x] Commercial hub page
- [x] Estimate workspace
- [x] Proforma workspace
- [x] Follow-up workspace
- [x] Customer statement page
- [x] Receivable aging page

## Phase 4: Controls

- [x] Approval alignment for estimate/proforma
- [x] PDF/export support
- [x] Reminder escalation polish
- [x] Customer-wise drilldowns
- [x] Seed/demo data

## Current Build Slice

This implementation pass is focused on:

1. adding the missing commercial doctypes
2. wiring core backend methods
3. exposing first-pass frontend workspaces
4. enabling statement/aging/dashboard/tax summaries
