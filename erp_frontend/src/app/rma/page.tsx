'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';
import Link from 'next/link';
import RegisterPage, { StatItem } from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';
import {
  callApi, formatCurrency, formatDate, badge, hasAnyRole, useAuth,
  RMA_BADGES, WARRANTY_BADGES,
} from '@/components/om/om-helpers';

interface RMATracker {
  name: string;
  linked_ticket?: string;
  linked_project?: string;
  item_link?: string;
  asset_serial_number?: string;
  qty?: number;
  faulty_date?: string;
  dispatch_destination?: string;
  service_partner_name?: string;
  warranty_status?: string;
  repairability_status?: string;
  rma_reference_no?: string;
  approval_status?: string;
  rma_purchase_order_no?: string;
  repairing_status?: string;
  aging_days?: number;
  rma_status?: string;
  repair_cost?: number;
  ph_status?: string;
}

interface RMAStats {
  total?: number; pending?: number; in_transit?: number;
  under_repair?: number; repaired?: number; rejected?: number;
  under_warranty?: number; non_warranty?: number;
  repairable?: number; non_repairable?: number; awaiting_approval?: number;
}

export default function RMAPage() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<RMATracker[]>([]);
  const [stats, setStats] = useState<RMAStats>({});
  const [tickets, setTickets] = useState<{ name: string; title?: string; linked_project?: string; asset_serial_no?: string; is_rma?: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [listRes, statsRes, ticketRes] = await Promise.all([
        apiFetch('/api/rma-trackers').catch(() => ({ data: [] })),
        apiFetch('/api/rma-trackers/stats').catch(() => ({ data: {} })),
        apiFetch('/api/tickets').catch(() => ({ data: [] })),
      ]);
      setItems(listRes.data || []);
      setStats(statsRes.data || {});
      setTickets((ticketRes.data || []).filter((t: any) => !t.is_rma));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const canManage = hasAnyRole(currentUser?.roles, 'Director', 'System Manager', 'OM Operator', 'RMA Manager');

  const statItems: StatItem[] = [
    { label: 'Total RMA', value: stats.total ?? items.length },
    { label: 'In Transit', value: stats.in_transit ?? 0, variant: 'warning' },
    { label: 'Under Warranty', value: stats.under_warranty ?? 0, variant: 'success' },
    { label: 'Awaiting Approval', value: stats.awaiting_approval ?? 0, variant: 'error' },
    { label: 'Rejected', value: stats.rejected ?? 0, variant: 'error' },
  ];

  const rmaAction = async (name: string, action: string, extra?: Record<string, string>) => {
    setBusyId(name);
    try {
      await callApi('/api/rma-trackers', { method: 'PATCH', body: { name, action, reason: extra?.reason || '', new_status: extra?.new_status || '' } });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); }
    setBusyId(null);
  };

  const submitToPH = async (name: string) => {
    setBusyId(name);
    try {
      await callApi('/api/rma-trackers', { method: 'PATCH', body: { name, action: 'submit_to_ph' } });
      await load();
    } catch { /* ignore */ }
    setBusyId(null);
  };

  return (
    <>
      <RegisterPage
        title="RMA Department"
        description="Field fault to dispatch, RCA, warranty approval, repair, and return-to-location tracking"
        loading={loading}
        error={error}
        empty={!loading && items.length === 0}
        emptyTitle="No RMA records"
        emptyDescription="No RMA trackers found"
        onRetry={load}
        stats={statItems}
        headerActions={
          canManage ? <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create RMA</button> : undefined
        }
      >
        {error && !showCreate && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 flex items-center justify-between">
            {error}
            <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>RMA ID</th>
                <th>Project / Ticket</th>
                <th>Item / Serial</th>
                <th>Destination</th>
                <th>Warranty</th>
                <th>Repairability</th>
                <th>Approval / PO</th>
                <th>Status</th>
                <th>Aging</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const st = item.rma_status || 'PENDING';
                return (
                  <tr key={item.name}>
                    <td>
                      <Link href={`/rma/${encodeURIComponent(item.name)}`} className="font-medium text-blue-700 hover:underline">{item.name}</Link>
                      <div className="text-xs text-gray-500">{item.rma_reference_no || '-'}</div>
                    </td>
                    <td>
                      {item.linked_project ? <Link href={`/projects/${encodeURIComponent(item.linked_project)}`} className="text-sm text-blue-600 hover:underline">{item.linked_project}</Link> : <span className="text-gray-400">-</span>}
                      <div className="text-xs text-gray-500">{item.linked_ticket || '-'}</div>
                    </td>
                    <td>
                      <div className="text-sm">{item.item_link || '-'}</div>
                      <div className="text-xs text-gray-500">{item.asset_serial_number || '-'}</div>
                    </td>
                    <td>
                      <div className="text-sm">{item.dispatch_destination || '-'}</div>
                      <div className="text-xs text-gray-500">{item.service_partner_name || '-'}</div>
                    </td>
                    <td><span className={`badge ${badge(WARRANTY_BADGES, item.warranty_status)}`}>{(item.warranty_status || '-').replace(/_/g, ' ')}</span></td>
                    <td>
                      <div className="text-sm">{item.repairability_status || '-'}</div>
                      <div className="text-xs text-gray-500">Qty {item.qty ?? 1}</div>
                    </td>
                    <td>
                      <div className="text-sm">{item.approval_status || '-'}</div>
                      <div className="text-xs text-gray-500">{item.rma_purchase_order_no || '-'}</div>
                    </td>
                    <td><span className={`badge ${badge(RMA_BADGES, st)}`}>{st.replace(/_/g, ' ')}</span></td>
                    <td className="font-medium">{item.aging_days ?? 0} days</td>
                    {canManage && (
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {st === 'PENDING' && <button onClick={() => rmaAction(item.name, 'approve')} disabled={busyId === item.name} className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50">Approve</button>}
                          {st === 'PENDING' && <button onClick={() => setRejectTarget(item.name)} className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100">Reject</button>}
                          {st === 'APPROVED' && <button onClick={() => rmaAction(item.name, 'status', { new_status: 'IN_TRANSIT' })} disabled={busyId === item.name} className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded hover:bg-amber-100 disabled:opacity-50">In Transit</button>}
                          {st === 'APPROVED' && !item.ph_status && <button onClick={() => submitToPH(item.name)} disabled={busyId === item.name} className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50">Submit PO to PH</button>}
                          {['REPAIRED', 'REPLACED', 'REJECTED'].includes(st) && <button onClick={() => rmaAction(item.name, 'close')} disabled={busyId === item.name} className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50">Close</button>}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </RegisterPage>

      <FormModal
        open={showCreate}
        title="Create RMA"
        description="Raise a fresh RMA record or link to an existing helpdesk ticket"
        size="lg"
        busy={createBusy}
        confirmLabel="Create RMA"
        fields={[
          { name: 'linked_ticket', label: 'Linked Ticket', type: 'select', options: tickets.map(t => ({ value: t.name, label: `${t.name} - ${t.title || 'Untitled'}` })) },
          { name: 'linked_project', label: 'Project', type: 'link', linkEntity: 'project' as const, placeholder: 'Search project…' },
          { name: 'item_link', label: 'Item', type: 'link', linkEntity: 'item' as const, placeholder: 'Search item…' },
          { name: 'asset_serial_number', label: 'Asset Serial', type: 'text' },
          { name: 'qty', label: 'Quantity', type: 'number', defaultValue: '1' },
          { name: 'faulty_date', label: 'Faulty Date', type: 'date' },
          { name: 'dispatch_destination', label: 'Dispatch Destination', type: 'select', defaultValue: 'OEM', options: [
            { value: 'OEM', label: 'OEM' }, { value: 'VENDOR', label: 'Vendor' },
            { value: 'HEAD_OFFICE', label: 'Head Office' }, { value: 'CENTRAL_TEAM', label: 'Central Team' },
            { value: 'THIRD_PARTY_REPAIR', label: 'Third Party Repair' },
          ]},
          { name: 'service_partner_name', label: 'Partner Name', type: 'text' },
          { name: 'warranty_status', label: 'Warranty Status', type: 'select', defaultValue: 'UNDER_WARRANTY', options: [
            { value: 'UNDER_WARRANTY', label: 'Under Warranty' }, { value: 'NON_WARRANTY', label: 'Non Warranty' },
          ]},
          { name: 'repairability_status', label: 'Repairability', type: 'select', defaultValue: 'REPAIRABLE', options: [
            { value: 'REPAIRABLE', label: 'Repairable' }, { value: 'NON_REPAIRABLE', label: 'Non Repairable' },
          ]},
          { name: 'failure_reason', label: 'Failure Reason', type: 'textarea' },
          { name: 'field_rca', label: 'Field RCA', type: 'textarea' },
        ]}
        onConfirm={async (values) => {
          setCreateBusy(true);
          try {
            await callApi('/api/rma-trackers', { method: 'POST', body: { ...values, qty: Number(values.qty) || 1 } });
            setShowCreate(false);
            await load();
          } catch { /* handled */ }
          finally { setCreateBusy(false); }
        }}
        onCancel={() => setShowCreate(false)}
      />

      <ActionModal
        open={rejectTarget !== null}
        title="Reject RMA"
        description={`Reject RMA "${rejectTarget}"?`}
        confirmLabel="Reject"
        variant="danger"
        fields={[{ name: 'reason', label: 'Reject Reason', type: 'textarea' }]}
        onCancel={() => setRejectTarget(null)}
        onConfirm={async (values) => {
          if (rejectTarget) await rmaAction(rejectTarget, 'reject', { reason: values.reason || '' });
          setRejectTarget(null);
        }}
      />
    </>
  );
}
