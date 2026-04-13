'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import { formatCurrency } from '@/components/finance/fin-helpers';
import LinkPicker from '@/components/ui/LinkPicker';

type Entry = { date?: string; type?: string; reference?: string; debit?: number; credit?: number; balance?: number };
type Statement = { customer?: string; entries?: Entry[]; summary?: Record<string, number> };

export default function CustomerStatementPage() {
  const [customer, setCustomer] = useState('');
  const [data, setData] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!customer.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/finance/customer-statement?customer=${encodeURIComponent(customer.trim())}`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setData(payload.data);
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setData(null); }
    setLoading(false);
  };

  const s = data?.summary || {};

  return (
    <RegisterPage
      title="Customer Statement" description="Invoice-to-payment exposure with running balance"
      loading={false} empty={false}
      stats={data ? [
        { label: 'Invoice Value', value: Number(s.invoice_value || 0).toLocaleString('en-IN') },
        { label: 'Receipts', value: Number(s.receipts_total || 0).toLocaleString('en-IN'), variant: 'success' },
        { label: 'Credit Notes', value: Number(s.credit_note_total || 0).toLocaleString('en-IN') },
        { label: 'Closing Balance', value: Number(s.closing_balance || 0).toLocaleString('en-IN'), variant: 'warning' },
      ] : undefined}
    >
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-col gap-3 sm:flex-row">
            <LinkPicker
              entity="customer"
              value={customer}
              onChange={setCustomer}
              placeholder="Search customer from GE Party…"
              className="flex-1"
            />
            <button className="btn btn-primary" onClick={run} disabled={loading}><Search className="h-4 w-4" />{loading ? 'Loading...' : 'Load Statement'}</button>
          </div>
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </div>
      </div>

      {data && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">{data.customer}</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
              <tbody>
                {!data.entries?.length ? <tr><td colSpan={6} className="py-8 text-center text-gray-500">No entries</td></tr>
                  : data.entries.map((r, i) => <tr key={`${r.reference}-${i}`}><td>{r.date||'-'}</td><td>{r.type||'-'}</td><td>{r.reference||'-'}</td><td>{r.debit||0}</td><td>{r.credit||0}</td><td>{r.balance||0}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </RegisterPage>
  );
}
