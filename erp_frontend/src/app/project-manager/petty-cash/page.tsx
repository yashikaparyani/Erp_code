'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Banknote, Plus, Send, Wallet, X } from 'lucide-react';
import { usePermissions } from '@/context/PermissionContext';

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
  requested_by?: string;
  requested_on?: string;
  amount?: number;
  purpose?: string;
  status?: string;
  ph_approver?: string;
}

type PageTab = 'entries' | 'fund_requests';

function formatCurrency(value?: number) {
  if (!value) return '₹ 0';
  return `₹ ${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function ProjectManagerPettyCashPage() {
  const { permissions } = usePermissions();
  const assignedProjects = permissions?.user_context.assigned_projects ?? [];
  const [tab, setTab] = useState<PageTab>('entries');
  const [selectedProject, setSelectedProject] = useState('');
  const [items, setItems] = useState<PettyCashEntry[]>([]);
  const [fundRequests, setFundRequests] = useState<FundRequest[]>([]);
  const [sites, setSites] = useState<Array<{ name: string; site_name?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showFundCreate, setShowFundCreate] = useState(false);
  const [fundCreating, setFundCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ description: '', category: '', amount: '', paid_to: '', linked_site: '', entry_date: '' });
  const [fundForm, setFundForm] = useState({ amount: '', purpose: '', requested_on: '' });

  useEffect(() => {
    if (!selectedProject && assignedProjects.length) {
      setSelectedProject(assignedProjects[0]);
    }
  }, [assignedProjects, selectedProject]);

  const loadData = async (project: string) => {
    if (!project) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/petty-cash?project=${encodeURIComponent(project)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Failed to load petty cash');
      }
      setItems(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load petty cash');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFundRequests = useCallback(async (project: string) => {
    if (!project) {
      setFundRequests([]);
      return;
    }
    try {
      const response = await fetch(`/api/petty-cash/fund-requests?project=${encodeURIComponent(project)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Failed to load fund requests');
      }
      setFundRequests(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fund requests');
      setFundRequests([]);
    }
  }, []);

  const loadSites = async (project: string) => {
    if (!project) {
      setSites([]);
      return;
    }
    const response = await fetch(`/api/sites?project=${encodeURIComponent(project)}`).then((r) => r.json()).catch(() => ({ data: [] }));
    setSites(Array.isArray(response.data) ? response.data : []);
  };

  useEffect(() => {
    if (selectedProject) {
      void loadData(selectedProject);
      void loadSites(selectedProject);
      void loadFundRequests(selectedProject);
    }
  }, [selectedProject, loadFundRequests]);

  const totalAmount = useMemo(
    () => items.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [items],
  );
  const pendingFundRequests = useMemo(
    () => fundRequests.filter((row) => row.status === 'Submitted to PH' || row.status === 'Draft').length,
    [fundRequests],
  );

  const handleCreate = async () => {
    if (!selectedProject || !form.description.trim() || !(Number(form.amount) > 0)) {
      setError('Project, description, and amount are required.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/petty-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linked_project: selectedProject,
          linked_site: form.linked_site || undefined,
          description: form.description.trim(),
          category: form.category.trim() || undefined,
          amount: Number(form.amount),
          paid_to: form.paid_to.trim() || undefined,
          entry_date: form.entry_date || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to create petty cash entry');
      }
      setShowCreate(false);
      setForm({ description: '', category: '', amount: '', paid_to: '', linked_site: '', entry_date: '' });
      await loadData(selectedProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create petty cash entry');
    } finally {
      setCreating(false);
    }
  };

  const handleFundCreate = async () => {
    if (!selectedProject || !fundForm.purpose.trim() || !(Number(fundForm.amount) > 0)) {
      setError('Project, amount, and purpose are required.');
      return;
    }
    setFundCreating(true);
    setError('');
    try {
      const response = await fetch('/api/petty-cash/fund-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: selectedProject,
          amount: Number(fundForm.amount),
          purpose: fundForm.purpose.trim(),
          requested_on: fundForm.requested_on || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to create fund request');
      }
      setShowFundCreate(false);
      setFundForm({ amount: '', purpose: '', requested_on: '' });
      await loadFundRequests(selectedProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create fund request');
    } finally {
      setFundCreating(false);
    }
  };

  if (!assignedProjects.length) {
    return (
      <div className="card">
        <div className="card-body py-12 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Project Petty Cash</h1>
          <p className="mt-2 text-sm text-gray-500">No assigned projects were found for this Project Manager.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Petty Cash</h1>
          <p className="mt-1 text-sm text-gray-500">Petty cash for assigned projects, including PH-bound fund requests.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select className="input min-w-[240px]" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            {assignedProjects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={() => setTab('fund_requests')}>
            <Banknote className="h-4 w-4" />
            View Fund Requests
          </button>
          <button className="btn btn-primary" onClick={() => setShowFundCreate(true)}>
            <Send className="h-4 w-4" />
            Make Request For Funds
          </button>
          {tab === 'entries' ? (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              New Entry
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="stat-card"><div className="stat-value">{items.length}</div><div className="stat-label">Entries</div></div>
        <div className="stat-card"><div className="stat-value">{formatCurrency(totalAmount)}</div><div className="stat-label">Total Amount</div></div>
        <div className="stat-card"><div className="stat-value">{pendingFundRequests}</div><div className="stat-label">Pending Fund Requests</div></div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
        Project Managers raise fund requests here, Project Head approves them, and then Costing picks them up for release.
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setTab('entries')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${tab === 'entries' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Wallet className="h-4 w-4" />
            Expense Entries
          </button>
          <button
            onClick={() => setTab('fund_requests')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${tab === 'fund_requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Banknote className="h-4 w-4" />
            Fund Requests
          </button>
        </nav>
      </div>

      {tab === 'entries' ? (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="font-semibold text-gray-900">Project Petty Cash Register</h3>
              <p className="mt-1 text-xs text-gray-500">Only entries for the selected assigned project are shown here.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Date</th><th>Description</th><th>Site</th><th>Paid To</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-sm text-gray-500">Loading petty cash entries...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-sm text-gray-500">No petty cash entries for this project.</td></tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.name}>
                      <td className="font-medium text-gray-900">{row.name}</td>
                      <td>{row.entry_date || '-'}</td>
                      <td>{row.description || '-'}</td>
                      <td>{row.linked_site || '-'}</td>
                      <td>{row.paid_to || '-'}</td>
                      <td>{formatCurrency(row.amount)}</td>
                      <td>{row.status || 'Draft'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="font-semibold text-gray-900">Fund Requests</h3>
              <p className="mt-1 text-xs text-gray-500">Project Manager requests that move to Project Head approval and then Costing.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Date</th><th>Amount</th><th>Purpose</th><th>Status</th><th>PH Approver</th></tr></thead>
              <tbody>
                {fundRequests.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-500">No fund requests for this project yet.</td></tr>
                ) : (
                  fundRequests.map((row) => (
                    <tr key={row.name}>
                      <td className="font-medium text-gray-900">{row.name}</td>
                      <td>{row.requested_on || '-'}</td>
                      <td>{formatCurrency(row.amount)}</td>
                      <td>{row.purpose || '-'}</td>
                      <td>{row.status || 'Draft'}</td>
                      <td>{row.ph_approver || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">New Project Petty Cash Entry</h2>
              <button className="rounded-lg p-2 hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <label className="md:col-span-2"><div className="mb-2 text-sm font-medium text-gray-700">Description *</div><input className="input" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Category</div><input className="input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Amount *</div><input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Paid To</div><input className="input" value={form.paid_to} onChange={(e) => setForm((p) => ({ ...p, paid_to: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Entry Date</div><input className="input" type="date" value={form.entry_date} onChange={(e) => setForm((p) => ({ ...p, entry_date: e.target.value }))} /></label>
              <label className="md:col-span-2"><div className="mb-2 text-sm font-medium text-gray-700">Site</div><select className="input" value={form.linked_site} onChange={(e) => setForm((p) => ({ ...p, linked_site: e.target.value }))}><option value="">Project-level only</option>{sites.map((site) => <option key={site.name} value={site.name}>{site.site_name ? `${site.name} | ${site.site_name}` : site.name}</option>)}</select></label>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Entry'}</button>
            </div>
          </div>
        </div>
      ) : null}

      {showFundCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Make Request For Funds</h2>
                <p className="mt-1 text-xs text-gray-500">This request will go to the Project Head and then to Costing after approval.</p>
              </div>
              <button className="rounded-lg p-2 hover:bg-gray-100" onClick={() => setShowFundCreate(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <label><div className="mb-2 text-sm font-medium text-gray-700">Project</div><input className="input bg-gray-50" value={selectedProject} disabled /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Amount *</div><input className="input" type="number" min="0" step="0.01" value={fundForm.amount} onChange={(e) => setFundForm((p) => ({ ...p, amount: e.target.value }))} /></label>
              <label className="md:col-span-2"><div className="mb-2 text-sm font-medium text-gray-700">Purpose *</div><textarea className="input min-h-[96px]" value={fundForm.purpose} onChange={(e) => setFundForm((p) => ({ ...p, purpose: e.target.value }))} /></label>
              <label><div className="mb-2 text-sm font-medium text-gray-700">Required By</div><input className="input" type="date" value={fundForm.requested_on} onChange={(e) => setFundForm((p) => ({ ...p, requested_on: e.target.value }))} /></label>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button className="btn btn-secondary" onClick={() => setShowFundCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleFundCreate} disabled={fundCreating}>
                <Send className="h-4 w-4" />
                {fundCreating ? 'Submitting...' : 'Submit to Project Head'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
