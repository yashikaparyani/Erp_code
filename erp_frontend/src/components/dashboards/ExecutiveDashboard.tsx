'use client';

import { AlertTriangle, BriefcaseBusiness, Building2, IndianRupee, ListTodo, ShieldCheck } from 'lucide-react';
import { DashboardShell, EmptyState, MetricList, SectionCard, StatCard, formatCurrency, formatPercent, formatDateTime, useApiData } from './shared';

type ExecutiveDashboardData = {
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
};

const initialData: ExecutiveDashboardData = {
	projects: { total: 0, active_sites: 0 },
	budget: { allocations: 0, sanctioned_total: 0, revised_total: 0, spent_total: 0, avg_utilization_pct: 0 },
	sla: { total: 0, at_risk: 0, response_compliance_pct: 0, resolution_compliance_pct: 0, avg_resolution_minutes: 0 },
	tickets: { total: 0, new: 0, assigned: 0, in_progress: 0, on_hold: 0, resolved: 0, closed: 0, critical: 0, high: 0, rma_count: 0 },
	pending_approvals: { count: 0, items: [] },
};

export default function ExecutiveDashboard() {
	const { data, loading, error, lastUpdated, refresh } = useApiData<ExecutiveDashboardData>('/api/dashboards/executive', initialData);
	const budgetGap = Math.max(data.budget.revised_total - data.budget.spent_total, 0);

	return (
		<DashboardShell
			title="Executive Dashboard"
			subtitle="Portfolio-wide live view across projects, budget utilization, service exposure, and approval backlog"
			loading={loading}
			error={error}
			lastUpdated={lastUpdated}
			onRetry={() => void refresh()}
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
				<StatCard title="Projects" value={data.projects.total} hint={`${data.projects.active_sites} active sites`} icon={Building2} tone="blue" />
				<StatCard title="Budget Revised" value={formatCurrency(data.budget.revised_total)} hint={`${data.budget.allocations} active allocations`} icon={IndianRupee} tone="green" />
				<StatCard title="Budget Spent" value={formatCurrency(data.budget.spent_total)} hint={`${formatPercent(data.budget.avg_utilization_pct)} average utilization`} icon={BriefcaseBusiness} tone="orange" />
				<StatCard title="SLA At Risk" value={data.sla.at_risk} hint={`${formatPercent(data.sla.resolution_compliance_pct)} resolution compliance`} icon={AlertTriangle} tone="red" />
				<StatCard title="Critical Tickets" value={data.tickets.critical} hint={`${data.tickets.high} additional high-priority tickets`} icon={ShieldCheck} tone="purple" />
				<StatCard title="Pending Approvals" value={data.pending_approvals.count} hint="Cross-module approval inbox" icon={ListTodo} tone="amber" />
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
				<SectionCard title="Portfolio Baseline" subtitle="Current overall delivery footprint">
					<MetricList
						items={[
							{ label: 'Projects', value: data.projects.total },
							{ label: 'Active Sites', value: data.projects.active_sites, tone: 'info' },
							{ label: 'Total Tickets', value: data.tickets.total, tone: data.tickets.total > 0 ? 'warning' : 'positive' },
							{ label: 'RMA-linked Tickets', value: data.tickets.rma_count, tone: 'info' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Budget Control" subtitle="Financial envelope versus actual spend">
					<MetricList
						items={[
							{ label: 'Sanctioned Total', value: formatCurrency(data.budget.sanctioned_total) },
							{ label: 'Revised Total', value: formatCurrency(data.budget.revised_total) },
							{ label: 'Spent Total', value: formatCurrency(data.budget.spent_total), tone: 'warning' },
							{ label: 'Budget Headroom', value: formatCurrency(budgetGap), tone: budgetGap > 0 ? 'positive' : 'negative' },
							{ label: 'Average Utilization', value: formatPercent(data.budget.avg_utilization_pct), tone: data.budget.avg_utilization_pct <= 85 ? 'positive' : 'warning' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Service Reliability" subtitle="Organization-level ticket and SLA health">
					<MetricList
						items={[
							{ label: 'New Tickets', value: data.tickets.new, tone: 'warning' },
							{ label: 'In Progress', value: data.tickets.in_progress, tone: 'info' },
							{ label: 'At-Risk SLAs', value: data.sla.at_risk, tone: data.sla.at_risk > 0 ? 'negative' : 'positive' },
							{ label: 'Response Compliance', value: formatPercent(data.sla.response_compliance_pct), tone: 'positive' },
							{ label: 'Resolution Compliance', value: formatPercent(data.sla.resolution_compliance_pct), tone: 'positive' },
						]}
					/>
				</SectionCard>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
				<SectionCard title="Pending Approvals" subtitle="Latest cross-module items requiring leadership action">
					{data.pending_approvals.items.length ? (
						<div className="space-y-3">
							{data.pending_approvals.items.map((item) => (
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
						<EmptyState message="No pending approvals in the current executive inbox." />
					)}
				</SectionCard>

				<SectionCard title="Attention Stack" subtitle="Fast read of current pressure points">
					<MetricList
						items={[
							{ label: 'Pending Approvals', value: data.pending_approvals.count, tone: data.pending_approvals.count > 0 ? 'warning' : 'positive' },
							{ label: 'Critical Tickets', value: data.tickets.critical, tone: data.tickets.critical > 0 ? 'negative' : 'positive' },
							{ label: 'High Tickets', value: data.tickets.high, tone: data.tickets.high > 0 ? 'warning' : 'positive' },
							{ label: 'At-Risk SLA Timers', value: data.sla.at_risk, tone: data.sla.at_risk > 0 ? 'negative' : 'positive' },
							{ label: 'Budget Headroom', value: formatCurrency(budgetGap), tone: budgetGap > 0 ? 'positive' : 'negative' },
						]}
					/>
				</SectionCard>
			</div>
		</DashboardShell>
	);
}
