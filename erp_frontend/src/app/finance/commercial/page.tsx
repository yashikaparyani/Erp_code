'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BellRing, FileSpreadsheet, FileText, MessageSquareText, ReceiptText, Upload, Wallet } from 'lucide-react';

async function fetchOps(method: string, args: Record<string, any> = {}) {
  const response = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const payload = await response.json();
  if (!response.ok || payload.success === false) throw new Error(payload.message || `Failed to load ${method}`);
  return payload.data;
}

export default function CommercialPage() {
  const [aging, setAging] = useState<any[]>([]);
  const [estimateStats, setEstimateStats] = useState<Record<string, number>>({});
  const [proformaStats, setProformaStats] = useState<Record<string, number>>({});
  const [invoiceStats, setInvoiceStats] = useState<Record<string, number>>({});
  const [receiptStats, setReceiptStats] = useState<Record<string, number>>({});
  const [followUpStats, setFollowUpStats] = useState<Record<string, number>>({});
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [commentItems, setCommentItems] = useState<any[]>([]);
  const [documentItems, setDocumentItems] = useState<any[]>([]);
  const [commentForm, setCommentForm] = useState({ reference_doctype: 'GE Estimate', reference_name: '', content: '' });
  const [documentForm, setDocumentForm] = useState({ customer: '', reference_doctype: 'GE Estimate', reference_name: '', document_name: '', category: 'Commercial', file_url: '', remarks: '' });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');

  const bookkeepingCards = useMemo(
    () => [
      ['Estimate Value', estimateStats.total_value || 0],
      ['Proforma Value', proformaStats.total_value || 0],
      ['Receivable', invoiceStats.total_receivable || 0],
      ['Collected', receiptStats.total_received || 0],
      ['Open Follow-ups', followUpStats.open || 0],
    ],
    [estimateStats, followUpStats, invoiceStats, proformaStats, receiptStats],
  );

  const topExposureRows = useMemo(
    () =>
      [...aging]
        .sort((a, b) => (b.total_outstanding || 0) - (a.total_outstanding || 0))
        .slice(0, 5),
    [aging],
  );

  const openCollectionRisk = Number(invoiceStats.total_receivable || 0) - Number(receiptStats.total_received || 0);

  const loadAll = () => {
    Promise.all([
      fetchOps('get_receivable_aging'),
      fetchOps('get_estimate_stats'),
      fetchOps('get_proforma_invoice_stats'),
      fetchOps('get_invoice_stats'),
      fetchOps('get_payment_receipt_stats'),
      fetchOps('get_payment_follow_up_stats'),
    ])
      .then(([agingData, estimateData, proformaData, invoiceData, receiptData, followUpData]) => {
        setAging(agingData || []);
        setEstimateStats(estimateData || {});
        setProformaStats(proformaData || {});
        setInvoiceStats(invoiceData || {});
        setReceiptStats(receiptData || {});
        setFollowUpStats(followUpData || {});
      })
      .finally(() => setLoading(false));
  };

  const loadContext = async (customer: string) => {
    if (!customer.trim()) {
      setCommentItems([]);
      setDocumentItems([]);
      return;
    }
    const [comments, documents] = await Promise.all([
      fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'get_commercial_comments', args: { customer } }),
      }).then((response) => response.json()),
      fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'get_commercial_documents', args: { customer } }),
      }).then((response) => response.json()),
    ]);
    setCommentItems(comments.data || []);
    setDocumentItems(documents.data || []);
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    void loadContext(selectedCustomer);
  }, [selectedCustomer]);

  const seedDemo = async () => {
    setSeeding(true);
    try {
      await fetchOps('seed_bookkeeping_demo');
      setLoading(true);
      loadAll();
    } finally {
      setSeeding(false);
    }
  };

  const addComment = async () => {
    setBusyAction('comment');
    setError('');
    try {
      await fetchOps('add_commercial_comment', {
        reference_doctype: commentForm.reference_doctype,
        reference_name: commentForm.reference_name,
        content: commentForm.content,
      });
      setCommentForm((prev) => ({ ...prev, reference_name: '', content: '' }));
      await loadContext(selectedCustomer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setBusyAction('');
    }
  };

  const addDocument = async () => {
    setBusyAction('document');
    setError('');
    try {
      const response = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'create_commercial_document', args: { data: JSON.stringify(documentForm) } }),
      });
      const payload = await response.json();
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Failed to share document');
      }
      setDocumentForm((prev) => ({ ...prev, reference_name: '', document_name: '', file_url: '', remarks: '' }));
      if (documentForm.customer) {
        setSelectedCustomer(documentForm.customer);
      }
      await loadContext(documentForm.customer || selectedCustomer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share document');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commercial Bookkeeping</h1>
          <p className="mt-1 text-sm text-gray-500">Estimate to collection control layer built inside the ERP.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => void seedDemo()} disabled={seeding}>
          {seeding ? 'Seeding...' : 'Seed Demo Data'}
        </button>
      </div>

      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {bookkeepingCards.map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">{Number(value).toLocaleString('en-IN')}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: 'Estimates', href: '/finance/estimates', icon: FileText, text: 'Create and approve quotes.' },
          { title: 'Costing', href: '/finance/costing', icon: FileSpreadsheet, text: 'Validate internal cost and margin before billing.' },
          { title: 'Proformas', href: '/finance/proformas', icon: ReceiptText, text: 'Convert approved commercials before invoice.' },
          { title: 'Billing', href: '/finance/billing', icon: ReceiptText, text: 'Issue and manage project invoices.' },
          { title: 'Payment Receipts', href: '/finance/payment-receipts', icon: Wallet, text: 'Track invoice and advance collections.' },
          { title: 'Follow Ups', href: '/finance/follow-ups', icon: BellRing, text: 'Track collections and promises.' },
          { title: 'Customer Statement', href: '/finance/customer-statement', icon: Wallet, text: 'Review running balance customer-wise.' },
          { title: 'Receivable Aging', href: '/finance/receivable-aging', icon: FileSpreadsheet, text: 'Bucket outstanding amounts by age.' },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[#1e6b87]">
            <item.icon className="h-6 w-6 text-[#1e6b87]" />
            <div className="mt-3 font-semibold text-gray-900">{item.title}</div>
            <div className="mt-1 text-sm text-gray-500">{item.text}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-gray-900">Recommended Finance Path</div>
          <div className="mt-2 text-sm text-gray-500">
            Customer record se start karo, phir quote, costing, proforma or invoice, payment receipt, statement, aur finally receivable follow-up.
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              'Customer',
              'Estimate / Quote',
              'Costing',
              'Invoice / Proforma',
              'Statement',
              'Receivables / Payment Follow-up',
            ].map((step, index) => (
              <div key={step} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#1e6b87]">Step {index + 1}</div>
                <div className="mt-1 font-medium text-gray-900">{step}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4 font-semibold text-gray-900">Receivable Aging</div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Customer</th><th>0-30</th><th>31-60</th><th>61-90</th><th>90+</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="py-8 text-center text-gray-500">Loading...</td></tr> : !aging.length ? <tr><td colSpan={5} className="py-8 text-center text-gray-500">No aging rows found</td></tr> : aging.map((row) => (
                  <tr key={row.customer}>
                    <td>{row.customer}</td>
                    <td>{row.bucket_0_30 || 0}</td>
                    <td>{row.bucket_31_60 || 0}</td>
                    <td>{row.bucket_61_90 || 0}</td>
                    <td>{row.bucket_90_plus || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="font-semibold text-gray-900">Bookkeeping Visibility</div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Invoices Raised</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{Number(invoiceStats.total_invoices || 0).toLocaleString('en-IN')}</div>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-amber-700">Collection Gap</div>
              <div className="mt-1 text-xl font-semibold text-amber-900">{openCollectionRisk.toLocaleString('en-IN')}</div>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-blue-700">Customers In Aging</div>
              <div className="mt-1 text-xl font-semibold text-blue-900">{aging.length}</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Is dashboard ka lens ab funnel nahi, bookkeeping hai: value booked kitni hai, paisa aaya kitna hai, aur recovery risk kahaan khada hai.
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="font-semibold text-gray-900">Top Exposure Accounts</div>
          <div className="mt-4 space-y-3">
            {!topExposureRows.length ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                No customer exposure rows found yet.
              </div>
            ) : (
              topExposureRows.map((row) => (
                <div key={row.customer} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{row.customer}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    Outstanding {Number(row.total_outstanding || 0).toLocaleString('en-IN')} | 90+ {Number(row.bucket_90_plus || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <MessageSquareText className="h-5 w-5 text-[#1e6b87]" />
            Transaction Comments
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className="input sm:col-span-2" placeholder="Customer filter" value={selectedCustomer} onChange={(event) => setSelectedCustomer(event.target.value)} />
            <select className="input" value={commentForm.reference_doctype} onChange={(event) => setCommentForm((prev) => ({ ...prev, reference_doctype: event.target.value }))}>
              <option value="GE Estimate">Estimate</option>
              <option value="GE Proforma Invoice">Proforma</option>
              <option value="GE Invoice">Invoice</option>
              <option value="GE Payment Follow Up">Payment Follow Up</option>
            </select>
            <input className="input" placeholder="Record ID" value={commentForm.reference_name} onChange={(event) => setCommentForm((prev) => ({ ...prev, reference_name: event.target.value }))} />
            <textarea className="input min-h-24 sm:col-span-2" placeholder="Add a transaction comment" value={commentForm.content} onChange={(event) => setCommentForm((prev) => ({ ...prev, content: event.target.value }))} />
          </div>
          <div className="mt-3 flex justify-end">
            <button className="btn btn-primary" disabled={busyAction === 'comment'} onClick={() => void addComment()}>{busyAction === 'comment' ? 'Saving...' : 'Add Comment'}</button>
          </div>
          <div className="mt-4 space-y-3">
            {!commentItems.length ? <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">No transaction comments found for the selected customer yet.</div> : commentItems.slice(0, 6).map((item) => (
              <div key={item.name} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-sm font-medium text-gray-900">{item.reference_doctype} | {item.reference_name}</div>
                <div className="mt-1 text-sm text-gray-600">{item.content}</div>
                <div className="mt-1 text-xs text-gray-400">{item.comment_by || '-'} | {item.creation || '-'}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Upload className="h-5 w-5 text-[#1e6b87]" />
            Customer Document Exchange
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className="input" placeholder="Customer" value={documentForm.customer} onChange={(event) => setDocumentForm((prev) => ({ ...prev, customer: event.target.value }))} />
            <select className="input" value={documentForm.reference_doctype} onChange={(event) => setDocumentForm((prev) => ({ ...prev, reference_doctype: event.target.value }))}>
              <option value="GE Estimate">Estimate</option>
              <option value="GE Proforma Invoice">Proforma</option>
              <option value="GE Invoice">Invoice</option>
              <option value="GE Payment Follow Up">Payment Follow Up</option>
            </select>
            <input className="input" placeholder="Record ID" value={documentForm.reference_name} onChange={(event) => setDocumentForm((prev) => ({ ...prev, reference_name: event.target.value }))} />
            <input className="input" placeholder="Document Name" value={documentForm.document_name} onChange={(event) => setDocumentForm((prev) => ({ ...prev, document_name: event.target.value }))} />
            <select className="input" value={documentForm.category} onChange={(event) => setDocumentForm((prev) => ({ ...prev, category: event.target.value }))}>
              <option value="Commercial">Commercial</option>
              <option value="Quote">Quote</option>
              <option value="Statement">Statement</option>
              <option value="Payment Proof">Payment Proof</option>
              <option value="Customer Communication">Customer Communication</option>
              <option value="Other">Other</option>
            </select>
            <input className="input" placeholder="File URL / uploaded file path" value={documentForm.file_url} onChange={(event) => setDocumentForm((prev) => ({ ...prev, file_url: event.target.value }))} />
            <textarea className="input min-h-24 sm:col-span-2" placeholder="Remarks" value={documentForm.remarks} onChange={(event) => setDocumentForm((prev) => ({ ...prev, remarks: event.target.value }))} />
          </div>
          <div className="mt-3 flex justify-end">
            <button className="btn btn-primary" disabled={busyAction === 'document'} onClick={() => void addDocument()}>{busyAction === 'document' ? 'Sharing...' : 'Share Document'}</button>
          </div>
          <div className="mt-4 space-y-3">
            {!documentItems.length ? <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">No customer-context documents found for the selected customer yet.</div> : documentItems.slice(0, 6).map((item) => (
              <div key={item.name} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-sm font-medium text-gray-900">{item.document_name}</div>
                <div className="mt-1 text-xs text-gray-500">{item.customer} | {item.reference_doctype} | {item.reference_name}</div>
                <a href={item.file_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-[#1e6b87] hover:underline">{item.file_url}</a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
