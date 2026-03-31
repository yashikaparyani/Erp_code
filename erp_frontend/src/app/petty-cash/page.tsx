'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Wallet, Plus, CheckCircle2, Clock, X, Send, IndianRupee, AlertCircle, Banknote } from 'lucide-react';

interface PettyCash {
  name: string;
  linked_project?: string;
  linked_site?: string;
  entry_date?: string;
  description?: string;
  category?: string;
  amount?: number;
  paid_to?: string;
  paid_by?: string;
  voucher_ref?: string;
  status?: string;
  approved_by?: string;
}

interface ProjectOption {
  name: string;
  project_name?: string;
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
  ph_remarks?: string;
}

type PageTab = 'entries' | 'fund_requests';

interface SiteOption {
  name: string;
  site_name?: string;
}

function formatCurrency(v?: number) {
  if (!v) return '₹ 0';
  return `₹ ${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function statusBadge(s?: string) {
  const m: Record<string, string> = {
    Draft: 'badge-yellow',
    Submitted: 'badge-blue',
    Approved: 'badge-green',
    Rejected: 'badge-red',
    Cancelled: 'badge-gray',
    'Submitted to PH': 'badge-blue',
    'Approved by PH': 'badge-green',
    'Rejected by PH': 'badge-red',
    'Forwarded to Costing': 'badge-purple',
    'Disbursed / Released': 'badge-gray',
  };
  return m[s || ''] || 'badge-gray';
}

export default function PettyCashPage() {
  const [tab, setTab] = useState<PageTab>('entries');
  const [items, setItems] = useState<PettyCash[]>([]);
  const [fundRequests, setFundRequests] = useState<FundRequest[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showFundCreate, setShowFundCreate] = useState(false);
  const [fundCreating, setFundCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ description: '', category: '', amount: '', paid_to: '', linked_project: '', linked_site: '', entry_date: '' });
  const [fundForm, setFundForm] = useState({ project: '', amount: '', purpose: '', requested_on: '' });

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/petty-cash').then(r => r.json()).catch(() => ({ data: [] }));
    setItems(res.data || []);
    setLoading(false);
  };

  const loadFundRequests = useCallback(async () => {
    const res = await fetch('/api/petty-cash/fund-requests').then(r => r.json()).catch(() => ({ data: [] }));
    setFundRequests(res.data || []);
  }, []);

  const loadProjects = async () => {
    setLookupLoading(true);
    try {
      const response = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'get_project_spine_list' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Failed to load projects');
      }
      setProjects(payload.data || []);
    } catch {
      setProjects([]);
    } finally {
      setLookupLoading(false);
    }
  };

  const loadSites = async (project: string) => {
    if (!project) {
      setSites([]);
      return;
    }
    const res = await fetch(`/api/sites?project=${encodeURIComponent(project)}`).then(r => r.json()).catch(() => ({ data: [] }));
    setSites(res.data || []);
  };

  useEffect(() => {
    loadData();
    loadProjects();
    loadFundRequests();
  }, [loadFundRequests]);

  useEffect(() => {
    loadSites(form.linked_project);
  }, [form.linked_project]);

  const resetForm = () => {
    setForm({ description: '', category: '', amount: '', paid_to: '', linked_project: '', linked_site: '', entry_date: '' });
    setSites([]);
  };

  const handleProjectChange = (linked_project: string) => {
    setForm((current) => ({ ...current, linked_project, linked_site: '' }));
  };

  const handleCreate = async () => {
    if (!form.description.trim() || !form.linked_project.trim() || !(parseFloat(form.amount) > 0)) {
      setError('Description, project, and amount are required.');
      return;
    }
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/petty-cash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: parseFloat(form.amount) || 0 }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowCreate(false);
      resetForm();
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setCreating(false); }
  };

  const resetFundForm = () => setFundForm({ project: '', amount: '', purpose: '', requested_on: '' });

  const handleFundCreate = async () => {
    if (!fundForm.project.trim() || !(parseFloat(fundForm.amount) > 0) || !fundForm.purpose.trim()) {
      setError('Project, amount, and purpose are required.');
      return;
    }
    setError('');
    setFundCreating(true);
    try {
      const res = await fetch('/api/petty-cash/fund-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fundForm, amount: parseFloat(fundForm.amount) || 0 }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed to create fund request');
      setShowFundCreate(false);
      resetFundForm();
      await loadFundRequests();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setFundCreating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const totalAmount = items.reduce((s, i) => s + (i.amount || 0), 0);
  const approved = items.filter(i => i.status === 'Approved').length;
  const canCreate = Boolean(form.description.trim() && form.linked_project.trim() && parseFloat(form.amount) > 0);
  const canCreateFund = Boolean(fundForm.project.trim() && parseFloat(fundForm.amount) > 0 && fundForm.purpose.trim());
  const pendingFundRequests = fundRequests.filter(r => r.status === 'Submitted to PH' || r.status === 'Draft').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Petty Cash</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Project-linked petty cash expenses and fund requests requiring PH approval.</p>
        </div>
        {tab === 'entries' ? (
          <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />New Entry</button>
        ) : (
          <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowFundCreate(true)}><Banknote className="w-4 h-4" />Make Request For Funds</button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Wallet className="w-5 h-5" /></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Total Entries</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><IndianRupee className="w-5 h-5" /></div><div><div className="stat-value">{formatCurrency(totalAmount)}</div><div className="stat-label">Total Amount</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div><div><div className="stat-value">{approved}</div><div className="stat-label">Approved</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><Clock className="w-5 h-5" /></div><div><div className="stat-value">{pendingFundRequests}</div><div className="stat-label">Pending Fund Requests</div></div></div></div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setTab('entries')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${tab === 'entries' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Wallet className="w-4 h-4" />
            Expense Entries
          </button>
          <button
            onClick={() => setTab('fund_requests')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${tab === 'fund_requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Banknote className="w-4 h-4" />
            Fund Requests
            {pendingFundRequests > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{pendingFundRequests}</span>
            )}
          </button>
        </nav>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Entries tab */}
      {tab === 'entries' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">All Petty Cash Entries</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Date</th><th>Description</th><th>Category</th><th>Paid To</th><th>Project</th><th>Site</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-gray-500">No petty cash entries found</td></tr> : items.map(item => (
                  <tr key={item.name}>
                    <td><Link href={`/petty-cash/${encodeURIComponent(item.name)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{item.name}</Link></td>
                    <td><div className="text-sm text-gray-700">{item.entry_date || '-'}</div></td>
                    <td><div className="text-sm text-gray-900 max-w-xs truncate">{item.description || '-'}</div></td>
                    <td><div className="text-sm text-gray-700">{item.category || '-'}</div></td>
                    <td><div className="text-sm text-gray-700">{item.paid_to || '-'}</div></td>
                    <td><div className="text-sm text-gray-700">{item.linked_project || '-'}</div></td>
                    <td><div className="text-sm text-gray-700">{item.linked_site || '-'}</div></td>
                    <td><div className="text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</div></td>
                    <td><span className={`badge ${statusBadge(item.status)}`}>{item.status || 'Draft'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fund Requests tab */}
      {tab === 'fund_requests' && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Fund Requests (PH Approval Chain)</h3>
            <span className="text-sm text-gray-500">{fundRequests.length} request{fundRequests.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Project</th>
                  <th>Requested By</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>PH Approver</th>
                </tr>
              </thead>
              <tbody>
                {fundRequests.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-500">No fund requests found. Click &quot;Make Request For Funds&quot; to raise one.</td></tr>
                ) : fundRequests.map(req => (
                  <tr key={req.name}>
                    <td><span className="font-medium text-gray-900 text-sm">{req.name}</span></td>
                    <td><div className="text-sm text-gray-700">{req.project || '-'}</div></td>
                    <td><div className="text-sm text-gray-700">{req.requested_by || '-'}</div></td>
                    <td><div className="text-sm text-gray-500">{req.requested_on || '-'}</div></td>
                    <td><div className="text-sm font-medium text-gray-900">{formatCurrency(req.amount)}</div></td>
                    <td><div className="text-sm text-gray-700 max-w-xs truncate">{req.purpose || '-'}</div></td>
                    <td><span className={`badge ${statusBadge(req.status)}`}>{req.status || 'Draft'}</span></td>
                    <td><div className="text-sm text-gray-700">{req.ph_approver || '-'}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div><h2 className="text-lg font-semibold text-gray-900">New Petty Cash Entry</h2></div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => { setShowCreate(false); resetForm(); }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Description *</div><input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Category</div><input className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Amount (₹) *</div><input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Paid To</div><input className="input" value={form.paid_to} onChange={e => setForm({ ...form, paid_to: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Project *</div><select className="input" value={form.linked_project} onChange={e => handleProjectChange(e.target.value)} disabled={lookupLoading}><option value="">{lookupLoading ? 'Loading projects...' : 'Select project'}</option>{projects.map(project => <option key={project.name} value={project.name}>{project.name}{project.project_name ? ` | ${project.project_name}` : ''}</option>)}</select></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Site</div><select className="input" value={form.linked_site} onChange={e => setForm({ ...form, linked_site: e.target.value })} disabled={!form.linked_project}><option value="">{form.linked_project ? 'Select site' : 'Select project first'}</option>{sites.map(site => <option key={site.name} value={site.name}>{site.site_name ? `${site.name} | ${site.site_name}` : site.name}</option>)}</select></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Date</div><input className="input" type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} /></label>
            </div>
            <div className="px-6 pb-6">
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-3"><button className="btn btn-secondary" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={creating || !canCreate}>{creating ? 'Creating...' : 'Create'}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Make Request For Funds modal */}
      {showFundCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Make Request For Funds</h2>
                <p className="text-xs text-gray-500 mt-0.5">This will be routed to the Project Head for approval before disbursement.</p>
              </div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => { setShowFundCreate(false); resetFundForm(); }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label><div className="text-sm font-medium text-gray-700 mb-2">Project *</div>
                <select className="input" value={fundForm.project} onChange={e => setFundForm({ ...fundForm, project: e.target.value })} disabled={lookupLoading}>
                  <option value="">{lookupLoading ? 'Loading...' : 'Select project'}</option>
                  {projects.map(p => <option key={p.name} value={p.name}>{p.name}{p.project_name ? ` | ${p.project_name}` : ''}</option>)}
                </select>
              </label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Amount (₹) *</div>
                <input className="input" type="number" min="0" step="0.01" value={fundForm.amount} onChange={e => setFundForm({ ...fundForm, amount: e.target.value })} placeholder="0.00" />
              </label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Purpose / Justification *</div>
                <textarea className="input w-full" rows={3} value={fundForm.purpose} onChange={e => setFundForm({ ...fundForm, purpose: e.target.value })} placeholder="Describe what these funds will be used for…" />
              </label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Required By Date</div>
                <input className="input" type="date" value={fundForm.requested_on} onChange={e => setFundForm({ ...fundForm, requested_on: e.target.value })} />
              </label>
            </div>
            <div className="px-6 pb-6">
              {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
              <div className="flex justify-end gap-3">
                <button className="btn btn-secondary" onClick={() => { setShowFundCreate(false); resetFundForm(); setError(''); }}>Cancel</button>
                <button className="btn btn-primary" onClick={handleFundCreate} disabled={fundCreating || !canCreateFund}>
                  <Send className="w-4 h-4" />
                  {fundCreating ? 'Submitting...' : 'Submit to Project Head'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
