'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, User, Building2,
  MapPin, Hash, CheckCircle2, XCircle, Cpu, Network, Wrench, Shield,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import { useAuth } from '@/context/AuthContext';

interface DeviceDetail {
  name: string;
  device_name?: string;
  device_type?: string;
  linked_project?: string;
  linked_site?: string;
  serial_no?: string;
  make_model?: string;
  mac_address?: string;
  ip_address?: string;
  status?: string;
  deployment_date?: string;
  warranty_end_date?: string;
  remarks?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || '').toUpperCase();
  const style = s === 'COMMISSIONED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'ACTIVE' || s === 'DEPLOYED' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : s === 'FAULTY' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : s === 'DECOMMISSIONED' ? 'bg-gray-100 text-gray-700 border-gray-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s || 'N/A'}</span>;
}

export default function DeviceDetailPage() {
  const params = useParams();
  const deviceName = decodeURIComponent((params?.id as string) || '');
  const { currentUser } = useAuth();

  const [data, setData] = useState<DeviceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [faultyModal, setFaultyModal] = useState(false);
  const [decommModal, setDecommModal] = useState(false);

  const hasRole = (...roles: string[]) => {
    const set = new Set(currentUser?.roles || []);
    return roles.some((r) => set.has(r));
  };
  const canManage = hasRole('Director', 'System Manager', 'I&C Manager', 'Field Technician', 'Project Manager');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/execution/commissioning/device-registers/${encodeURIComponent(deviceName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load device'); }
    finally { setLoading(false); }
  }, [deviceName]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  const runAction = async (action: string, extra: Record<string, string> = {}) => {
    setActionBusy(action); setError('');
    try {
      const res = await fetch('/api/execution/commissioning/device-registers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, name: deviceName, ...extra }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || `Failed to ${action}`);
      showSuccess(result.message || `${action} completed`);
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : `Failed to ${action}`); }
    finally { setActionBusy(''); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading device...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/execution/commissioning/devices" className="text-sm text-blue-600 hover:underline">← Back to Devices</Link></div>;
  if (!data) return null;

  const st = (data.status || '').toUpperCase();
  const isDeployed = st === 'DEPLOYED' || st === 'ACTIVE';
  const isCommissioned = st === 'COMMISSIONED';
  const isFaulty = st === 'FAULTY';
  const isDecomm = st === 'DECOMMISSIONED';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/execution/commissioning/devices" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to Devices</Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.device_name || data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.name}{data.make_model ? ` • ${data.make_model}` : ''}</p>
        </div>
        <StatusBadge status={st} />
      </div>

      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error} <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button></div>}

      {canManage && !isDecomm && (
        <div className="flex flex-wrap gap-2">
          {isDeployed && <button onClick={() => runAction('commission')} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> Commission</button>}
          {!isFaulty && !isDecomm && <button onClick={() => setFaultyModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" /> Mark Faulty</button>}
          {(isCommissioned || isFaulty) && <button onClick={() => setDecommModal(true)} disabled={!!actionBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"><Wrench className="h-3.5 w-3.5" /> Decommission</button>}
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Device Details</h3></div>
        <div className="card-body">
          <dl className="space-y-3 text-sm">
            {[
              [<Hash key="n" className="h-3.5 w-3.5" />, 'Device ID', data.name],
              [<Cpu key="dn" className="h-3.5 w-3.5" />, 'Device Name', data.device_name],
              [<Cpu key="dt" className="h-3.5 w-3.5" />, 'Device Type', data.device_type],
              [<Hash key="sn" className="h-3.5 w-3.5" />, 'Serial No', data.serial_no],
              [<Cpu key="mm" className="h-3.5 w-3.5" />, 'Make/Model', data.make_model],
              [<Network key="mac" className="h-3.5 w-3.5" />, 'MAC Address', data.mac_address],
              [<Network key="ip" className="h-3.5 w-3.5" />, 'IP Address', data.ip_address],
              [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
              [<MapPin key="s" className="h-3.5 w-3.5" />, 'Site', data.linked_site],
              [<Calendar key="dd" className="h-3.5 w-3.5" />, 'Deployment Date', formatDate(data.deployment_date)],
              [<Shield key="we" className="h-3.5 w-3.5" />, 'Warranty End', formatDate(data.warranty_end_date)],
              [<User key="o" className="h-3.5 w-3.5" />, 'Created By', data.owner],
              [<Calendar key="c" className="h-3.5 w-3.5" />, 'Created', formatDate(data.creation)],
            ].map(([icon, label, value]) => (
              <div key={String(label)} className="flex items-center gap-2">
                <span className="text-gray-400">{icon}</span>
                <dt className="text-gray-500 w-32 shrink-0">{String(label)}</dt>
                <dd className="font-medium text-gray-900 truncate">{String(value || '-')}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {data.remarks && (
        <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Remarks</h3></div><div className="card-body"><p className="text-sm text-gray-700 whitespace-pre-wrap">{data.remarks}</p></div></div>
      )}

      <LinkedRecordsPanel links={[
        { label: 'Uptime Logs', doctype: 'GE Device Uptime Log', method: 'frappe.client.get_list', args: { doctype: 'GE Device Uptime Log', filters: JSON.stringify({ linked_device: data.name }), fields: JSON.stringify(['name', 'sla_status', 'uptime_pct', 'creation']), limit_page_length: '10' }, href: () => `/device-uptime` },
      ]} />

      <RecordDocumentsPanel referenceDoctype="GE Device Register" referenceName={deviceName} title="Linked Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE Device Register" subjectName={deviceName} compact={false} initialLimit={10} /></div></div>

      <ActionModal open={faultyModal} title="Mark Device Faulty" description={`Mark ${data.device_name || data.name} as faulty.`} variant="danger" confirmLabel="Mark Faulty" busy={actionBusy === 'mark_faulty'} fields={[{ name: 'remarks', label: 'Fault Description', type: 'textarea', required: true, placeholder: 'Describe the fault...' }]} onConfirm={async (values) => { await runAction('mark_faulty', { remarks: values.remarks || '' }); setFaultyModal(false); }} onCancel={() => setFaultyModal(false)} />

      <ActionModal open={decommModal} title="Decommission Device" description={`Decommission ${data.device_name || data.name}. This action may not be reversible.`} variant="danger" confirmLabel="Decommission" busy={actionBusy === 'decommission'} fields={[{ name: 'remarks', label: 'Reason', type: 'textarea', required: true, placeholder: 'Reason for decommissioning...' }]} onConfirm={async (values) => { await runAction('decommission', { remarks: values.remarks || '' }); setDecommModal(false); }} onCancel={() => setDecommModal(false)} />
    </div>
  );
}
