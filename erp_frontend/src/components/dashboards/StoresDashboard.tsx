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

export default function StoresDashboard() {
	const { data, loading, error, lastUpdated, refresh } = useApiData<StoresDashboardData>('/api/dashboards/stores', initialData);

	return (
		<DashboardShell
			title="Stores Dashboard"
			subtitle="Live GRN, stock, aging, and dispatch visibility from ERPNext-backed inventory data"
			loading={loading}
			error={error}
			lastUpdated={lastUpdated}
			onRetry={() => void refresh()}
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
				<StatCard title="GRN Queue" value={data.grns.total} hint={`${data.grns.approved} approved receipts`} icon={Package} tone="blue" />
				<StatCard title="Stock Items" value={data.stock_position.item_count} hint={`${formatNumber(data.stock_position.total_qty)} total quantity`} icon={Boxes} tone="green" />
				<StatCard title="Stock Value" value={formatCurrency(data.stock_position.total_value)} hint="Computed from live Bin valuation" icon={Warehouse} tone="teal" />
				<StatCard title="Aging 90+" value={data.stock_aging.age_90_plus || 0} hint={`${data.stock_aging.unknown || 0} items with unknown aging`} icon={TriangleAlert} tone="red" />
				<StatCard title="Negative Stock" value={data.stock_position.negative_stock_count} hint="Items requiring warehouse cleanup" icon={ClipboardList} tone="amber" />
				<StatCard title="Dispatch Qty" value={formatNumber(data.dispatch.total_qty)} hint={`${data.dispatch.dispatched} challans dispatched`} icon={Truck} tone="purple" />
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
				<SectionCard title="GRN Status" subtitle="Inbound receipt flow across stores">
					<MetricList
						items={[
							{ label: 'Draft', value: data.grns.draft, tone: 'warning' },
							{ label: 'Pending Approval', value: data.grns.submitted, tone: 'info' },
							{ label: 'Approved', value: data.grns.approved, tone: 'positive' },
							{ label: 'Rejected', value: data.grns.rejected, tone: 'negative' },
							{ label: 'Total Qty', value: data.grns.total_qty },
							{ label: 'Receipt Value', value: formatCurrency(data.grns.total_value) },
						]}
					/>
				</SectionCard>

				<SectionCard title="Stock Position" subtitle="Current quantity and valuation overview">
					<MetricList
						items={[
							{ label: 'Item Count', value: data.stock_position.item_count },
							{ label: 'Total Quantity', value: formatNumber(data.stock_position.total_qty) },
							{ label: 'Total Value', value: formatCurrency(data.stock_position.total_value) },
							{ label: 'Negative Stock Count', value: data.stock_position.negative_stock_count, tone: data.stock_position.negative_stock_count > 0 ? 'negative' : 'positive' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Dispatch Throughput" subtitle="Outbound movement and approval staging">
					<MetricList
						items={[
							{ label: 'Draft', value: data.dispatch.draft, tone: 'warning' },
							{ label: 'Pending Approval', value: data.dispatch.pending_approval, tone: 'warning' },
							{ label: 'Approved', value: data.dispatch.approved, tone: 'info' },
							{ label: 'Dispatched', value: data.dispatch.dispatched, tone: 'positive' },
							{ label: 'Cancelled', value: data.dispatch.cancelled, tone: 'negative' },
						]}
					/>
				</SectionCard>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<SectionCard title="Stock Aging Buckets" subtitle="Item counts by last positive receipt age">
					<MetricList
						items={[
							{ label: '0-30 Days', value: data.stock_aging.age_0_30 || 0, tone: 'positive' },
							{ label: '31-60 Days', value: data.stock_aging.age_31_60 || 0, tone: 'info' },
							{ label: '61-90 Days', value: data.stock_aging.age_61_90 || 0, tone: 'warning' },
							{ label: '90+ Days', value: data.stock_aging.age_90_plus || 0, tone: 'negative' },
							{ label: 'Unknown Age', value: data.stock_aging.unknown || 0, tone: 'warning' },
						]}
					/>
				</SectionCard>

				<SectionCard title="Warehouse Risk" subtitle="Where store operations need immediate control action">
					<MetricList
						items={[
							{ label: 'Negative Stock Items', value: data.stock_position.negative_stock_count, tone: data.stock_position.negative_stock_count > 0 ? 'negative' : 'positive' },
							{ label: 'Aged 90+ Items', value: data.stock_aging.age_90_plus || 0, tone: (data.stock_aging.age_90_plus || 0) > 0 ? 'negative' : 'positive' },
							{ label: 'Pending Dispatch Approval', value: data.dispatch.pending_approval, tone: data.dispatch.pending_approval > 0 ? 'warning' : 'positive' },
							{ label: 'GRN Pending Approval', value: data.grns.submitted, tone: data.grns.submitted > 0 ? 'warning' : 'positive' },
						]}
					/>
				</SectionCard>
			</div>
		</DashboardShell>
	);
}
