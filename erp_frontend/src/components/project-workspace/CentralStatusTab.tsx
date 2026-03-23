'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle, Loader2, RefreshCcw,
  Settings, ShoppingCart, DollarSign, Wrench, Users2,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { callOps } from './pm-helpers';

type CentralStatus = {
  engineering: {
    drawings: any[];
    drawing_count: number;
    boqs: any[];
    boq_count: number;
    change_requests: any[];
  };
  procurement: {
    indents: any[];
    indent_by_status: Record<string, number>;
    dispatch_challans: any[];
    grns: any[];
    grn_by_status: Record<string, number>;
  };
  finance: {
    invoices: any[];
    total_invoiced: number;
    total_collected: number;
    pending_amount: number;
    payment_receipts: any[];
    petty_cash: any[];
    petty_total: number;
    petty_approved: number;
  };
  ic: {
    checklists: any[];
    checklist_by_status: Record<string, number>;
    test_reports: any[];
    signoffs: any[];
  };
  hr: {
    team_members: any[];
    active_count: number;
    total_count: number;
    manpower: {
      total_man_days: number;
      total_entries: number;
      total_overtime: number;
    };
  };
};

export default function CentralStatusTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<CentralStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    engineering: true, procurement: true, finance: true, ic: true, hr: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await callOps<CentralStatus>('get_pm_central_status', { project: projectId });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load central team status');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const toggle = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-sm text-[var(--text-muted)]">
        {error || 'No data available.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">Read-only status from central teams. You do not own these workflows.</p>
        <button onClick={() => void load()} className="btn btn-secondary text-xs">
          <RefreshCcw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Engineering */}
      <SliceSection
        title="Engineering"
        icon={Settings}
        tone="blue"
        expanded={!!expanded.engineering}
        onToggle={() => toggle('engineering')}
        summary={`${data.engineering.drawing_count} drawings · ${data.engineering.boq_count} BOQs · ${data.engineering.change_requests.length} CRs`}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <MiniTable title="Drawings" rows={data.engineering.drawings} columns={[
            { key: 'title', label: 'Title' },
            { key: 'revision', label: 'Rev' },
            { key: 'status', label: 'Status' },
          ]} />
          <MiniTable title="BOQs" rows={data.engineering.boqs} columns={[
            { key: 'title', label: 'Title' },
            { key: 'status', label: 'Status' },
          ]} />
          <MiniTable title="Change Requests" rows={data.engineering.change_requests} columns={[
            { key: 'title', label: 'Title' },
            { key: 'status', label: 'Status' },
            { key: 'impact', label: 'Impact' },
          ]} />
        </div>
      </SliceSection>

      {/* Procurement */}
      <SliceSection
        title="Procurement"
        icon={ShoppingCart}
        tone="orange"
        expanded={!!expanded.procurement}
        onToggle={() => toggle('procurement')}
        summary={`${data.procurement.indents.length} indents · ${data.procurement.grns.length} GRNs · ${data.procurement.dispatch_challans.length} dispatches`}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <h5 className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Indent Status</h5>
            <StatusBreakdown data={data.procurement.indent_by_status} />
          </div>
          <div>
            <h5 className="mb-2 text-xs font-semibold text-[var(--text-muted)]">GRN Status</h5>
            <StatusBreakdown data={data.procurement.grn_by_status} />
          </div>
          <MiniTable title="Recent Dispatches" rows={data.procurement.dispatch_challans} columns={[
            { key: 'challan_number', label: 'Challan' },
            { key: 'status', label: 'Status' },
            { key: 'dispatch_date', label: 'Date' },
          ]} />
        </div>
      </SliceSection>

      {/* Finance */}
      <SliceSection
        title="Finance"
        icon={DollarSign}
        tone="green"
        expanded={!!expanded.finance}
        onToggle={() => toggle('finance')}
        summary={`Invoiced: ₹${fmt(data.finance.total_invoiced)} · Collected: ₹${fmt(data.finance.total_collected)} · Pending: ₹${fmt(data.finance.pending_amount)}`}
      >
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Invoiced" value={`₹${fmt(data.finance.total_invoiced)}`} />
          <MetricCard label="Collected" value={`₹${fmt(data.finance.total_collected)}`} tone="success" />
          <MetricCard label="Pending" value={`₹${fmt(data.finance.pending_amount)}`} tone="warning" />
          <MetricCard label="Petty Cash" value={`₹${fmt(data.finance.petty_total)}`} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MiniTable title="Invoices" rows={data.finance.invoices} columns={[
            { key: 'number', label: '#' },
            { key: 'status', label: 'Status' },
            { key: 'total_amount', label: 'Amount', render: (v: number) => `₹${fmt(v)}` },
          ]} />
          <MiniTable title="Payment Receipts" rows={data.finance.payment_receipts} columns={[
            { key: 'receipt_number', label: '#' },
            { key: 'amount', label: 'Amount', render: (v: number) => `₹${fmt(v)}` },
            { key: 'receipt_date', label: 'Date' },
          ]} />
        </div>
      </SliceSection>

      {/* I&C / Execution */}
      <SliceSection
        title="I&C / Execution"
        icon={Wrench}
        tone="purple"
        expanded={!!expanded.ic}
        onToggle={() => toggle('ic')}
        summary={`${data.ic.checklists.length} checklists · ${data.ic.test_reports.length} test reports · ${data.ic.signoffs.length} signoffs`}
      >
        <div className="mb-3">
          <h5 className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Checklist Status</h5>
          <StatusBreakdown data={data.ic.checklist_by_status} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MiniTable title="Test Reports" rows={data.ic.test_reports} columns={[
            { key: 'report_name', label: 'Report' },
            { key: 'test_type', label: 'Type' },
            { key: 'status', label: 'Status' },
          ]} />
          <MiniTable title="Signoffs" rows={data.ic.signoffs} columns={[
            { key: 'signoff_type', label: 'Type' },
            { key: 'status', label: 'Status' },
            { key: 'signoff_date', label: 'Date' },
          ]} />
        </div>
      </SliceSection>

      {/* HR / Admin */}
      <SliceSection
        title="HR / Admin"
        icon={Users2}
        tone="teal"
        expanded={!!expanded.hr}
        onToggle={() => toggle('hr')}
        summary={`${data.hr.active_count} active / ${data.hr.total_count} total · ${Math.round(data.hr.manpower.total_man_days)} man-days`}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Active Staff" value={String(data.hr.active_count)} />
          <MetricCard label="Total Assigned" value={String(data.hr.total_count)} />
          <MetricCard label="Man-Days" value={String(Math.round(data.hr.manpower.total_man_days))} />
          <MetricCard label="OT Hours" value={String(Math.round(data.hr.manpower.total_overtime))} />
        </div>
      </SliceSection>
    </div>
  );
}

/* ── Sub-Components ── */

function fmt(n: number): string {
  return (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function SliceSection({
  title, icon: Icon, tone, expanded, onToggle, summary, children,
}: {
  title: string;
  icon: typeof Settings;
  tone: string;
  expanded: boolean;
  onToggle: () => void;
  summary: string;
  children: React.ReactNode;
}) {
  const toneMap: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50/40',
    orange: 'border-orange-200 bg-orange-50/40',
    green: 'border-emerald-200 bg-emerald-50/40',
    purple: 'border-purple-200 bg-purple-50/40',
    teal: 'border-teal-200 bg-teal-50/40',
  };

  return (
    <div className={`rounded-xl border ${toneMap[tone] || 'border-gray-200 bg-gray-50/40'}`}>
      <button onClick={onToggle} className="flex w-full items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-semibold text-[var(--text-main)]">{title}</span>
          <span className="text-xs text-[var(--text-muted)]">— {summary}</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && <div className="border-t px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}

function MiniTable({ title, rows, columns }: {
  title: string;
  rows: any[];
  columns: { key: string; label: string; render?: (v: any) => string }[];
}) {
  return (
    <div>
      <h5 className="mb-2 text-xs font-semibold text-[var(--text-muted)]">{title} ({rows.length})</h5>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">None</p>
      ) : (
        <div className="max-h-48 overflow-auto rounded border border-[var(--border-subtle)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-gray-50">
                {columns.map((c) => (
                  <th key={c.key} className="px-2 py-1.5 text-left font-medium text-gray-500">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((row, i) => (
                <tr key={row.name || i} className="border-b last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className="px-2 py-1.5 text-gray-700">
                      {c.render ? c.render(row[c.key]) : (row[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBreakdown({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return <p className="text-xs text-gray-400">No data</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([status, count]) => (
        <span key={status} className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--text-main)]">
          {status}: <strong>{count}</strong>
        </span>
      ))}
    </div>
  );
}

function MetricCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'warning' }) {
  const cls = {
    default: 'bg-[var(--surface-raised)]',
    success: 'bg-emerald-50',
    warning: 'bg-amber-50',
  }[tone];
  return (
    <div className={`rounded-lg border border-[var(--border-subtle)] p-2.5 text-center ${cls}`}>
      <div className="text-base font-bold text-[var(--text-main)]">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
    </div>
  );
}
