'use client';

import { AlertTriangle, BriefcaseBusiness, Building2, IndianRupee, ListTodo, ShieldCheck } from 'lucide-react';
import { DashboardShell, EmptyState, MetricList, SectionCard, StatCard, formatCurrency, formatPercent, formatDateTime, useApiData } from './shared';

type DirectorDashboardData = {
	projects: {
		total: number;
		active_sites: number;
	};
	budget: {
		allocations: number;
		sanctioned_total: number;
		revised_total: number;
		spent_total: number;
		avg_utilization_pct: number;
	};
	sla: {
		total: number;
		at_risk: number;
		response_compliance_pct: number;
		resolution_compliance_pct: number;
		avg_resolution_minutes: number;
	};
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
	pending_approvals: {
		count: number;
		items: Array<{
			id: string;
			tender_id?: string;
			approval_for: string;
			approval_from?: string;
			requester?: string;
			request_date?: string;
			status?: string;
			type?: string;
		}>;
	};
	persona?: {
		role?: string;
		view?: string;
		title?: string;
	};
};

const initialData: DirectorDashboardData = {
	projects: { total: 0, active_sites: 0 },
	budget: { allocations: 0, sanctioned_total: 0, revised_total: 0, spent_total: 0, avg_utilization_pct: 0 },
	sla: { total: 0, at_risk: 0, response_compliance_pct: 0, resolution_compliance_pct: 0, avg_resolution_minutes: 0 },
	tickets: { total: 0, new: 0, assigned: 0, in_progress: 0, on_hold: 0, resolved: 0, closed: 0, critical: 0, high: 0, rma_count: 0 },
	pending_approvals: { count: 0, items: [] },
	persona: { role: 'Director', view: 'director', title: 'Director Command Center' },
};

export default function DirectorDashboard() {
	const { data, loading, error, lastUpdated, refresh } = useApiData<DirectorDashboardData>('/api/dashboards/director', initialData);
	const budgetHeadroom = Math.max(data.budget.revised_total - data.budget.spent_total, 0);
	const attentionIndex = data.pending_approvals.count + data.tickets.critical + data.sla.at_risk;
	const topApprovals = data.pending_approvals.items.slice(0, 8);

	return (
		<DashboardShell
			title={data.persona?.title || 'Director Command Center'}
			subtitle="Personalized strategic view for Director: approvals requiring escalation, portfolio risk, budget envelope, and service pressure in one place"
			loading={loading}
			error={error}
			lastUpdated={lastUpdated}
			onRetry={() => void refresh()}
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
				<StatCard title="Portfolio Projects" value={data.projects.total} hint={`${data.projects.active_sites} active sites`} icon={Building2} tone="blue" />
				<StatCard title="Strategic Attention" value={attentionIndex} hint="Pending approvals + critical tickets + SLA risk" icon={AlertTriangle} tone={attentionIndex > 0 ? 'red' : 'green'} />
				<StatCard title="Budget Headroom" value={formatCurrency(budgetHeadroom)} hint={`${formatPercent(data.budget.avg_utilization_pct)} average utilization`} icon={IndianRupee} tone={budgetHeadroom > 0 ? 'green' : 'orange'} />
				<StatCard title="Spend Visibility" value={formatCurrency(data.budget.spent_total)} hint={`${data.budget.allocations} allocation tracks`} icon={BriefcaseBusiness} tone="orange" />
				<StatCard title="Service Critical" value={data.tickets.critical} hint={`${data.tickets.high} high-priority tickets`} icon={ShieldCheck} tone={data.tickets.critical > 0 ? 'purple' : 'teal'} />
				<StatCard title="Approval Queue" value={data.pending_approvals.count} hint="Leadership actions in queue" icon={ListTodo} tone={data.pending_approvals.count > 0 ? 'amber' : 'teal'} />
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
				<SectionCard title="Director Snapshot" subtitle="Single-page pulse for leadership decisions">
					<MetricList
						items={[
							{ label: 'Projects in Portfolio', value: data.projects.total },
							{ label: 'Active Sites', value: data.projects.active_sites, tone: 'info' },
							{ label: 'Pending Approvals', value: data.pending_approvals.count, tone: data.pending_approvals.count > 0 ? 'warning' : 'positive' },
							{ label: 'Critical Tickets', value: data.tickets.critical, tone: data.tickets.critical > 0 ? 'negative' : 'positive' },
							{ label: 'At-Risk SLAs', value: data.sla.at_risk, tone: data.sla.at_risk > 0 ? 'negative' : 'positive' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Budget Control" subtitle="Envelope status and financial control markers">
					<MetricList
						items={[
							{ label: 'Sanctioned Total', value: formatCurrency(data.budget.sanctioned_total) },
							{ label: 'Revised Total', value: formatCurrency(data.budget.revised_total) },
							{ label: 'Spent Total', value: formatCurrency(data.budget.spent_total), tone: 'warning' },
							{ label: 'Headroom Available', value: formatCurrency(budgetHeadroom), tone: budgetHeadroom > 0 ? 'positive' : 'negative' },
							{ label: 'Avg Utilization', value: formatPercent(data.budget.avg_utilization_pct), tone: data.budget.avg_utilization_pct <= 85 ? 'positive' : 'warning' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Service Pressure" subtitle="Ticket flow and SLA reliability exposure">
					<MetricList
						items={[
							{ label: 'Total Tickets', value: data.tickets.total },
							{ label: 'New Tickets', value: data.tickets.new, tone: 'warning' },
							{ label: 'In Progress', value: data.tickets.in_progress, tone: 'info' },
							{ label: 'SLA At Risk', value: data.sla.at_risk, tone: data.sla.at_risk > 0 ? 'negative' : 'positive' },
							{ label: 'Resolution Compliance', value: formatPercent(data.sla.resolution_compliance_pct), tone: 'positive' },
						]}
					/>
				</SectionCard>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
				<SectionCard title="Director Approval Inbox" subtitle="Recent approvals requiring your attention">
					{topApprovals.length ? (
						<div className="space-y-3">
							{topApprovals.map((item) => (
								<div key={item.id} className="rounded-lg bg-gray-50 px-4 py-3">
									<div className="flex items-start justify-between gap-4">
										<div>
											<div className="text-sm font-semibold text-gray-900">{item.approval_for}</div>
											<div className="mt-1 text-xs text-gray-500">
												{item.type || 'General'}
												{item.tender_id ? ` • ${item.tender_id}` : ''}
												{item.requester ? ` • ${item.requester}` : ''}
											</div>
										</div>
										<div className="text-right text-xs text-gray-500">
											<div>{item.approval_from || 'Approver not specified'}</div>
											<div className="mt-1">{formatDateTime(item.request_date)}</div>
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<EmptyState message="No approvals are pending for Director action right now." />
					)}
				</SectionCard>

				<SectionCard title="Escalation Focus" subtitle="Fast triage checklist for this shift">
					<MetricList
						items={[
							{ label: 'Approval Queue', value: data.pending_approvals.count, tone: data.pending_approvals.count > 0 ? 'warning' : 'positive' },
							{ label: 'Critical Tickets', value: data.tickets.critical, tone: data.tickets.critical > 0 ? 'negative' : 'positive' },
							{ label: 'High Tickets', value: data.tickets.high, tone: data.tickets.high > 0 ? 'warning' : 'positive' },
							{ label: 'SLA At Risk', value: data.sla.at_risk, tone: data.sla.at_risk > 0 ? 'negative' : 'positive' },
							{ label: 'Budget Headroom', value: formatCurrency(budgetHeadroom), tone: budgetHeadroom > 0 ? 'positive' : 'negative' },
						]}
					/>
				</SectionCard>
			</div>
		</DashboardShell>
	);
}
