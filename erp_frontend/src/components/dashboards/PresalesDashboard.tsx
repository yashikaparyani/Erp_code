'use client';

import { Calculator, CheckSquare, FileText, Landmark, MapPin, Trophy } from 'lucide-react';
import { DashboardShell, MetricList, SectionCard, StatCard, formatCurrency, formatPercent, useApiData } from './shared';

type PresalesDashboardData = {
	tenders: {
		total: number;
		won: number;
		submitted: number;
		draft: number;
		under_evaluation: number;
		lost: number;
		cancelled: number;
		dropped: number;
		total_pipeline: number;
	};
	boqs: {
		total: number;
		draft: number;
		pending_approval: number;
		approved: number;
		rejected: number;
		total_value: number;
	};
	surveys: {
		total: number;
		completed: number;
		in_progress: number;
		pending: number;
	};
	finance_requests: {
		total: number;
		pending: number;
		active: number;
		released: number;
		refunded: number;
		rejected: number;
		total_amount: number;
		pending_amount: number;
		emd_count: number;
		pbg_count: number;
	};
	checklist_completion_pct: number;
};

const initialData: PresalesDashboardData = {
	tenders: { total: 0, won: 0, submitted: 0, draft: 0, under_evaluation: 0, lost: 0, cancelled: 0, dropped: 0, total_pipeline: 0 },
	boqs: { total: 0, draft: 0, pending_approval: 0, approved: 0, rejected: 0, total_value: 0 },
	surveys: { total: 0, completed: 0, in_progress: 0, pending: 0 },
	finance_requests: { total: 0, pending: 0, active: 0, released: 0, refunded: 0, rejected: 0, total_amount: 0, pending_amount: 0, emd_count: 0, pbg_count: 0 },
	checklist_completion_pct: 0,
};

export default function PresalesDashboard() {
	const { data, loading, error, lastUpdated, refresh } = useApiData<PresalesDashboardData>('/api/dashboards/presales', initialData);

	return (
		<DashboardShell
			title="Presales Dashboard"
			subtitle="Live tender pipeline, BOQ readiness, surveys, and EMD/PBG demand overview"
			loading={loading}
			error={error}
			lastUpdated={lastUpdated}
			onRetry={() => void refresh()}
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
				<StatCard title="Tender Pipeline" value={data.tenders.total} hint={`${data.tenders.under_evaluation} currently under evaluation`} icon={FileText} tone="blue" />
				<StatCard title="Submitted" value={data.tenders.submitted} hint={`${data.tenders.won} already converted to wins`} icon={Trophy} tone="green" />
				<StatCard title="Pipeline Value" value={formatCurrency(data.tenders.total_pipeline)} hint="Estimated value of tracked tenders" icon={Landmark} tone="orange" />
				<StatCard title="BOQ Ready" value={data.boqs.approved} hint={`${data.boqs.pending_approval} waiting for approval`} icon={Calculator} tone="purple" />
				<StatCard title="Survey Coverage" value={data.surveys.total} hint={`${data.surveys.completed} completed site surveys`} icon={MapPin} tone="cyan" />
				<StatCard title="Checklist Completion" value={formatPercent(data.checklist_completion_pct)} hint={`${data.finance_requests.pending} finance requests still pending`} icon={CheckSquare} tone="teal" />
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
				<SectionCard title="Tender Status" subtitle="Live pipeline split across tender stages">
					<MetricList
						items={[
							{ label: 'Draft', value: data.tenders.draft, tone: 'warning' },
							{ label: 'Submitted', value: data.tenders.submitted, tone: 'info' },
							{ label: 'Under Evaluation', value: data.tenders.under_evaluation, tone: 'warning' },
							{ label: 'Won', value: data.tenders.won, tone: 'positive' },
							{ label: 'Lost', value: data.tenders.lost, tone: 'negative' },
							{ label: 'Dropped / Cancelled', value: data.tenders.dropped + data.tenders.cancelled, tone: 'negative' },
						]}
					/>
				</SectionCard>

				<SectionCard title="BOQ Readiness" subtitle="Engineering handoff quality for submissions">
					<MetricList
						items={[
							{ label: 'Total BOQs', value: data.boqs.total },
							{ label: 'Draft', value: data.boqs.draft, tone: 'warning' },
							{ label: 'Pending Approval', value: data.boqs.pending_approval, tone: 'warning' },
							{ label: 'Approved', value: data.boqs.approved, tone: 'positive' },
							{ label: 'Rejected', value: data.boqs.rejected, tone: 'negative' },
							{ label: 'BOQ Value', value: formatCurrency(data.boqs.total_value) },
						]}
					/>
				</SectionCard>

				<SectionCard title="Survey and Finance Gate" subtitle="Site readiness plus bid-security movement">
					<MetricList
						items={[
							{ label: 'Surveys Completed', value: data.surveys.completed, tone: 'positive' },
							{ label: 'Surveys In Progress', value: data.surveys.in_progress, tone: 'info' },
							{ label: 'Surveys Pending', value: data.surveys.pending, tone: 'warning' },
							{ label: 'Pending EMD/PBG', value: data.finance_requests.pending, tone: 'warning' },
							{ label: 'Pending Amount', value: formatCurrency(data.finance_requests.pending_amount), tone: 'negative' },
							{ label: 'Active Instruments', value: data.finance_requests.active, tone: 'positive' },
						]}
					/>
				</SectionCard>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<SectionCard title="Instrument Mix" subtitle="Bid security composition across presales finance requests">
					<MetricList
						items={[
							{ label: 'EMD Count', value: data.finance_requests.emd_count, tone: 'info' },
							{ label: 'PBG Count', value: data.finance_requests.pbg_count, tone: 'info' },
							{ label: 'Released', value: data.finance_requests.released, tone: 'positive' },
							{ label: 'Refunded', value: data.finance_requests.refunded, tone: 'positive' },
							{ label: 'Rejected', value: data.finance_requests.rejected, tone: 'negative' },
							{ label: 'Total Amount', value: formatCurrency(data.finance_requests.total_amount) },
						]}
					/>
				</SectionCard>

				<SectionCard title="Submission Readiness" subtitle="What remains before more bids can move cleanly">
					<MetricList
						items={[
							{ label: 'Checklist Completion', value: formatPercent(data.checklist_completion_pct), tone: data.checklist_completion_pct >= 80 ? 'positive' : 'warning' },
							{ label: 'Tenders Not Yet Submitted', value: data.tenders.draft + data.tenders.under_evaluation, tone: 'warning' },
							{ label: 'BOQs Not Yet Approved', value: data.boqs.draft + data.boqs.pending_approval, tone: 'warning' },
							{ label: 'Surveys Outstanding', value: data.surveys.in_progress + data.surveys.pending, tone: 'warning' },
						]}
					/>
				</SectionCard>
			</div>
		</DashboardShell>
	);
}
