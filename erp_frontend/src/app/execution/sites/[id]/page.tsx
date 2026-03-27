'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, User, Building2,
  Hash, MapPin, Globe, Tag, Compass,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';

interface SiteDetail {
  name: string;
  site_code?: string;
  site_name?: string;
  status?: string;
  linked_project?: string;
  linked_tender?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
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
    : s === 'IN_PROGRESS' || s === 'IN PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : s === 'PLANNED' ? 'bg-purple-50 text-purple-700 border-purple-200'
    : s === 'BLOCKED' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : s === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold ${style}`}>{s.replace(/_/g, ' ') || 'N/A'}</span>;
}

export default function SiteDetailPage() {
  const params = useParams();
  const siteName = decodeURIComponent((params?.id as string) || '');

  const [data, setData] = useState<SiteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/sites/${encodeURIComponent(siteName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load site'); }
    finally { setLoading(false); }
  }, [siteName]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading site...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/execution" className="text-sm text-blue-600 hover:underline">← Back to Execution</Link></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/execution" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to Execution</Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.site_name || data.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{data.site_code || data.name}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Site Details</h3></div>
          <div className="card-body">
            <dl className="space-y-3 text-sm">
              {[
                [<Hash key="n" className="h-3.5 w-3.5" />, 'Site ID', data.name],
                [<Tag key="sc" className="h-3.5 w-3.5" />, 'Site Code', data.site_code],
                [<MapPin key="sn" className="h-3.5 w-3.5" />, 'Site Name', data.site_name],
                [<Building2 key="p" className="h-3.5 w-3.5" />, 'Project', data.linked_project],
                [<Hash key="t" className="h-3.5 w-3.5" />, 'Tender', data.linked_tender],
                [<MapPin key="addr" className="h-3.5 w-3.5" />, 'Address', data.address],
                [<Building2 key="c" className="h-3.5 w-3.5" />, 'City', data.city],
                [<Globe key="st" className="h-3.5 w-3.5" />, 'State', data.state],
                [<Hash key="pin" className="h-3.5 w-3.5" />, 'Pincode', data.pincode],
                [<Compass key="lat" className="h-3.5 w-3.5" />, 'Latitude', data.latitude],
                [<Compass key="lng" className="h-3.5 w-3.5" />, 'Longitude', data.longitude],
                [<User key="cp" className="h-3.5 w-3.5" />, 'Contact', data.contact_person],
                [<Hash key="ph" className="h-3.5 w-3.5" />, 'Phone', data.contact_phone],
                [<Hash key="em" className="h-3.5 w-3.5" />, 'Email', data.contact_email],
                [<User key="o" className="h-3.5 w-3.5" />, 'Created By', data.owner],
                [<Calendar key="cr" className="h-3.5 w-3.5" />, 'Created', formatDate(data.creation)],
              ].map(([icon, label, value]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className="text-gray-400">{icon}</span>
                  <dt className="text-gray-500 w-32 shrink-0">{String(label)}</dt>
                  <dd className="font-medium text-gray-900 truncate">{String(value ?? '-')}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <LinkedRecordsPanel links={[
            { label: 'Test Reports', doctype: 'GE Test Report', method: 'frappe.client.get_list', args: { doctype: 'GE Test Report', filters: JSON.stringify({ linked_site: data.name }), fields: JSON.stringify(['name', 'report_name', 'test_type', 'status']), limit_page_length: '10' }, href: (name: string) => `/execution/commissioning/test-reports/${name}` },
            { label: 'Checklists', doctype: 'GE Commissioning Checklist', method: 'frappe.client.get_list', args: { doctype: 'GE Commissioning Checklist', filters: JSON.stringify({ linked_site: data.name }), fields: JSON.stringify(['name', 'checklist_name', 'status']), limit_page_length: '10' }, href: (name: string) => `/execution/commissioning/checklists/${name}` },
            { label: 'Client Signoffs', doctype: 'GE Client Signoff', method: 'frappe.client.get_list', args: { doctype: 'GE Client Signoff', filters: JSON.stringify({ linked_site: data.name }), fields: JSON.stringify(['name', 'signoff_type', 'status']), limit_page_length: '10' }, href: (name: string) => `/execution/commissioning/client-signoffs/${name}` },
            { label: 'Devices', doctype: 'GE Device Register', method: 'frappe.client.get_list', args: { doctype: 'GE Device Register', filters: JSON.stringify({ linked_site: data.name }), fields: JSON.stringify(['name', 'device_name', 'device_type', 'status']), limit_page_length: '10' }, href: (name: string) => `/execution/commissioning/devices/${name}` },
          ]} />
        </div>
      </div>

      <TraceabilityPanel projectId={data.linked_project} siteId={data.name} siteLabel={data.site_name || data.name} />

      <RecordDocumentsPanel referenceDoctype="GE Site" referenceName={siteName} title="Site Documents" initialLimit={5} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE Site" subjectName={siteName} compact={false} initialLimit={10} /></div></div>
    </div>
  );
}
