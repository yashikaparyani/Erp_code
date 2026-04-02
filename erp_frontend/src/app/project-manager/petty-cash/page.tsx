'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Banknote, Plus, Send, Wallet } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import { usePmContext, formatCurrency, siteLabel } from '@/components/pm/pm-helpers';

interface PettyCashEntry {
  name: string;
  linked_project?: string;
  linked_site?: string;
  entry_date?: string;
  description?: string;
  category?: string;
  amount?: number;
  paid_to?: string;
  status?: string;
}

interface FundRequest {
  name: string;
  project?: string;
  linked_site?: string;
  requested_by?: string;
  requested_on?: string;
  amount?: number;
  purpose?: string;
  status?: string;
  ph_approver?: string;
}

type PageTab = 'entries' | 'fund_requests';

export default function ProjectManagerPettyCashPage() {
  const { assignedProjects, selectedProject, setSelectedProject, sites } = usePmContext();
  const [tab, setTab] = useState<PageTab>('entries');
  const [items, setItems] = useState<PettyCashEntry[]>([]);
  const [fundRequests, setFundRequests] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showFundCreate, setShowFundCreate] = useState(false);
  const [fundCreating, setFundCreating] = useState(false);

  const loadEntries = async (project: string) => {
    if (!project) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/petty-cash?project=${encodeURIComponent(project)}`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to load');
      setItems(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load petty cash');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFundRequests = useCallback(async (project: string) => {
    if (!project) { setFundRequests([]); return; }
    try {
      const res = await fetch(`/api/petty-cash/fund-requests?project=${encodeURIComponent(project)}`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to load');
      setFundRequests(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fund requests');
      setFundRequests([]);
    }
  }, []);

  useEffect(() => {
    if (selectedProject) {
      void loadEntries(selectedProject);
      void loadFundRequests(selectedProject);
    }
  }, [selectedProject, loadFundRequests]);

  const totalAmount = useMemo(() => items.reduce((s, r) => s + Number(r.amount || 0), 0), [items]);
  const pendingFunds = useMemo(() => fundRequests.filter((r) => r.status === 'Submitted to PH' || r.status === 'Draft').length, [fundRequests]);

  const siteOptions = [{ value: '', label: 'Project-level only' }, ...sites.map((s) => ({ value: s.name, label: siteLabel(s) }))];

  const handleCreate = async (values: Record<string, string>) => {
    if (!selectedProject || !values.description?.trim() || !(Number(values.amount) > 0)) { setError('Description and amount required.'); return; }
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/petty-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linked_project: selectedProject,
          linked_site: values.linked_site || undefined,
          description: values.description.trim(),
          category: values.category?.trim() || undefined,
          amount: Number(values.amount),
          paid_to: values.paid_to?.trim() || undefined,
          entry_date: values.entry_date || undefined,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowCreate(false);
      await loadEntries(selectedProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create entry');
    } finally {
      setCreating(false);
    }
  };

  const handleFundCreate = async (values: Record<string, string>) => {
    if (!selectedProject || !values.purpose?.trim() || !(Number(values.amount) > 0)) { setError('Amount and purpose required.'); return; }
    setFundCreating(true);
    setError('');
    try {
      const res = await fetch('/api/petty-cash/fund-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: selectedProject,
          linked_site: values.linked_site || undefined,
          amount: Number(values.amount),
          purpose: values.purpose.trim(),
          requested_on: values.requested_on || undefined,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowFundCreate(false);
      await loadFundRequests(selectedProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create fund request');
    } finally {
      setFundCreating(false);
    }
  };

  if (!assignedProjects.length) {
    return (
      <RegisterPage title="Project Petty Cash" loading={false} empty emptyTitle="No Assigned Projects" emptyDescription="No assigned projects were found for this Project Manager.">
        <div />
      </RegisterPage>
    );
  }

  return (
    <>
      <RegisterPage
        title="Project Petty Cash"
        description="Petty cash for assigned projects, including PH-bound fund requests."
        loading={loading}
        error={error}
        empty={!loading && tab === 'entries' && items.length === 0 && tab === 'entries'}
        emptyTitle="No Entries"
        emptyDescription="No petty cash entries for this project."
        onRetry={() => { void loadEntries(selectedProject); void loadFundRequests(selectedProject); }}
        stats={[
          { label: 'Entries', value: items.length },
          { label: 'Total Amount', value: formatCurrency(totalAmount) },
          { label: 'Pending Fund Requests', value: pendingFunds, variant: pendingFunds > 0 ? 'warning' : 'default' },
        ]}
        filterBar={
          <>
            <select className="input max-w-xs" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
              {assignedProjects.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setTab('entries')} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${tab === 'entries' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-raised)] text-[var(--text-muted)]'}`}>
                <Wallet className="inline h-3.5 w-3.5 mr-1" />Entries
              </button>
              <button onClick={() => setTab('fund_requests')} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${tab === 'fund_requests' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-raised)] text-[var(--text-muted)]'}`}>
                <Banknote className="inline h-3.5 w-3.5 mr-1" />Fund Requests
              </button>
            </div>
          </>
        }
        headerActions={
          <>
            <button className="btn btn-secondary" onClick={() => setShowFundCreate(true)}>
              <Send className="h-4 w-4" /> Request Funds
            </button>
            {tab === 'entries' && (
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" /> New Entry
              </button>
            )}
          </>
        }
      >
        {tab === 'entries' ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Date</th><th>Description</th><th>Site</th><th>Paid To</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.name}>
                    <td className="font-medium text-gray-900">{row.name}</td>
                    <td>{row.entry_date || '-'}</td>
                    <td>{row.description || '-'}</td>
                    <td>{row.linked_site || '-'}</td>
                    <td>{row.paid_to || '-'}</td>
                    <td>{formatCurrency(row.amount)}</td>
                    <td>{row.status || 'Draft'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Site</th><th>Date</th><th>Amount</th><th>Purpose</th><th>Status</th><th>PH Approver</th></tr></thead>
              <tbody>
                {fundRequests.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-sm text-gray-500">No fund requests for this project yet.</td></tr>
                ) : fundRequests.map((row) => (
                  <tr key={row.name}>
                    <td className="font-medium text-gray-900">{row.name}</td>
                    <td>{row.linked_site || '-'}</td>
                    <td>{row.requested_on || '-'}</td>
                    <td>{formatCurrency(row.amount)}</td>
                    <td>{row.purpose || '-'}</td>
                    <td>{row.status || 'Draft'}</td>
                    <td>{row.ph_approver || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </RegisterPage>

      <FormModal
        open={showCreate}
        title="New Petty Cash Entry"
        description={`Project: ${selectedProject}`}
        busy={creating}
        confirmLabel="Create Entry"
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
        fields={[
          { name: 'description', label: 'Description', type: 'text', required: true },
          { name: 'category', label: 'Category', type: 'text' },
          { name: 'amount', label: 'Amount', type: 'number', required: true },
          { name: 'paid_to', label: 'Paid To', type: 'text' },
          { name: 'entry_date', label: 'Entry Date', type: 'date' },
          { name: 'linked_site', label: 'Site', type: 'select', options: siteOptions },
        ]}
      />

      <FormModal
        open={showFundCreate}
        title="Request Funds from Project Head"
        description={`Project: ${selectedProject} — This request will go to PH, then Costing.`}
        busy={fundCreating}
        confirmLabel="Submit to Project Head"
        onConfirm={handleFundCreate}
        onCancel={() => setShowFundCreate(false)}
        fields={[
          { name: 'amount', label: 'Amount (₹)', type: 'number', required: true },
          { name: 'purpose', label: 'Purpose', type: 'textarea', required: true },
          { name: 'linked_site', label: 'Site', type: 'select', options: siteOptions },
          { name: 'requested_on', label: 'Required By', type: 'date' },
        ]}
      />
    </>
  );
}
