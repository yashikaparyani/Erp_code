# Pre-Sales MIS Review

## Decision

Current recommendation: **keep all 3 MIS pages for now**.

## Why

- `Finance MIS` is useful because it shows actual `EMD` / `PBG` tracking from live finance request data.
- `Sales MIS` is useful because it gives a user-wise tender movement summary from real tender records.
- `Login MIS` is useful for admin audit and user activity verification, even though it is not core bid workflow.

## Recommendation by page

### 1. Finance MIS

Decision: `KEEP`

Reason:

- directly supports pre-sales finance readiness
- linked to live instrument records
- helps monitor `Pending`, `Active`, `Released`, `Rejected` states

### 2. Sales MIS

Decision: `KEEP`

Reason:

- useful for ownership and status movement reporting
- supports tender workload review
- should later be aligned further with new workflow statuses if needed

### 3. Login MIS

Decision: `KEEP FOR NOW`

Reason:

- not a core bid screen
- but still useful for admin and audit control
- low-risk to keep because it is already backend-backed and isolated

## Future cleanup note

If later we want a tighter pre-sales navigation, the first candidate to move out of `Pre-Sales > MIS` would be:

- `Login MIS`

Reason:

- it is more of a system audit page than a bid management page

For now, no MIS tab is recommended for removal.
