'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ClipboardList, ClipboardCheck, Loader2 } from 'lucide-react';
import { projectWorkspaceApi } from '@/lib/typedApi';

type PHApprovalItem = {
  name: string;
  source_type?: string;
  source_name?: string;
  project?: string;
  status?: string;
  submitted_by?: string;
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  remarks?: string;
  amount?: number;
  description?: string;
  creation?: string;
  modified?: string;
};

const SUB_TABS: { key: 'po' | 'rma_po' | 'petty_cash'; label: string }[] = [
  { key: 'po', label: 'Purchase Orders' },
  { key: 'rma_po', label: 'RMA POs' },
  { key: 'petty_cash', label: 'Petty Cash' },
];

function ApprovalsTab({ projectId }: { projectId: string }) {
  const [activeTab, setActiveTab] = useState<'po' | 'rma_po' | 'petty_cash'>('po');
  const [items, setItems] = useState<PHApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await projectWorkspaceApi.getPhApprovalItems<PHApprovalItem[]>(
        projectId,
        activeTab === 'po' ? 'PO' : activeTab === 'rma_po' ? 'RMA PO' : 'Petty Cash',
      );
      setItems(data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load approval items'); }
    finally { setLoading(false); }
  }, [activeTab, projectId]);

  useEffect(() => { void loadItems(); }, [loadItems]);

  const handleAction = async (name: string, action: 'ph_approve_item' | 'ph_reject_item') => {
    setActionBusy(name);
    try {
      await projectWorkspaceApi.runPhApprovalAction(action, name);
      await loadItems();
    } catch (err) { setError(err instanceof Error ? err.message : 'Action failed'); }
    setActionBusy('');
  };

  const pending = items.filter(i => (i.status || '').toLowerCase().includes('submitted'));
  const processed = items.filter(i => !(i.status || '').toLowerCase().includes('submitted'));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-blue-600" />
          PH Approval Hub
        </h2>
        <p className="mt-1 text-xs text-gray-500">Purchase Orders, RMA POs, and Petty Cash requests pending Project Head approval</p>
      </div>

      {/* Sub-tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {SUB_TABS.map(st => (
          <button key={st.key} onClick={() => setActiveTab(st.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === st.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{st.label}</button>
        ))}
      </div>

      {loading && <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No approval items in this category</p>
        </div>
      )}

      {!loading && !error && pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Pending Approval · {pending.length} item{pending.length !== 1 ? 's' : ''}</h3>
          <div className="space-y-3">
            {pending.map(item => (
              <div key={item.name} className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{item.source_name || item.name}</span>
                      <span className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">{item.status}</span>
                      {item.source_type && <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">{item.source_type}</span>}
                    </div>
                    {item.description && <p className="mt-1 text-xs text-gray-500">{item.description}</p>}
                    <div className="mt-2 flex gap-4 text-[11px] text-gray-400">
                      {item.submitted_by && <span>By: {item.submitted_by}</span>}
                      {item.submitted_at && <span>{new Date(item.submitted_at).toLocaleDateString('en-IN')}</span>}
                      {item.amount != null && <span className="font-medium text-gray-600">₹{Number(item.amount).toLocaleString('en-IN')}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleAction(item.name, 'ph_approve_item')} disabled={actionBusy === item.name}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                      {actionBusy === item.name ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Approve'}
                    </button>
                    <button onClick={() => handleAction(item.name, 'ph_reject_item')} disabled={actionBusy === item.name}
                      className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && processed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Processed</h3>
          <div className="space-y-2">
            {processed.map(item => {
              const approved = (item.status || '').toLowerCase().includes('approved');
              return (
                <div key={item.name} className={`rounded-lg border p-3 ${approved ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{item.source_name || item.name}</span>
                        <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-medium ${approved ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>{item.status}</span>
                        {item.source_type && <span className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">{item.source_type}</span>}
                      </div>
                      <div className="mt-1 flex gap-4 text-[11px] text-gray-400">
                        {item.amount != null && <span>₹{Number(item.amount).toLocaleString('en-IN')}</span>}
                        {approved && item.approved_by && <span>Approved: {item.approved_by}</span>}
                        {!approved && item.rejected_by && <span>Rejected: {item.rejected_by}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ApprovalsTab;
