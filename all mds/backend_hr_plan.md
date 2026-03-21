# Backend HR Plan

## Source Of Truth

This plan is based on the HR bookkeeping / onboarding form shared in chat on 2026-03-13.

The form captures:

- employment basics
- personal identity and contact data
- statutory identifiers
- education history
- certifications
- past work history
- mandatory document uploads

## Recommended Backend Strategy

Use built-in ERPNext employee masters where they already exist, and add a thin custom HR layer for onboarding-specific data that does not fit cleanly into the base Employee model.

## Verified Built-in DocTypes Available In This Bench

- `Employee`
- `Employee Education`
- `Employee External Work History`
- `Employee Internal Work History`

Not verified as available in the current app stack:

- `Attendance`
- `Leave Application`
- payroll / salary workflow DocTypes

So the safest approach is:

1. reuse `Employee`
2. reuse `Employee Education`
3. reuse `Employee External Work History`
4. add custom DocTypes only for onboarding-only or compliance-only data

## Proposed Data Model

### Reuse: `Employee`

Map these form fields into `Employee` directly or via custom fields on `Employee`:

- company
- date_of_joining
- status
- designation
- project_state
- project_location
- project_city
- employee_id
- salutation
- employee_name
- gender
- date_of_birth
- blood_group
- contact_number
- alternate_contact_number
- personal_email
- permanent_address
- local_address
- marital_status
- spouse_name
- father_name
- mother_name

### Custom Fields On `Employee`

These are statutory / onboarding fields that should live on the employee record:

- aadhar_number
- pan_number
- epf_number
- esic_number

These should be unique where applicable:

- employee_id
- aadhar_number
- pan_number
- epf_number
- esic_number

## Education Mapping

### Reuse: `Employee Education`

Create one child row per qualification entry:

- SSE / 10th
- HSE / 12th
- Diploma
- UG 1
- UG 2
- PG 1
- PG 2

Suggested fields per row:

- level
- course
- stream
- school_or_institution
- board_or_university
- passing_year

If the built-in `Employee Education` fields are too narrow, extend that DocType with custom fields instead of creating a parallel education table.

## Experience Mapping

### Reuse: `Employee External Work History`

The form supports up to 8 past employers.

Map each entry into one row with:

- company_name
- designation
- from_year
- to_year
- display_order

The input quality is noisy in the sample data, so validation should accept text during draft onboarding but tighten before final approval.

## New Custom DocTypes

### `GE Employee Onboarding`

Purpose:

- capture the raw onboarding submission before creating or updating the final `Employee`
- keep approval / review state separate from the live employee master

Suggested fields:

- employee_reference
- onboarding_status
- company
- date_of_joining
- project_state
- project_location
- project_city
- form_source
- remarks
- submitted_by
- reviewed_by
- approved_by

Suggested statuses:

- `DRAFT`
- `SUBMITTED`
- `UNDER_REVIEW`
- `APPROVED`
- `REJECTED`
- `MAPPED_TO_EMPLOYEE`

### `GE Employee Certification`

Purpose:

- store up to 5 certifications from the form
- allow future expansion beyond 5 without schema changes

Fields:

- parent onboarding or employee
- certificate_name
- certificate_description
- validity_date

### `GE Employee Document`

Purpose:

- track mandatory onboarding documents and their uploaded file links
- separate checklist state from generic `File` attachments

Fields:

- parent onboarding or employee
- document_type
- is_mandatory
- file_url or file
- verified_by
- verified_on
- verification_status
- remarks

Document types from current form:

- passport_size_photo
- cv
- tenth_mark_sheet
- twelfth_mark_sheet
- diploma_certificate
- ug_certificate
- pg_certificate
- aadhar_card
- pan_card
- birth_certificate
- certifications_bundle

## Validation Rules

### Identity / Statutory

- `aadhar_number` must be 12 digits
- `pan_number` should follow PAN format
- `date_of_birth` must be before `date_of_joining`
- `epf_number` and `esic_number` can be optional, but once provided should be unique

### Education

- `passing_year` should be numeric and realistic
- later qualifications should not end before earlier ones

### Experience

- each work history row should have company + designation together
- `from_year <= to_year` where numeric
- rows may stay partially unstructured during draft review if imported from messy forms

### Documents

- mandatory docs must exist before final approval
- uploaded file type should match expected category where possible

## API / Workflow Direction

### Phase 1 HR Slice

Build only the onboarding and employee-master sync layer:

1. create onboarding draft
2. attach certifications
3. attach documents
4. review / approve onboarding
5. create or update linked `Employee`
6. create linked education and external work history rows

### Later HR Slice

Build after onboarding is stable:

- attendance
- travel log
- overtime
- technician visit log
- ESIC / PF compliance trackers
- payroll / leave only if the app stack supports it cleanly

## Current Implementation Status

Implemented now:

- `GE Employee Onboarding`
- `GE Employee Certification`
- `GE Employee Document`
- employee sync into built-in `Employee`
- education sync into built-in `Employee Education`
- past employment sync into built-in `Employee External Work History`
- `GE Attendance Log`
- `GE Travel Log`
- `GE Overtime Entry`
- `GE Statutory Ledger`
- `GE Technician Visit Log`

Explicitly out of scope for the current stack:

- payroll
- leave management

Reason:

- only `Employee` was verified as available in the current site
- `Attendance` / `Leave Application` were not present in this app stack, so the safe backend completion path is custom HR operations docs instead of pretending ERPNext HRMS is installed

## Role Ownership

- `HR Manager`: full access to onboarding and employee compliance docs
- `Top Management`: read-only visibility for HR dashboards
- `System Manager`: admin override

No tender / survey / BOQ / costing access should be granted to HR by default.

## Recommended Tiny Steps

1. Add this HR plan to the canonical backend docs
2. Create `GE Employee Onboarding`
3. Create `GE Employee Certification`
4. Create `GE Employee Document`
5. Add approval workflow and employee sync service
6. Add source-level validation tests
7. Add HR operations layer for attendance, travel, overtime, statutory tracking, and technician visits
