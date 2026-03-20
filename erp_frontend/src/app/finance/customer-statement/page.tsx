'use client';

import { useState } from 'react';
import { BookOpenText, Search } from 'lucide-react';

type StatementEntry = { date?: string; type?: string; reference?: string; debit?: number; credit?: number; balance?: number };
type StatementResponse = { customer?: string; entries?: StatementEntry[]; summary?: Record<string, number> };

async function fetchStatement(customer: string): Promise<StatementResponse> {
  const response = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'get_customer_statement', args: { customer } }),
  });
  const payload = await response.json();
  if (!response.ok || payload.success === false) throw new Error(payload.message || 'Failed to load statement');
  return payload.data || {};
}

export default function CustomerStatementPage() {
  const [customer, setCustomer] = useState('');
  const [data, setData] = useState<StatementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runSearch = async () => {
    if (!customer.trim()) return;
    setLoading(true);
    setError('');
    try {
      setData(await fetchStatement(customer.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statement');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer Statement</h1>
        <p className="mt-1 text-sm text-gray-500">Search a customer and review invoice-to-payment exposure with running balance.</p>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input className="input flex-1" placeholder="Customer name from GE Party" value={customer} onChange={(event) => setCustomer(event.target.value)} />
          <button className="btn btn-primary" onClick={() => void runSearch()} disabled={loading}>
            <Search className="h-4 w-4" />
            {loading ? 'Loading...' : 'Load Statement'}
          </button>
        </div>
        {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
      </div>

      {data ? (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Invoice Value', data.summary?.invoice_value || 0],
              ['Receipts', data.summary?.receipts_total || 0],
              ['Credit Notes', data.summary?.credit_note_total || 0],
              ['Closing Balance', data.summary?.closing_balance || 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-sm text-gray-500">{label}</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">{Number(value).toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2 text-gray-900">
                <BookOpenText className="h-5 w-5" />
                <h2 className="font-semibold">{data.customer}</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
                <tbody>
                  {!data.entries?.length ? <tr><td colSpan={6} className="py-8 text-center text-gray-500">No statement entries found</td></tr> : data.entries.map((row, index) => (
                    <tr key={`${row.reference}-${index}`}>
                      <td>{row.date || '-'}</td>
                      <td>{row.type || '-'}</td>
                      <td>{row.reference || '-'}</td>
                      <td>{row.debit || 0}</td>
                      <td>{row.credit || 0}</td>
                      <td>{row.balance || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

