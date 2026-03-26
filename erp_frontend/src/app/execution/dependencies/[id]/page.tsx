'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, Calendar, User,
  Hash, GitBranch, Lock, Unlock, ToggleRight, ToggleLeft, FileText,
} from 'lucide-react';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';

interface DependencyRuleDetail {
  name: string;
  linked_task?: string;
  prerequisite_type?: string;
  prerequisite_task?: string;
  hard_block?: boolean;
  required_status?: string;
  block_message?: string;
  is_active?: boolean;
  creation?: string;
  modified?: string;
  owner?: string;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DependencyRuleDetailPage() {
  const params = useParams();
  const ruleName = decodeURIComponent((params?.id as string) || '');

  const [data, setData] = useState<DependencyRuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/execution/dependency-rules/${encodeURIComponent(ruleName)}`);
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Failed to load');
      setData(payload.data?.data || payload.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load dependency rule'); }
    finally { setLoading(false); }
  }, [ruleName]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /><span className="ml-2 text-gray-500">Loading dependency rule...</span></div>;
  if (error && !data) return <div className="flex flex-col items-center justify-center h-64 gap-4"><AlertCircle className="h-10 w-10 text-rose-400" /><p className="text-rose-600">{error}</p><Link href="/execution/dependencies" className="text-sm text-blue-600 hover:underline">← Back to Dependencies</Link></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/execution/dependencies" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to Dependencies</Link>
          <h1 className="text-2xl font-bold text-gray-900">Dependency Rule: {data.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.hard_block
            ? <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"><Lock className="h-3.5 w-3.5" /> Hard Block</span>
            : <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"><Unlock className="h-3.5 w-3.5" /> Soft Block</span>}
          {data.is_active
            ? <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><ToggleRight className="h-3.5 w-3.5" /> Active</span>
            : <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-500"><ToggleLeft className="h-3.5 w-3.5" /> Inactive</span>}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Rule Details</h3></div>
        <div className="card-body">
          <dl className="space-y-3 text-sm">
            {[
              [<Hash key="n" className="h-3.5 w-3.5" />, 'Rule ID', data.name],
              [<GitBranch key="lt" className="h-3.5 w-3.5" />, 'Linked Task', data.linked_task],
              [<FileText key="pt" className="h-3.5 w-3.5" />, 'Prerequisite Type', data.prerequisite_type],
              [<GitBranch key="ptk" className="h-3.5 w-3.5" />, 'Prerequisite Task', data.prerequisite_task],
              [<Lock key="hb" className="h-3.5 w-3.5" />, 'Hard Block', data.hard_block ? 'Yes' : 'No'],
              [<FileText key="rs" className="h-3.5 w-3.5" />, 'Required Status', data.required_status],
              [<User key="o" className="h-3.5 w-3.5" />, 'Created By', data.owner],
              [<Calendar key="c" className="h-3.5 w-3.5" />, 'Created', formatDate(data.creation)],
              [<Calendar key="m" className="h-3.5 w-3.5" />, 'Modified', formatDate(data.modified)],
            ].map(([icon, label, value]) => (
              <div key={String(label)} className="flex items-center gap-2">
                <span className="text-gray-400">{icon}</span>
                <dt className="text-gray-500 w-36 shrink-0">{String(label)}</dt>
                <dd className="font-medium text-gray-900 truncate">{String(value ?? '-')}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {data.block_message && (
        <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Block Message</h3></div><div className="card-body"><p className="text-sm text-gray-700 whitespace-pre-wrap">{data.block_message}</p></div></div>
      )}

      <LinkedRecordsPanel links={[
        { label: 'Override Requests', doctype: 'GE Dependency Override', method: 'frappe.client.get_list', args: { doctype: 'GE Dependency Override', filters: JSON.stringify({ dependency_rule: data.name }), fields: JSON.stringify(['name', 'status', 'requested_by', 'reason']), limit_page_length: '10' }, href: () => `/execution/dependencies` },
      ]} />

      <div className="card"><div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div><div className="card-body"><AccountabilityTimeline subjectDoctype="GE Dependency Rule" subjectName={ruleName} compact={false} initialLimit={10} /></div></div>
    </div>
  );
}
