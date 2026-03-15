'use client';

import { AlertCircle, FileText, Percent, Receipt, ShieldAlert, Wallet } from 'lucide-react';
import { DashboardShell, MetricList, SectionCard, StatCard, formatCurrency, formatNumber, useApiData } from './shared';

type AccountsDashboardData = {
	invoices: {
		total: number;
		draft: number;
		submitted: number;
		approved: number;
		payment_received: number;
		cancelled: number;
		total_amount: number;
		total_receivable: number;
	};
	retention: {
		total: number;
		retained: number;
		partially_released: number;
		released: number;
		total_retained: number;
		total_released: number;
	};
	penalties: {
		total: number;
		pending: number;
		approved: number;
		applied: number;
		reversed: number;
		total_amount: number;
		applied_amount: number;
	};
	taxes: {
		gst_total: number;
		tds_total: number;
	};
	aging: {
		current: number;
		age_1_30: number;
		age_31_60: number;
		age_61_90: number;
		age_90_plus: number;
	};
};

const initialData: AccountsDashboardData = {
	invoices: { total: 0, draft: 0, submitted: 0, approved: 0, payment_received: 0, cancelled: 0, total_amount: 0, total_receivable: 0 },
	retention: { total: 0, retained: 0, partially_released: 0, released: 0, total_retained: 0, total_released: 0 },
	penalties: { total: 0, pending: 0, approved: 0, applied: 0, reversed: 0, total_amount: 0, applied_amount: 0 },
	taxes: { gst_total: 0, tds_total: 0 },
	aging: { current: 0, age_1_30: 0, age_31_60: 0, age_61_90: 0, age_90_plus: 0 },
};

export default function AccountsDashboard() {
	const { data, loading, error, lastUpdated, refresh } = useApiData<AccountsDashboardData>('/api/dashboards/accounts', initialData);
	const overdueAmount = data.aging.age_1_30 + data.aging.age_31_60 + data.aging.age_61_90 + data.aging.age_90_plus;

	return (
		<DashboardShell
			title="Accounts Dashboard"
			subtitle="Billing, receivables, retention, penalties, and tax exposure from live backend aggregates"
			loading={loading}
			error={error}
			lastUpdated={lastUpdated}
			onRetry={() => void refresh()}
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
				<StatCard title="Net Receivable" value={formatCurrency(data.invoices.total_receivable)} hint={`${formatNumber(data.invoices.total)} invoices across the book`} icon={Wallet} tone="blue" />
				<StatCard title="Submitted" value={data.invoices.submitted} hint={`${data.invoices.approved} approved and awaiting collection`} icon={FileText} tone="orange" />
				<StatCard title="Overdue Aging" value={formatCurrency(overdueAmount)} hint={`${formatCurrency(data.aging.age_90_plus)} beyond 90 days`} icon={AlertCircle} tone="red" />
				<StatCard title="Retention Held" value={formatCurrency(data.retention.total_retained)} hint={`${formatCurrency(data.retention.total_released)} already released`} icon={Percent} tone="purple" />
				<StatCard title="GST / TDS" value={formatCurrency(data.taxes.gst_total)} hint={`TDS deducted ${formatCurrency(data.taxes.tds_total)}`} icon={Receipt} tone="green" />
				<StatCard title="Penalty Applied" value={formatCurrency(data.penalties.applied_amount)} hint={`${data.penalties.pending} still pending review`} icon={ShieldAlert} tone="amber" />
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
				<SectionCard title="Invoice Workflow" subtitle="Billing state across live invoice records">
					<MetricList
						items={[
							{ label: 'Draft', value: data.invoices.draft, tone: 'warning' },
							{ label: 'Submitted', value: data.invoices.submitted, tone: 'info' },
							{ label: 'Approved', value: data.invoices.approved, tone: 'positive' },
							{ label: 'Payment Received', value: data.invoices.payment_received, tone: 'positive' },
							{ label: 'Cancelled', value: data.invoices.cancelled, tone: 'negative' },
							{ label: 'Gross Billing', value: formatCurrency(data.invoices.total_amount) },
						]}
					/>
				</SectionCard>

				<SectionCard title="Receivable Aging" subtitle="Exposure by collection delay bucket">
					<MetricList
						items={[
							{ label: 'Current', value: formatCurrency(data.aging.current), tone: 'positive' },
							{ label: '1-30 Days', value: formatCurrency(data.aging.age_1_30), tone: 'warning' },
							{ label: '31-60 Days', value: formatCurrency(data.aging.age_31_60), tone: 'warning' },
							{ label: '61-90 Days', value: formatCurrency(data.aging.age_61_90), tone: 'negative' },
							{ label: '90+ Days', value: formatCurrency(data.aging.age_90_plus), tone: 'negative' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Retention and Deductions" subtitle="Capital blocked and downward adjustments">
					<MetricList
						items={[
							{ label: 'Retention Entries', value: data.retention.total },
							{ label: 'Still Retained', value: data.retention.retained, tone: 'warning' },
							{ label: 'Partially Released', value: data.retention.partially_released, tone: 'info' },
							{ label: 'Released', value: data.retention.released, tone: 'positive' },
							{ label: 'Penalty Cases', value: data.penalties.total, tone: data.penalties.total > 0 ? 'warning' : 'positive' },
							{ label: 'Penalty Value', value: formatCurrency(data.penalties.total_amount), tone: data.penalties.total_amount > 0 ? 'negative' : 'positive' },
						]}
					/>
				</SectionCard>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<SectionCard title="Tax Summary" subtitle="Current statutory totals from invoice tax fields">
					<MetricList
						items={[
							{ label: 'GST Total', value: formatCurrency(data.taxes.gst_total), tone: 'warning' },
							{ label: 'TDS Total', value: formatCurrency(data.taxes.tds_total), tone: 'info' },
							{ label: 'Applied Penalties', value: data.penalties.applied, tone: data.penalties.applied > 0 ? 'negative' : 'positive' },
							{ label: 'Reversed Penalties', value: data.penalties.reversed, tone: 'positive' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Cash Conversion Pressure" subtitle="How much billed value still needs movement">
					<MetricList
						items={[
							{ label: 'Receivable Base', value: formatCurrency(data.invoices.total_receivable) },
							{ label: 'Overdue Base', value: formatCurrency(overdueAmount), tone: overdueAmount > 0 ? 'negative' : 'positive' },
							{ label: 'Retention Locked', value: formatCurrency(data.retention.total_retained), tone: 'warning' },
							{ label: 'Released Retention', value: formatCurrency(data.retention.total_released), tone: 'positive' },
						]}
					/>
				</SectionCard>
			</div>
		</DashboardShell>
	);
}
