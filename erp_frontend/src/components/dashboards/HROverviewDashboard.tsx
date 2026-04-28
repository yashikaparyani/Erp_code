'use client';

import { AlertTriangle, ArrowRight, Briefcase, CalendarCheck2, Plane, ShieldCheck, Wrench } from 'lucide-react';
import { DashboardShell, MetricList, SectionCard, StatCard, formatCurrency, useApiData } from './shared';

type DashboardData = {
  stats: {
    onboarding?: Record<string, number>;
    attendance?: Record<string, number>;
    travel?: Record<string, number>;
    statutory?: Record<string, number>;
    visits?: Record<string, number>;
  };
  recent: {
    onboardings: Array<{ name: string; employee_name?: string; onboarding_status?: string }>;
    attendance: Array<{ name: string; employee?: string; attendance_status?: string; linked_site?: string }>;
    travel: Array<{ name: string; employee?: string; travel_status?: string; expense_amount?: number }>;
    statutory: Array<{ name: string; employee?: string; payment_status?: string; ledger_type?: string }>;
    visits: Array<{ name: string; employee?: string; visit_status?: string; linked_site?: string; customer_location?: string }>;
  };
};

const initialData: DashboardData = {
  stats: {},
  recent: {
    onboardings: [],
    attendance: [],
    travel: [],
    statutory: [],
    visits: [],
  },
};

function getPendingCount(bucket?: Record<string, number>) {
  return Number(bucket?.pending || 0) + Number(bucket?.draft || 0);
}

export default function HROverviewDashboard() {
  const { data, loading, error, lastUpdated, refresh } = useApiData<DashboardData>('/api/hr/dashboard', initialData);

  const onboarding = data.stats.onboarding || {};
  const attendance = data.stats.attendance || {};
  const travel = data.stats.travel || {};
  const statutory = data.stats.statutory || {};
  const visits = data.stats.visits || {};

  const pendingApprovals = getPendingCount(onboarding) + getPendingCount(travel);
  const complianceRisk = Number(statutory.pending || 0);
  const fieldAttention = Number(visits.in_progress || 0) + Number(visits.scheduled || 0);

  return (
    <DashboardShell
      title="HR Overview"
      subtitle="A compact priority board for today's HR follow-ups and people operations health."
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      onRetry={() => void refresh()}
    >
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr,1fr]">
        <div className="rounded-2xl bg-gradient-to-br from-[#114b5f] via-[#1e6b87] to-[#3b879f] p-6 text-white shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-white/75">Today Focus</p>
              <h2 className="mt-2 text-2xl font-semibold">Keep approvals moving and compliance clean.</h2>
              <p className="mt-3 max-w-2xl text-sm text-white/80">
                Use the HR tab for full operational detail. This home view is optimized for quick scanning and decision-making.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <AlertTriangle className="h-7 w-7" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/70">Pending approvals</div>
              <div className="mt-2 text-3xl font-semibold">{pendingApprovals}</div>
              <div className="mt-1 text-sm text-white/75">Onboarding and travel</div>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/70">Compliance risk</div>
              <div className="mt-2 text-3xl font-semibold">{complianceRisk}</div>
              <div className="mt-1 text-sm text-white/75">Statutory pending items</div>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/70">Field attention</div>
              <div className="mt-2 text-3xl font-semibold">{fieldAttention}</div>
              <div className="mt-1 text-sm text-white/75">Visits in progress or scheduled</div>
            </div>
          </div>
        </div>

        <SectionCard title="Quick Signals" subtitle="Fast takeaways before you open detailed HR operations">
          <MetricList
            items={[
              { label: 'Present employees', value: attendance.present ?? 0, tone: 'positive' },
              { label: 'Absent employees', value: attendance.absent ?? 0, tone: attendance.absent ? 'negative' : 'default' },
              { label: 'Approved travel spend', value: formatCurrency(travel.total_expense_amount), tone: 'info' },
              { label: 'Employees mapped after onboarding', value: onboarding.mapped_to_employee ?? 0, tone: 'positive' },
            ]}
          />
        </SectionCard>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Onboarding Queue"
          value={onboarding.total ?? 0}
          hint={`${onboarding.pending ?? 0} pending review`}
          icon={Briefcase}
          tone="blue"
        />
        <StatCard
          title="Attendance Pulse"
          value={attendance.total ?? 0}
          hint={`${attendance.present ?? 0} present and ${attendance.absent ?? 0} absent`}
          icon={CalendarCheck2}
          tone="green"
        />
        <StatCard
          title="Travel Desk"
          value={travel.total ?? 0}
          hint={`${travel.approved ?? 0} approved entries`}
          icon={Plane}
          tone="amber"
        />
        <StatCard
          title="Compliance Ledger"
          value={statutory.total ?? 0}
          hint={`${statutory.pending ?? 0} payment items pending`}
          icon={ShieldCheck}
          tone="red"
        />
        <StatCard
          title="Technician Movement"
          value={visits.total ?? 0}
          hint={`${visits.completed ?? 0} completed visits`}
          icon={Wrench}
          tone="teal"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard title="Action Queue" subtitle="What usually deserves first attention">
          <MetricList
            items={[
              { label: 'Onboarding approvals pending', value: onboarding.pending ?? 0, tone: (onboarding.pending ?? 0) > 0 ? 'warning' : 'positive' },
              { label: 'Travel approvals pending', value: travel.pending ?? 0, tone: (travel.pending ?? 0) > 0 ? 'warning' : 'positive' },
              { label: 'Statutory payments pending', value: statutory.pending ?? 0, tone: (statutory.pending ?? 0) > 0 ? 'negative' : 'positive' },
            ]}
          />
        </SectionCard>

        <SectionCard title="Recent Movement" subtitle="Latest employee movement and field activity">
          <MetricList
            items={[
              {
                label: data.recent.travel[0]?.employee || 'Latest travel log',
                value: data.recent.travel[0]?.travel_status || 'No travel logs',
                tone: 'info',
              },
              {
                label: data.recent.visits[0]?.employee || 'Latest technician visit',
                value: data.recent.visits[0]?.visit_status || 'No visit logs',
                tone: 'default',
              },
            ]}
          />
        </SectionCard>

        <SectionCard title="Next Step" subtitle="Use the detailed HR workspace for record-level action">
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-900">Open HR Operations tab</div>
            <p className="mt-2 text-sm text-gray-600">
              There you can review full tables for onboarding, attendance, travel, statutory ledgers, and technician visits.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#1e6b87]">
              Detailed workspace
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
