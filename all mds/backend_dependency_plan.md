# Backend Dependency Plan

## Goal

Implement the first execution and dependency-engine slice without replacing ERPNext `Task`.

## Backend Choice

### Reuse ERPNext Built-ins

- `Project`
- `Task`

### Add Custom Gov ERP Layer

- `GE Site`
- `GE Milestone`
- `GE Dependency Rule`
- `GE Dependency Override`

Reason:

- site and milestone tracking are domain-specific
- dependency logic needs project-specific blocker and override behavior
- built-in `Task` remains the execution anchor for now

## Implemented In This Slice

### `GE Site`

- site code
- site name
- linked project
- linked tender
- address
- latitude / longitude
- status

### `GE Milestone`

- linked project
- linked site
- milestone name
- planned date
- actual date
- owner user
- status

### `GE Dependency Rule`

- linked task
- prerequisite type
- linked project
- linked site
- prerequisite reference doctype
- prerequisite reference name
- required status
- hard block
- active flag
- block message

### `GE Dependency Override`

- linked task
- dependency rule
- status
- requested by
- approved by
- actioned at
- reason

## Business Rules

- dependency rules are generic and point to a referenced document instead of hard-coding every prerequisite type
- the engine resolves prerequisite state from `status`, then `workflow_state`, then `docstatus`
- approved overrides disable blocking for the linked rule
- inactive rules do not block execution
- hard blocks prevent task start

## API Surface

- `get_sites`
- `get_site`
- `create_site`
- `update_site`
- `delete_site`
- `get_milestones`
- `get_milestone`
- `create_milestone`
- `update_milestone`
- `delete_milestone`
- `get_dependency_rules`
- `create_dependency_rule`
- `update_dependency_rule`
- `delete_dependency_rule`
- `get_dependency_overrides`
- `create_dependency_override`
- `approve_dependency_override`
- `reject_dependency_override`
- `evaluate_task_dependencies`

## Verified Runtime Coverage

- live runtime test added in `apps/gov_erp/gov_erp/tests/test_execution_runtime.py`
- verified on `dev.localhost` using:
  - real `Project`
  - real `Task`
  - real `GE Survey`
  - real `GE Dependency Rule`
  - real `GE Dependency Override`
- currently covered cases:
  - task is blocked when survey prerequisite is not complete
  - approved override clears the blocker and allows task start

## Roles

- `Project Manager`: primary execution owner
- `Engineering Head` / `Engineer`: execution write access
- `Department Head`: override approval
- `Top Management`: read visibility

## Next Execution Steps

1. decide whether milestones should link into built-in `Task` via custom fields
2. add DPR doc and one-site-per-day validation
3. add richer prerequisite-specific helpers for material, document, approval, and IP states
4. add role-focused runtime tests for execution write access vs override approval access
