'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock, Plus, X, XCircle } from 'lucide-react';

interface TechnicalDeviation {
  name: string;
  deviation_id?: string;
  linked_project?: string;
  linked_site?: string;
  linked_drawing?: string;
  impact?: string;
  description?: string;
  proposed_solution?: string;
  root_cause?: string;
  status?: string;
  raised_by?: string;
  approved_by?: string;
  creation?: string;
}

type FormData = {
  linked_project: string;
  linked_site: string;
  linked_drawing: string;
  impact: string;
  description: string;
  proposed_solution: string;
  root_cause: string;
};

const initialFormData: FormData = {
  linked_project: '',
  linked_site: '',
  linked_drawing: '',
  impact: 'Low',
  description: '',
  proposed_solution: '',
  root_cause: '',
};

const STATUS_BADGES: Record<string, string> = {
  Open: 'badge-warning',
  Approved: 'badge-success',
  Rejected: 'badge-error',
  Closed: 'badge-gray',
};

export default function TechnicalDeviationsPage() {
  const [items, setItems] = useState<TechnicalDeviation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/api/engineering/technical-deviations');
      setItems(response.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/engineering/technical-deviations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Failed to create');
      setShowCreateModal(false);
      setFormData(initialFormData);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (action: string, name: string, extra?: Record<string, string>) => {
    try {
      const response = await fetch('/api/engineering/technical-deviations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, name, ...extra }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Action failed');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const countByStatus = (status: string) => items.filter(i => i.status === status).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Technical Deviations</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Track deviations from approved drawings and engineering specs. Approve, reject, or close deviations.
          </p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" /> Raise Deviation
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard icon={AlertTriangle} color="blue" label="Total" value={items.length} />
        <StatCard icon={Clock} color="amber" label="Open" value={countByStatus('Open')} />
        <StatCard icon={CheckCircle2} color="green" label="Approved" value={countByStatus('Approved')} />
        <StatCard icon={XCircle} color="rose" label="Rejected" value={countByStatus('Rejected')} />
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Deviation Register</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Project / Site</th>
                <th>Drawing</th>
                <th>Impact</th>
                <th>Description</th>
                <th>Status</th>
                <th>Raised By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">No technical deviations found</td></tr>
              ) : items.map(item => (
                <tr key={item.name}>
                  <td><Link href={`/engineering/deviations/${encodeURIComponent(item.name)}`} className="font-medium text-blue-600 hover:text-blue-800">{item.deviation_id || item.name}</Link></td>
                  <td>
                    <div className="text-sm text-gray-900">{item.linked_project || '-'}</div>
                    <div className="text-xs text-gray-500">{item.linked_site || '-'}</div>
                  </td>
                  <td><div className="text-sm text-gray-900">{item.linked_drawing || '-'}</div></td>
                  <td><div className="text-sm text-gray-900">{item.impact || '-'}</div></td>
                  <td><div className="text-sm text-gray-900 max-w-[200px] truncate">{item.description || '-'}</div></td>
                  <td><span className={`badge ${STATUS_BADGES[item.status || ''] || 'badge-gray'}`}>{item.status || '-'}</span></td>
                  <td><div className="text-sm text-gray-500">{item.raised_by || '-'}</div></td>
                  <td>
                    <div className="flex gap-1">
                      {item.status === 'Open' && (
                        <>
                          <button className="btn btn-xs btn-success" onClick={() => handleAction('approve', item.name)}>Approve</button>
                          <button className="btn btn-xs btn-error" onClick={() => handleAction('reject', item.name)}>Reject</button>
                        </>
                      )}
                      {(item.status === 'Approved' || item.status === 'Rejected') && (
                        <button className="btn btn-xs btn-secondary" onClick={() => handleAction('close', item.name)}>Close</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Raise Technical Deviation</h2>
                <p className="text-sm text-gray-500 mt-1">Record a deviation from the approved design or drawing.</p>
              </div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreateModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Project"><input className="input" value={formData.linked_project} onChange={e => setFormData({ ...formData, linked_project: e.target.value })} /></Field>
              <Field label="Site"><input className="input" value={formData.linked_site} onChange={e => setFormData({ ...formData, linked_site: e.target.value })} /></Field>
              <Field label="Drawing"><input className="input" value={formData.linked_drawing} onChange={e => setFormData({ ...formData, linked_drawing: e.target.value })} /></Field>
              <Field label="Impact">
                <select className="input" value={formData.impact} onChange={e => setFormData({ ...formData, impact: e.target.value })}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </Field>
              <Field label="Description" full><textarea className="input min-h-[88px]" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></Field>
              <Field label="Root Cause" full><textarea className="input min-h-[88px]" value={formData.root_cause} onChange={e => setFormData({ ...formData, root_cause: e.target.value })} /></Field>
              <Field label="Proposed Solution" full><textarea className="input min-h-[88px]" value={formData.proposed_solution} onChange={e => setFormData({ ...formData, proposed_solution: e.target.value })} /></Field>
            </div>
            <div className="px-6 pb-6">
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-3">
                <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Raise Deviation'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: number }) {
  const colors: Record<string, string> = { blue: 'bg-blue-100 text-blue-600', amber: 'bg-amber-100 text-amber-600', green: 'bg-green-100 text-green-600', rose: 'bg-rose-100 text-rose-600' };
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color] || colors.blue}`}><Icon className="w-5 h-5" /></div>
        <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
      </div>
    </div>
  );
}

function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={full ? 'md:col-span-2' : ''}><div className="text-sm font-medium text-gray-700 mb-2">{label}</div>{children}</label>;
}
