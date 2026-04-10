'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, Plus, X } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import ActionModal from '@/components/ui/ActionModal';
import LinkPicker from '@/components/ui/LinkPicker';
import {
  callApi, formatCurrency, badge, COST_SHEET_BADGES, hasAnyRole,
} from '@/components/finance/fin-helpers';
import { useAuth } from '@/context/AuthContext';

interface CostSheet {
  name: string; linked_tender?: string; linked_project?: string; linked_boq?: string;
  version?: number; status?: string; margin_percent?: number; base_cost?: number;
  sell_value?: number; total_items?: number; created_by_user?: string; approved_by?: string;
}
interface Stats {
  total?: number; draft?: number; pending_approval?: number; approved?: number;
  rejected?: number; total_base_cost?: number; total_sell_value?: number;
}

const INIT = { linked_tender: '', linked_boq: '', description: '', cost_type: 'Material', quantity: 1, rate: 0, remarks: '' };

export default function FinanceCostingPage() {
  const { currentUser } = useAuth();
  const [rows, setRows] = useState<CostSheet[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [busyName, setBusyName] = useState<string | null>(null);
  const [reasonTarget, setReasonTarget] = useState<{ name: string; action: 'reject' | 'revise' } | null>(null);
  const [form, setForm] = useState(INIT);

  const canSubmit = hasAnyRole(currentUser?.roles, 'Director', 'System Manager', 'Accounts', 'Department Head');
  const canApprove = hasAnyRole(currentUser?.roles, 'Director', 'System Manager', 'Department Head');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, st] = await Promise.all([callApi<CostSheet[]>('/api/cost-sheets'), callApi<Stats>('/api/cost-sheets/stats')]);
      setRows(s || []); setStats(st || {});
    } catch { /* swallow */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.linked_tender.trim() || !form.description.trim()) { setError('Tender and Description required.'); return; }
    setCreating(true); setError('');
    try {
      await callApi('/api/cost-sheets', {
        method: 'POST',
        body: {
          linked_tender: form.linked_tender, linked_boq: form.linked_boq || undefined,
          notes: form.remarks || undefined,
          items: [{ description: form.description, cost_type: form.cost_type, qty: form.quantity, base_rate: form.rate, remarks: form.remarks }],
        },
      });
      setShowCreate(false); setForm(INIT); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setCreating(false);
  };

  const runAction = async (name: string, action: string, extra?: Record<string, string>) => {
    setBusyName(name); setError('');
    try {
      await callApi(`/api/cost-sheets/${encodeURIComponent(name)}/actions`, { method: 'POST', body: { action, ...(extra || {}) } });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setBusyName(null);
  };

  const variance = (stats.total_sell_value || 0) - (stats.total_base_cost || 0);

  const blocker = (r: CostSheet) =>
    r.status === 'DRAFT' ? 'Submit for approval'
    : r.status === 'PENDING_APPROVAL' || r.status === 'SUBMITTED' ? 'Waiting department head review'
    : r.status === 'REJECTED' ? 'Revise pricing or assumptions'
    : r.status === 'APPROVED' ? 'Ready for quote / proforma'
    : 'Review status';

  return (
    <RegisterPage
      title="Finance Costing" description="Cost sheets, base cost, sell value, and approval tracking"
      loading={loading} error={error} onRetry={load} empty={!rows.length && !loading}
      stats={[
        { label: 'Planned Cost', value: formatCurrency(stats.total_base_cost), variant: 'info' },
        { label: 'Sell Value', value: formatCurrency(stats.total_sell_value), variant: 'success' },
        { label: 'Gross Margin', value: formatCurrency(variance), variant: variance >= 0 ? 'success' : 'error' },
        { label: 'Cost Sheets', value: stats.total ?? rows.length },
      ]}
      headerActions={
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={async () => {
            const boq = prompt('Enter BOQ ID to create cost sheet from:');
            if (!boq) return;
            setBusyName('_from_boq'); setError('');
            try {
              await callApi('/api/ops', { method: 'POST', body: { method: 'create_cost_sheet_from_boq', args: { boq_name: boq } } });
              await load();
            } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
            setBusyName(null);
          }} disabled={busyName === '_from_boq'}>From BOQ</button>
          <button className="btn btn-primary" onClick={() => { setForm(INIT); setShowCreate(true); }}><Plus className="w-4 h-4" /> New Cost Sheet</button>
        </div>
      }
    >
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Cost Sheet Register</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Sheet</th><th>Tender / Project</th><th>Owner</th><th>Base Cost</th><th>Sell Value</th><th>Margin %</th><th>Status</th><th>Next Step</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.name}>
                  <td><Link href={`/finance/costing/${encodeURIComponent(r.name)}`} className="font-medium text-blue-600 hover:underline">{r.name}</Link>
                    <div className="text-xs text-gray-500">v{r.version || 1} · {r.total_items || 0} items</div></td>
                  <td>{r.linked_project ? <Link href={`/projects/${encodeURIComponent(r.linked_project)}`} className="text-sm text-blue-600 hover:underline">{r.linked_project}</Link> : '-'}
                    <div className="text-xs text-gray-400">{r.linked_tender || '-'}</div></td>
                  <td className="text-sm">{r.created_by_user || '-'}<div className="text-xs text-gray-400">{r.approved_by ? `Approved by ${r.approved_by}` : 'Not approved'}</div></td>
                  <td>{formatCurrency(r.base_cost)}</td>
                  <td className="font-medium">{formatCurrency(r.sell_value)}</td>
                  <td>{r.margin_percent || 0}%</td>
                  <td><span className={`badge ${badge(COST_SHEET_BADGES, r.status)}`}>{r.status || 'Unknown'}</span></td>
                  <td className="text-sm text-gray-700">{blocker(r)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1 items-center">
                      <Link href={`/finance/costing/${encodeURIComponent(r.name)}`} className="text-blue-600 text-sm font-medium flex items-center gap-1"><Eye className="w-3.5 h-3.5" />View</Link>
                      {r.status === 'DRAFT' && canSubmit && <button disabled={busyName===r.name} onClick={() => runAction(r.name,'submit')} className="text-indigo-600 text-sm font-medium">Submit</button>}
                      {r.status === 'SUBMITTED' && canApprove && <>
                        <button disabled={busyName===r.name} onClick={() => runAction(r.name,'approve')} className="text-green-600 text-sm font-medium">Approve</button>
                        <button disabled={busyName===r.name} onClick={() => setReasonTarget({ name: r.name, action: 'reject' })} className="text-red-600 text-sm font-medium">Reject</button>
                      </>}
                      {(r.status === 'APPROVED' || r.status === 'REJECTED') && canSubmit && <button disabled={busyName===r.name} onClick={() => setReasonTarget({ name: r.name, action: 'revise' })} className="text-orange-600 text-sm font-medium">Revise</button>}
                      {r.status === 'DRAFT' && canSubmit && <button disabled={busyName===r.name} onClick={() => { if (confirm(`Delete cost sheet ${r.name}?`)) runAction(r.name,'delete'); }} className="text-gray-500 text-sm font-medium hover:text-red-600">Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-lg font-semibold">Create Cost Sheet</h2><button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button></div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Tender *</label>
                <LinkPicker entity="tender" value={form.linked_tender} onChange={(value) => setForm((p) => ({ ...p, linked_tender: value }))} placeholder="Search tender…" />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Linked BOQ</label><input className="input" value={form.linked_boq} onChange={e => setForm(p => ({...p, linked_boq: e.target.value}))} /></div>
              <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description *</label><textarea className="input min-h-24" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Cost Type</label><select className="input" value={form.cost_type} onChange={e => setForm(p => ({...p, cost_type: e.target.value}))}><option>Material</option><option>Service</option><option>Labour</option><option>Overhead</option><option>Other</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Qty</label><input className="input" type="number" min={1} value={form.quantity} onChange={e => setForm(p => ({...p, quantity: Number(e.target.value)||1}))} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Rate</label><input className="input" type="number" min={0} step={0.01} value={form.rate} onChange={e => setForm(p => ({...p, rate: Number(e.target.value)||0}))} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label><input className="input" value={form.remarks} onChange={e => setForm(p => ({...p, remarks: e.target.value}))} /></div>
            </div>
            {error && <p className="px-6 pb-2 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      <ActionModal
        open={!!reasonTarget}
        title={reasonTarget?.action === 'reject' ? 'Reject Cost Sheet' : 'Revise Cost Sheet'}
        description={`${reasonTarget?.action === 'reject' ? 'Reject' : 'Revise'} ${reasonTarget?.name}?`}
        confirmLabel={reasonTarget?.action === 'reject' ? 'Reject' : 'Revise'}
        variant={reasonTarget?.action === 'reject' ? 'danger' : 'default'}
        fields={[{ name: 'reason', label: 'Reason', type: 'textarea' }]}
        onCancel={() => setReasonTarget(null)}
        onConfirm={async (values) => {
          if (reasonTarget) await runAction(reasonTarget.name, reasonTarget.action, { reason: values.reason || '' });
          setReasonTarget(null);
        }}
      />
    </RegisterPage>
  );
}
