# Frontend Phase Plan For Opus

Purpose: give Opus a phase-wise execution plan from "frontend is mostly wired" to "safe to hand to deployment team".

This plan is not a feature wishlist. It is ordered by release risk, handoff value, and how much each phase reduces deployment uncertainty.

## Phase 0. Lock The Release Baseline

Goal:
- Start from a known-good frontend state before more changes land.

Tasks:
- Pull latest `master`.
- Confirm local tree is understood before editing.
- Run baseline verification:
  - `cd /workspace/development/Erp_code/erp_frontend && npm run build`
  - `cd /workspace/development/Erp_code/erp_frontend && npx vitest run src/__tests__/smoke-routes.test.ts`
- Record the baseline result in the PR notes or commit message.

Done when:
- Build passes.
- Smoke tests pass.
- Opus knows exactly which files are intentionally being changed.

## Phase 1. Remove Production-Unsafe Affordances

Goal:
- Strip anything that should not be visible in a deployment candidate.

Why this comes first:
- Deployment teams should never inherit a UI that can seed demo data or imply non-production workflows.

Tasks:
- Remove or hard-hide the `Seed Demo Data` control from:
  - [commercial/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/finance/commercial/page.tsx)
- Remove or guard the frontend exposure of `seed_bookkeeping_demo` in:
  - [api/ops/route.ts](/workspace/development/Erp_code/erp_frontend/src/app/api/ops/route.ts)
- Review Settings/Admin surfaces and confirm only intentional admin tools remain exposed:
  - [settings/operations/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/settings/operations/page.tsx)
  - [settings/anda-import/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/settings/anda-import/page.tsx)

Done when:
- No production-facing page exposes demo-seeding actions.
- Admin-only tools are intentionally scoped and not mistaken for normal operator flows.

## Phase 2. Finish The Raw Picker Conversion Pass

Goal:
- Eliminate the remaining high-risk free-text relational inputs.

Why this matters:
- These are the most common operator-error generators left in the app.

High-priority targets:
- [indents/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/indents/page.tsx)
- [purchase-orders/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/purchase-orders/page.tsx)
- [grns/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/grns/page.tsx)
- [finance/retention/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/finance/retention/page.tsx)
- [finance/follow-ups/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/finance/follow-ups/page.tsx)
- [execution/sites/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/execution/sites/page.tsx)

Implementation rule:
- Use `LinkPicker` or `FormModal` `type: 'link'` wherever the field points to a real record.
- Extend:
  - [LinkPicker.tsx](/workspace/development/Erp_code/erp_frontend/src/components/ui/LinkPicker.tsx)
  - [FormModal.tsx](/workspace/development/Erp_code/erp_frontend/src/components/shells/FormModal.tsx)
  - [api/lookup/route.ts](/workspace/development/Erp_code/erp_frontend/src/app/api/lookup/route.ts)
  only when a missing lookup entity blocks the work.

Done when:
- Project, site, customer, invoice, item, and warehouse fields no longer rely on memory-based typing on release-critical forms.

## Phase 3. Finish Typed API Migration For Core Workflows

Goal:
- Reduce reliance on generic `/api/ops` for the highest-value flows.

Why this matters:
- Typed wrappers are easier to maintain, safer to refactor, and clearer for deployment/debugging.

Already in place:
- [typedApi.ts](/workspace/development/Erp_code/erp_frontend/src/lib/typedApi.ts) now covers project inventory, commercial, closeout, indents, costing, and ANDA.

Tasks:
- Review core screens still hitting `/api/ops` directly and migrate the release-critical ones first.
- Prioritize:
  - execution DPR and execution summary flows
  - finance landing-page actions
  - project workspace tabs that are operationally central
  - notifications/reports if those are part of release scope
- Add dedicated typed routes when a flow is repeatedly hitting generic `method + args`.

Key seams:
- [execution/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/execution/page.tsx)
- [finance/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/finance/page.tsx)
- [projects/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/projects/page.tsx)
- [OpsWorkspace.tsx](/workspace/development/Erp_code/erp_frontend/src/components/ops/OpsWorkspace.tsx)

Done when:
- The core business workflows use explicit typed request contracts instead of generic RPC wherever practical.

## Phase 4. Do A Deployment-Safe Route Layer Audit

Goal:
- Ensure the Next route layer is stable in production builds.

Why this matters:
- This already produced a real build failure from static generation versus cookie-backed handlers.

Tasks:
- Audit `src/app/api/**/route.ts` for dynamic behavior consistency.
- Keep cookie/session-backed routes explicitly dynamic.
- Avoid duplicate exports on alias/re-export routes like:
  - [api/drawings/route.ts](/workspace/development/Erp_code/erp_frontend/src/app/api/drawings/route.ts)
- Re-run full frontend build after any route-layer edits.

Done when:
- `npm run build` passes cleanly without route-layer dynamic/static errors.

## Phase 5. Tighten Role-Gated Navigation And Admin Exposure

Goal:
- Make sure the visible app surface matches intended permissions before handoff.

Tasks:
- Review sidebar and top-level navigation:
  - [Sidebar.tsx](/workspace/development/Erp_code/erp_frontend/src/components/Sidebar.tsx)
- Confirm only intended users see:
  - ANDA import
  - system operations
  - finance/costing approval tools
  - project-head approval tools
- Remove any dead or misleading navigation entry points.

Done when:
- Navigation feels intentional for each role.
- Deployment team is not asked to infer whether a page is "meant to be there."

## Phase 6. Polish The New Operational Screens

Goal:
- Raise the final UX of the biggest recently-added work so deployment doesn’t inherit "just wired" pages.

Priority screens:
- [execution/sites/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/execution/sites/page.tsx)
- [execution/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/execution/page.tsx)
- [inventory/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/inventory/page.tsx)
- [project-manager/inventory/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/project-manager/inventory/page.tsx)
- [finance/commercial/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/finance/commercial/page.tsx)
- [settings/operations/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/settings/operations/page.tsx)
- [settings/anda-import/page.tsx](/workspace/development/Erp_code/erp_frontend/src/app/settings/anda-import/page.tsx)

Tasks:
- Clean up labels, spacing, empty states, and button hierarchy.
- Check mobile behavior and table overflow.
- Ensure success/error states read clearly for operators.

Done when:
- These pages feel deployable, not merely connected.

## Phase 7. Build The Deployment Handoff Packet

Goal:
- Give deployment team everything they need without tribal knowledge.

Tasks:
- Write a short deployment handoff doc with:
  - required frontend env vars
  - required backend/Frappe env vars the frontend assumes
  - build command
  - start command
  - dynamic route note
  - auth/session assumptions
  - smoke-test URLs
  - admin-only pages
- Include exact commands:
  - `cd /workspace/development/Erp_code/erp_frontend && npm install`
  - `cd /workspace/development/Erp_code/erp_frontend && npm run build`
  - `cd /workspace/development/Erp_code/erp_frontend && npm run start`
- Add rollback note if deployment team gets a bad build.

Done when:
- A deployment engineer can take the repo and run the frontend without asking product/dev for hidden context.

## Phase 8. Final Release Validation

Goal:
- Close the loop with a clear handoff-ready proof.

Tasks:
- Run:
  - `cd /workspace/development/Erp_code/erp_frontend && npm run build`
  - `cd /workspace/development/Erp_code/erp_frontend && npx vitest run src/__tests__/smoke-routes.test.ts`
- Manually smoke:
  - login
  - director dashboard
  - execution
  - site register
  - inventory
  - PM inventory
  - approval hub
  - costing queue
  - commercial page
- Confirm file upload flows still work after picker/type changes.

Done when:
- Build passes.
- Smoke tests pass.
- Core role-based screens open and behave correctly.

## Phase 9. Release Branch Hygiene

Goal:
- Hand off a clean, reviewable release branch.

Tasks:
- Review `git status`.
- Separate docs-only edits from product code if needed.
- Avoid bundling unrelated local experiments.
- Commit with a release-focused message.

Done when:
- The branch is clean.
- The deployment team receives only intentional release changes.

## Deployment Handoff Gate

Do not hand to deployment until all are true:
- Demo-seed affordances are gone from production UI.
- High-risk relational fields use pickers instead of raw typing.
- Core release flows use typed APIs where practical.
- Frontend production build passes.
- Smoke tests pass.
- Route-layer dynamic behavior is stable.
- A deployment handoff note exists.

## Suggested Execution Order For Opus

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6
7. Phase 7
8. Phase 8
9. Phase 9

