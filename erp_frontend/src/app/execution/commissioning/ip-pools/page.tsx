'use client';

import { useEffect, useMemo, useState } from 'react';
import { Edit3, Network, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import LinkPicker from '@/components/ui/LinkPicker';
import { apiFetch } from '@/lib/api-client';

type IpPool = {
  name: string;
  network_name?: string;
  linked_project?: string;
  linked_site?: string;
  subnet?: string;
  gateway?: string;
  vlan_id?: string | number;
  total_ips?: number;
  allocated_ips?: number;
  status?: string;
};

const EMPTY_FORM = {
  network_name: '',
  linked_project: '',
  linked_site: '',
  subnet: '',
  gateway: '',
  vlan_id: '',
  remarks: '',
};

export default function IpPoolsPage() {
  const [rows, setRows] = useState<IpPool[]>([]);
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
      const result = await apiFetch<{ data?: IpPool[] }>('/api/execution/commissioning/ip-pools');
      setRows(result.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load IP pools');
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
    const totalIps = rows.reduce((sum, row) => sum + Number(row.total_ips || 0), 0);
    const allocated = rows.reduce((sum, row) => sum + Number(row.allocated_ips || 0), 0);
    const available = totalIps - allocated;
    return { total, totalIps, allocated, available };
  }, [rows]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (row: IpPool) => {
    setEditingId(row.name);
    setForm({
      network_name: row.network_name || '',
      linked_project: row.linked_project || '',
      linked_site: row.linked_site || '',
      subnet: row.subnet || '',
      gateway: row.gateway || '',
      vlan_id: row.vlan_id != null ? String(row.vlan_id) : '',
      remarks: '',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.network_name.trim() || !form.subnet.trim()) {
      setError('Network name and subnet are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await apiFetch('/api/execution/commissioning/ip-pools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', name: editingId, data: { ...form, vlan_id: form.vlan_id || undefined } }),
        });
      } else {
        await apiFetch('/api/execution/commissioning/ip-pools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, vlan_id: form.vlan_id || undefined }),
        });
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await load(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save IP pool');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm('Delete this IP pool?')) return;
    setDeletingId(name);
    setError('');
    try {
      await apiFetch('/api/execution/commissioning/ip-pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', name }),
      });
      await load(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete IP pool');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <RegisterPage
      title="IP Pool Management"
      description="Manage IP address pools for commissioning and network configuration."
      loading={loading}
      error={error || undefined}
      empty={!loading && rows.length === 0}
      emptyTitle="No IP pools configured"
      emptyDescription="Create the first commissioning network pool to start tracking subnet allocation."
      onRetry={() => load()}
      stats={[
        { label: 'IP Pools', value: stats.total, variant: 'info' },
        { label: 'Total Addresses', value: stats.totalIps, variant: 'default' },
        { label: 'Allocated', value: stats.allocated, variant: 'warning' },
        { label: 'Available', value: stats.available, variant: 'success' },
      ]}
      headerActions={
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={openCreate}><Plus className="h-4 w-4" />Create IP Pool</button>
          <button className="btn btn-secondary" onClick={() => void load(false)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
      }
    >
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Configured Pools</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Pool</th><th>Project</th><th>Site</th><th>Subnet</th><th>Gateway</th><th>VLAN</th><th>Usage</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={9} className="py-8 text-center text-gray-500">No IP pools configured</td></tr> : rows.map((row) => (
                <tr key={row.name}>
                  <td><span className="font-medium text-gray-900">{row.network_name || row.name}</span></td>
                  <td>{row.linked_project || '-'}</td>
                  <td>{row.linked_site || '-'}</td>
                  <td><span className="font-mono text-sm">{row.subnet || '-'}</span></td>
                  <td><span className="font-mono text-sm">{row.gateway || '-'}</span></td>
                  <td>{row.vlan_id || '-'}</td>
                  <td>{Number(row.allocated_ips || 0)} / {Number(row.total_ips || 0)}</td>
                  <td>{row.status || '-'}</td>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit IP Pool' : 'Create IP Pool'}</h2>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Network Name *</label><input className="input" value={form.network_name} onChange={(e) => setForm((p) => ({ ...p, network_name: e.target.value }))} placeholder="e.g. Site-A CCTV Pool" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Project</label><LinkPicker entity="project" value={form.linked_project} onChange={(value) => setForm((p) => ({ ...p, linked_project: value, linked_site: '' }))} placeholder="Search project…" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Site</label><LinkPicker entity="site" value={form.linked_site} onChange={(value) => setForm((p) => ({ ...p, linked_site: value }))} placeholder="Search site…" filters={form.linked_project ? { project: form.linked_project } : undefined} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Subnet *</label><input className="input" value={form.subnet} onChange={(e) => setForm((p) => ({ ...p, subnet: e.target.value }))} placeholder="e.g. 192.168.1.0/24" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Gateway</label><input className="input" value={form.gateway} onChange={(e) => setForm((p) => ({ ...p, gateway: e.target.value }))} placeholder="e.g. 192.168.1.1" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">VLAN ID</label><input className="input" value={form.vlan_id} onChange={(e) => setForm((p) => ({ ...p, vlan_id: e.target.value }))} placeholder="e.g. 100" /></div>
              <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label><textarea className="input min-h-24" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create IP Pool'}</button>
            </div>
          </div>
        </div>
      )}
    </RegisterPage>
  );
}
