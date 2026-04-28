import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

type EmployeeRow = {
  name: string;
  employee_name?: string;
  designation?: string;
  department?: string;
  branch?: string;
  status?: string;
  date_of_joining?: string;
  cell_number?: string;
  company_email?: string;
  company?: string;
};

type ReportRow = Record<string, string | number | null>;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value?: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function uniqueValues(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort((left, right) => left.localeCompare(right));
}

function filterRowsByEmployees<T extends Record<string, any>>(rows: T[], employees: Set<string>, field = 'employee') {
  if (!employees.size) return rows;
  return rows.filter((row) => employees.has(String(row[field] || '')));
}

function buildReport(
  key: string,
  title: string,
  category: string,
  description: string,
  columns: string[],
  rows: ReportRow[],
  primaryMetric: string,
  drilldownPath: string,
  highlights: string[],
) {
  return {
    key,
    title,
    category,
    description,
    formats: ['PDF', 'XLS'],
    rowCount: rows.length,
    primaryMetric,
    drilldownPath,
    highlights,
    updatedAt: new Date().toISOString(),
    columns,
    rows,
  };
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const department = params.get('department') || undefined;
    const branch = params.get('branch') || undefined;
    const status = params.get('status') || undefined;
    const attendanceDate = params.get('attendanceDate') || todayIso();

    const [allEmployees, filteredEmployees, leaveBalances, attendanceMuster, travelLogs, onboardings, statutoryLedgers] = await Promise.all([
      callFrappeMethod('get_employees', {}, request),
      callFrappeMethod('get_employees', { department, branch, status }, request),
      callFrappeMethod('get_leave_balances', {}, request),
      callFrappeMethod('get_attendance_muster', { attendance_date: attendanceDate, department }, request),
      callFrappeMethod('get_travel_logs', {}, request),
      callFrappeMethod('get_onboardings', {}, request),
      callFrappeMethod('get_statutory_ledgers', {}, request),
    ]);

    const allEmployeeRows = (allEmployees.data || []) as EmployeeRow[];
    const employeeRows = (filteredEmployees.data || []) as EmployeeRow[];
    const employeeContext = new Set(employeeRows.map((row) => row.name));
    const employeeMap = new Map(allEmployeeRows.map((row) => [row.name, row]));
    const contextFiltersApplied = Boolean(department || branch || status);

    const leaveRows = filterRowsByEmployees((leaveBalances.data?.rows || []) as Array<Record<string, any>>, contextFiltersApplied ? employeeContext : new Set(), 'employee').map((row) => ({
      employee: String(row.employee || ''),
      leave_type: String(row.leave_type_label || row.leave_type || ''),
      allocated: Number(row.allocated || 0),
      consumed: Number(row.consumed || 0),
      remaining: Number(row.remaining || 0),
      paid_leave: row.is_paid_leave ? 'Paid' : 'Unpaid',
    }));

    const musterRows = filterRowsByEmployees((attendanceMuster.data?.rows || []) as Array<Record<string, any>>, branch || status ? employeeContext : new Set(), 'employee').map((row) => {
      const employee = employeeMap.get(String(row.employee || ''));
      return {
        employee: String(row.employee_name || row.employee || ''),
        employee_id: String(row.employee || ''),
        designation: String(row.designation || employee?.designation || ''),
        department: String(row.department || employee?.department || ''),
        branch: String(employee?.branch || ''),
        state: String(row.state || ''),
        status: String(row.status || ''),
        linked_site: String(row.linked_site || ''),
        linked_project: String(row.linked_project || ''),
      };
    });

    const travelRows = filterRowsByEmployees((travelLogs.data || []) as Array<Record<string, any>>, contextFiltersApplied ? employeeContext : new Set(), 'employee').map((row) => ({
      employee: String(row.employee || ''),
      travel_date: String(row.travel_date || ''),
      from_location: String(row.from_location || ''),
      to_location: String(row.to_location || ''),
      status: String(row.travel_status || ''),
      expense_amount: Number(row.expense_amount || 0),
    }));

    const onboardingRows = ((onboardings.data || []) as Array<Record<string, any>>)
      .filter((row) => {
        if (!contextFiltersApplied) return true;
        const employeeReference = String(row.employee_reference || '');
        if (!employeeReference) return true;
        return employeeContext.has(employeeReference);
      })
      .map((row) => ({
        candidate: String(row.employee_name || row.name || ''),
        designation: String(row.designation || ''),
        company: String(row.company || ''),
        joining_date: String(row.date_of_joining || ''),
        status: String(row.onboarding_status || ''),
        submitted_by: String(row.submitted_by || ''),
      }));

    const filteredStatutoryRows = filterRowsByEmployees((statutoryLedgers.data || []) as Array<Record<string, any>>, contextFiltersApplied ? employeeContext : new Set(), 'employee');
    const statutorySummary = ['EPF', 'ESIC'].map((ledgerType) => {
      const ledgerRows = filteredStatutoryRows.filter((row) => String(row.ledger_type || '') === ledgerType);
      return {
        ledger_type: ledgerType,
        records: ledgerRows.length,
        paid: ledgerRows.filter((row) => String(row.payment_status || '') === 'PAID').length,
        pending: ledgerRows.filter((row) => String(row.payment_status || '') === 'PENDING').length,
        hold: ledgerRows.filter((row) => String(row.payment_status || '') === 'HOLD').length,
        employee_contribution: Number(ledgerRows.reduce((sum, row) => sum + Number(row.employee_contribution || 0), 0)),
        employer_contribution: Number(ledgerRows.reduce((sum, row) => sum + Number(row.employer_contribution || 0), 0)),
      };
    });

    const reports = [
      buildReport(
        'employee-master',
        'Employee Master Export',
        'People Administration',
        'Searchable employee master with status, designation, location, and contact details.',
        ['employee_id', 'employee_name', 'designation', 'department', 'branch', 'status', 'joining_date', 'phone', 'email', 'company'],
        employeeRows.map((row) => ({
          employee_id: row.name,
          employee_name: row.employee_name || '',
          designation: row.designation || '',
          department: row.department || '',
          branch: row.branch || '',
          status: row.status || '',
          joining_date: row.date_of_joining || '',
          phone: row.cell_number || '',
          email: row.company_email || '',
          company: row.company || '',
        })),
        `${employeeRows.length} employees in current scope`,
        '/hr/employees',
        [
          `${employeeRows.filter((row) => row.status === 'Active').length} active`,
          `${uniqueValues(employeeRows.map((row) => row.department)).length} departments`,
        ],
      ),
      buildReport(
        'pf-esi-summary',
        'PF / ESI Summary',
        'Compliance',
        'Statutory contribution summary for EPF and ESIC, grouped by payment state and contribution totals.',
        ['ledger_type', 'records', 'paid', 'pending', 'hold', 'employee_contribution', 'employer_contribution'],
        statutorySummary,
        formatCurrency(statutorySummary.reduce((sum, row) => sum + row.employee_contribution + row.employer_contribution, 0)),
        '/hr',
        [
          `${statutorySummary.reduce((sum, row) => sum + row.pending, 0)} pending payments`,
          `${statutorySummary.reduce((sum, row) => sum + row.records, 0)} statutory entries`,
        ],
      ),
      buildReport(
        'leave-balance',
        'Leave Balance Report',
        'Time Office',
        'Allocated, consumed, and remaining leave balances across employees and leave policies.',
        ['employee', 'leave_type', 'allocated', 'consumed', 'remaining', 'paid_leave'],
        leaveRows,
        `${leaveRows.length} leave balance rows`,
        '/hr/attendance',
        [
          `${leaveRows.filter((row) => Number(row.remaining || 0) < 0).length} negative balances`,
          `${leaveRows.filter((row) => String(row.paid_leave) === 'Paid').length} paid leave rows`,
        ],
      ),
      buildReport(
        'attendance-muster',
        'Attendance Muster Export',
        'Time Office',
        'Day-wise attendance muster with state, linked site, and linked project visibility.',
        ['employee', 'employee_id', 'designation', 'department', 'branch', 'state', 'status', 'linked_site', 'linked_project'],
        musterRows,
        `${musterRows.filter((row) => String(row.state) === 'In').length} employees in today`,
        '/hr/attendance',
        [
          `${musterRows.filter((row) => String(row.state) === 'Absent').length} absent`,
          `${musterRows.filter((row) => String(row.state) === 'On Leave').length} on leave`,
        ],
      ),
      buildReport(
        'travel-summary',
        'Travel Summary',
        'Field Operations',
        'Travel movement and expense summary for operational and HR review.',
        ['employee', 'travel_date', 'from_location', 'to_location', 'status', 'expense_amount'],
        travelRows,
        formatCurrency(travelRows.reduce((sum, row) => sum + Number(row.expense_amount || 0), 0)),
        '/hr/travel-logs',
        [
          `${travelRows.filter((row) => String(row.status) === 'APPROVED').length} approved trips`,
          `${travelRows.length} total travel rows`,
        ],
      ),
      buildReport(
        'onboarding-status',
        'Onboarding Status Report',
        'Talent Pipeline',
        'Candidate onboarding progress from draft through employee mapping.',
        ['candidate', 'designation', 'company', 'joining_date', 'status', 'submitted_by'],
        onboardingRows,
        `${onboardingRows.filter((row) => String(row.status) === 'APPROVED').length} approved onboardings`,
        '/hr/onboarding',
        [
          `${onboardingRows.filter((row) => String(row.status) === 'UNDER_REVIEW').length} under review`,
          `${onboardingRows.filter((row) => String(row.status) === 'MAPPED_TO_EMPLOYEE').length} mapped to employee`,
        ],
      ),
    ];

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          reports: reports.length,
          totalRows: reports.reduce((sum, report) => sum + report.rowCount, 0),
          filteredEmployees: employeeRows.length,
          attendanceDate,
        },
        filters: {
          departments: uniqueValues(allEmployeeRows.map((row) => row.department)),
          branches: uniqueValues(allEmployeeRows.map((row) => row.branch)),
          statuses: uniqueValues(allEmployeeRows.map((row) => row.status)),
        },
        reports,
      },
    });
  } catch (error) {
    return jsonErrorResponse(error, 'Failed to load HR reports gallery', {
      data: {
        summary: { reports: 0, totalRows: 0, filteredEmployees: 0, attendanceDate: todayIso() },
        filters: { departments: [], branches: [], statuses: [] },
        reports: [],
      },
    });
  }
}
