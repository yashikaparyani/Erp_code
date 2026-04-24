'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Building2, Pencil, Trash2 } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import ActionModal from '@/components/ui/ActionModal';

type Supplier = {
  name: string;
  party_name: string;
  party_type?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  address?: string;
  active?: number;
  creation?: string;
};

const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]';

function SupplierForm({
  values,
  onChange,
}: {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Supplier Name *</label>
        <input className={inputCls} value={values.party_name || ''} onChange={e => onChange('party_name', e.target.value)} placeholder="Supplier name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
          <input className={inputCls} value={values.phone || ''} onChange={e => onChange('phone', e.target.value)} placeholder="+91-..." />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
          <input className={inputCls} type="email" value={values.email || ''} onChange={e => onChange('email', e.target.value)} placeholder="contact@supplier.com" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">City</label>
          <input className={inputCls} value={values.city || ''} onChange={e => onChange('city', e.target.value)} placeholder="City" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">State</label>
          <input className={inputCls} value={values.state || ''} onChange={e => onChange('state', e.target.value)} placeholder="State" />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Address</label>
        <input className={inputCls} value={values.address || ''} onChange={e => onChange('address', e.target.value)} placeholder="Full address" />
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [createValues, setCreateValues] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState('');

  // Edit
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState('');

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/suppliers', { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to load suppliers');
      setRows(Array.isArray(payload.data) ? payload.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.party_name, r.city, r.state, r.email, r.phone].filter(Boolean).some(v => v!.toLowerCase().includes(q))
    );
  }, [rows, query]);

  const handleCreate = async () => {
    if (!createValues.party_name?.trim()) { setCreateError('Supplier name is required'); return; }
    setBusy(true); setCreateError('');
    try {
      const res = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createValues) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to create supplier');
      setShowCreate(false);
      setCreateValues({});
      await load();
    } catch (e) { setCreateError(e instanceof Error ? e.message : 'Failed to create supplier'); }
    finally { setBusy(false); }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    if (!editValues.party_name?.trim()) { setEditError('Supplier name is required'); return; }
    setBusy(true); setEditError('');
    try {
      const res = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', name: editTarget.name, ...editValues }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to update supplier');
      setEditTarget(null);
      await load();
    } catch (e) { setEditError(e instanceof Error ? e.message : 'Failed to update supplier'); }
    finally { setBusy(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', name: deleteTarget.name }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to delete supplier');
      setDeleteTarget(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete supplier'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <RegisterPage
        title="Supplier Management"
        description="Manage vendor and supplier master records used in procurement."
        loading={loading}
        error={error}
        empty={!loading && rows.length === 0}
        emptyTitle="No suppliers"
        emptyDescription="Add your first supplier to enable procurement workflows."
        onRetry={load}
        stats={[
          { label: 'Total', value: rows.length },
          { label: 'Active', value: rows.filter(r => r.active).length, variant: 'success' },
          { label: 'Filtered', value: filtered.length, variant: query ? 'default' : undefined },
        ]}
        headerActions={
          <button className="btn btn-primary" onClick={() => { setCreateValues({}); setCreateError(''); setShowCreate(true); }}>
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        }
        filterBar={
          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input className="input pl-9" type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search supplier, city…" />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="data-table w-full text-sm">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Phone</th>
                <th>Email</th>
                <th>City</th>
                <th>State</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.name}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="font-medium text-gray-900">{r.party_name}</span>
                    </div>
                    {r.address && <div className="text-xs text-gray-500 mt-0.5 pl-6">{r.address}</div>}
                  </td>
                  <td className="text-gray-700">{r.phone || '-'}</td>
                  <td className="text-gray-700">{r.email || '-'}</td>
                  <td className="text-gray-700">{r.city || '-'}</td>
                  <td className="text-gray-700">{r.state || '-'}</td>
                  <td>
                    <span className={`badge ${r.active ? 'badge-success' : 'badge-gray'}`}>
                      {r.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <button
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        onClick={() => { setEditTarget(r); setEditValues({ party_name: r.party_name, phone: r.phone || '', email: r.email || '', city: r.city || '', state: r.state || '', address: r.address || '' }); setEditError(''); }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        className="text-sm font-medium text-rose-600 hover:text-rose-800 flex items-center gap-1"
                        onClick={() => setDeleteTarget(r)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RegisterPage>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Add Supplier</h2>
            {createError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{createError}</div>}
            <SupplierForm values={createValues} onChange={(k, v) => setCreateValues(prev => ({ ...prev, [k]: v }))} />
            <div className="flex justify-end gap-3 pt-2">
              <button className="btn" onClick={() => setShowCreate(false)} disabled={busy}>Cancel</button>
              <button className="btn btn-primary" onClick={() => void handleCreate()} disabled={busy}>{busy ? 'Creating…' : 'Create Supplier'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Edit Supplier</h2>
            {editError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{editError}</div>}
            <SupplierForm values={editValues} onChange={(k, v) => setEditValues(prev => ({ ...prev, [k]: v }))} />
            <div className="flex justify-end gap-3 pt-2">
              <button className="btn" onClick={() => setEditTarget(null)} disabled={busy}>Cancel</button>
              <button className="btn btn-primary" onClick={() => void handleEdit()} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      <ActionModal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.party_name || 'Supplier'}`}
        description="This will permanently remove the supplier. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        busy={busy}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
