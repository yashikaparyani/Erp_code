'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import { formatCurrency, formatDate } from '@/components/finance/fin-helpers';
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
        { label: 'Invoice Value', value: formatCurrency(Number(s.invoice_value || 0)), variant: 'info' as const },
        { label: 'Receipts', value: formatCurrency(Number(s.receipts_total || 0)), variant: 'success' as const },
        { label: 'Closing Balance', value: formatCurrency(Number(s.closing_balance || 0)), variant: (s.closing_balance || 0) > 0 ? 'warning' as const : 'success' as const },
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
              <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th className="text-right">Debit</th><th className="text-right">Credit</th><th className="text-right">Balance</th></tr></thead>
              <tbody>
                {!data.entries?.length ? <tr><td colSpan={6} className="py-8 text-center text-gray-500">No entries</td></tr>
                  : data.entries.map((r, i) => <tr key={`${r.reference}-${i}`}><td>{formatDate(r.date)}</td><td>{r.type||'-'}</td><td>{r.reference||'-'}</td><td className="text-right">{r.debit ? formatCurrency(r.debit) : '-'}</td><td className="text-right text-green-700">{r.credit ? formatCurrency(r.credit) : '-'}</td><td className="text-right font-semibold">{formatCurrency(r.balance||0)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </RegisterPage>
  );
}
