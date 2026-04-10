import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

/**
 * Scoped gateway for project-workspace operations.
 * Replaces generic /api/ops for all project workspace tabs.
 */
const PROJECT_WORKSPACE_METHODS = new Set([
  // Spine & overview
  'get_project',
  'update_project',
  'delete_project',
  'add_project_sites',
  'get_project_spine_detail',
  'get_project_spine_list',
  'get_project_spine_summary',
  'get_project_workflow_state',
  'refresh_project_spine',
  // Workflow advancement
  'submit_project_stage_for_approval',
  'approve_project_stage',
  'reject_project_stage',
  'override_project_stage',
  'restart_project_stage',
  // PM cockpit
  'get_pm_cockpit_summary',
  'get_pm_central_status',
  // Activity
  'get_project_activity',
  // Tasks
  'get_project_tasks',
  'create_project_task',
  'update_project_task',
  'delete_project_task',
  'reorder_project_tasks',
  'update_task_status',
  'get_task_summary',
  // Notes
  'get_project_notes',
  'create_project_note',
  'update_project_note',
  'delete_project_note',
  // Documents / files
  'get_project_documents',
  'upload_project_document',
  'update_document_status',
  'delete_project_document',
  'get_record_documents',
  'check_stage_document_completeness',
  'check_progression_gate',
  'get_document_requirements',
  'get_project_dossier',
  'get_site_dossier',
  // Issues
  'get_project_issues',
  'get_project_issue',
  'create_project_issue',
  'update_project_issue',
  'delete_project_issue',
  // Petty cash
  'get_petty_cash_entries',
  'get_petty_cash_entry',
  'create_petty_cash_entry',
  'update_petty_cash_entry',
  'approve_petty_cash_entry',
  'reject_petty_cash_entry',
  'delete_petty_cash_entry',
  'submit_petty_cash_to_ph',
  // Communications
  'get_comm_logs',
  'get_comm_log',
  'create_comm_log',
  // PM Requests
  'get_pm_requests',
  'get_pm_request',
  'create_pm_request',
  'update_pm_request',
  'submit_pm_request',
  'approve_pm_request',
  'reject_pm_request',
  'withdraw_pm_request',
  'delete_pm_request',
  // Favorites
  'toggle_project_favorite',
  'get_project_favorites',
  // Timesheets
  'get_project_timesheet_summary',
  // Accountability
  'get_accountability_timeline',
  'get_accountability_record',
  'get_open_accountability_items',
  // Team
  'get_project_team_members',
  'get_project_team_member',
  'create_project_team_member',
  'update_project_team_member',
  'delete_project_team_member',
  // Manpower
  'get_manpower_summary',
  'get_manpower_logs',
  // Milestones
  'get_milestones',
  'get_milestone',
  'create_milestone',
  'delete_milestone',
  'update_milestone',
  // Dependencies
  'evaluate_task_dependencies',
  // PH Approvals
  'get_ph_approval_items',
  'ph_approve_item',
  'ph_reject_item',
]);

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const method = String(payload?.method || '').trim();
    const args = payload?.args && typeof payload.args === 'object' ? payload.args : {};

    if (!method) {
      return NextResponse.json({ success: false, message: 'method is required' }, { status: 400 });
    }

    if (!PROJECT_WORKSPACE_METHODS.has(method)) {
      return NextResponse.json(
        { success: false, message: `Method not allowed on project-workspace route: ${method}` },
        { status: 400 },
      );
    }

    const result = await callFrappeMethod(method, args, request);
    return NextResponse.json({ success: true, data: result?.data ?? result, message: result?.message });
  } catch (error) {
    return jsonErrorResponse(error, 'Project workspace operation failed');
  }
}
