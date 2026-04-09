'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, Plus, X } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import {
  callApi,
  formatCurrency,
  formatDate,
  badge,
  INVOICE_BADGES,
} from '@/components/finance/fin-helpers';
import { invoiceApi } from '@/lib/typedApi';

interface Invoice {
  name: string;
  linked_project?: string;
  linked_site?: string;
  invoice_date?: string;
  invoice_type?: string;
  status?: string;
  amount?: number;
  net_receivable?: number;
}

interface Stats {
  total?: number;
  draft?: number;
  submitted?: number;
  approved?: number;
  payment_received?: number;
  cancelled?: number;
  total_amount?: number;
  total_receivable?: number;
}

export default function FinancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyInv, setBusyInv] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState(searchParams?.get('project') || '');
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const [invRes, statsRes] = await Promise.all([
        callApi<Invoice[]>('/api/invoices', { signal: controller.signal }),
        callApi<Stats>('/api/invoices/stats', { signal: controller.signal }),
      ]);
      if (requestId !== requestIdRef.current || controller.signal.aborted) {
        return;
      }
      setInvoices(invRes || []);
      setStats(statsRes || {});
    } catch (e) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runAction = async (name: string, method: string) => {
    setBusyInv(name);
    try {
      // Map full method names to short action names: submit_invoice -> submit, mark_invoice_paid -> mark_paid
      const action = method.replace(/_invoice$/, '').replace('mark_invoice_', 'mark_');
      await invoiceApi.action(action, name);
      await load();
    } catch { /* swallow */ }
    setBusyInv(null);
  };

  const runGlobalAction = async (_method: string) => {
    setBusyInv('__global__');
    try {
      await invoiceApi.reconcile();
      await load();
    } catch {
      // no-op
    }
    setBusyInv(null);
  };

  const filtered = projectFilter
    ? invoices.filter(i => (i.linked_project || '').toLowerCase().includes(projectFilter.toLowerCase()))
    : invoices;

  const pending = (stats.submitted ?? 0) + (stats.approved ?? 0);

  return (
    <RegisterPage
      title="Finance"
      description="Invoicing, payments, and financial tracking"
      loading={loading}
      error={error}
      onRetry={load}
      empty={!filtered.length && !loading}
      stats={[
        { label: 'Total Invoiced', value: formatCurrency(stats.total_amount), variant: 'info' },
        { label: 'Payments Received', value: stats.payment_received ?? 0, variant: 'success' },
        { label: 'Pending', value: pending, variant: 'warning' },
        { label: 'Receivable', value: formatCurrency(stats.total_receivable) },
      ]}
      headerActions={
        <div className="flex flex-wrap gap-2">
          <Link href="/finance/commercial" className="btn btn-secondary">Commercial</Link>
          <Link href="/finance/costing" className="btn btn-secondary">Costing</Link>
          <Link href="/finance/billing" className="btn btn-secondary">Billing</Link>
          <Link href="/finance/payment-receipts" className="btn btn-secondary">Payments</Link>
          <button className="btn btn-secondary" onClick={() => void runGlobalAction('reconcile_invoice_payments')} disabled={busyInv === '__global__'}>
            Reconcile
          </button>
        </div>
      }
      filterBar={
        <div className="flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4 text-gray-400" />
          <input value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
            placeholder="Filter by project..." className="border rounded px-2 py-1 text-sm w-48" />
          {projectFilter && (
            <button onClick={() => setProjectFilter('')}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      }
    >
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Invoices</h3>
          <button className="btn btn-primary btn-sm" onClick={() => router.push('/finance/billing')}>
            <Plus className="w-4 h-4" /> Generate Invoice
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Project / Site</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Net Receivable</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.name}>
                  <td className="font-medium text-gray-900">{inv.name}</td>
                  <td>
                    {inv.linked_project ? (
                      <Link href={`/projects/${encodeURIComponent(inv.linked_project)}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800">
                        {inv.linked_project}
                      </Link>
                    ) : '-'}
                    {inv.linked_site && <div className="text-xs text-gray-500">{inv.linked_site}</div>}
                  </td>
                  <td><span className="badge badge-info">{inv.invoice_type || '-'}</span></td>
                  <td className="font-semibold text-gray-900">{formatCurrency(inv.amount)}</td>
                  <td>{formatCurrency(inv.net_receivable)}</td>
                  <td className="text-gray-600">{formatDate(inv.invoice_date)}</td>
                  <td><span className={`badge ${badge(INVOICE_BADGES, inv.status)}`}>{inv.status}</span></td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {inv.status === 'DRAFT' && (
                        <button onClick={() => runAction(inv.name, 'submit_invoice')}
                          disabled={busyInv === inv.name}
                          className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50">
                          Submit
                        </button>
                      )}
                      {inv.status === 'SUBMITTED' && (
                        <>
                          <button onClick={() => runAction(inv.name, 'approve_invoice')}
                            disabled={busyInv === inv.name}
                            className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50">
                            Approve
                          </button>
                          <button onClick={() => runAction(inv.name, 'reject_invoice')}
                            disabled={busyInv === inv.name}
                            className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50">
                            Reject
                          </button>
                        </>
                      )}
                      {inv.status === 'APPROVED' && (
                        <button onClick={() => runAction(inv.name, 'mark_invoice_paid')}
                          disabled={busyInv === inv.name}
                          className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50">
                          Mark Paid
                        </button>
                      )}
                      {!['CANCELLED', 'PAYMENT_RECEIVED'].includes(inv.status || '') && (
                        <button onClick={() => runAction(inv.name, 'cancel_invoice')}
                          disabled={busyInv === inv.name}
                          className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50">
                          Cancel
                        </button>
                      )}
                      {inv.status === 'DRAFT' && (
                        <button onClick={() => runAction(inv.name, 'delete_invoice')}
                          disabled={busyInv === inv.name}
                          className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50">
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RegisterPage>
  );
}
