'use client';

import { useEffect, useState } from 'react';
import {
  Briefcase,
  CalendarCheck2,
  Plane,
  Clock3,
  ShieldCheck,
  Wrench,
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

const initialData: DashboardData = {
  stats: {},
  recent: {
    onboardings: [],
    attendance: [],
    travel: [],
    overtime: [],
    statutory: [],
    visits: [],
  },
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
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="stat-value">{value}</div>
          <div className="stat-label">{title}</div>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500">{hint}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

export default function HRDashboard() {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body py-10 text-center">
          <h1 className="mb-2 text-xl font-semibold text-gray-900">HR Dashboard</h1>
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
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">HR Manager Dashboard</h1>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          Daily people operations snapshot for onboarding, attendance, movement approvals, compliance, and technician coordination.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        <StatCard
          title="Onboardings"
          value={onboardingStats.total ?? 0}
          hint={`${onboardingStats.approved ?? 0} approved | ${onboardingStats.mapped_to_employee ?? 0} mapped`}
          icon={Briefcase}
          tone="blue"
        />
        <StatCard
          title="Attendance"
          value={attendanceStats.total ?? 0}
          hint={`${attendanceStats.present ?? 0} present | ${attendanceStats.absent ?? 0} absent`}
          icon={CalendarCheck2}
          tone="green"
        />
        <StatCard
          title="Travel Logs"
          value={travelStats.total ?? 0}
          hint={`${travelStats.approved ?? 0} approved | ${formatCurrency(travelStats.total_expense_amount)}`}
          icon={Plane}
          tone="amber"
        />
        <StatCard
          title="Overtime"
          value={overtimeStats.total ?? 0}
          hint={`${overtimeStats.approved ?? 0} approved | ${overtimeStats.total_hours ?? 0} hours`}
          icon={Clock3}
          tone="violet"
        />
        <StatCard
          title="Statutory"
          value={statutoryStats.total ?? 0}
          hint={`${statutoryStats.paid ?? 0} paid | ${statutoryStats.pending ?? 0} pending`}
          icon={ShieldCheck}
          tone="rose"
        />
        <StatCard
          title="Technician Visits"
          value={visitStats.total ?? 0}
          hint={`${visitStats.completed ?? 0} completed | ${visitStats.in_progress ?? 0} in progress`}
          icon={Wrench}
          tone="slate"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
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
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">No onboarding records</td>
                  </tr>
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

        <Section title="Recent Attendance" subtitle="Field and office attendance activity">
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
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">No attendance logs</td>
                  </tr>
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

        <Section title="Travel and Overtime" subtitle="Recent movement approvals and extra hours">
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Travel Logs</h4>
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
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Overtime Entries</h4>
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
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Statutory Ledger</h4>
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
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Technician Visits</h4>
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
    </div>
  );
}
