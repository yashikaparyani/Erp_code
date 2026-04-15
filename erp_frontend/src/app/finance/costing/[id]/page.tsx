'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import AccountabilityTimeline from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { formatCurrency, formatDate, COST_SHEET_BADGES, statusVariant, useAuth, hasAnyRole } from '@/components/finance/fin-helpers';

type Sheet = Record<string, any>;

export default function CostingDetailPage() {
  const { id } = useParams() as { id: string };
  const { currentUser } = useAuth();
  const [data, setData] = useState<Sheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReject, setShowReject] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/cost-sheets/${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed');
      setData(json.data ?? json);
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const d = data || {} as Sheet;
  const items: any[] = d.items || [];
  const canApprove = hasAnyRole(currentUser?.roles, 'Finance Admin', 'Costing Approver');
  const canEdit = hasAnyRole(currentUser?.roles, 'Finance Officer', 'Finance Admin');

  return (
    <DetailPage
      title={d.name || id} kicker="Cost Sheet"
      backHref="/finance/costing" backLabel="Cost Sheets"
      loading={loading} error={error} onRetry={load}
      status={d.status} statusVariant={statusVariant(d.status)}
      headerActions={
        <div className="flex gap-2">
          {canApprove && d.status === 'Pending' && <button className="btn btn-primary" onClick={async () => { await fetch(`/api/cost-sheets/${encodeURIComponent(id)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve' }) }); load(); }}>Approve</button>}
          {canApprove && d.status === 'Pending' && <button className="btn btn-secondary text-red-600" onClick={() => setShowReject(true)}>Reject</button>}
          {canEdit && d.status === 'Draft' && <button className="btn btn-primary" onClick={async () => { await fetch(`/api/cost-sheets/${encodeURIComponent(id)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submit' }) }); load(); }}>Submit</button>}
        </div>
      }
      identityBlock={
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Cost Summary</h3></div>
          <div className="card-body grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Tender / BOQ</span><p>{d.tender || '-'} / {d.boq || '-'}</p></div>
            <div><span className="text-gray-500">Version</span><p>{d.version || 1}</p></div>
            <div><span className="text-gray-500">Cost Type</span><p>{d.cost_type || '-'}</p></div>
            <div><span className="text-gray-500">Project</span><p>{d.project || '-'}</p></div>
            <div><span className="text-gray-500">Base Cost</span><p className="font-semibold">{formatCurrency(d.base_cost)}</p></div>
            <div><span className="text-gray-500">Sell Value</span><p className="font-semibold">{formatCurrency(d.sell_value)}</p></div>
            <div><span className="text-gray-500">Gross Margin</span><p className="font-semibold">{formatCurrency(d.gross_margin)} ({d.margin_pct||0}%)</p></div>
            <div><span className="text-gray-500">Next Step</span><p className="text-orange-600 font-medium">{d.next_step || '-'}</p></div>
          </div>
        </div>
      }
      sidePanels={
        <>
          <TraceabilityPanel projectId={d.project || null} siteId={null} />
          <RecordDocumentsPanel referenceDoctype="Cost Sheet" referenceName={id} title="Documents" />
          <LinkedRecordsPanel links={[
            { label: 'Invoices', doctype: 'Sales Invoice', method: 'frappe.client.get_list', args: { doctype: 'Sales Invoice', filters: JSON.stringify({ cost_sheet: id }), fields: JSON.stringify(['name','grand_total','status']), limit_page_length: '10' }, href: (n: string) => `/finance/billing/${n}` },
            { label: 'Estimates', doctype: 'Estimate', method: 'frappe.client.get_list', args: { doctype: 'Estimate', filters: JSON.stringify({ cost_sheet: id }), fields: JSON.stringify(['name','grand_total','status']), limit_page_length: '10' }, href: (n: string) => `/finance/estimates/${n}` },
          ]} />
          <AccountabilityTimeline subjectDoctype="Cost Sheet" subjectName={id} />
        </>
      }
    >
      {/* Line Items */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold">Line Items</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {!items.length ? <tr><td colSpan={6} className="py-6 text-center text-gray-500">No line items</td></tr>
                : items.map((it: any, i: number) => (
                  <tr key={i}><td>{i + 1}</td><td>{it.description || '-'}</td><td>{it.qty}</td><td>{it.unit || '-'}</td><td className="text-right">{formatCurrency(it.rate)}</td><td className="text-right">{formatCurrency(it.amount)}</td></tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <ActionModal
        open={showReject} title="Reject Cost Sheet"
        confirmLabel="Reject" variant="danger"
        fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
        onConfirm={async (v) => { await fetch(`/api/cost-sheets/${encodeURIComponent(id)}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', ...v }) }); setShowReject(false); load(); }}
        onCancel={() => setShowReject(false)}
      />
    </DetailPage>
  );
}
