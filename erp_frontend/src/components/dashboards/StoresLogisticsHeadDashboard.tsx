'use client';

import { Boxes, ClipboardList, Package, TriangleAlert, Truck, Warehouse } from 'lucide-react';
import { DashboardShell, MetricList, SectionCard, StatCard, formatCurrency, formatNumber, useApiData } from './shared';

type StoresDashboardData = {
	grns: {
		total: number;
		draft: number;
		submitted: number;
		approved: number;
		rejected: number;
		total_qty: number;
		total_value: number;
	};
	stock_position: {
		item_count: number;
		total_qty: number;
		total_value: number;
		negative_stock_count: number;
	};
	stock_aging: {
		age_0_30?: number;
		age_31_60?: number;
		age_61_90?: number;
		age_90_plus?: number;
		unknown?: number;
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
};

const initialData: StoresDashboardData = {
	grns: { total: 0, draft: 0, submitted: 0, approved: 0, rejected: 0, total_qty: 0, total_value: 0 },
	stock_position: { item_count: 0, total_qty: 0, total_value: 0, negative_stock_count: 0 },
	stock_aging: { age_0_30: 0, age_31_60: 0, age_61_90: 0, age_90_plus: 0, unknown: 0 },
	dispatch: { total: 0, draft: 0, pending_approval: 0, approved: 0, dispatched: 0, cancelled: 0, total_qty: 0 },
};

export default function StoresLogisticsHeadDashboard() {
	const { data, loading, error, lastUpdated, refresh } = useApiData<StoresDashboardData>('/api/dashboards/stores', initialData);

	return (
		<DashboardShell
			title="Stores Logistics Head Dashboard"
			subtitle="Leadership view for outbound movement, dispatch approvals, stock-aging risk, and warehouse control"
			loading={loading}
			error={error}
			lastUpdated={lastUpdated}
			onRetry={() => void refresh()}
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
				<StatCard title="Dispatch Pending" value={data.dispatch.pending_approval} hint={`${data.dispatch.approved} approved challans`} icon={Truck} tone="purple" />
				<StatCard title="Dispatched Qty" value={formatNumber(data.dispatch.total_qty)} hint={`${data.dispatch.dispatched} challans moved`} icon={Package} tone="blue" />
				<StatCard title="Aging 90+" value={data.stock_aging.age_90_plus || 0} hint="Old stock requiring liquidation plan" icon={TriangleAlert} tone="red" />
				<StatCard title="Negative Stock" value={data.stock_position.negative_stock_count} hint="Control exceptions to resolve" icon={ClipboardList} tone="amber" />
				<StatCard title="GRN Approved" value={data.grns.approved} hint={`${data.grns.total} total GRNs`} icon={Boxes} tone="green" />
				<StatCard title="Inventory Value" value={formatCurrency(data.stock_position.total_value)} hint={`${data.stock_position.item_count} stocked items`} icon={Warehouse} tone="teal" />
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
				<SectionCard title="Logistics Control" subtitle="Dispatch pipeline and movement bottlenecks">
					<MetricList
						items={[
							{ label: 'Dispatch Draft', value: data.dispatch.draft, tone: 'warning' },
							{ label: 'Pending Approval', value: data.dispatch.pending_approval, tone: data.dispatch.pending_approval > 0 ? 'warning' : 'positive' },
							{ label: 'Approved', value: data.dispatch.approved, tone: 'info' },
							{ label: 'Dispatched', value: data.dispatch.dispatched, tone: 'positive' },
							{ label: 'Cancelled', value: data.dispatch.cancelled, tone: data.dispatch.cancelled > 0 ? 'negative' : 'positive' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Stock Risk Desk" subtitle="Aging and negative-stock risk to be governed">
					<MetricList
						items={[
							{ label: '0-30 Days', value: data.stock_aging.age_0_30 || 0, tone: 'positive' },
							{ label: '31-60 Days', value: data.stock_aging.age_31_60 || 0, tone: 'info' },
							{ label: '61-90 Days', value: data.stock_aging.age_61_90 || 0, tone: 'warning' },
							{ label: '90+ Days', value: data.stock_aging.age_90_plus || 0, tone: (data.stock_aging.age_90_plus || 0) > 0 ? 'negative' : 'positive' },
							{ label: 'Negative Stock Count', value: data.stock_position.negative_stock_count, tone: data.stock_position.negative_stock_count > 0 ? 'negative' : 'positive' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Inbound Quality" subtitle="GRN and warehouse intake quality indicators">
					<MetricList
						items={[
							{ label: 'GRN Draft', value: data.grns.draft, tone: 'warning' },
							{ label: 'GRN Pending Approval', value: data.grns.submitted, tone: 'info' },
							{ label: 'GRN Approved', value: data.grns.approved, tone: 'positive' },
							{ label: 'GRN Rejected', value: data.grns.rejected, tone: data.grns.rejected > 0 ? 'warning' : 'positive' },
							{ label: 'Receipt Value', value: formatCurrency(data.grns.total_value) },
						]}
					/>
				</SectionCard>
			</div>
		</DashboardShell>
	);
}