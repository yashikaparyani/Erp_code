'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import RegisterPage from '@/components/shells/RegisterPage';
import { badge, DC_BADGES } from '@/components/procurement/proc-helpers';

interface DispatchChallan {
  name: string; dispatch_date?: string; dispatch_type?: string; status?: string;
  from_warehouse?: string; to_warehouse?: string; target_site_name?: string;
  linked_project?: string; total_items?: number; total_qty?: number;
}

export default function DispatchChallansPage() {
  const [items, setItems] = useState<DispatchChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const qs = filter ? `?status=${encodeURIComponent(filter)}` : '';
      const res = await fetch(`/api/dispatch-challans${qs}`).then(r => r.json());
      setItems(res.data || []);
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const draft = items.filter(i => i.status === 'DRAFT').length;
  const pending = items.filter(i => i.status === 'PENDING_APPROVAL').length;
  const dispatched = items.filter(i => i.status === 'DISPATCHED').length;

  return (
    <RegisterPage
      title="Dispatch Challans"
      description="Track material dispatches from warehouse to project sites."
      loading={loading} error={error} onRetry={load}
      stats={[
        { label: 'Total', value: items.length },
        { label: 'Draft', value: draft },
        { label: 'Pending', value: pending },
        { label: 'Dispatched', value: dispatched },
      ]}
      filterBar={
        <select className="input w-auto text-xs" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DISPATCHED', 'REJECTED'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      }
    >
      <table className="data-table">
        <thead><tr><th>Challan ID</th><th>Date</th><th>Type</th><th>From</th><th>To / Site</th><th>Project</th><th>Items</th><th>Qty</th><th>Status</th></tr></thead>
        <tbody>
          {items.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-gray-500">No dispatch challans found</td></tr> : items.map(c => (
            <tr key={c.name}>
              <td><Link href={`/dispatch-challans/${encodeURIComponent(c.name)}`} className="font-medium text-blue-700 hover:underline">{c.name}</Link></td>
              <td className="text-gray-700">{c.dispatch_date || '-'}</td>
              <td className="text-gray-700">{c.dispatch_type || '-'}</td>
              <td className="text-gray-700">{c.from_warehouse || '-'}</td>
              <td className="text-gray-700">{c.target_site_name || c.to_warehouse || '-'}</td>
              <td className="text-gray-700">{c.linked_project || '-'}</td>
              <td className="text-center text-gray-700">{c.total_items ?? '-'}</td>
              <td className="text-center text-gray-700">{c.total_qty ?? '-'}</td>
              <td><span className={`badge ${badge(DC_BADGES, c.status)}`}>{c.status || '-'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </RegisterPage>
  );
}