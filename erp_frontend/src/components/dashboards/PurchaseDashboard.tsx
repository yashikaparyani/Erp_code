'use client';

import { Banknote, ClipboardList, FileText, ShoppingCart, Truck, WalletCards } from 'lucide-react';
import { DashboardShell, MetricList, SectionCard, StatCard, formatCurrency, formatPercent, useApiData } from './shared';

type PurchaseDashboardData = {
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

const initialData: PurchaseDashboardData = {
	indents: { total: 0, draft: 0, submitted: 0, pending_purchase: 0, ordered: 0, stopped: 0, cancelled: 0 },
	purchase_orders: { total: 0, draft: 0, submitted: 0, to_receive: 0, completed: 0, cancelled: 0, total_value: 0 },
	vendor_comparisons: { total: 0, draft: 0, pending_approval: 0, approved: 0, rejected: 0, three_quote_ready: 0, selected_total_amount: 0 },
	dispatch: { total: 0, draft: 0, pending_approval: 0, approved: 0, dispatched: 0, cancelled: 0, total_qty: 0 },
	payments: { approved_unpaid_count: 0, approved_unpaid_amount: 0 },
};

export default function PurchaseDashboard() {
	const { data, loading, error, lastUpdated, refresh } = useApiData<PurchaseDashboardData>('/api/dashboards/procurement', initialData);
	const comparisonReadiness = data.vendor_comparisons.total > 0
		? (data.vendor_comparisons.three_quote_ready * 100) / data.vendor_comparisons.total
		: 0;

	return (
		<DashboardShell
			title="Purchase Officer Dashboard"
			subtitle="Personalized purchase desk for indent action, PO release, dispatch flow, and payment-follow pressure"
			loading={loading}
			error={error}
			lastUpdated={lastUpdated}
			onRetry={() => void refresh()}
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
				<StatCard title="Indents To Process" value={data.indents.pending_purchase} hint={`${data.indents.total} total indent records`} icon={FileText} tone="blue" />
				<StatCard title="PO To Receive" value={data.purchase_orders.to_receive} hint={`${data.purchase_orders.submitted} submitted POs`} icon={ShoppingCart} tone="orange" />
				<StatCard title="Comparison Ready" value={data.vendor_comparisons.three_quote_ready} hint={`${formatPercent(comparisonReadiness)} compliance-ready`} icon={ClipboardList} tone="green" />
				<StatCard title="Dispatch Pending" value={data.dispatch.pending_approval} hint={`${data.dispatch.approved} approved challans`} icon={Truck} tone="purple" />
				<StatCard title="Approved Unpaid" value={data.payments.approved_unpaid_count} hint={formatCurrency(data.payments.approved_unpaid_amount)} icon={Banknote} tone="red" />
				<StatCard title="PO Value" value={formatCurrency(data.purchase_orders.total_value)} hint={`${data.purchase_orders.total} total POs`} icon={WalletCards} tone="teal" />
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
				<SectionCard title="My Purchase Queue" subtitle="First list for daily action completion">
					<MetricList
						items={[
							{ label: 'Pending Purchase', value: data.indents.pending_purchase, tone: data.indents.pending_purchase > 0 ? 'warning' : 'positive' },
							{ label: 'Draft Indents', value: data.indents.draft, tone: 'warning' },
							{ label: 'Submitted Indents', value: data.indents.submitted, tone: 'info' },
							{ label: 'Stopped or Cancelled', value: data.indents.stopped + data.indents.cancelled, tone: data.indents.stopped + data.indents.cancelled > 0 ? 'negative' : 'positive' },
						]}
					/>
				</SectionCard>

				<SectionCard title="PO Control" subtitle="Commercial commitments currently in motion">
					<MetricList
						items={[
							{ label: 'PO Draft', value: data.purchase_orders.draft, tone: 'warning' },
							{ label: 'PO Submitted', value: data.purchase_orders.submitted, tone: 'info' },
							{ label: 'PO To Receive', value: data.purchase_orders.to_receive, tone: 'warning' },
							{ label: 'PO Completed', value: data.purchase_orders.completed, tone: 'positive' },
							{ label: 'PO Cancelled', value: data.purchase_orders.cancelled, tone: data.purchase_orders.cancelled > 0 ? 'negative' : 'positive' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Comparison and Dispatch" subtitle="Vendor readiness and movement status">
					<MetricList
						items={[
							{ label: 'Comparison Pending Approval', value: data.vendor_comparisons.pending_approval, tone: data.vendor_comparisons.pending_approval > 0 ? 'warning' : 'positive' },
							{ label: 'Comparison Approved', value: data.vendor_comparisons.approved, tone: 'positive' },
							{ label: 'Dispatch Pending Approval', value: data.dispatch.pending_approval, tone: data.dispatch.pending_approval > 0 ? 'warning' : 'positive' },
							{ label: 'Dispatch Dispatched', value: data.dispatch.dispatched, tone: 'positive' },
							{ label: 'Dispatched Quantity', value: data.dispatch.total_qty },
						]}
					/>
				</SectionCard>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<SectionCard title="Cash Pressure" subtitle="Approved but unpaid commercial exposure">
					<MetricList
						items={[
							{ label: 'Approved Unpaid Count', value: data.payments.approved_unpaid_count, tone: data.payments.approved_unpaid_count > 0 ? 'negative' : 'positive' },
							{ label: 'Approved Unpaid Amount', value: formatCurrency(data.payments.approved_unpaid_amount), tone: data.payments.approved_unpaid_amount > 0 ? 'negative' : 'positive' },
							{ label: 'Selected Comparison Value', value: formatCurrency(data.vendor_comparisons.selected_total_amount) },
							{ label: 'Total PO Value', value: formatCurrency(data.purchase_orders.total_value) },
						]}
					/>
				</SectionCard>

				<SectionCard title="Execution Readiness" subtitle="How much purchase work is converted to movement">
					<MetricList
						items={[
							{ label: 'Ordered Indents', value: data.indents.ordered, tone: 'positive' },
							{ label: 'Dispatch Approved', value: data.dispatch.approved, tone: 'positive' },
							{ label: 'Dispatch Pending', value: data.dispatch.pending_approval, tone: data.dispatch.pending_approval > 0 ? 'warning' : 'positive' },
							{ label: 'Comparison Readiness', value: formatPercent(comparisonReadiness), tone: comparisonReadiness >= 70 ? 'positive' : 'warning' },
						]}
					/>
				</SectionCard>
			</div>
		</DashboardShell>
	);
}