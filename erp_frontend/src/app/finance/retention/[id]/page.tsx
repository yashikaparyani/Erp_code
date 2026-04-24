'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import AccountabilityTimeline from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { callApi, formatCurrency, formatDate, statusVariant, useAuth, hasAnyRole } from '@/components/finance/fin-helpers';

type Retention = Record<string, any>;

export default function RetentionDetailPage() {
  const { id } = useParams() as { id: string };
  const { currentUser } = useAuth();
  const [data, setData] = useState<Retention | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRelease, setShowRelease] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await callApi<Retention>(`/api/retention/${encodeURIComponent(id)}`)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const d = data || {} as Retention;
  const held = Number(d.retention_amount || 0);
  const released = Number(d.release_amount || 0);
  const remaining = held - released;
  const pct = held > 0 ? Math.round((released / held) * 100) : 0;
  const canRelease = hasAnyRole(currentUser?.roles, 'Director', 'System Manager', 'Department Head') && remaining > 0;

  return (
    <DetailPage
      title={d.name || id} kicker="Retention"
      backHref="/finance/retention" backLabel="Retention"
      loading={loading} error={error} onRetry={load}
      status={d.status} statusVariant={statusVariant(d.status)}
      headerActions={
        <div className="flex gap-2">
          {canRelease ? <button className="btn btn-primary" onClick={() => setShowRelease(true)}>Release</button> : null}
          <button className="btn btn-secondary" onClick={() => setShowUpdate(true)}>Update</button>
          <button className="btn btn-secondary text-red-600" onClick={() => setShowDelete(true)}>Delete</button>
        </div>
      }
      identityBlock={
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="stat-card"><span className="text-gray-500 text-xs">Retained</span><p className="font-semibold text-lg">{formatCurrency(held)}</p></div>
            <div className="stat-card"><span className="text-gray-500 text-xs">Released</span><p className="font-semibold text-lg text-green-700">{formatCurrency(released)}</p></div>
            <div className="stat-card"><span className="text-gray-500 text-xs">Remaining</span><p className="font-semibold text-lg text-orange-600">{formatCurrency(remaining)}</p></div>
            <div className="stat-card"><span className="text-gray-500 text-xs">Released %</span><p className="font-semibold text-lg">{pct}%</p></div>
          </div>
          {/* Release Progress */}
          <div className="mb-4">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
          </div>
          {/* Detail Card */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Details</h3></div>
            <div className="card-body grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Project</span><p>{d.linked_project || '-'}</p></div>
              <div><span className="text-gray-500">Invoice</span><p>{d.linked_invoice || '-'}</p></div>
              <div><span className="text-gray-500">Retention %</span><p>{d.retention_percent ?? '-'}%</p></div>
              <div><span className="text-gray-500">Release Due</span><p>{formatDate(d.release_due_date)}</p></div>
              <div><span className="text-gray-500">Customer</span><p>{d.customer || '-'}</p></div>
              <div className="col-span-2"><span className="text-gray-500">Remarks</span><p>{d.remarks || '-'}</p></div>
            </div>
          </div>
        </>
      }
      sidePanels={
        <>
          <RecordDocumentsPanel referenceDoctype="GE Retention Ledger" referenceName={id} title="Documents" />
          <LinkedRecordsPanel links={[
            ...(d.linked_invoice ? [{ label: 'Invoice', doctype: 'GE Invoice', method: 'frappe.client.get_list', args: { doctype: 'GE Invoice', filters: JSON.stringify({ name: d.linked_invoice }), fields: JSON.stringify(['name','amount','net_receivable','status']), limit_page_length: '5' }, href: (n: string) => `/finance/billing/${n}` }] : []),
          ]} />
          <AccountabilityTimeline subjectDoctype="GE Retention Ledger" subjectName={id} />
        </>
      }
    >
      <ActionModal
        open={showRelease} title="Release Retention"
        confirmLabel="Release" variant="default"
        fields={[
          { name: 'release_amount', label: `Amount to Release (max ${formatCurrency(remaining)})`, type: 'text', required: true },
        ]}
        onConfirm={async (v) => { await callApi(`/api/retention/${encodeURIComponent(id)}/actions`, { method: 'POST', body: { action: 'release', ...v } }); setShowRelease(false); load(); }}
        onCancel={() => setShowRelease(false)}
      />

      <ActionModal
        open={showUpdate}
        title="Update Retention"
        confirmLabel="Update"
        variant="default"
        fields={[{ name: 'remarks', label: 'Update Note', type: 'textarea' }]}
        onConfirm={async (v) => { await callApi(`/api/retention/${encodeURIComponent(id)}`, { method: 'PATCH', body: v }); setShowUpdate(false); load(); }}
        onCancel={() => setShowUpdate(false)}
      />

      <ActionModal
        open={showDelete}
        title="Delete Retention"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => { await callApi(`/api/retention/${encodeURIComponent(id)}`, { method: 'DELETE' }); setShowDelete(false); load(); }}
        onCancel={() => setShowDelete(false)}
      />
    </DetailPage>
  );
}
