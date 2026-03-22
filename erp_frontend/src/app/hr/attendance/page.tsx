'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Users,
  Waves,
  XCircle,
} from 'lucide-react';

type EmployeeOption = {
  name: string;
  employee_name: string;
  department?: string;
};

type LeaveType = {
  name: string;
  leave_type_name: string;
  annual_allocation: number;
  is_paid_leave: number | boolean;
  is_active: number | boolean;
  color?: string;
  description?: string;
};

type LeaveAllocation = {
  name: string;
  employee: string;
  leave_type: string;
  allocation_days: number;
  from_date: string;
  to_date: string;
  notes?: string;
};

type LeaveApplication = {
  name: string;
  employee: string;
  leave_type: string;
  leave_status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  from_date: string;
  to_date: string;
  total_leave_days: number;
  linked_project?: string;
  linked_site?: string;
  reason?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
};

type BalanceRow = {
  employee: string;
  leave_type: string;
  leave_type_label: string;
  allocated: number;
  consumed: number;
  remaining: number;
  color?: string;
};

type CalendarEvent = {
  name: string;
  title: string;
  start: string;
  end: string;
  employee?: string;
  leave_type?: string;
  holiday_list?: string;
  kind: 'leave' | 'holiday';
};

type HolidayList = {
  name: string;
  holiday_list_name: string;
  from_date?: string;
  to_date?: string;
  weekly_off?: string;
};

type HolidayDetail = HolidayList & {
  holidays?: Array<{
    holiday_date: string;
    description?: string;
    weekly_off?: string;
  }>;
};

type OverviewRow = {
  employee: string;
  employee_name: string;
  designation?: string;
  department?: string;
  state: string;
  attendance_status?: string | null;
  leave_type?: string | null;
  linked_site?: string | null;
};

type AttendanceOverview = {
  whoIsIn: {
    attendance_date: string;
    summary: {
      total: number;
      in: number;
      on_leave: number;
      absent: number;
      unmarked: number;
    };
    rows: OverviewRow[];
  };
  muster: {
    attendance_date: string;
    rows: Array<{
      employee: string;
      employee_name: string;
      designation?: string;
      department?: string;
      status: string;
      state: string;
      linked_site?: string | null;
      linked_project?: string | null;
    }>;
  };
  swipeInfo: {
    status: string;
    supported_sources: string[];
    required_fields: string[];
    notes: string;
  };
  attendanceStats: {
    total: number;
    present: number;
    absent: number;
    half_day: number;
    on_duty: number;
    week_off: number;
  };
};

type Regularization = {
  name: string;
  employee: string;
  regularization_date: string;
  regularization_status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  requested_check_in?: string;
  requested_check_out?: string;
  requested_status?: string;
  linked_attendance_log?: string;
  reason?: string;
  rejection_reason?: string;
};

type TabKey = 'overview' | 'leaves' | 'setup' | 'calendar' | 'muster' | 'regularization';

type Flash = { tone: 'success' | 'error'; message: string } | null;

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Who Is In' },
  { key: 'leaves', label: 'Leave Requests' },
  { key: 'setup', label: 'Leave Setup' },
  { key: 'calendar', label: 'Calendar & Holidays' },
  { key: 'muster', label: 'Attendance Muster' },
  { key: 'regularization', label: 'Regularization' },
];

const INITIAL_LEAVE_FORM = {
  employee: '',
  leave_type: '',
  from_date: '',
  to_date: '',
  total_leave_days: 1,
  linked_project: '',
  linked_site: '',
  reason: '',
  contact_during_leave: '',
};

const INITIAL_TYPE_FORM = {
  leave_type_name: '',
  annual_allocation: 0,
  is_paid_leave: true,
  is_active: true,
  color: '#1e6b87',
  description: '',
};

const INITIAL_ALLOCATION_FORM = {
  employee: '',
  leave_type: '',
  allocation_days: 0,
  from_date: '',
  to_date: '',
  notes: '',
};

const INITIAL_REGULARIZATION_FORM = {
  employee: '',
  regularization_date: '',
  requested_check_in: '',
  requested_check_out: '',
  requested_status: 'PRESENT',
  reason: '',
  remarks: '',
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status: string) {
  const classes: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    SUBMITTED: 'bg-sky-50 text-sky-700',
    APPROVED: 'bg-emerald-50 text-emerald-700',
    REJECTED: 'bg-rose-50 text-rose-700',
    In: 'bg-emerald-50 text-emerald-700',
    'On Leave': 'bg-amber-50 text-amber-700',
    Absent: 'bg-rose-50 text-rose-700',
    Unmarked: 'bg-slate-100 text-slate-700',
    WEEK_OFF: 'bg-violet-50 text-violet-700',
    ON_LEAVE: 'bg-amber-50 text-amber-700',
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes[status] || 'bg-slate-100 text-slate-700'}`}>{status.replaceAll('_', ' ')}</span>;
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1e6b87] focus:ring-2 focus:ring-[#1e6b87]/20 ${props.className || ''}`} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1e6b87] focus:ring-2 focus:ring-[#1e6b87]/20 ${props.className || ''}`} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`min-h-[88px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1e6b87] focus:ring-2 focus:ring-[#1e6b87]/20 ${props.className || ''}`} />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export default function HrAttendancePage() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [calendarStart, setCalendarStart] = useState(new Date().toISOString().slice(0, 10));
  const [calendarEnd, setCalendarEnd] = useState(new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10));
  const [holidayListName, setHolidayListName] = useState('');

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [balances, setBalances] = useState<{ cycle_start: string; cycle_end: string; rows: BalanceRow[] }>({ cycle_start: '', cycle_end: '', rows: [] });
  const [holidayLists, setHolidayLists] = useState<HolidayList[]>([]);
  const [holidayDetail, setHolidayDetail] = useState<HolidayDetail | null>(null);
  const [calendarData, setCalendarData] = useState<{ leaves: CalendarEvent[]; holidays: CalendarEvent[] }>({ leaves: [], holidays: [] });
  const [overview, setOverview] = useState<AttendanceOverview | null>(null);
  const [regularizations, setRegularizations] = useState<Regularization[]>([]);

  const [leaveForm, setLeaveForm] = useState(INITIAL_LEAVE_FORM);
  const [typeForm, setTypeForm] = useState(INITIAL_TYPE_FORM);
  const [allocationForm, setAllocationForm] = useState(INITIAL_ALLOCATION_FORM);
  const [regularizationForm, setRegularizationForm] = useState(INITIAL_REGULARIZATION_FORM);
  const [working, setWorking] = useState<string | null>(null);

  const employeeOptions = useMemo(() => employees.map((employee) => ({ value: employee.name, label: `${employee.employee_name} (${employee.name})` })), [employees]);

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    if (!holidayListName) {
      setHolidayDetail(null);
      return;
    }
    void loadHolidayDetail(holidayListName);
  }, [holidayListName]);

  async function loadWorkspace() {
    setLoading(true);
    try {
      const [employeesRes, typesRes, allocationsRes, leaveRes, balancesRes, holidaysRes, calendarRes, overviewRes, regularizationRes] = await Promise.all([
        fetch('/api/hr/employees'),
        fetch('/api/hr/leave/types'),
        fetch('/api/hr/leave/allocations'),
        fetch('/api/hr/leave/applications'),
        fetch(`/api/hr/leave/balances?fromDate=${encodeURIComponent(calendarStart)}&toDate=${encodeURIComponent(calendarEnd)}`),
        fetch('/api/hr/holidays'),
        fetch(`/api/hr/leave/calendar?fromDate=${encodeURIComponent(calendarStart)}&toDate=${encodeURIComponent(calendarEnd)}`),
        fetch(`/api/hr/attendance/overview?attendanceDate=${encodeURIComponent(attendanceDate)}`),
        fetch('/api/hr/regularizations'),
      ]);

      const [employeesJson, typesJson, allocationsJson, leaveJson, balancesJson, holidaysJson, calendarJson, overviewJson, regularizationJson] = await Promise.all([
        employeesRes.json(),
        typesRes.json(),
        allocationsRes.json(),
        leaveRes.json(),
        balancesRes.json(),
        holidaysRes.json(),
        calendarRes.json(),
        overviewRes.json(),
        regularizationRes.json(),
      ]);

      if (!employeesRes.ok || employeesJson.success === false) throw new Error(employeesJson.message || 'Failed to load employees');
      setEmployees(employeesJson.data || []);
      setLeaveTypes(typesJson.data || []);
      setAllocations(allocationsJson.data || []);
      setLeaveApplications(leaveJson.data || []);
      setBalances(balancesJson.data || { cycle_start: '', cycle_end: '', rows: [] });
      setHolidayLists(holidaysJson.data || []);
      setCalendarData(calendarJson.data || { leaves: [], holidays: [] });
      setOverview(overviewJson.data || null);
      setRegularizations(regularizationJson.data || []);
      if (!holidayListName && holidaysJson.data?.length) {
        setHolidayListName(holidaysJson.data[0].name);
      }
    } catch (error) {
      setFlash({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to load leave and attendance workspace' });
    } finally {
      setLoading(false);
    }
  }

  async function refreshWorkspace() {
    setRefreshing(true);
    await loadWorkspace();
    setRefreshing(false);
  }

  async function loadHolidayDetail(name: string) {
    const res = await fetch(`/api/hr/holidays/${encodeURIComponent(name)}`);
    const json = await res.json();
    if (res.ok && json.success !== false) {
      setHolidayDetail(json.data || null);
    }
  }

  async function submitLeaveApplication() {
    setWorking('leave-create');
    try {
      const res = await fetch('/api/hr/leave/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveForm),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to create leave application');
      setLeaveForm(INITIAL_LEAVE_FORM);
      setFlash({ tone: 'success', message: 'Leave draft created.' });
      await refreshWorkspace();
    } catch (error) {
      setFlash({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to create leave application' });
    } finally {
      setWorking(null);
    }
  }

  async function createLeaveType() {
    setWorking('type-create');
    try {
      const res = await fetch('/api/hr/leave/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeForm),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to create leave type');
      setTypeForm(INITIAL_TYPE_FORM);
      setFlash({ tone: 'success', message: 'Leave type created.' });
      await refreshWorkspace();
    } catch (error) {
      setFlash({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to create leave type' });
    } finally {
      setWorking(null);
    }
  }

  async function createAllocation() {
    setWorking('allocation-create');
    try {
      const res = await fetch('/api/hr/leave/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allocationForm),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to create leave allocation');
      setAllocationForm(INITIAL_ALLOCATION_FORM);
      setFlash({ tone: 'success', message: 'Leave allocation created.' });
      await refreshWorkspace();
    } catch (error) {
      setFlash({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to create leave allocation' });
    } finally {
      setWorking(null);
    }
  }

  async function createRegularization() {
    setWorking('regularization-create');
    try {
      const payload = {
        ...regularizationForm,
        requested_check_in: regularizationForm.requested_check_in ? `${regularizationForm.regularization_date} ${regularizationForm.requested_check_in}:00` : '',
        requested_check_out: regularizationForm.requested_check_out ? `${regularizationForm.regularization_date} ${regularizationForm.requested_check_out}:00` : '',
      };
      const res = await fetch('/api/hr/regularizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to create regularization');
      setRegularizationForm(INITIAL_REGULARIZATION_FORM);
      setFlash({ tone: 'success', message: 'Regularization draft created.' });
      await refreshWorkspace();
    } catch (error) {
      setFlash({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to create regularization' });
    } finally {
      setWorking(null);
    }
  }

  async function runLeaveAction(id: string, action: 'submit' | 'approve' | 'reject' | 'reopen') {
    setWorking(`leave-${id}-${action}`);
    try {
      const reason = action === 'reject' ? window.prompt('Enter rejection reason')?.trim() : undefined;
      if (action === 'reject' && !reason) return;
      const res = await fetch(`/api/hr/leave/applications/${encodeURIComponent(id)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to run leave action');
      setFlash({ tone: 'success', message: json.message || 'Leave action completed.' });
      await refreshWorkspace();
    } catch (error) {
      setFlash({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to run leave action' });
    } finally {
      setWorking(null);
    }
  }

  async function runRegularizationAction(id: string, action: 'submit' | 'approve' | 'reject' | 'reopen') {
    setWorking(`regularization-${id}-${action}`);
    try {
      const reason = action === 'reject' ? window.prompt('Enter rejection reason')?.trim() : undefined;
      if (action === 'reject' && !reason) return;
      const res = await fetch(`/api/hr/regularizations/${encodeURIComponent(id)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to run regularization action');
      setFlash({ tone: 'success', message: json.message || 'Regularization action completed.' });
      await refreshWorkspace();
    } catch (error) {
      setFlash({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to run regularization action' });
    } finally {
      setWorking(null);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading leave and attendance workspace...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f7fbff_0%,#eef8f4_45%,#fff7ee_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#1e6b87]/15 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#1e6b87]">Phase 3 <span className="h-1 w-1 rounded-full bg-[#1e6b87]" /> Leave And Attendance</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Leave And Attendance Workspace</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">Leave requests, balances, holiday visibility, who-is-in, attendance muster, regularization, and device swipe readiness in one HR surface.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/hr" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">HR Dashboard</Link>
            <button onClick={() => void refreshWorkspace()} className="inline-flex items-center gap-2 rounded-xl bg-[#1e6b87] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#185a73]">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Refresh
            </button>
          </div>
        </div>
      </div>

      {flash ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${flash.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{flash.message}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SectionCard title="Present Today"><div className="flex items-center gap-2 text-2xl font-semibold text-slate-900"><CheckCircle2 className="h-5 w-5 text-emerald-600" />{overview?.attendanceStats.present || 0}</div></SectionCard>
        <SectionCard title="Absent Today"><div className="flex items-center gap-2 text-2xl font-semibold text-slate-900"><XCircle className="h-5 w-5 text-rose-600" />{overview?.attendanceStats.absent || 0}</div></SectionCard>
        <SectionCard title="On Leave"><div className="flex items-center gap-2 text-2xl font-semibold text-slate-900"><CalendarClock className="h-5 w-5 text-amber-600" />{overview?.whoIsIn.summary.on_leave || 0}</div></SectionCard>
        <SectionCard title="Unmarked"><div className="flex items-center gap-2 text-2xl font-semibold text-slate-900"><Clock3 className="h-5 w-5 text-slate-500" />{overview?.whoIsIn.summary.unmarked || 0}</div></SectionCard>
        <SectionCard title="Leave Types"><div className="flex items-center gap-2 text-2xl font-semibold text-slate-900"><ShieldCheck className="h-5 w-5 text-[#1e6b87]" />{leaveTypes.length}</div></SectionCard>
        <SectionCard title="Pending Regularization"><div className="flex items-center gap-2 text-2xl font-semibold text-slate-900"><FileSpreadsheet className="h-5 w-5 text-violet-600" />{regularizations.filter((item) => item.regularization_status === 'SUBMITTED').length}</div></SectionCard>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <nav className="flex gap-1">
          {TABS.map((item) => (
            <button key={item.key} onClick={() => setTab(item.key)} className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${tab === item.key ? 'bg-[#1e6b87] text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>{item.label}</button>
          ))}
        </nav>
      </div>

      {tab === 'overview' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_380px]">
          <SectionCard title="Who Is In" subtitle="Live occupancy by attendance state and approved leave status.">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Field label="Attendance Date"><Input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} /></Field>
              <button onClick={() => void refreshWorkspace()} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><RefreshCcw className="h-4 w-4" />Reload Date</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">Employee</th>
                    <th className="pb-3 pr-4 font-medium">Department</th>
                    <th className="pb-3 pr-4 font-medium">State</th>
                    <th className="pb-3 font-medium">Site</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(overview?.whoIsIn.rows || []).map((row) => (
                    <tr key={row.employee}>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-900">{row.employee_name}</div>
                        <div className="text-xs text-slate-500">{row.employee}</div>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{row.department || '-'}</td>
                      <td className="py-3 pr-4">{statusBadge(row.state)}</td>
                      <td className="py-3 text-slate-600">{row.linked_site || row.leave_type || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <div className="space-y-4">
            <SectionCard title="Swipe Ingestion" subtitle="Placeholder until biometric bridge or CSV feed is connected.">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Waves className="h-4 w-4 text-[#1e6b87]" /> {overview?.swipeInfo.status || 'PENDING_INTEGRATION'}</div>
                <div className="mt-3 text-sm text-slate-600">{overview?.swipeInfo.notes}</div>
                <div className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Supported sources</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(overview?.swipeInfo.supported_sources || []).map((source) => <span key={source} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">{source}</span>)}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Leave Balance Snapshot" subtitle={`Cycle ${formatDate(balances.cycle_start)} to ${formatDate(balances.cycle_end)}`}>
              <div className="space-y-3">
                {balances.rows.slice(0, 6).map((row) => (
                  <div key={`${row.employee}-${row.leave_type}`} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{row.leave_type_label}</div>
                        <div className="text-xs text-slate-500">{row.employee}</div>
                      </div>
                      <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: `${row.color || '#1e6b87'}22`, color: row.color || '#1e6b87' }}>{row.remaining} left</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-500">
                      <div><div className="font-semibold text-slate-900">{row.allocated}</div>Allocated</div>
                      <div><div className="font-semibold text-slate-900">{row.consumed}</div>Used</div>
                      <div><div className="font-semibold text-slate-900">{row.remaining}</div>Remaining</div>
                    </div>
                  </div>
                ))}
                {!balances.rows.length ? <div className="text-sm text-slate-500">No leave allocations found for the selected cycle.</div> : null}
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {tab === 'leaves' ? (
        <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <SectionCard title="Create Leave Request" subtitle="Draft, submit, approve, reject, and reopen leave applications.">
            <div className="grid gap-4">
              <Field label="Employee"><Select value={leaveForm.employee} onChange={(event) => setLeaveForm((current) => ({ ...current, employee: event.target.value }))}><option value="">Select employee</option>{employeeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></Field>
              <Field label="Leave Type"><Select value={leaveForm.leave_type} onChange={(event) => setLeaveForm((current) => ({ ...current, leave_type: event.target.value }))}><option value="">Select leave type</option>{leaveTypes.filter((item) => item.is_active).map((item) => <option key={item.name} value={item.name}>{item.leave_type_name}</option>)}</Select></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="From Date"><Input type="date" value={leaveForm.from_date} onChange={(event) => setLeaveForm((current) => ({ ...current, from_date: event.target.value }))} /></Field>
                <Field label="To Date"><Input type="date" value={leaveForm.to_date} onChange={(event) => setLeaveForm((current) => ({ ...current, to_date: event.target.value }))} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Total Days"><Input type="number" min="0.5" step="0.5" value={leaveForm.total_leave_days} onChange={(event) => setLeaveForm((current) => ({ ...current, total_leave_days: Number(event.target.value) }))} /></Field>
                <Field label="Contact During Leave"><Input value={leaveForm.contact_during_leave} onChange={(event) => setLeaveForm((current) => ({ ...current, contact_during_leave: event.target.value }))} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Linked Project"><Input value={leaveForm.linked_project} onChange={(event) => setLeaveForm((current) => ({ ...current, linked_project: event.target.value }))} /></Field>
                <Field label="Linked Site"><Input value={leaveForm.linked_site} onChange={(event) => setLeaveForm((current) => ({ ...current, linked_site: event.target.value }))} /></Field>
              </div>
              <Field label="Reason"><Textarea value={leaveForm.reason} onChange={(event) => setLeaveForm((current) => ({ ...current, reason: event.target.value }))} /></Field>
              <button onClick={() => void submitLeaveApplication()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e6b87] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#185a73] disabled:opacity-60" disabled={working === 'leave-create'}>{working === 'leave-create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create Draft</button>
            </div>
          </SectionCard>

          <SectionCard title="Leave Application Queue" subtitle="Approval-ready list with visible state and quick actions.">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">Employee</th>
                    <th className="pb-3 pr-4 font-medium">Leave Type</th>
                    <th className="pb-3 pr-4 font-medium">Dates</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Days</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaveApplications.map((item) => (
                    <tr key={item.name}>
                      <td className="py-3 pr-4"><div className="font-medium text-slate-900">{item.employee}</div><div className="text-xs text-slate-500">{item.reason || '-'}</div></td>
                      <td className="py-3 pr-4 text-slate-600">{leaveTypes.find((leaveType) => leaveType.name === item.leave_type)?.leave_type_name || item.leave_type}</td>
                      <td className="py-3 pr-4 text-slate-600">{formatDate(item.from_date)} to {formatDate(item.to_date)}</td>
                      <td className="py-3 pr-4">{statusBadge(item.leave_status)}</td>
                      <td className="py-3 pr-4 text-slate-600">{item.total_leave_days}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {item.leave_status === 'DRAFT' ? <button onClick={() => void runLeaveAction(item.name, 'submit')} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700">Submit</button> : null}
                          {item.leave_status === 'SUBMITTED' ? <button onClick={() => void runLeaveAction(item.name, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Approve</button> : null}
                          {item.leave_status === 'SUBMITTED' ? <button onClick={() => void runLeaveAction(item.name, 'reject')} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700">Reject</button> : null}
                          {(item.leave_status === 'SUBMITTED' || item.leave_status === 'REJECTED') ? <button onClick={() => void runLeaveAction(item.name, 'reopen')} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Back To Draft</button> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === 'setup' ? (
        <div className="grid gap-4 xl:grid-cols-[420px_420px_minmax(0,1fr)]">
          <SectionCard title="Leave Type Setup" subtitle="Create the categories used for allocations and leave requests.">
            <div className="grid gap-4">
              <Field label="Leave Type Name"><Input value={typeForm.leave_type_name} onChange={(event) => setTypeForm((current) => ({ ...current, leave_type_name: event.target.value }))} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Annual Allocation"><Input type="number" min="0" step="0.5" value={typeForm.annual_allocation} onChange={(event) => setTypeForm((current) => ({ ...current, annual_allocation: Number(event.target.value) }))} /></Field>
                <Field label="Color"><Input type="color" value={typeForm.color} onChange={(event) => setTypeForm((current) => ({ ...current, color: event.target.value }))} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={typeForm.is_paid_leave} onChange={(event) => setTypeForm((current) => ({ ...current, is_paid_leave: event.target.checked }))} /> Paid leave</label>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={typeForm.is_active} onChange={(event) => setTypeForm((current) => ({ ...current, is_active: event.target.checked }))} /> Active</label>
              <Field label="Description"><Textarea value={typeForm.description} onChange={(event) => setTypeForm((current) => ({ ...current, description: event.target.value }))} /></Field>
              <button onClick={() => void createLeaveType()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e6b87] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#185a73]">Create Leave Type</button>
            </div>
          </SectionCard>

          <SectionCard title="Leave Allocation" subtitle="Allocate leave to employees for the active cycle.">
            <div className="grid gap-4">
              <Field label="Employee"><Select value={allocationForm.employee} onChange={(event) => setAllocationForm((current) => ({ ...current, employee: event.target.value }))}><option value="">Select employee</option>{employeeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></Field>
              <Field label="Leave Type"><Select value={allocationForm.leave_type} onChange={(event) => setAllocationForm((current) => ({ ...current, leave_type: event.target.value }))}><option value="">Select leave type</option>{leaveTypes.map((item) => <option key={item.name} value={item.name}>{item.leave_type_name}</option>)}</Select></Field>
              <Field label="Allocation Days"><Input type="number" min="0" step="0.5" value={allocationForm.allocation_days} onChange={(event) => setAllocationForm((current) => ({ ...current, allocation_days: Number(event.target.value) }))} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="From Date"><Input type="date" value={allocationForm.from_date} onChange={(event) => setAllocationForm((current) => ({ ...current, from_date: event.target.value }))} /></Field>
                <Field label="To Date"><Input type="date" value={allocationForm.to_date} onChange={(event) => setAllocationForm((current) => ({ ...current, to_date: event.target.value }))} /></Field>
              </div>
              <Field label="Notes"><Textarea value={allocationForm.notes} onChange={(event) => setAllocationForm((current) => ({ ...current, notes: event.target.value }))} /></Field>
              <button onClick={() => void createAllocation()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e6b87] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#185a73]">Create Allocation</button>
            </div>
          </SectionCard>

          <div className="space-y-4">
            <SectionCard title="Leave Types" subtitle="Current leave categories.">
              <div className="space-y-3">
                {leaveTypes.map((item) => (
                  <div key={item.name} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{item.leave_type_name}</div>
                        <div className="text-xs text-slate-500">{item.description || 'No description'}</div>
                      </div>
                      <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: `${item.color || '#1e6b87'}22`, color: item.color || '#1e6b87' }}>{item.annual_allocation} days</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Allocations" subtitle="Employee allocations across the current cycle.">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="pb-3 pr-4 font-medium">Employee</th>
                      <th className="pb-3 pr-4 font-medium">Leave Type</th>
                      <th className="pb-3 pr-4 font-medium">Days</th>
                      <th className="pb-3 font-medium">Window</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allocations.map((item) => (
                      <tr key={item.name}>
                        <td className="py-3 pr-4 text-slate-900">{item.employee}</td>
                        <td className="py-3 pr-4 text-slate-600">{leaveTypes.find((leaveType) => leaveType.name === item.leave_type)?.leave_type_name || item.leave_type}</td>
                        <td className="py-3 pr-4 text-slate-600">{item.allocation_days}</td>
                        <td className="py-3 text-slate-600">{formatDate(item.from_date)} to {formatDate(item.to_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {tab === 'calendar' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <SectionCard title="Leave Calendar" subtitle="Approved leaves and holidays in one planning surface.">
            <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="From Date"><Input type="date" value={calendarStart} onChange={(event) => setCalendarStart(event.target.value)} /></Field>
              <Field label="To Date"><Input type="date" value={calendarEnd} onChange={(event) => setCalendarEnd(event.target.value)} /></Field>
              <button onClick={() => void refreshWorkspace()} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><RefreshCcw className="h-4 w-4" />Reload Range</button>
            </div>
            <div className="space-y-3">
              {[...calendarData.leaves, ...calendarData.holidays].sort((a, b) => a.start.localeCompare(b.start)).map((event) => (
                <div key={event.name} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{event.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatDate(event.start)} to {formatDate(event.end)}</div>
                    </div>
                    {statusBadge(event.kind === 'leave' ? 'APPROVED' : 'WEEK_OFF')}
                  </div>
                </div>
              ))}
              {!calendarData.leaves.length && !calendarData.holidays.length ? <div className="text-sm text-slate-500">No leave or holiday events found in the selected range.</div> : null}
            </div>
          </SectionCard>

          <div className="space-y-4">
            <SectionCard title="Holiday Lists" subtitle="Standard holiday lists reused for attendance planning.">
              <Field label="Holiday List"><Select value={holidayListName} onChange={(event) => setHolidayListName(event.target.value)}><option value="">Select holiday list</option>{holidayLists.map((item) => <option key={item.name} value={item.name}>{item.holiday_list_name || item.name}</option>)}</Select></Field>
              <div className="mt-4 space-y-3">
                {(holidayDetail?.holidays || []).slice(0, 12).map((holiday) => (
                  <div key={`${holiday.holiday_date}-${holiday.description || ''}`} className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-sm font-semibold text-slate-900">{holiday.description || holiday.weekly_off || 'Holiday'}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatDate(holiday.holiday_date)}</div>
                  </div>
                ))}
                {!holidayDetail?.holidays?.length ? <div className="text-sm text-slate-500">No holiday rows found for the selected list.</div> : null}
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {tab === 'muster' ? (
        <SectionCard title="Attendance Muster" subtitle="Daily roll-call sheet derived from attendance logs and approved leaves.">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Field label="Muster Date"><Input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} /></Field>
            <button onClick={() => void refreshWorkspace()} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><RefreshCcw className="h-4 w-4" />Reload Muster</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Employee</th>
                  <th className="pb-3 pr-4 font-medium">Department</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Site</th>
                  <th className="pb-3 font-medium">Project</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(overview?.muster.rows || []).map((row) => (
                  <tr key={row.employee}>
                    <td className="py-3 pr-4"><div className="font-medium text-slate-900">{row.employee_name}</div><div className="text-xs text-slate-500">{row.employee}</div></td>
                    <td className="py-3 pr-4 text-slate-600">{row.department || '-'}</td>
                    <td className="py-3 pr-4">{statusBadge(row.status)}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.linked_site || '-'}</td>
                    <td className="py-3 text-slate-600">{row.linked_project || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {tab === 'regularization' ? (
        <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <SectionCard title="Create Regularization Request" subtitle="Correction requests for missing or wrong attendance punches.">
            <div className="grid gap-4">
              <Field label="Employee"><Select value={regularizationForm.employee} onChange={(event) => setRegularizationForm((current) => ({ ...current, employee: event.target.value }))}><option value="">Select employee</option>{employeeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></Field>
              <Field label="Regularization Date"><Input type="date" value={regularizationForm.regularization_date} onChange={(event) => setRegularizationForm((current) => ({ ...current, regularization_date: event.target.value }))} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Requested Check In"><Input type="time" value={regularizationForm.requested_check_in} onChange={(event) => setRegularizationForm((current) => ({ ...current, requested_check_in: event.target.value }))} /></Field>
                <Field label="Requested Check Out"><Input type="time" value={regularizationForm.requested_check_out} onChange={(event) => setRegularizationForm((current) => ({ ...current, requested_check_out: event.target.value }))} /></Field>
              </div>
              <Field label="Requested Status"><Select value={regularizationForm.requested_status} onChange={(event) => setRegularizationForm((current) => ({ ...current, requested_status: event.target.value }))}><option value="PRESENT">Present</option><option value="ABSENT">Absent</option><option value="HALF_DAY">Half Day</option><option value="ON_DUTY">On Duty</option><option value="WEEK_OFF">Week Off</option></Select></Field>
              <Field label="Reason"><Textarea value={regularizationForm.reason} onChange={(event) => setRegularizationForm((current) => ({ ...current, reason: event.target.value }))} /></Field>
              <button onClick={() => void createRegularization()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e6b87] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#185a73]">Create Draft</button>
            </div>
          </SectionCard>

          <SectionCard title="Regularization Queue" subtitle="Approve corrections and write them back to attendance logs.">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">Employee</th>
                    <th className="pb-3 pr-4 font-medium">Date</th>
                    <th className="pb-3 pr-4 font-medium">Requested Status</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Reason</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {regularizations.map((item) => (
                    <tr key={item.name}>
                      <td className="py-3 pr-4 text-slate-900">{item.employee}</td>
                      <td className="py-3 pr-4 text-slate-600">{formatDate(item.regularization_date)}</td>
                      <td className="py-3 pr-4 text-slate-600">{item.requested_status || '-'}</td>
                      <td className="py-3 pr-4">{statusBadge(item.regularization_status)}</td>
                      <td className="py-3 pr-4 text-slate-600">{item.reason || '-'}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {item.regularization_status === 'DRAFT' ? <button onClick={() => void runRegularizationAction(item.name, 'submit')} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700">Submit</button> : null}
                          {item.regularization_status === 'SUBMITTED' ? <button onClick={() => void runRegularizationAction(item.name, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Approve</button> : null}
                          {item.regularization_status === 'SUBMITTED' ? <button onClick={() => void runRegularizationAction(item.name, 'reject')} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700">Reject</button> : null}
                          {(item.regularization_status === 'SUBMITTED' || item.regularization_status === 'REJECTED') ? <button onClick={() => void runRegularizationAction(item.name, 'reopen')} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Back To Draft</button> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
