'use client';

import { BriefcaseBusiness, Clock3, FileText, HardHat, IndianRupee, Users } from 'lucide-react';
import { DashboardShell, MetricList, SectionCard, StatCard, formatCurrency, formatPercent, useApiData } from './shared';

type ProjectHeadDashboardData = {
	indents: {
		total: number;
		draft: number;
		submitted: number;
		pending_purchase: number;
		ordered: number;
		stopped: number;
		cancelled: number;
	};
	execution: {
		sites: {
			total: number;
			avg_progress_pct: number;
			active: number;
		};
		dprs: {
			total_reports: number;
			total_manpower_logged: number;
			total_equipment_logged: number;
		};
		milestones: {
			total: number;
			completed: number;
			avg_progress_pct: number;
			overdue: number;
		};
		manpower: {
			total_logs: number;
			today_logs: number;
		};
		dependencies: {
			active_rules: number;
			hard_blocks: number;
		};
	};
	billing: {
		submitted: number;
		approved: number;
		payment_pending_amount: number;
	};
	sla: {
		total: number;
		at_risk: number;
		response_compliance_pct: number;
		resolution_compliance_pct: number;
		avg_resolution_minutes: number;
	};
	manpower: {
		sites_without_today_log: number;
		sites_with_today_log: number;
	};
};

const initialData: ProjectHeadDashboardData = {
	indents: { total: 0, draft: 0, submitted: 0, pending_purchase: 0, ordered: 0, stopped: 0, cancelled: 0 },
	execution: {
		sites: { total: 0, avg_progress_pct: 0, active: 0 },
		dprs: { total_reports: 0, total_manpower_logged: 0, total_equipment_logged: 0 },
		milestones: { total: 0, completed: 0, avg_progress_pct: 0, overdue: 0 },
		manpower: { total_logs: 0, today_logs: 0 },
		dependencies: { active_rules: 0, hard_blocks: 0 },
	},
	billing: { submitted: 0, approved: 0, payment_pending_amount: 0 },
	sla: { total: 0, at_risk: 0, response_compliance_pct: 0, resolution_compliance_pct: 0, avg_resolution_minutes: 0 },
	manpower: { sites_without_today_log: 0, sites_with_today_log: 0 },
};

export default function ProjectHeadDashboard() {
	const { data, loading, error, lastUpdated, refresh } = useApiData<ProjectHeadDashboardData>('/api/dashboards/project-head', initialData);

	return (
		<DashboardShell
			title="Project Head Dashboard"
			subtitle="Live project-control view across indents, execution, billing, SLA, and manpower coverage"
			loading={loading}
			error={error}
			lastUpdated={lastUpdated}
			onRetry={() => void refresh()}
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
				<StatCard title="Pending Indents" value={data.indents.pending_purchase} hint={`${data.indents.total} total procurement requests`} icon={FileText} tone="blue" />
				<StatCard title="Active Sites" value={data.execution.sites.active} hint={`${formatPercent(data.execution.sites.avg_progress_pct)} average site progress`} icon={HardHat} tone="green" />
				<StatCard title="Overdue Milestones" value={data.execution.milestones.overdue} hint={`${data.execution.milestones.total} milestones tracked`} icon={Clock3} tone="red" />
				<StatCard title="Billing Pending" value={formatCurrency(data.billing.payment_pending_amount)} hint={`${data.billing.submitted} submitted, ${data.billing.approved} approved`} icon={IndianRupee} tone="orange" />
				<StatCard title="SLA At Risk" value={data.sla.at_risk} hint={`${formatPercent(data.sla.resolution_compliance_pct)} resolution compliance`} icon={BriefcaseBusiness} tone="purple" />
				<StatCard title="Sites Without Log" value={data.manpower.sites_without_today_log} hint={`${data.manpower.sites_with_today_log} sites logged today`} icon={Users} tone="amber" />
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
				<SectionCard title="Procurement Pressure" subtitle="What still blocks execution from the supply side">
					<MetricList
						items={[
							{ label: 'Draft Indents', value: data.indents.draft, tone: 'warning' },
							{ label: 'Submitted Indents', value: data.indents.submitted, tone: 'info' },
							{ label: 'Pending Purchase', value: data.indents.pending_purchase, tone: data.indents.pending_purchase > 0 ? 'negative' : 'positive' },
							{ label: 'Ordered / Received', value: data.indents.ordered, tone: 'positive' },
							{ label: 'Stopped / Cancelled', value: data.indents.stopped + data.indents.cancelled, tone: 'negative' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Execution Control" subtitle="Delivery posture across sites and milestone plan">
					<MetricList
						items={[
							{ label: 'Total Sites', value: data.execution.sites.total },
							{ label: 'Average Site Progress', value: formatPercent(data.execution.sites.avg_progress_pct), tone: data.execution.sites.avg_progress_pct >= 75 ? 'positive' : 'warning' },
							{ label: 'Completed Milestones', value: data.execution.milestones.completed, tone: 'positive' },
							{ label: 'Overdue Milestones', value: data.execution.milestones.overdue, tone: data.execution.milestones.overdue > 0 ? 'negative' : 'positive' },
							{ label: 'Hard Dependency Blocks', value: data.execution.dependencies.hard_blocks, tone: data.execution.dependencies.hard_blocks > 0 ? 'negative' : 'positive' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Commercial and Service Risk" subtitle="Cash exposure and service reliability from the same project view">
					<MetricList
						items={[
							{ label: 'Submitted Invoices', value: data.billing.submitted, tone: 'warning' },
							{ label: 'Approved Invoices', value: data.billing.approved, tone: 'positive' },
							{ label: 'Payment Pending', value: formatCurrency(data.billing.payment_pending_amount), tone: data.billing.payment_pending_amount > 0 ? 'negative' : 'positive' },
							{ label: 'SLA At Risk', value: data.sla.at_risk, tone: data.sla.at_risk > 0 ? 'negative' : 'positive' },
							{ label: 'Response Compliance', value: formatPercent(data.sla.response_compliance_pct), tone: 'positive' },
						]}
					/>
				</SectionCard>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<SectionCard title="Manpower Coverage" subtitle="Daily reporting discipline across the site portfolio">
					<MetricList
						items={[
							{ label: 'Sites With Today Log', value: data.manpower.sites_with_today_log, tone: 'positive' },
							{ label: 'Sites Missing Today Log', value: data.manpower.sites_without_today_log, tone: data.manpower.sites_without_today_log > 0 ? 'warning' : 'positive' },
							{ label: 'Total DPR Reports', value: data.execution.dprs.total_reports },
							{ label: 'Total Manpower Logged', value: data.execution.dprs.total_manpower_logged },
						]}
					/>
				</SectionCard>

				<SectionCard title="Project Rhythm" subtitle="Execution momentum relative to reporting and support load">
					<MetricList
						items={[
							{ label: 'Average Milestone Progress', value: formatPercent(data.execution.milestones.avg_progress_pct), tone: data.execution.milestones.avg_progress_pct >= 75 ? 'positive' : 'warning' },
							{ label: 'Active Dependency Rules', value: data.execution.dependencies.active_rules, tone: data.execution.dependencies.active_rules > 0 ? 'warning' : 'positive' },
							{ label: 'SLA Timers Running', value: data.sla.total },
							{ label: 'Average Resolution Time', value: `${Math.round(data.sla.avg_resolution_minutes)} min` },
						]}
					/>
				</SectionCard>
			</div>
		</DashboardShell>
	);
}
