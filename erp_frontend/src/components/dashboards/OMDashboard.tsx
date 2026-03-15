'use client';

import { AlertTriangle, CheckCircle, RefreshCw, Ticket, Timer, Wrench } from 'lucide-react';
import { DashboardShell, MetricList, SectionCard, StatCard, formatMinutes, formatPercent, useApiData } from './shared';

type OMDashboardData = {
	tickets: {
		total: number;
		new: number;
		assigned: number;
		in_progress: number;
		on_hold: number;
		resolved: number;
		closed: number;
		critical: number;
		high: number;
		rma_count: number;
	};
	sla: {
		total: number;
		at_risk: number;
		response_compliance_pct: number;
		resolution_compliance_pct: number;
		avg_resolution_minutes: number;
	};
	rma: {
		total: number;
		pending: number;
		approved: number;
		in_transit: number;
		under_repair: number;
		repaired: number;
		replaced: number;
		rejected: number;
		awaiting_approval: number;
	};
};

const initialData: OMDashboardData = {
	tickets: { total: 0, new: 0, assigned: 0, in_progress: 0, on_hold: 0, resolved: 0, closed: 0, critical: 0, high: 0, rma_count: 0 },
	sla: { total: 0, at_risk: 0, response_compliance_pct: 0, resolution_compliance_pct: 0, avg_resolution_minutes: 0 },
	rma: { total: 0, pending: 0, approved: 0, in_transit: 0, under_repair: 0, repaired: 0, replaced: 0, rejected: 0, awaiting_approval: 0 },
};

export default function OMDashboard() {
	const { data, loading, error, lastUpdated, refresh } = useApiData<OMDashboardData>('/api/dashboards/om', initialData);

	return (
		<DashboardShell
			title="O&M Dashboard"
			subtitle="Ticket management, SLA tracking, and RMA execution from live backend aggregates"
			loading={loading}
			error={error}
			lastUpdated={lastUpdated}
			onRetry={() => void refresh()}
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
				<StatCard title="Open Tickets" value={data.tickets.total} hint={`${data.tickets.critical} critical, ${data.tickets.high} high priority`} icon={Ticket} tone="blue" />
				<StatCard title="New Queue" value={data.tickets.new} hint={`${data.tickets.assigned} assigned for action`} icon={Wrench} tone="amber" />
				<StatCard title="In Progress" value={data.tickets.in_progress} hint={`${data.tickets.on_hold} currently on hold`} icon={Timer} tone="purple" />
				<StatCard title="SLA At Risk" value={data.sla.at_risk} hint={`${data.sla.total} active SLA timers tracked`} icon={AlertTriangle} tone="red" />
				<StatCard title="Resolution SLA" value={formatPercent(data.sla.resolution_compliance_pct)} hint={`Response SLA ${formatPercent(data.sla.response_compliance_pct)}`} icon={CheckCircle} tone="green" />
				<StatCard title="RMA Pipeline" value={data.rma.total} hint={`${data.rma.awaiting_approval} waiting for approval`} icon={RefreshCw} tone="orange" />
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
				<SectionCard title="Ticket Flow" subtitle="Current helpdesk workload by status">
					<MetricList
						items={[
							{ label: 'New', value: data.tickets.new, tone: 'warning' },
							{ label: 'Assigned', value: data.tickets.assigned, tone: 'info' },
							{ label: 'In Progress', value: data.tickets.in_progress, tone: 'info' },
							{ label: 'On Hold', value: data.tickets.on_hold, tone: 'warning' },
							{ label: 'Resolved', value: data.tickets.resolved, tone: 'positive' },
							{ label: 'Closed', value: data.tickets.closed, tone: 'positive' },
						]}
					/>
				</SectionCard>

				<SectionCard title="SLA Health" subtitle="Current compliance and turnaround performance">
					<MetricList
						items={[
							{ label: 'Timers Running', value: data.sla.total },
							{ label: 'At Risk', value: data.sla.at_risk, tone: data.sla.at_risk > 0 ? 'negative' : 'positive' },
							{ label: 'Response Compliance', value: formatPercent(data.sla.response_compliance_pct), tone: 'positive' },
							{ label: 'Resolution Compliance', value: formatPercent(data.sla.resolution_compliance_pct), tone: 'positive' },
							{ label: 'Average Resolution', value: formatMinutes(data.sla.avg_resolution_minutes) },
						]}
					/>
				</SectionCard>

				<SectionCard title="RMA Tracker" subtitle="Field-to-service-center asset recovery status">
					<MetricList
						items={[
							{ label: 'Pending', value: data.rma.pending, tone: 'warning' },
							{ label: 'Approved', value: data.rma.approved, tone: 'info' },
							{ label: 'In Transit', value: data.rma.in_transit, tone: 'info' },
							{ label: 'Under Repair', value: data.rma.under_repair, tone: 'warning' },
							{ label: 'Repaired', value: data.rma.repaired, tone: 'positive' },
							{ label: 'Replaced', value: data.rma.replaced, tone: 'positive' },
							{ label: 'Rejected', value: data.rma.rejected, tone: 'negative' },
						]}
					/>
				</SectionCard>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<SectionCard title="Escalation Watch" subtitle="Immediate intervention points from live counts">
					<MetricList
						items={[
							{ label: 'Critical Tickets', value: data.tickets.critical, tone: data.tickets.critical > 0 ? 'negative' : 'positive' },
							{ label: 'High Priority Tickets', value: data.tickets.high, tone: data.tickets.high > 0 ? 'warning' : 'positive' },
							{ label: 'Tickets Flagged for RMA', value: data.tickets.rma_count, tone: 'info' },
							{ label: 'RMA Awaiting Approval', value: data.rma.awaiting_approval, tone: data.rma.awaiting_approval > 0 ? 'warning' : 'positive' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Closure Readiness" subtitle="Resolved work versus items still exposed to breach">
					<MetricList
						items={[
							{ label: 'Resolved Tickets', value: data.tickets.resolved, tone: 'positive' },
							{ label: 'Closed Tickets', value: data.tickets.closed, tone: 'positive' },
							{ label: 'Rejected RMAs', value: data.rma.rejected, tone: 'negative' },
							{ label: 'Avg Resolution Time', value: formatMinutes(data.sla.avg_resolution_minutes) },
						]}
					/>
				</SectionCard>
			</div>
		</DashboardShell>
	);
}
