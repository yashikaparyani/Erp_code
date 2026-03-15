'use client';

import { Banknote, ClipboardCheck, FileText, PackageCheck, ShoppingCart, Truck } from 'lucide-react';
import { DashboardShell, MetricList, SectionCard, StatCard, formatCurrency, formatPercent, useApiData } from './shared';

type ProcurementDashboardData = {
	indents: {
		total: number;
		draft: number;
		submitted: number;
		pending_purchase: number;
		ordered: number;
		stopped: number;
		cancelled: number;
	};
	purchase_orders: {
		total: number;
		draft: number;
		submitted: number;
		to_receive: number;
		completed: number;
		cancelled: number;
		total_value: number;
	};
	vendor_comparisons: {
		total: number;
		draft: number;
		pending_approval: number;
		approved: number;
		rejected: number;
		three_quote_ready: number;
		selected_total_amount: number;
	};
	dispatch: {
		total: number;
		draft: number;
		pending_approval: number;
		approved: number;
		dispatched: number;
		cancelled: number;
		total_qty: number;
	};
	payments: {
		approved_unpaid_count: number;
		approved_unpaid_amount: number;
	};
};

const initialData: ProcurementDashboardData = {
	indents: { total: 0, draft: 0, submitted: 0, pending_purchase: 0, ordered: 0, stopped: 0, cancelled: 0 },
	purchase_orders: { total: 0, draft: 0, submitted: 0, to_receive: 0, completed: 0, cancelled: 0, total_value: 0 },
	vendor_comparisons: { total: 0, draft: 0, pending_approval: 0, approved: 0, rejected: 0, three_quote_ready: 0, selected_total_amount: 0 },
	dispatch: { total: 0, draft: 0, pending_approval: 0, approved: 0, dispatched: 0, cancelled: 0, total_qty: 0 },
	payments: { approved_unpaid_count: 0, approved_unpaid_amount: 0 },
};

export default function ProcurementDashboard() {
	const { data, loading, error, lastUpdated, refresh } = useApiData<ProcurementDashboardData>('/api/dashboards/procurement', initialData);
	const comparisonReadiness = data.vendor_comparisons.total > 0
		? (data.vendor_comparisons.three_quote_ready * 100) / data.vendor_comparisons.total
		: 0;

	return (
		<DashboardShell
			title="Procurement Dashboard"
			subtitle="Live requisition, comparison, PO, dispatch, and payment-pressure view"
			loading={loading}
			error={error}
			lastUpdated={lastUpdated}
			onRetry={() => void refresh()}
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
				<StatCard title="Pending Indents" value={data.indents.pending_purchase} hint={`${data.indents.total} total requisitions`} icon={FileText} tone="blue" />
				<StatCard title="Comparison Ready" value={data.vendor_comparisons.three_quote_ready} hint={`${formatPercent(comparisonReadiness)} meet 3-quote rule`} icon={ClipboardCheck} tone="green" />
				<StatCard title="PO To Receive" value={data.purchase_orders.to_receive} hint={formatCurrency(data.purchase_orders.total_value)} icon={ShoppingCart} tone="orange" />
				<StatCard title="Approved Unpaid" value={data.payments.approved_unpaid_count} hint={formatCurrency(data.payments.approved_unpaid_amount)} icon={Banknote} tone="red" />
				<StatCard title="Dispatch Pending" value={data.dispatch.pending_approval} hint={`${data.dispatch.approved} already approved`} icon={Truck} tone="purple" />
				<StatCard title="Dispatched Qty" value={data.dispatch.total_qty} hint={`${data.dispatch.dispatched} challans moved`} icon={PackageCheck} tone="teal" />
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
				<SectionCard title="Indent Funnel" subtitle="Current conversion pressure from request to purchase">
					<MetricList
						items={[
							{ label: 'Draft', value: data.indents.draft, tone: 'warning' },
							{ label: 'Submitted', value: data.indents.submitted, tone: 'info' },
							{ label: 'Pending Purchase', value: data.indents.pending_purchase, tone: data.indents.pending_purchase > 0 ? 'negative' : 'positive' },
							{ label: 'Ordered / Received', value: data.indents.ordered, tone: 'positive' },
							{ label: 'Stopped / Cancelled', value: data.indents.stopped + data.indents.cancelled, tone: 'negative' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Comparison Governance" subtitle="Vendor comparison quality and approval readiness">
					<MetricList
						items={[
							{ label: 'Total Comparisons', value: data.vendor_comparisons.total },
							{ label: 'Draft', value: data.vendor_comparisons.draft, tone: 'warning' },
							{ label: 'Pending Approval', value: data.vendor_comparisons.pending_approval, tone: 'warning' },
							{ label: 'Approved', value: data.vendor_comparisons.approved, tone: 'positive' },
							{ label: 'Rejected', value: data.vendor_comparisons.rejected, tone: 'negative' },
							{ label: 'Selected Value', value: formatCurrency(data.vendor_comparisons.selected_total_amount) },
						]}
					/>
				</SectionCard>

				<SectionCard title="PO and Logistics" subtitle="Commercial commitment and outbound movement">
					<MetricList
						items={[
							{ label: 'PO Draft', value: data.purchase_orders.draft, tone: 'warning' },
							{ label: 'PO Submitted', value: data.purchase_orders.submitted, tone: 'info' },
							{ label: 'PO To Receive', value: data.purchase_orders.to_receive, tone: 'warning' },
							{ label: 'PO Completed', value: data.purchase_orders.completed, tone: 'positive' },
							{ label: 'Dispatch Pending Approval', value: data.dispatch.pending_approval, tone: 'warning' },
							{ label: 'Dispatch Approved', value: data.dispatch.approved, tone: 'positive' },
						]}
					/>
				</SectionCard>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<SectionCard title="Payment Exposure" subtitle="Approved invoices still not collected">
					<MetricList
						items={[
							{ label: 'Approved Unpaid Invoices', value: data.payments.approved_unpaid_count, tone: data.payments.approved_unpaid_count > 0 ? 'negative' : 'positive' },
							{ label: 'Approved Unpaid Amount', value: formatCurrency(data.payments.approved_unpaid_amount), tone: data.payments.approved_unpaid_amount > 0 ? 'negative' : 'positive' },
							{ label: 'Total PO Value', value: formatCurrency(data.purchase_orders.total_value) },
						]}
					/>
				</SectionCard>

				<SectionCard title="Operational Throughput" subtitle="How much approved work is actually moving">
					<MetricList
						items={[
							{ label: 'Dispatch Draft', value: data.dispatch.draft, tone: 'warning' },
							{ label: 'Dispatch Pending Approval', value: data.dispatch.pending_approval, tone: 'warning' },
							{ label: 'Dispatch Dispatched', value: data.dispatch.dispatched, tone: 'positive' },
							{ label: 'Dispatch Cancelled', value: data.dispatch.cancelled, tone: 'negative' },
						]}
					/>
				</SectionCard>
			</div>
		</DashboardShell>
	);
}
