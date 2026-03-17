# Project CRUD Implementation Notes

## What Was Already Present

- Project workspace read APIs already existed:
  - `get_project_spine_list`
  - `get_project_spine_summary`
- Project-linked doctypes and CRUD were already present for:
  - `GE Project Team Member`
  - `GE Project Asset`
- `Project` itself was using ERPNext's native doctype plus custom spine fields from `spine_setup.py`.

## What I Added

### Backend

- Added dedicated `Project` record APIs in `backend/gov_erp/gov_erp/api.py`:
  - `get_project`
  - `create_project`
  - `update_project`
  - `delete_project`
- Added payload normalization for project fields:
  - project name
  - company fallback
  - status
  - start/end dates
  - linked tender
  - project head / project manager
  - current project stage
  - blocker fields
  - estimated costing
  - notes
- Added a safer delete dependency check before removing a project.
- Added backend tests:
  - AST/source-level API existence check in `backend/gov_erp/gov_erp/tests/test_api.py`
  - runtime CRUD flow test in `backend/gov_erp/gov_erp/tests/test_app_runtime.py`

### Frontend

- Updated `/projects` page to support project record CRUD:
  - create project modal
  - edit project modal
  - delete project action
  - project detail fetch through verified backend API
- Refined `/projects` page layout to make it less random and more useful:
  - clearer top-level project actions
  - cleaner project overview card
  - backend-backed action queue instead of noisier summary blocks
  - add team member / add asset actions now guide the user instead of looking permission-disabled when no project is selected
- Preserved and kept working the already-added CRUD for:
  - project team members
  - project assets
- Updated frontend connector allowlist in `erp_frontend/src/app/api/ops/route.ts` for:
  - `get_project`
  - `create_project`
  - `update_project`
  - `delete_project`

## Sanity / Smoke Status

- Frontend TypeScript sanity check passed:
  - `cmd /c npx tsc --noEmit`
- Source-level wiring checks passed:
  - backend project CRUD methods exist
  - frontend connector allowlist includes them
  - `/projects` page handlers are wired

## Environment Blockers

- Full frontend production build could not be completed inside the sandbox because `next build` failed with worker spawn `EPERM`.
- Windows-side Python runtime was not available for executing backend tests locally.
- WSL-based bench smoke test could not be completed because WSL access timed out / was unavailable from this environment.

## Net Result

- Project master CRUD is now implemented backend-first and wired into the frontend.
- Existing project-linked CRUD remains available.
- Full bench-level runtime validation is still recommended once WSL / bench access is available.
