'use client';
import { useEffect, useState } from 'react';
import {
  Briefcase,
  CalendarCheck2,
  Plane,
  Clock3,
  ShieldCheck,
  Wrench,
  Plus,
  X,
} from 'lucide-react';

type OnboardingRow = {
  name: string;
  employee_name?: string;
  company?: string;
  designation?: string;
  onboarding_status?: string;
  date_of_joining?: string;
};

type AttendanceRow = {
  name: string;
  employee?: string;
  attendance_date?: string;
  attendance_status?: string;
  linked_site?: string;
};

type TravelRow = {
  name: string;
  employee?: string;
  travel_date?: string;
  travel_status?: string;
  from_location?: string;
  to_location?: string;
  expense_amount?: number;
};

type OvertimeRow = {
  name: string;
  employee?: string;
  overtime_date?: string;
  overtime_hours?: number;
  overtime_status?: string;
};

type StatutoryRow = {
  name: string;
  employee?: string;
  ledger_type?: string;
  payment_status?: string;
  employee_contribution?: number;
  employer_contribution?: number;
};

type VisitRow = {
  name: string;
  employee?: string;
  visit_date?: string;
  visit_status?: string;
  linked_site?: string;
  customer_location?: string;
};

type DashboardData = {
  stats: {
    onboarding?: Record<string, number>;
    attendance?: Record<string, number>;
    travel?: Record<string, number>;
    overtime?: Record<string, number>;
    statutory?: Record<string, number>;
    visits?: Record<string, number>;
  };
  recent: {
    onboardings: OnboardingRow[];
    attendance: AttendanceRow[];
    travel: TravelRow[];
    overtime: OvertimeRow[];
    statutory: StatutoryRow[];
    visits: VisitRow[];
  };
};

function formatCurrency(value?: number) {
  if (!value) return 'Rs 0';
  return `Rs ${value.toLocaleString('en-IN')}`;
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: any;
  tone: 'blue' | 'green' | 'amber' | 'violet' | 'rose' | 'slate';
}) {
  const tones = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700',
    rose: 'bg-rose-100 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="stat-value">{value}</div>
          <div className="stat-label">{title}</div>
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-2">{hint}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

export default function HRPage() {
  const [data, setData] = useState<DashboardData>({
    stats: {},
    recent: {
      onboardings: [],
      attendance: [],
      travel: [],
      overtime: [],
      statutory: [],
      visits: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [showAttModal, setShowAttModal] = useState(false);
  const [attForm, setAttForm] = useState({ employee: '', attendance_date: '', attendance_status: 'Present', linked_site: '' });

  const [showTravelModal, setShowTravelModal] = useState(false);
  const [travelForm, setTravelForm] = useState({ employee: '', travel_date: '', from_location: '', to_location: '', expense_amount: '' });

  const [showOtModal, setShowOtModal] = useState(false);
  const [otForm, setOtForm] = useState({ employee: '', overtime_date: '', overtime_hours: '' });

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setLoading(true);
    fetch('/api/hr/dashboard', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || 'Failed to load HR dashboard');
        }
        setData(payload.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load HR dashboard'))
      .finally(() => setLoading(false));
  }

  async function handleCreate(method: string, args: Record<string, unknown>, close: () => void) {
    setBusy(true);
    try {
      const res = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, args }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Create failed');
      close();
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  function handleCreateAttendance() {
    handleCreate('create_attendance_log', attForm, () => {
      setShowAttModal(false);
      setAttForm({ employee: '', attendance_date: '', attendance_status: 'Present', linked_site: '' });
    });
  }

  function handleCreateTravel() {
    handleCreate('create_travel_log', { ...travelForm, expense_amount: Number(travelForm.expense_amount) || 0 }, () => {
      setShowTravelModal(false);
      setTravelForm({ employee: '', travel_date: '', from_location: '', to_location: '', expense_amount: '' });
    });
  }

  function handleCreateOvertime() {
    handleCreate('create_overtime_entry', { ...otForm, overtime_hours: Number(otForm.overtime_hours) || 0 }, () => {
      setShowOtModal(false);
      setOtForm({ employee: '', overtime_date: '', overtime_hours: '' });
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body py-10 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">HR</h1>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const onboardingStats = data.stats.onboarding || {};
  const attendanceStats = data.stats.attendance || {};
  const travelStats = data.stats.travel || {};
  const overtimeStats = data.stats.overtime || {};
  const statutoryStats = data.stats.statutory || {};
  const visitStats = data.stats.visits || {};

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">HR Operations</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Employee onboarding, attendance, movement, overtime, statutory ledgers, and field visit tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard
          title="Onboardings"
          value={onboardingStats.total ?? 0}
          hint={`${onboardingStats.approved ?? 0} approved • ${onboardingStats.mapped_to_employee ?? 0} mapped`}
          icon={Briefcase}
          tone="blue"
        />
        <StatCard
          title="Attendance"
          value={attendanceStats.total ?? 0}
          hint={`${attendanceStats.present ?? 0} present • ${attendanceStats.absent ?? 0} absent`}
          icon={CalendarCheck2}
          tone="green"
        />
        <StatCard
          title="Travel Logs"
          value={travelStats.total ?? 0}
          hint={`${travelStats.approved ?? 0} approved • ${formatCurrency(travelStats.total_expense_amount)}`}
          icon={Plane}
          tone="amber"
        />
        <StatCard
          title="Overtime"
          value={overtimeStats.total ?? 0}
          hint={`${overtimeStats.approved ?? 0} approved • ${overtimeStats.total_hours ?? 0} hours`}
          icon={Clock3}
          tone="violet"
        />
        <StatCard
          title="Statutory"
          value={statutoryStats.total ?? 0}
          hint={`${statutoryStats.paid ?? 0} paid • ${statutoryStats.pending ?? 0} pending`}
          icon={ShieldCheck}
          tone="rose"
        />
        <StatCard
          title="Technician Visits"
          value={visitStats.total ?? 0}
          hint={`${visitStats.completed ?? 0} completed • ${visitStats.in_progress ?? 0} in progress`}
          icon={Wrench}
          tone="slate"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <Section title="Recent Onboardings" subtitle="Latest employee intake and review status">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Designation</th>
                  <th>Joining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.onboardings.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-gray-500">No onboarding records</td></tr>
                ) : data.recent.onboardings.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <div className="font-medium text-gray-900">{row.employee_name || row.name}</div>
                      <div className="text-xs text-gray-500">{row.company || '-'}</div>
                    </td>
                    <td>{row.designation || '-'}</td>
                    <td>{row.date_of_joining || '-'}</td>
                    <td><span className="badge badge-gray">{row.onboarding_status || '-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Recent Attendance" subtitle="Field and office attendance activity"
          action={<button className="btn-primary text-xs flex items-center gap-1" onClick={() => setShowAttModal(true)}><Plus className="w-3 h-3" /> Add</button>}
        >
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Site</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.attendance.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-gray-500">No attendance logs</td></tr>
                ) : data.recent.attendance.map((row) => (
                  <tr key={row.name}>
                    <td>{row.employee || '-'}</td>
                    <td>{row.attendance_date || '-'}</td>
                    <td>{row.linked_site || '-'}</td>
                    <td><span className="badge badge-gray">{row.attendance_status || '-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Travel and Overtime" subtitle="Recent movement approvals and extra hours"
          action={
            <div className="flex gap-2">
              <button className="btn-primary text-xs flex items-center gap-1" onClick={() => setShowTravelModal(true)}><Plus className="w-3 h-3" /> Travel</button>
              <button className="btn-primary text-xs flex items-center gap-1" onClick={() => setShowOtModal(true)}><Plus className="w-3 h-3" /> Overtime</button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Travel Logs</h4>
              <div className="space-y-2">
                {data.recent.travel.length === 0 ? (
                  <p className="text-sm text-gray-500">No travel logs</p>
                ) : data.recent.travel.map((row) => (
                  <div key={row.name} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{row.employee || row.name}</div>
                      <div className="text-xs text-gray-500">{row.from_location || '-'} to {row.to_location || '-'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-900">{formatCurrency(row.expense_amount)}</div>
                      <div className="text-xs text-gray-500">{row.travel_status || '-'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Overtime Entries</h4>
              <div className="space-y-2">
                {data.recent.overtime.length === 0 ? (
                  <p className="text-sm text-gray-500">No overtime entries</p>
                ) : data.recent.overtime.map((row) => (
                  <div key={row.name} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{row.employee || row.name}</div>
                      <div className="text-xs text-gray-500">{row.overtime_date || '-'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-900">{row.overtime_hours ?? 0} hrs</div>
                      <div className="text-xs text-gray-500">{row.overtime_status || '-'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Compliance and Field Visits" subtitle="PF/ESIC bookkeeping and technician movement">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Statutory Ledger</h4>
              <div className="space-y-2">
                {data.recent.statutory.length === 0 ? (
                  <p className="text-sm text-gray-500">No statutory entries</p>
                ) : data.recent.statutory.map((row) => (
                  <div key={row.name} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{row.employee || row.name}</div>
                      <div className="text-xs text-gray-500">{row.ledger_type || '-'} ledger</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-900">
                        {formatCurrency((row.employee_contribution || 0) + (row.employer_contribution || 0))}
                      </div>
                      <div className="text-xs text-gray-500">{row.payment_status || '-'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Technician Visits</h4>
              <div className="space-y-2">
                {data.recent.visits.length === 0 ? (
                  <p className="text-sm text-gray-500">No technician visits</p>
                ) : data.recent.visits.map((row) => (
                  <div key={row.name} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{row.employee || row.name}</div>
                      <div className="text-xs text-gray-500">{row.linked_site || row.customer_location || '-'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-900">{row.visit_date || '-'}</div>
                      <div className="text-xs text-gray-500">{row.visit_status || '-'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Attendance Modal */}
      {showAttModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Log Attendance</h3>
              <button onClick={() => setShowAttModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                <input className="input w-full" value={attForm.employee} onChange={e => setAttForm({ ...attForm, employee: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" className="input w-full" value={attForm.attendance_date} onChange={e => setAttForm({ ...attForm, attendance_date: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select className="input w-full" value={attForm.attendance_status} onChange={e => setAttForm({ ...attForm, attendance_status: e.target.value })}>
                  <option value="Present">Present</option><option value="Absent">Absent</option><option value="Half Day">Half Day</option><option value="On Leave">On Leave</option>
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Linked Site</label>
                <input className="input w-full" value={attForm.linked_site} onChange={e => setAttForm({ ...attForm, linked_site: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t">
              <button className="btn-secondary" onClick={() => setShowAttModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={busy || !attForm.employee || !attForm.attendance_date} onClick={handleCreateAttendance}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Travel Modal */}
      {showTravelModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Log Travel</h3>
              <button onClick={() => setShowTravelModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                <input className="input w-full" value={travelForm.employee} onChange={e => setTravelForm({ ...travelForm, employee: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Travel Date *</label>
                <input type="date" className="input w-full" value={travelForm.travel_date} onChange={e => setTravelForm({ ...travelForm, travel_date: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                  <input className="input w-full" value={travelForm.from_location} onChange={e => setTravelForm({ ...travelForm, from_location: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                  <input className="input w-full" value={travelForm.to_location} onChange={e => setTravelForm({ ...travelForm, to_location: e.target.value })} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Expense Amount</label>
                <input type="number" className="input w-full" value={travelForm.expense_amount} onChange={e => setTravelForm({ ...travelForm, expense_amount: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t">
              <button className="btn-secondary" onClick={() => setShowTravelModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={busy || !travelForm.employee || !travelForm.travel_date} onClick={handleCreateTravel}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Overtime Modal */}
      {showOtModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Log Overtime</h3>
              <button onClick={() => setShowOtModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                <input className="input w-full" value={otForm.employee} onChange={e => setOtForm({ ...otForm, employee: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" className="input w-full" value={otForm.overtime_date} onChange={e => setOtForm({ ...otForm, overtime_date: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Hours *</label>
                <input type="number" step="0.5" className="input w-full" value={otForm.overtime_hours} onChange={e => setOtForm({ ...otForm, overtime_hours: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t">
              <button className="btn-secondary" onClick={() => setShowOtModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={busy || !otForm.employee || !otForm.overtime_date || !otForm.overtime_hours} onClick={handleCreateOvertime}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
