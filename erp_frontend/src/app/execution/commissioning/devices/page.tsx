'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Cpu, Network, Plus, Wifi, X } from 'lucide-react';

interface DeviceRegister {
  name: string;
  linked_project?: string;
  linked_site?: string;
  device_name?: string;
  device_type?: string;
  serial_no?: string;
  make_model?: string;
  mac_address?: string;
  ip_address?: string;
  status?: string;
  deployment_date?: string;
  warranty_end_date?: string;
}

interface IPPool {
  name: string;
  linked_project?: string;
  linked_site?: string;
  network_name?: string;
  subnet?: string;
  gateway?: string;
  vlan_id?: string;
  total_ips?: number;
  allocated_ips?: number;
  status?: string;
}

interface IPAllocation {
  name: string;
  linked_pool?: string;
  linked_device?: string;
  ip_address?: string;
  status?: string;
  allocated_on?: string;
  allocated_by?: string;
  released_on?: string;
}

interface DeviceUptimeLog {
  name: string;
  linked_project?: string;
  linked_site?: string;
  linked_device?: string;
  device_type?: string;
  log_date?: string;
  uptime_percent?: number;
  downtime_minutes?: number;
  sla_status?: string;
}

type DeviceFormData = { linked_project: string; linked_site: string; device_name: string; device_type: string; serial_no: string; make_model: string; mac_address: string };
const initialDeviceForm: DeviceFormData = { linked_project: '', linked_site: '', device_name: '', device_type: 'Camera', serial_no: '', make_model: '', mac_address: '' };

const DEVICE_STATUS: Record<string, string> = { Deployed: 'badge-warning', Active: 'badge-success', Faulty: 'badge-error', Commissioned: 'badge-success', Decommissioned: 'badge-gray' };
const IP_STATUS: Record<string, string> = { Active: 'badge-success', Released: 'badge-gray', Planning: 'badge-warning' };

type TabKey = 'devices' | 'pools' | 'allocations' | 'uptime';

export default function CommissioningDevicesPage() {
  const [devices, setDevices] = useState<DeviceRegister[]>([]);
  const [pools, setPools] = useState<IPPool[]>([]);
  const [allocations, setAllocations] = useState<IPAllocation[]>([]);
  const [uptimeLogs, setUptimeLogs] = useState<DeviceUptimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('devices');
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [deviceForm, setDeviceForm] = useState<DeviceFormData>(initialDeviceForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [devRes, poolRes, allocRes, uptimeRes] = await Promise.all([
      fetch('/api/execution/commissioning/device-registers').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/execution/commissioning/ip-pools').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/execution/commissioning/ip-allocations').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/execution/commissioning/device-uptime-logs').then(r => r.json()).catch(() => ({ data: [] })),
    ]);
    setDevices(devRes.data || []);
    setPools(poolRes.data || []);
    setAllocations(allocRes.data || []);
    setUptimeLogs(uptimeRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateDevice = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/execution/commissioning/device-registers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(deviceForm) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowDeviceModal(false);
      setDeviceForm(initialDeviceForm);
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setIsSubmitting(false); }
  };

  const handleDeviceAction = async (action: string, name: string, extra?: Record<string, string>) => {
    try {
      const response = await fetch('/api/execution/commissioning/device-registers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, name, ...extra }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Action failed');
      await loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Action failed'); }
  };

  const handleIPAction = async (action: string, name: string) => {
    try {
      const response = await fetch('/api/execution/commissioning/ip-allocations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, name }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Action failed');
      await loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Action failed'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Devices & IP Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Device register, IP pool allocation, and uptime monitoring for commissioning.</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowDeviceModal(true)}><Plus className="w-4 h-4" /> Add Device</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard icon={Cpu} color="blue" label="Devices" value={devices.length} hint={`${devices.filter(d => d.status === 'Commissioned').length} commissioned`} />
        <StatCard icon={Network} color="violet" label="IP Pools" value={pools.length} hint={`${pools.reduce((s, p) => s + (p.allocated_ips || 0), 0)} IPs allocated`} />
        <StatCard icon={Wifi} color="green" label="Active IPs" value={allocations.filter(a => a.status === 'Active').length} hint={`${allocations.filter(a => a.status === 'Released').length} released`} />
        <StatCard icon={Activity} color="amber" label="Uptime Logs" value={uptimeLogs.length} hint={`${uptimeLogs.filter(u => u.sla_status === 'Met').length} SLA met`} />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['devices', 'pools', 'allocations', 'uptime'] as TabKey[]).map(tab => (
          <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab(tab)}>
            {{devices: `Devices (${devices.length})`, pools: `IP Pools (${pools.length})`, allocations: `IP Allocations (${allocations.length})`, uptime: `Uptime (${uptimeLogs.length})`}[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'devices' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Device Register</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Device</th><th>Type</th><th>Serial / MAC</th><th>Project / Site</th><th>IP</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {devices.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-500">No devices registered</td></tr>
                ) : devices.map(d => (
                  <tr key={d.name}>
                    <td><Link href={`/execution/commissioning/devices/${encodeURIComponent(d.name)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{d.name}</Link></td>
                    <td><div className="text-sm text-gray-900">{d.device_name || '-'}</div><div className="text-xs text-gray-500">{d.make_model || ''}</div></td>
                    <td><div className="text-sm text-gray-900">{d.device_type || '-'}</div></td>
                    <td><div className="text-sm text-gray-900">{d.serial_no || '-'}</div><div className="text-xs text-gray-500">{d.mac_address || ''}</div></td>
                    <td><div className="text-sm text-gray-900">{d.linked_project || '-'}</div><div className="text-xs text-gray-500">{d.linked_site || ''}</div></td>
                    <td><div className="text-sm text-gray-900">{d.ip_address || '-'}</div></td>
                    <td><span className={`badge ${DEVICE_STATUS[d.status || ''] || 'badge-gray'}`}>{d.status || '-'}</span></td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {(d.status === 'Deployed' || d.status === 'Active') && <button className="btn btn-xs btn-success" onClick={() => handleDeviceAction('commission', d.name)}>Commission</button>}
                        {d.status !== 'Decommissioned' && d.status !== 'Faulty' && <button className="btn btn-xs btn-warning" onClick={() => handleDeviceAction('mark_faulty', d.name)}>Faulty</button>}
                        {d.status !== 'Decommissioned' && <button className="btn btn-xs btn-error" onClick={() => handleDeviceAction('decommission', d.name)}>Decommission</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pools' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">IP Pools</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Pool</th><th>Network</th><th>Subnet / Gateway</th><th>VLAN</th><th>Total IPs</th><th>Allocated</th><th>Status</th></tr></thead>
              <tbody>
                {pools.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-500">No IP pools defined</td></tr>
                ) : pools.map(p => (
                  <tr key={p.name}>
                    <td><div className="font-medium text-gray-900">{p.name}</div></td>
                    <td><div className="text-sm text-gray-900">{p.network_name || '-'}</div></td>
                    <td><div className="text-sm text-gray-900">{p.subnet || '-'}</div><div className="text-xs text-gray-500">{p.gateway || ''}</div></td>
                    <td><div className="text-sm text-gray-900">{p.vlan_id || '-'}</div></td>
                    <td><div className="text-sm text-gray-900">{p.total_ips ?? 0}</div></td>
                    <td><div className="text-sm text-gray-900">{p.allocated_ips ?? 0}</div></td>
                    <td><span className={`badge ${IP_STATUS[p.status || ''] || 'badge-gray'}`}>{p.status || '-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'allocations' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">IP Allocations</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Allocation</th><th>Pool</th><th>Device</th><th>IP Address</th><th>Allocated On</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {allocations.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-500">No IP allocations</td></tr>
                ) : allocations.map(a => (
                  <tr key={a.name}>
                    <td><div className="font-medium text-gray-900">{a.name}</div></td>
                    <td><div className="text-sm text-gray-900">{a.linked_pool || '-'}</div></td>
                    <td><div className="text-sm text-gray-900">{a.linked_device || '-'}</div></td>
                    <td><div className="text-sm font-mono text-gray-900">{a.ip_address || '-'}</div></td>
                    <td><div className="text-sm text-gray-500">{a.allocated_on || '-'}</div></td>
                    <td><span className={`badge ${IP_STATUS[a.status || ''] || 'badge-gray'}`}>{a.status || '-'}</span></td>
                    <td>{a.status === 'Active' && <button className="btn btn-xs btn-warning" onClick={() => handleIPAction('release', a.name)}>Release</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'uptime' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Device Uptime Logs</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Log</th><th>Device</th><th>Type</th><th>Date</th><th>Uptime %</th><th>Downtime (min)</th><th>SLA Status</th></tr></thead>
              <tbody>
                {uptimeLogs.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-500">No uptime logs recorded</td></tr>
                ) : uptimeLogs.map(u => (
                  <tr key={u.name}>
                    <td><div className="font-medium text-gray-900">{u.name}</div></td>
                    <td><div className="text-sm text-gray-900">{u.linked_device || '-'}</div></td>
                    <td><div className="text-sm text-gray-900">{u.device_type || '-'}</div></td>
                    <td><div className="text-sm text-gray-500">{u.log_date || '-'}</div></td>
                    <td><div className="text-sm font-medium text-gray-900">{u.uptime_percent != null ? `${u.uptime_percent}%` : '-'}</div></td>
                    <td><div className="text-sm text-gray-900">{u.downtime_minutes ?? '-'}</div></td>
                    <td><span className={`badge ${u.sla_status === 'Met' ? 'badge-success' : u.sla_status === 'Breached' ? 'badge-error' : 'badge-gray'}`}>{u.sla_status || '-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Add Device</h2>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowDeviceModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Project"><input className="input" value={deviceForm.linked_project} onChange={e => setDeviceForm({ ...deviceForm, linked_project: e.target.value })} /></Field>
              <Field label="Site"><input className="input" value={deviceForm.linked_site} onChange={e => setDeviceForm({ ...deviceForm, linked_site: e.target.value })} /></Field>
              <Field label="Device Name"><input className="input" value={deviceForm.device_name} onChange={e => setDeviceForm({ ...deviceForm, device_name: e.target.value })} /></Field>
              <Field label="Device Type">
                <select className="input" value={deviceForm.device_type} onChange={e => setDeviceForm({ ...deviceForm, device_type: e.target.value })}>
                  <option value="Camera">Camera</option><option value="PTZ Camera">PTZ Camera</option><option value="ANPR Camera">ANPR Camera</option>
                  <option value="RLVD Camera">RLVD Camera</option><option value="Server">Server</option><option value="Switch">Switch</option>
                  <option value="NVR">NVR</option><option value="Workstation">Workstation</option><option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Serial No"><input className="input" value={deviceForm.serial_no} onChange={e => setDeviceForm({ ...deviceForm, serial_no: e.target.value })} /></Field>
              <Field label="Make / Model"><input className="input" value={deviceForm.make_model} onChange={e => setDeviceForm({ ...deviceForm, make_model: e.target.value })} /></Field>
              <Field label="MAC Address"><input className="input" value={deviceForm.mac_address} onChange={e => setDeviceForm({ ...deviceForm, mac_address: e.target.value })} /></Field>
            </div>
            <div className="px-6 pb-6">
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-3">
                <button className="btn btn-secondary" onClick={() => setShowDeviceModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateDevice} disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Device'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, hint }: { icon: any; color: string; label: string; value: number; hint: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-100 text-blue-600', violet: 'bg-violet-100 text-violet-600', green: 'bg-green-100 text-green-600', amber: 'bg-amber-100 text-amber-600' };
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color] || colors.blue}`}><Icon className="w-5 h-5" /></div>
        <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
      </div>
      <div className="text-xs text-gray-500 mt-2">{hint}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><div className="text-sm font-medium text-gray-700 mb-2">{label}</div>{children}</label>;
}
