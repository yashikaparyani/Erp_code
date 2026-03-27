'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Clock, CheckCircle2, XCircle, Ban, DollarSign } from 'lucide-react';

interface SlaPenalty {
  name: string;
  linked_ticket?: string;
  sla_penalty_rule?: string;
  breach_type?: string;
  calculated_penalty?: number;
  calculated_on?: string;
  approval_status?: string;
  approved_by?: string;
  applied_to_invoice?: string;
}

function statusBadge(s?: string) {
  const map: Record<string, string> = { PENDING: 'badge-yellow', APPROVED: 'badge-green', REJECTED: 'badge-red', WAIVED: 'badge-gray' };
  return map[s || ''] || 'badge-gray';
}

function formatCurrency(v?: number) {
  if (v == null) return '-';
  return '₹ ' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SlaPenaltiesPage() {
  const [items, setItems] = useState<SlaPenalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    const qs = filter ? `?status=${encodeURIComponent(filter)}` : '';
    const res = await fetch(`/api/sla-penalties${qs}`).then(r => r.json()).catch(() => ({ data: [] }));
    setItems(res.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [filter]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const pending = items.filter(i => i.approval_status === 'PENDING').length;
  const approved = items.filter(i => i.approval_status === 'APPROVED').length;
  const totalPenalty = items.reduce((s, i) => s + (i.calculated_penalty || 0), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">SLA Penalties</h1><p className="text-xs sm:text-sm text-gray-500 mt-1">Penalty records from SLA breaches across tickets.</p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Shield className="w-5 h-5" /></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Total</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-yellow-100 text-yellow-600"><Clock className="w-5 h-5" /></div><div><div className="stat-value">{pending}</div><div className="stat-label">Pending</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><CheckCircle2 className="w-5 h-5" /></div><div><div className="stat-value">{approved}</div><div className="stat-label">Approved</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100 text-red-600"><DollarSign className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatCurrency(totalPenalty)}</div><div className="stat-label">Total Penalty</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">All Penalty Records</h3>
          <select className="input w-auto text-xs" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="WAIVED">Waived</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Ticket</th><th>Rule</th><th>Breach Type</th><th>Penalty</th><th>Calculated On</th><th>Invoice</th><th>Status</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-500">No penalty records found</td></tr> : items.map(item => (
                <tr key={item.name}>
                  <td><Link href={`/sla-penalties/${encodeURIComponent(item.name)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{item.name}</Link></td>
                  <td className="text-sm text-gray-700">{item.linked_ticket ? <Link href={`/om-helpdesk/${encodeURIComponent(item.linked_ticket)}`} className="text-blue-600 hover:underline">{item.linked_ticket}</Link> : '-'}</td>
                  <td className="text-sm text-gray-700">{item.sla_penalty_rule || '-'}</td>
                  <td className="text-sm text-gray-700">{item.breach_type || '-'}</td>
                  <td className="text-sm text-gray-900 font-medium text-right">{formatCurrency(item.calculated_penalty)}</td>
                  <td className="text-sm text-gray-700">{item.calculated_on || '-'}</td>
                  <td className="text-sm text-gray-700">{item.applied_to_invoice || '-'}</td>
                  <td><span className={`badge ${statusBadge(item.approval_status)}`}>{item.approval_status || '-'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
