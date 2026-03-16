'use client';

import { AlertTriangle, ArrowRight, Banknote, ClipboardCheck, FileText, PackageCheck, ShoppingCart, Truck } from 'lucide-react';
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

export default function ProcurementOverviewDashboard() {
  const { data, loading, error, lastUpdated, refresh } = useApiData<ProcurementDashboardData>('/api/dashboards/procurement', initialData);
  const comparisonReadiness = data.vendor_comparisons.total > 0
    ? (data.vendor_comparisons.three_quote_ready * 100) / data.vendor_comparisons.total
    : 0;
  const actionBacklog = data.indents.pending_purchase + data.vendor_comparisons.pending_approval + data.dispatch.pending_approval;

  return (
    <DashboardShell
      title="Procurement Overview"
      subtitle="A quick command view for requisition pressure, approvals, commercial exposure, and movement."
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      onRetry={() => void refresh()}
    >
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr,1fr]">
        <div className="rounded-2xl bg-gradient-to-br from-[#5a3e2b] via-[#8a5a3b] to-[#c27c44] p-6 text-white shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-white/75">Today Focus</p>
              <h2 className="mt-2 text-2xl font-semibold">Push approvals forward and keep supply movement unblocked.</h2>
              <p className="mt-3 max-w-2xl text-sm text-white/80">
                Use the Procurement tab for detailed vendor-comparison operations. This overview is meant for fast scanning and prioritization.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <AlertTriangle className="h-7 w-7" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/70">Action backlog</div>
              <div className="mt-2 text-3xl font-semibold">{actionBacklog}</div>
              <div className="mt-1 text-sm text-white/75">Indents, approvals, dispatch</div>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/70">Unpaid exposure</div>
              <div className="mt-2 text-3xl font-semibold">{data.payments.approved_unpaid_count}</div>
              <div className="mt-1 text-sm text-white/75">{formatCurrency(data.payments.approved_unpaid_amount)}</div>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/70">3-quote readiness</div>
              <div className="mt-2 text-3xl font-semibold">{data.vendor_comparisons.three_quote_ready}</div>
              <div className="mt-1 text-sm text-white/75">{formatPercent(comparisonReadiness)} governance-ready</div>
            </div>
          </div>
        </div>

        <SectionCard title="Quick Signals" subtitle="Fast commercial and workflow snapshot">
          <MetricList
            items={[
              { label: 'Pending indents', value: data.indents.pending_purchase, tone: data.indents.pending_purchase > 0 ? 'warning' : 'positive' },
              { label: 'Pending approvals', value: data.vendor_comparisons.pending_approval, tone: data.vendor_comparisons.pending_approval > 0 ? 'warning' : 'positive' },
              { label: 'PO to receive', value: data.purchase_orders.to_receive, tone: 'info' },
              { label: 'Approved dispatches', value: data.dispatch.approved, tone: 'positive' },
              { label: 'Total PO value', value: formatCurrency(data.purchase_orders.total_value), tone: 'default' },
            ]}
          />
        </SectionCard>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Indent Queue"
          value={data.indents.pending_purchase}
          hint={`${data.indents.total} total requisitions`}
          icon={FileText}
          tone="blue"
        />
        <StatCard
          title="Comparison Desk"
          value={data.vendor_comparisons.pending_approval}
          hint={`${data.vendor_comparisons.three_quote_ready} ready for governance`}
          icon={ClipboardCheck}
          tone="green"
        />
        <StatCard
          title="PO Pipeline"
          value={data.purchase_orders.to_receive}
          hint={formatCurrency(data.purchase_orders.total_value)}
          icon={ShoppingCart}
          tone="orange"
        />
        <StatCard
          title="Payment Exposure"
          value={data.payments.approved_unpaid_count}
          hint={formatCurrency(data.payments.approved_unpaid_amount)}
          icon={Banknote}
          tone="red"
        />
        <StatCard
          title="Dispatch Queue"
          value={data.dispatch.pending_approval}
          hint={`${data.dispatch.dispatched} already moved`}
          icon={Truck}
          tone="purple"
        />
        <StatCard
          title="Moved Quantity"
          value={data.dispatch.total_qty}
          hint={`${data.dispatch.approved} challans approved`}
          icon={PackageCheck}
          tone="teal"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard title="Priority Queue" subtitle="What usually needs attention first">
          <MetricList
            items={[
              { label: 'Pending purchase indents', value: data.indents.pending_purchase, tone: data.indents.pending_purchase > 0 ? 'warning' : 'positive' },
              { label: 'Draft comparisons', value: data.vendor_comparisons.draft, tone: data.vendor_comparisons.draft > 0 ? 'warning' : 'default' },
              { label: 'Comparison approvals pending', value: data.vendor_comparisons.pending_approval, tone: data.vendor_comparisons.pending_approval > 0 ? 'negative' : 'positive' },
              { label: 'Dispatch approvals pending', value: data.dispatch.pending_approval, tone: data.dispatch.pending_approval > 0 ? 'warning' : 'positive' },
            ]}
          />
        </SectionCard>

        <SectionCard title="Commercial Health" subtitle="Procurement money and commitment snapshot">
          <MetricList
            items={[
              { label: 'Selected comparison value', value: formatCurrency(data.vendor_comparisons.selected_total_amount), tone: 'info' },
              { label: 'Approved unpaid amount', value: formatCurrency(data.payments.approved_unpaid_amount), tone: data.payments.approved_unpaid_amount > 0 ? 'negative' : 'positive' },
              { label: 'PO completed', value: data.purchase_orders.completed, tone: 'positive' },
              { label: 'PO cancelled', value: data.purchase_orders.cancelled, tone: data.purchase_orders.cancelled > 0 ? 'negative' : 'default' },
            ]}
          />
        </SectionCard>

        <SectionCard title="Next Step" subtitle="Open the detailed procurement workspace for record-level action">
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-900">Open Procurement tab</div>
            <p className="mt-2 text-sm text-gray-600">
              There you can create vendor comparisons, review records, and take submit, approve, reject, revise, or PO actions.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#8a5a3b]">
              Detailed workspace
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
