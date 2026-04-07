'use client';

import { AlertTriangle, ClipboardList, HardHat, Link2, MapPinned, TimerReset } from 'lucide-react';
import { DashboardShell, MetricList, SectionCard, StatCard, formatPercent, useApiData } from './shared';

type EngineerDashboardData = {
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

const initialData: EngineerDashboardData = {
	sites: { total: 0, avg_progress_pct: 0, active: 0 },
	dprs: { total_reports: 0, total_manpower_logged: 0, total_equipment_logged: 0 },
	milestones: { total: 0, completed: 0, avg_progress_pct: 0, overdue: 0 },
	manpower: { total_logs: 0, today_logs: 0 },
	dependencies: { active_rules: 0, hard_blocks: 0 },
};

export default function EngineerDashboard() {
	const { data, loading, error, lastUpdated, refresh } = useApiData<EngineerDashboardData>('/api/dashboards/execution', initialData);

	return (
		<DashboardShell
			title="Engineer Dashboard"
			subtitle="Personalized field-engineering view for daily execution, milestone risk, and site reporting discipline"
			loading={loading}
			error={error}
			lastUpdated={lastUpdated}
			onRetry={() => void refresh()}
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
				<StatCard title="Active Sites" value={data.sites.active} hint={`${data.sites.total} total sites in scope`} icon={MapPinned} tone="blue" />
				<StatCard title="Site Progress" value={formatPercent(data.sites.avg_progress_pct)} hint="Average location completion" icon={HardHat} tone="green" />
				<StatCard title="Overdue Milestones" value={data.milestones.overdue} hint={`${data.milestones.total} milestones tracked`} icon={AlertTriangle} tone="red" />
				<StatCard title="DPR Reports" value={data.dprs.total_reports} hint={`${data.manpower.today_logs} logs submitted today`} icon={ClipboardList} tone="purple" />
				<StatCard title="Dependency Blocks" value={data.dependencies.hard_blocks} hint={`${data.dependencies.active_rules} active dependency rules`} icon={Link2} tone="orange" />
				<StatCard title="Milestone Progress" value={formatPercent(data.milestones.avg_progress_pct)} hint={`${data.milestones.completed} milestones completed`} icon={TimerReset} tone="cyan" />
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
				<SectionCard title="My Execution Focus" subtitle="Where engineering attention should go first today">
					<MetricList
						items={[
							{ label: 'Overdue Milestones', value: data.milestones.overdue, tone: data.milestones.overdue > 0 ? 'negative' : 'positive' },
							{ label: 'Hard Blocks', value: data.dependencies.hard_blocks, tone: data.dependencies.hard_blocks > 0 ? 'negative' : 'positive' },
							{ label: 'Sites Missing Daily Log Signal', value: Math.max(data.sites.active - data.manpower.today_logs, 0), tone: 'warning' },
							{ label: 'Average Site Progress', value: formatPercent(data.sites.avg_progress_pct), tone: data.sites.avg_progress_pct >= 70 ? 'positive' : 'warning' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Milestones and DPR" subtitle="Project rhythm from completion and reporting signals">
					<MetricList
						items={[
							{ label: 'Total Milestones', value: data.milestones.total },
							{ label: 'Completed Milestones', value: data.milestones.completed, tone: 'positive' },
							{ label: 'DPR Reports', value: data.dprs.total_reports, tone: 'info' },
							{ label: 'Total Manpower Logged', value: data.dprs.total_manpower_logged },
							{ label: 'Total Equipment Logged', value: data.dprs.total_equipment_logged },
						]}
					/>
				</SectionCard>

				<SectionCard title="Daily Discipline" subtitle="Whether field logging is matching active site load">
					<MetricList
						items={[
							{ label: 'Today\'s Manpower Logs', value: data.manpower.today_logs, tone: data.manpower.today_logs > 0 ? 'positive' : 'warning' },
							{ label: 'Total Manpower Logs', value: data.manpower.total_logs },
							{ label: 'Active Sites', value: data.sites.active },
							{ label: 'Coverage Ratio', value: formatPercent(data.sites.active ? (data.manpower.today_logs / data.sites.active) * 100 : 0), tone: data.sites.active && data.manpower.today_logs >= data.sites.active ? 'positive' : 'warning' },
						]}
					/>
				</SectionCard>
			</div>
		</DashboardShell>
	);
}