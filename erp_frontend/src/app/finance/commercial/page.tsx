'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MessageSquareText, Upload } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import { callOps } from '@/components/finance/fin-helpers';

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

  const bookkeepingCards = useMemo(() => [
    { label: 'Estimate Value', value: estimateStats.total_value || 0, variant: 'info' as const },
    { label: 'Proforma Value', value: proformaStats.total_value || 0 },
    { label: 'Receivable', value: invoiceStats.total_receivable || 0, variant: 'warning' as const },
    { label: 'Collected', value: receiptStats.total_received || 0, variant: 'success' as const },
    { label: 'Open Follow-ups', value: followUpStats.open || 0 },
  ], [estimateStats, followUpStats, invoiceStats, proformaStats, receiptStats]);

  const topExposure = useMemo(() => [...aging].sort((a, b) => (b.total_outstanding || 0) - (a.total_outstanding || 0)).slice(0, 5), [aging]);
  const collectionRisk = Number(invoiceStats.total_receivable || 0) - Number(receiptStats.total_received || 0);

  const loadAll = () => {
    Promise.all([
      callOps<any[]>('get_receivable_aging'), callOps<Record<string, number>>('get_estimate_stats'),
      callOps<Record<string, number>>('get_proforma_invoice_stats'), callOps<Record<string, number>>('get_invoice_stats'),
      callOps<Record<string, number>>('get_payment_receipt_stats'), callOps<Record<string, number>>('get_payment_follow_up_stats'),
    ])
      .then(([a, e, p, i, r, f]) => { setAging(a||[]); setEstimateStats(e||{}); setProformaStats(p||{}); setInvoiceStats(i||{}); setReceiptStats(r||{}); setFollowUpStats(f||{}); })
      .finally(() => setLoading(false));
  };

  const loadContext = async (customer: string) => {
    if (!customer.trim()) { setCommentItems([]); setDocumentItems([]); return; }
    const [c, d] = await Promise.all([
      callOps<any[]>('get_commercial_comments', { customer }),
      callOps<any[]>('get_commercial_documents', { customer }),
    ]);
    setCommentItems(c || []); setDocumentItems(d || []);
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { void loadContext(selectedCustomer); }, [selectedCustomer]);

  const seedDemo = async () => { setSeeding(true); try { await callOps('seed_bookkeeping_demo'); setLoading(true); loadAll(); } finally { setSeeding(false); } };

  const addComment = async () => {
    setBusyAction('comment'); setError('');
    try {
      await callOps('add_commercial_comment', { reference_doctype: commentForm.reference_doctype, reference_name: commentForm.reference_name, content: commentForm.content });
      setCommentForm(p => ({ ...p, reference_name: '', content: '' })); await loadContext(selectedCustomer);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setBusyAction('');
  };

  const addDocument = async () => {
    setBusyAction('document'); setError('');
    try {
      await callOps('create_commercial_document', { data: JSON.stringify(documentForm) });
      setDocumentForm(p => ({ ...p, reference_name: '', document_name: '', file_url: '', remarks: '' }));
      await loadContext(documentForm.customer || selectedCustomer);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setBusyAction('');
  };

  const navCards = [
    { title: 'Estimates', href: '/finance/estimates', text: 'Create and approve quotes.' },
    { title: 'Costing', href: '/finance/costing', text: 'Validate cost and margin before billing.' },
    { title: 'Proformas', href: '/finance/proformas', text: 'Convert approved commercials before invoice.' },
    { title: 'Billing', href: '/finance/billing', text: 'Issue and manage project invoices.' },
    { title: 'Payment Receipts', href: '/finance/payment-receipts', text: 'Track collections.' },
    { title: 'Follow Ups', href: '/finance/follow-ups', text: 'Track collections and promises.' },
    { title: 'Customer Statement', href: '/finance/customer-statement', text: 'Running balance per customer.' },
    { title: 'Receivable Aging', href: '/finance/receivable-aging', text: 'Outstanding by age bucket.' },
  ];

  const doctypeOptions = ['GE Estimate', 'GE Proforma Invoice', 'GE Invoice', 'GE Payment Follow Up'];

  return (
    <RegisterPage
      title="Commercial Bookkeeping" description="Estimate-to-collection control layer"
      loading={loading} error={error} onRetry={loadAll} empty={false}
      stats={bookkeepingCards}
      headerActions={<button className="btn btn-secondary" onClick={seedDemo} disabled={seeding}>{seeding ? 'Seeding...' : 'Seed Demo Data'}</button>}
    >
      {/* ── Nav cards ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        {navCards.map(c => (
          <Link key={c.href} href={c.href} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[#1e6b87]">
            <div className="font-semibold text-gray-900">{c.title}</div>
            <div className="mt-1 text-sm text-gray-500">{c.text}</div>
          </Link>
        ))}
      </div>

      {/* ── Aging + Exposure ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr] mb-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Receivable Aging</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Customer</th><th>0-30</th><th>31-60</th><th>61-90</th><th>90+</th></tr></thead>
              <tbody>
                {!aging.length ? <tr><td colSpan={5} className="py-8 text-center text-gray-500">No aging rows</td></tr> : aging.map(r => (
                  <tr key={r.customer}><td>{r.customer}</td><td>{r.bucket_0_30||0}</td><td>{r.bucket_31_60||0}</td><td>{r.bucket_61_90||0}</td><td>{r.bucket_90_plus||0}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Top Exposure Accounts</h3></div>
          <div className="card-body space-y-3">
            {!topExposure.length ? <div className="text-sm text-gray-500">No exposure data</div> : topExposure.map(r => (
              <div key={r.customer} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-sm font-medium text-gray-900">{r.customer}</div>
                <div className="text-xs text-gray-500">Outstanding {Number(r.total_outstanding||0).toLocaleString('en-IN')} | 90+ {Number(r.bucket_90_plus||0).toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bookkeeping visibility ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><div className="text-xs uppercase tracking-wide text-slate-500">Invoices Raised</div><div className="mt-1 text-xl font-semibold">{Number(invoiceStats.total_invoices||0).toLocaleString('en-IN')}</div></div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3"><div className="text-xs uppercase tracking-wide text-amber-700">Collection Gap</div><div className="mt-1 text-xl font-semibold text-amber-900">{collectionRisk.toLocaleString('en-IN')}</div></div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3"><div className="text-xs uppercase tracking-wide text-blue-700">Customers In Aging</div><div className="mt-1 text-xl font-semibold text-blue-900">{aging.length}</div></div>
      </div>

      {/* ── Transaction comments + Document exchange ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="card-header flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-[#1e6b87]" /><h3 className="font-semibold text-gray-900">Transaction Comments</h3></div>
          <div className="card-body space-y-3">
            <input className="input" placeholder="Customer filter" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select className="input" value={commentForm.reference_doctype} onChange={e => setCommentForm(p => ({...p, reference_doctype: e.target.value}))}>
                {doctypeOptions.map(d => <option key={d} value={d}>{d.replace('GE ','')}</option>)}
              </select>
              <input className="input" placeholder="Record ID" value={commentForm.reference_name} onChange={e => setCommentForm(p => ({...p, reference_name: e.target.value}))} />
            </div>
            <textarea className="input min-h-24" placeholder="Add a transaction comment" value={commentForm.content} onChange={e => setCommentForm(p => ({...p, content: e.target.value}))} />
            <div className="flex justify-end"><button className="btn btn-primary" disabled={busyAction==='comment'} onClick={addComment}>{busyAction==='comment'?'Saving...':'Add Comment'}</button></div>
            <div className="space-y-2">
              {!commentItems.length ? <div className="text-sm text-gray-500">No comments</div> : commentItems.slice(0,6).map(c => (
                <div key={c.name} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{c.reference_doctype} | {c.reference_name}</div>
                  <div className="text-sm text-gray-600 mt-1">{c.content}</div>
                  <div className="text-xs text-gray-400 mt-1">{c.comment_by} | {c.creation}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center gap-2"><Upload className="h-5 w-5 text-[#1e6b87]" /><h3 className="font-semibold text-gray-900">Document Exchange</h3></div>
          <div className="card-body space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className="input" placeholder="Customer" value={documentForm.customer} onChange={e => setDocumentForm(p => ({...p, customer: e.target.value}))} />
              <select className="input" value={documentForm.reference_doctype} onChange={e => setDocumentForm(p => ({...p, reference_doctype: e.target.value}))}>
                {doctypeOptions.map(d => <option key={d} value={d}>{d.replace('GE ','')}</option>)}
              </select>
              <input className="input" placeholder="Record ID" value={documentForm.reference_name} onChange={e => setDocumentForm(p => ({...p, reference_name: e.target.value}))} />
              <input className="input" placeholder="Document Name" value={documentForm.document_name} onChange={e => setDocumentForm(p => ({...p, document_name: e.target.value}))} />
              <select className="input" value={documentForm.category} onChange={e => setDocumentForm(p => ({...p, category: e.target.value}))}>
                {['Commercial','Quote','Statement','Payment Proof','Customer Communication','Other'].map(c => <option key={c}>{c}</option>)}
              </select>
              <input className="input" placeholder="File URL" value={documentForm.file_url} onChange={e => setDocumentForm(p => ({...p, file_url: e.target.value}))} />
            </div>
            <textarea className="input min-h-24" placeholder="Remarks" value={documentForm.remarks} onChange={e => setDocumentForm(p => ({...p, remarks: e.target.value}))} />
            <div className="flex justify-end"><button className="btn btn-primary" disabled={busyAction==='document'} onClick={addDocument}>{busyAction==='document'?'Sharing...':'Share Document'}</button></div>
            <div className="space-y-2">
              {!documentItems.length ? <div className="text-sm text-gray-500">No documents</div> : documentItems.slice(0,6).map(d => (
                <div key={d.name} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{d.document_name}</div>
                  <div className="text-xs text-gray-500">{d.customer} | {d.reference_doctype} | {d.reference_name}</div>
                  <a href={d.file_url} target="_blank" rel="noreferrer" className="text-sm text-[#1e6b87] hover:underline mt-1 inline-block">{d.file_url}</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </RegisterPage>
  );
}
