'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import { formatCurrency, badge, GRN_BADGES } from '@/components/procurement/proc-helpers';

interface GRN { name: string; supplier?: string; posting_date?: string; status?: string; project?: string; set_warehouse?: string; grand_total?: number; }
interface GRNStats { total?: number; draft?: number; completed?: number; return_count?: number; total_value?: number; }

export default function GRNsPage() {
  const [items, setItems] = useState<GRN[]>([]);
  const [stats, setStats] = useState<GRNStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [lr, sr] = await Promise.all([fetch('/api/grns').then(r => r.json()), fetch('/api/grns/stats').then(r => r.json())]);
      setItems(lr.data || []); setStats(sr.data || {});
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (v: Record<string, string>) => {
    setCreating(true); setError('');
    try {
      const res = await fetch('/api/grns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
      const p = await res.json(); if (!res.ok || !p.success) throw new Error(p.message || 'Failed');
      setShowCreate(false); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setCreating(false); }
  };

  return (
    <RegisterPage
      title="Goods Receipt Notes"
      description="Receive goods against purchase orders and track GRN status."
      loading={loading} error={error} onRetry={load}
      stats={[
        { label: 'Total GRNs', value: stats.total ?? items.length },
        { label: 'Draft', value: stats.draft ?? 0 },
        { label: 'Completed', value: stats.completed ?? 0 },
        { label: 'Returns', value: stats.return_count ?? 0 },
      ]}
      headerActions={<button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create GRN</button>}
    >
      <table className="data-table">
        <thead><tr><th>GRN #</th><th>Supplier</th><th>Date</th><th>Project</th><th>Warehouse</th><th>Status</th><th className="text-right">Total</th></tr></thead>
        <tbody>
          {items.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-500">No GRN records found</td></tr> : items.map(g => (
            <tr key={g.name}>
              <td><Link href={`/grns/${encodeURIComponent(g.name)}`} className="font-medium text-blue-700 hover:underline">{g.name}</Link></td>
              <td className="text-gray-900">{g.supplier || '-'}</td>
              <td className="text-gray-700">{g.posting_date || '-'}</td>
              <td className="text-gray-700">{g.project || '-'}</td>
              <td className="text-gray-700">{g.set_warehouse || '-'}</td>
              <td><span className={`badge ${badge(GRN_BADGES, g.status)}`}>{g.status || 'Draft'}</span></td>
              <td className="text-right font-medium">{formatCurrency(g.grand_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <FormModal
        open={showCreate}
        title="Create GRN"
        description="Receive goods against a purchase order."
        busy={creating}
        fields={[
          { name: 'purchase_order', label: 'Purchase Order', type: 'text' as const, placeholder: 'e.g. PO-00001' },
          { name: 'supplier', label: 'Supplier', type: 'text' as const },
          { name: 'project', label: 'Project', type: 'text' as const },
          { name: 'set_warehouse', label: 'Warehouse', type: 'text' as const },
          { name: 'posting_date', label: 'Posting Date', type: 'date' as const },
        ]}
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
      />
    </RegisterPage>
  );
}