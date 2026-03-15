'use client';

import { CalendarCheck2, ClipboardList, Link2, MapPinned, Wrench } from 'lucide-react';
import { DashboardShell, MetricList, SectionCard, StatCard, formatPercent, useApiData } from './shared';

type ExecutionDashboardData = {
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

const initialData: ExecutionDashboardData = {
	sites: { total: 0, avg_progress_pct: 0, active: 0 },
	dprs: { total_reports: 0, total_manpower_logged: 0, total_equipment_logged: 0 },
	milestones: { total: 0, completed: 0, avg_progress_pct: 0, overdue: 0 },
	manpower: { total_logs: 0, today_logs: 0 },
	dependencies: { active_rules: 0, hard_blocks: 0 },
};

export default function ExecutionDashboard() {
	const { data, loading, error, lastUpdated, refresh } = useApiData<ExecutionDashboardData>('/api/dashboards/execution', initialData);

	return (
		<DashboardShell
			title="Execution Dashboard"
			subtitle="Field progress, DPR throughput, milestones, manpower logging, and dependency blockers"
			loading={loading}
			error={error}
			lastUpdated={lastUpdated}
			onRetry={() => void refresh()}
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
				<StatCard title="Active Sites" value={data.sites.active} hint={`${data.sites.total} total mapped sites`} icon={MapPinned} tone="blue" />
				<StatCard title="Site Progress" value={formatPercent(data.sites.avg_progress_pct)} hint="Average completion across site master" icon={CalendarCheck2} tone="green" />
				<StatCard title="Milestones" value={data.milestones.total} hint={`${data.milestones.completed} completed, ${data.milestones.overdue} overdue`} icon={Wrench} tone="purple" />
				<StatCard title="DPR Reports" value={data.dprs.total_reports} hint={`${data.manpower.today_logs} manpower logs submitted today`} icon={ClipboardList} tone="orange" />
				<StatCard title="Hard Blocks" value={data.dependencies.hard_blocks} hint={`${data.dependencies.active_rules} active dependency rules`} icon={Link2} tone="red" />
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
				<SectionCard title="Site Health" subtitle="Execution footprint and average completion">
					<MetricList
						items={[
							{ label: 'Total Sites', value: data.sites.total },
							{ label: 'Active Sites', value: data.sites.active, tone: 'info' },
							{ label: 'Average Site Progress', value: formatPercent(data.sites.avg_progress_pct), tone: data.sites.avg_progress_pct >= 75 ? 'positive' : 'warning' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Milestone Delivery" subtitle="Macro delivery cadence from milestone tracker">
					<MetricList
						items={[
							{ label: 'Total Milestones', value: data.milestones.total },
							{ label: 'Completed', value: data.milestones.completed, tone: 'positive' },
							{ label: 'Average Milestone Progress', value: formatPercent(data.milestones.avg_progress_pct), tone: data.milestones.avg_progress_pct >= 75 ? 'positive' : 'warning' },
							{ label: 'Overdue', value: data.milestones.overdue, tone: data.milestones.overdue > 0 ? 'negative' : 'positive' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Field Logging" subtitle="DPR volume and daily manpower capture">
					<MetricList
						items={[
							{ label: 'DPR Reports', value: data.dprs.total_reports, tone: 'info' },
							{ label: 'Manpower Logged', value: data.dprs.total_manpower_logged },
							{ label: 'Equipment Logged', value: data.dprs.total_equipment_logged },
							{ label: 'Total Manpower Logs', value: data.manpower.total_logs },
							{ label: 'Today\'s Logs', value: data.manpower.today_logs, tone: data.manpower.today_logs > 0 ? 'positive' : 'warning' },
						]}
					/>
				</SectionCard>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<SectionCard title="Dependency Risk" subtitle="Execution blockers derived from dependency rules">
					<MetricList
						items={[
							{ label: 'Active Rules', value: data.dependencies.active_rules, tone: 'warning' },
							{ label: 'Hard Blocks', value: data.dependencies.hard_blocks, tone: data.dependencies.hard_blocks > 0 ? 'negative' : 'positive' },
							{ label: 'Sites Without Immediate Hard Block', value: Math.max(data.sites.active - data.dependencies.hard_blocks, 0), tone: 'positive' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Execution Capacity" subtitle="Whether field reporting is keeping pace with active work">
					<MetricList
						items={[
							{ label: 'Active Sites', value: data.sites.active },
							{ label: 'Today\'s Manpower Logs', value: data.manpower.today_logs, tone: data.manpower.today_logs >= data.sites.active ? 'positive' : 'warning' },
							{ label: 'Total Manpower Logged', value: data.dprs.total_manpower_logged },
							{ label: 'Average Milestone Progress', value: formatPercent(data.milestones.avg_progress_pct) },
						]}
					/>
				</SectionCard>
			</div>
		</DashboardShell>
	);
}
