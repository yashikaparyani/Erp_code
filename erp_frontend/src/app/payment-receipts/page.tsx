'use client';
import { useEffect, useState } from 'react';
import { Receipt, Plus, X } from 'lucide-react';

interface PaymentReceipt {
  name: string;
  linked_invoice?: string;
  linked_project?: string;
  received_date?: string;
  amount_received?: number;
  tds_amount?: number;
  payment_mode?: string;
  payment_reference?: string;
}

function formatCurrency(v?: number) {
  if (!v) return '₹ 0';
  return `₹ ${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function PaymentReceiptsPage() {
  const [items, setItems] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ linked_invoice: '', linked_project: '', received_date: '', amount_received: '', tds_amount: '', payment_mode: 'Bank Transfer', payment_reference: '' });

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/payment-receipts').then(r => r.json()).catch(() => ({ data: [] }));
    setItems(res.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/payment-receipts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount_received: parseFloat(form.amount_received) || 0, tds_amount: parseFloat(form.tds_amount) || 0 }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowCreate(false);
      setForm({ linked_invoice: '', linked_project: '', received_date: '', amount_received: '', tds_amount: '', payment_mode: 'Bank Transfer', payment_reference: '' });
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setCreating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const totalReceived = items.reduce((s, i) => s + (i.amount_received || 0), 0);
  const totalTDS = items.reduce((s, i) => s + (i.tds_amount || 0), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">Payment Receipts</h1><p className="text-xs sm:text-sm text-gray-500 mt-1">Track payments received against invoices.</p></div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Record Payment</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Receipt className="w-5 h-5" /></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Total Receipts</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><Receipt className="w-5 h-5" /></div><div><div className="stat-value">{formatCurrency(totalReceived)}</div><div className="stat-label">Total Received</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><Receipt className="w-5 h-5" /></div><div><div className="stat-value">{formatCurrency(totalTDS)}</div><div className="stat-label">TDS Deducted</div></div></div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">All Payment Receipts</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Invoice</th><th>Project</th><th>Date</th><th>Mode</th><th>Reference</th><th>Amount</th><th>TDS</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-500">No payment receipts found</td></tr> : items.map(item => (
                <tr key={item.name}>
                  <td><div className="font-medium text-gray-900">{item.name}</div></td>
                  <td><div className="text-sm text-gray-900">{item.linked_invoice || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.linked_project || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.received_date || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.payment_mode || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.payment_reference || '-'}</div></td>
                  <td><div className="text-sm font-medium text-green-700">{formatCurrency(item.amount_received)}</div></td>
                  <td><div className="text-sm text-gray-700">{formatCurrency(item.tds_amount)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div><h2 className="text-lg font-semibold text-gray-900">Record Payment</h2></div>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label><div className="text-sm font-medium text-gray-700 mb-2">Invoice *</div><input className="input" value={form.linked_invoice} onChange={e => setForm({ ...form, linked_invoice: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Project</div><input className="input" value={form.linked_project} onChange={e => setForm({ ...form, linked_project: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Date</div><input className="input" type="date" value={form.received_date} onChange={e => setForm({ ...form, received_date: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Amount (₹) *</div><input className="input" type="number" value={form.amount_received} onChange={e => setForm({ ...form, amount_received: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">TDS Amount</div><input className="input" type="number" value={form.tds_amount} onChange={e => setForm({ ...form, tds_amount: e.target.value })} /></label>
              <label><div className="text-sm font-medium text-gray-700 mb-2">Mode</div><select className="input" value={form.payment_mode} onChange={e => setForm({ ...form, payment_mode: e.target.value })}><option>Bank Transfer</option><option>Cheque</option><option>Cash</option><option>UPI</option></select></label>
              <label className="sm:col-span-2"><div className="text-sm font-medium text-gray-700 mb-2">Reference</div><input className="input" value={form.payment_reference} onChange={e => setForm({ ...form, payment_reference: e.target.value })} placeholder="UTR / Cheque No." /></label>
            </div>
            <div className="px-6 pb-6">
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-3"><button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create'}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
