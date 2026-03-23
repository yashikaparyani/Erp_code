import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

type ProjectRow = {
  name: string;
  project_name?: string;
  customer?: string;
  status?: string;
  current_project_stage?: string;
  total_sites?: number;
  spine_progress_pct?: number;
};

type SiteRow = {
  name: string;
  site_name?: string;
  site_code?: string;
  status?: string;
  linked_project?: string;
};

type TeamMemberRow = {
  linked_project?: string;
  linked_site?: string;
  role_in_project?: string;
  is_active?: number;
};

type AttendanceRow = {
  employee?: string;
  attendance_date?: string;
  attendance_status?: string;
  linked_project?: string;
  linked_site?: string;
};

type OvertimeRow = {
  employee?: string;
  overtime_date?: string;
  overtime_hours?: number;
  overtime_status?: string;
  linked_project?: string;
  linked_site?: string;
};

type TravelRow = {
  employee?: string;
  travel_date?: string;
  travel_status?: string;
  from_location?: string;
  to_location?: string;
  linked_project?: string;
  linked_site?: string;
  expense_amount?: number;
};

type VisitRow = {
  employee?: string;
  visit_date?: string;
  visit_status?: string;
  linked_project?: string;
  linked_site?: string;
  customer_location?: string;
};

type DocumentRow = {
  name: string;
  document_name?: string;
  linked_project?: string;
  linked_site?: string;
  category?: string;
  expiry_date?: string;
  days_until_expiry?: number;
};

type StatutoryRow = {
  employee?: string;
  ledger_type?: string;
  payment_status?: string;
  employee_contribution?: number;
  employer_contribution?: number;
  period_end?: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isPresentStatus(status?: string) {
  return ['PRESENT', 'ON_DUTY', 'HALF_DAY'].includes(String(status || '').toUpperCase());
}

function projectMatcher(project?: string, siteMap?: Map<string, SiteRow>) {
  return <T extends { linked_project?: string; linked_site?: string }>(row: T) => {
    if (!project) return true;
    if ((row.linked_project || '') === project) return true;
    if (row.linked_site && siteMap?.get(row.linked_site)?.linked_project === project) return true;
    return false;
  };
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const project = params.get('project') || undefined;
    const attendanceDate = params.get('attendanceDate') || todayIso();

    const [projectsRes, sitesRes, teamMembersRes, attendanceRes, overtimeRes, travelRes, technicianRes, documentsRes, expiringRes, statutoryRes] = await Promise.all([
      callFrappeMethod('get_project_spine_list', {}, request),
      callFrappeMethod('get_sites', project ? { project } : {}, request),
      callFrappeMethod('get_project_team_members', { ...(project ? { project } : {}), active: 1 }, request),
      callFrappeMethod('get_attendance_logs', { attendance_date: attendanceDate }, request),
      callFrappeMethod('get_overtime_entries', {}, request),
      callFrappeMethod('get_travel_logs', project ? { project } : {}, request),
      callFrappeMethod('get_technician_visit_logs', {}, request),
      callFrappeMethod('get_project_documents', project ? { project } : {}, request),
      callFrappeMethod('get_expiring_documents', { ...(project ? { project } : {}), days: 30 }, request),
      callFrappeMethod('get_statutory_ledgers', {}, request),
    ]);

    const allProjects = (projectsRes.data || []) as ProjectRow[];
    const projects = project ? allProjects.filter((row) => row.name === project) : allProjects;
    const sites = (sitesRes.data || []) as SiteRow[];
    const siteMap = new Map(sites.map((row) => [row.name, row]));
    const matchesProject = projectMatcher(project, siteMap);

    const teamMembers = ((teamMembersRes.data || []) as TeamMemberRow[]).filter(matchesProject);
    const attendanceRows = ((attendanceRes.data || []) as AttendanceRow[]).filter(matchesProject);
    const overtimeRows = ((overtimeRes.data || []) as OvertimeRow[]).filter(matchesProject);
    const travelRows = ((travelRes.data || []) as TravelRow[]).filter(matchesProject);
    const technicianRows = ((technicianRes.data || []) as VisitRow[]).filter(matchesProject);
    const documentRows = ((documentsRes.data || []) as DocumentRow[]).filter(matchesProject);
    const expiringDocuments = ((expiringRes.data || []) as DocumentRow[]).filter(matchesProject);
    const statutoryRows = (statutoryRes.data || []) as StatutoryRow[];

    const siteAttendanceRows = sites.map((site) => {
      const attendanceForSite = attendanceRows.filter((row) => row.linked_site === site.name);
      const overtimeForSite = overtimeRows.filter((row) => row.linked_site === site.name);
      const techniciansForSite = technicianRows.filter((row) => row.linked_site === site.name);
      const documentsForSite = documentRows.filter((row) => row.linked_site === site.name);
      return {
        site: site.site_name || site.site_code || site.name,
        site_code: site.site_code || site.name,
        project: site.linked_project || '-',
        status: site.status || '-',
        present_count: attendanceForSite.filter((row) => isPresentStatus(row.attendance_status)).length,
        absent_count: attendanceForSite.filter((row) => String(row.attendance_status || '').toUpperCase() === 'ABSENT').length,
        total_attendance: attendanceForSite.length,
        overtime_hours: Number(overtimeForSite.reduce((sum, row) => sum + Number(row.overtime_hours || 0), 0).toFixed(2)),
        active_technicians: techniciansForSite.filter((row) => ['PLANNED', 'IN_PROGRESS'].includes(String(row.visit_status || '').toUpperCase())).length,
        documents: documentsForSite.length,
      };
    }).sort((left, right) => right.present_count - left.present_count || right.active_technicians - left.active_technicians);

    const projectStaffingRows = projects.map((projectRow) => {
      const projectSites = sites.filter((row) => row.linked_project === projectRow.name);
      const attendanceForProject = attendanceRows.filter((row) => matchesProject(row) && ((row.linked_project || '') === projectRow.name || projectSites.some((site) => site.name === row.linked_site)));
      const overtimeForProject = overtimeRows.filter((row) => matchesProject(row) && ((row.linked_project || '') === projectRow.name || projectSites.some((site) => site.name === row.linked_site)));
      const travelForProject = travelRows.filter((row) => matchesProject(row) && ((row.linked_project || '') === projectRow.name || projectSites.some((site) => site.name === row.linked_site)));
      const techniciansForProject = technicianRows.filter((row) => matchesProject(row) && ((row.linked_project || '') === projectRow.name || projectSites.some((site) => site.name === row.linked_site)));
      const documentsForProject = documentRows.filter((row) => row.linked_project === projectRow.name);
      const expiringForProject = expiringDocuments.filter((row) => row.linked_project === projectRow.name);
      const teamForProject = teamMembers.filter((row) => row.linked_project === projectRow.name);
      return {
        project: projectRow.project_name || projectRow.name,
        project_id: projectRow.name,
        stage: projectRow.current_project_stage || '-',
        sites: projectSites.length || projectRow.total_sites || 0,
        active_assignments: teamForProject.length,
        attendance_marked: attendanceForProject.length,
        present_today: attendanceForProject.filter((row) => isPresentStatus(row.attendance_status)).length,
        overtime_hours: Number(overtimeForProject.reduce((sum, row) => sum + Number(row.overtime_hours || 0), 0).toFixed(2)),
        travel_expense: Number(travelForProject.reduce((sum, row) => sum + Number(row.expense_amount || 0), 0).toFixed(2)),
        technician_visits: techniciansForProject.length,
        expiring_documents: expiringForProject.length,
        document_count: documentsForProject.length,
        progress_pct: Number(projectRow.spine_progress_pct || 0),
      };
    }).sort((left, right) => right.active_assignments - left.active_assignments || right.present_today - left.present_today);

    const governanceRows = projects.map((projectRow) => {
      const docs = documentRows.filter((row) => row.linked_project === projectRow.name);
      const expiring = expiringDocuments.filter((row) => row.linked_project === projectRow.name);
      return {
        project: projectRow.project_name || projectRow.name,
        project_id: projectRow.name,
        total_documents: docs.length,
        expiring_documents: expiring.length,
        site_coverage: new Set(docs.map((row) => row.linked_site).filter(Boolean)).size,
        categories: new Set(docs.map((row) => row.category).filter(Boolean)).size,
      };
    }).sort((left, right) => right.expiring_documents - left.expiring_documents || right.total_documents - left.total_documents);

    const complianceSummary = {
      total_records: statutoryRows.length,
      pending: statutoryRows.filter((row) => String(row.payment_status || '').toUpperCase() === 'PENDING').length,
      hold: statutoryRows.filter((row) => String(row.payment_status || '').toUpperCase() === 'HOLD').length,
      paid: statutoryRows.filter((row) => String(row.payment_status || '').toUpperCase() === 'PAID').length,
      employee_contribution: Number(statutoryRows.reduce((sum, row) => sum + Number(row.employee_contribution || 0), 0).toFixed(2)),
      employer_contribution: Number(statutoryRows.reduce((sum, row) => sum + Number(row.employer_contribution || 0), 0).toFixed(2)),
    };

    const complianceRows = ['EPF', 'ESIC'].map((ledgerType) => {
      const rows = statutoryRows.filter((row) => String(row.ledger_type || '').toUpperCase() === ledgerType);
      return {
        ledger_type: ledgerType,
        total: rows.length,
        pending: rows.filter((row) => String(row.payment_status || '').toUpperCase() === 'PENDING').length,
        hold: rows.filter((row) => String(row.payment_status || '').toUpperCase() === 'HOLD').length,
        paid: rows.filter((row) => String(row.payment_status || '').toUpperCase() === 'PAID').length,
        employee_contribution: Number(rows.reduce((sum, row) => sum + Number(row.employee_contribution || 0), 0).toFixed(2)),
        employer_contribution: Number(rows.reduce((sum, row) => sum + Number(row.employer_contribution || 0), 0).toFixed(2)),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        filters: {
          attendanceDate,
          project: project || 'all',
          projects: allProjects.map((row) => ({ name: row.name, label: row.project_name || row.name })),
        },
        summary: {
          projects: projects.length,
          sites: sites.length,
          active_assignments: teamMembers.length,
          attendance_marked: attendanceRows.length,
          present_today: attendanceRows.filter((row) => isPresentStatus(row.attendance_status)).length,
          active_deployments: technicianRows.filter((row) => ['PLANNED', 'IN_PROGRESS'].includes(String(row.visit_status || '').toUpperCase())).length,
          expiring_documents: expiringDocuments.length,
          compliance_attention: complianceSummary.pending + complianceSummary.hold,
        },
        project_staffing: projectStaffingRows,
        site_attendance: siteAttendanceRows,
        technician_deployments: technicianRows.slice(0, 12),
        travel_links: travelRows.slice(0, 20),
        overtime_links: overtimeRows.slice(0, 20),
        document_governance: governanceRows,
        expiring_documents: expiringDocuments.slice(0, 12),
        compliance: {
          summary: complianceSummary,
          rows: complianceRows,
        },
      },
    });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load HR operations cockpit', {
      data: {
        filters: { attendanceDate: todayIso(), project: 'all', projects: [] },
        summary: {
          projects: 0,
          sites: 0,
          active_assignments: 0,
          attendance_marked: 0,
          present_today: 0,
          active_deployments: 0,
          expiring_documents: 0,
          compliance_attention: 0,
        },
        project_staffing: [],
        site_attendance: [],
        technician_deployments: [],
        travel_links: [],
        overtime_links: [],
        document_governance: [],
        expiring_documents: [],
        compliance: { summary: { total_records: 0, pending: 0, hold: 0, paid: 0, employee_contribution: 0, employer_contribution: 0 }, rows: [] },
      },
    });
  }
}
