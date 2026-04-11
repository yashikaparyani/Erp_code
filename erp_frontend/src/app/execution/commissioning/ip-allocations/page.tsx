'use client';

import { useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, RefreshCw, Trash2, Wifi, X } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import LinkPicker from '@/components/ui/LinkPicker';
import { apiFetch } from '@/lib/api-client';

type IpAllocation = {
  name: string;
  ip_address?: string;
  linked_pool?: string;
  linked_device?: string;
  allocated_on?: string;
  allocated_by?: string;
  released_on?: string;
  status?: string;
};

const EMPTY_FORM = {
  linked_pool: '',
  linked_device: '',
  ip_address: '',
  remarks: '',
};

export default function IpAllocationsPage() {
  const [rows, setRows] = useState<IpAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const result = await apiFetch<{ data?: IpAllocation[] }>('/api/execution/commissioning/ip-allocations');
      setRows(result.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load IP allocations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const allocated = rows.filter((row) => row.status !== 'Released').length;
    const released = rows.filter((row) => row.status === 'Released').length;
    return { total, allocated, released };
  }, [rows]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (row: IpAllocation) => {
    setEditingId(row.name);
    setForm({
      linked_pool: row.linked_pool || '',
      linked_device: row.linked_device || '',
      ip_address: row.ip_address || '',
      remarks: '',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.linked_pool.trim() || !form.ip_address.trim()) {
      setError('IP pool and IP address are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await apiFetch('/api/execution/commissioning/ip-allocations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            name: editingId,
            data: {
              linked_pool: form.linked_pool,
              linked_device: form.linked_device || undefined,
              ip_address: form.ip_address,
              remarks: form.remarks || undefined,
            },
          }),
        });
      } else {
        await apiFetch('/api/execution/commissioning/ip-allocations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            linked_pool: form.linked_pool,
            linked_device: form.linked_device || undefined,
            ip_address: form.ip_address,
            remarks: form.remarks || undefined,
          }),
        });
      }
      resetForm();
      await load(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save IP allocation');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm('Release this IP allocation?')) return;
    setDeletingId(name);
    setError('');
    try {
      await apiFetch('/api/execution/commissioning/ip-allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', name }),
      });
      await load(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete IP allocation');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <RegisterPage
      title="IP Allocation Register"
      description="Track assigned IP addresses by pool and device without falling back to raw commissioning IDs."
      loading={loading}
      error={error || undefined}
      empty={!loading && rows.length === 0}
      emptyTitle="No IP allocations found"
      emptyDescription="Allocate the first IP address to start tracking commissioned network usage."
      onRetry={() => load()}
      stats={[
        { label: 'Allocations', value: stats.total, variant: 'info' },
        { label: 'Active', value: stats.allocated, variant: 'success' },
        { label: 'Released', value: stats.released, variant: 'warning' },
      ]}
      headerActions={(
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Allocate IP</button>
          <button className="btn btn-secondary" onClick={() => void load(false)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
      )}
    >
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Allocated Addresses</h3>
          <div className="text-sm text-gray-500">Use registered pools and devices for clean commissioning traceability.</div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Pool</th>
                <th>Device</th>
                <th>Status</th>
                <th>Allocated On</th>
                <th>Released On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">No IP allocations found</td>
                </tr>
              ) : rows.map((row) => (
                <tr key={row.name}>
                  <td><span className="font-mono text-sm text-gray-900">{row.ip_address || row.name}</span></td>
                  <td>{row.linked_pool || '-'}</td>
                  <td>{row.linked_device || '-'}</td>
                  <td>{row.status || '-'}</td>
                  <td>{row.allocated_on || '-'}</td>
                  <td>{row.released_on || '-'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-800" onClick={() => openEdit(row)}><Edit3 className="h-4 w-4" /></button>
                      <button className="text-red-600 hover:text-red-800 disabled:opacity-50" onClick={() => handleDelete(row.name)} disabled={deletingId === row.name}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl max-h-[90vh]">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">{editingId ? 'Edit IP Allocation' : 'Allocate IP Address'}</h2>
              </div>
              <button className="rounded-lg p-2 hover:bg-gray-100" onClick={resetForm}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">IP Pool *</label>
                <LinkPicker
                  entity="ip_pool"
                  value={form.linked_pool}
                  onChange={(value) => setForm((prev) => ({ ...prev, linked_pool: value }))}
                  placeholder="Search IP pool…"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Device</label>
                <LinkPicker
                  entity="device"
                  value={form.linked_device}
                  onChange={(value) => setForm((prev) => ({ ...prev, linked_device: value }))}
                  placeholder="Search commissioned device…"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">IP Address *</label>
                <input
                  className="input"
                  value={form.ip_address}
                  onChange={(e) => setForm((prev) => ({ ...prev, ip_address: e.target.value }))}
                  placeholder="e.g. 192.168.1.10"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Remarks</label>
                <textarea
                  className="input min-h-24"
                  value={form.remarks}
                  onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Add allocation notes if needed"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <button className="btn btn-secondary" onClick={resetForm}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Allocate IP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </RegisterPage>
  );
}
