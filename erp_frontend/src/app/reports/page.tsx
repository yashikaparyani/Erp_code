'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  Boxes, ClipboardList, Download, FileText, Filter,
  Loader2, MapPin, Receipt, RefreshCw, ShieldAlert, Target,
} from 'lucide-react';

type StatCard = {
  title: string;
  value: string;
  hint: string;
  icon: any;
  color: string;
  bg: string;
  href: string;
};

type ProjectRow = {
  name: string;
  project_name: string;
  status: string;
  current_project_stage: string;
  current_stage_status: string;
  spine_progress_pct: number;
  total_sites: number;
  spine_blocked: number;
};

type PORow = {
  name: string;
  supplier_name: string;
  grand_total: number;
  status: string;
  project: string;
  transaction_date: string;
};

type InvoiceRow = {
  name: string;
  status: string;
  net_receivable: number;
  linked_project: string;
  invoice_date: string;
  client_name: string;
};

type TenderRow = {
  name: string;
  title: string;
  client: string;
  status: string;
  estimated_value: number;
  submission_date: string;
};

type ReportTab = 'overview' | 'projects' | 'purchase_orders' | 'invoices' | 'tenders';

function formatCurrency(value?: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to load');
  return (payload.data ?? payload) as T;
}

export default function ReportsPage() {
  const [cards, setCards] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [pos, setPos] = useState<PORow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [tenders, setTenders] = useState<TenderRow[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const exportCsv = (headers: string[], rows: string[][], filename: string) => {
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/boqs/stats').then((r) => r.json()).catch(() => ({ data: {} })),
      fetch('/api/cost-sheets/stats').then((r) => r.json()).catch(() => ({ data: {} })),
      fetch('/api/invoices/stats').then((r) => r.json()).catch(() => ({ data: {} })),
      fetch('/api/dispatch-challans/stats').then((r) => r.json()).catch(() => ({ data: {} })),
      fetch('/api/dprs/stats').then((r) => r.json()).catch(() => ({ data: {} })),
      fetch('/api/rma-trackers/stats').then((r) => r.json()).catch(() => ({ data: {} })),
      fetch('/api/sites').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/vendor-comparisons/stats').then((r) => r.json()).catch(() => ({ data: {} })),
    ])
      .then(([boqRes, costRes, invoiceRes, dispatchRes, dprRes, rmaRes, sitesRes, procurementRes]) => {
        setCards([
          { title: 'BOQ Value', value: formatCurrency(boqRes.data?.total_value), hint: `${boqRes.data?.approved || 0} approved BOQs`, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-100', href: '/engineering/boq' },
          { title: 'Sell Value', value: formatCurrency(costRes.data?.total_sell_value), hint: `${costRes.data?.pending_approval || 0} cost sheets pending`, icon: Target, color: 'text-violet-600', bg: 'bg-violet-100', href: '/finance/costing' },
          { title: 'Net Receivable', value: formatCurrency(invoiceRes.data?.total_net_receivable), hint: `${invoiceRes.data?.payment_received || 0} invoices paid`, icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-100', href: '/finance/billing' },
          { title: 'Dispatch Volume', value: `${dispatchRes.data?.total || 0}`, hint: `${dispatchRes.data?.dispatched || 0} dispatched challans`, icon: Boxes, color: 'text-amber-600', bg: 'bg-amber-100', href: '/inventory' },
          { title: 'Execution Sites', value: `${(sitesRes.data || []).length}`, hint: `${dprRes.data?.total_reports || 0} DPRs logged`, icon: MapPin, color: 'text-cyan-600', bg: 'bg-cyan-100', href: '/execution' },
          { title: 'RMA Cases', value: `${rmaRes.data?.total || 0}`, hint: `${rmaRes.data?.awaiting_approval || 0} awaiting approval`, icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-100', href: '/rma' },
          { title: 'Vendor Comparisons', value: `${procurementRes.data?.total || 0}`, hint: `${procurementRes.data?.approved || 0} approved comparisons`, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-100', href: '/procurement' },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadTabData = useCallback(async (tab: ReportTab) => {
    if (tab === 'overview') return;
    setTabLoading(true);
    try {
      if (tab === 'projects') {
        const data = await fetchJson<ProjectRow[]>('/api/projects');
        setProjects(data);
      } else if (tab === 'purchase_orders') {
        const data = await fetchJson<PORow[]>('/api/purchase-orders');
        setPos(data);
      } else if (tab === 'invoices') {
        const data = await fetchJson<InvoiceRow[]>('/api/invoices');
        setInvoices(data);
      } else if (tab === 'tenders') {
        const data = await fetchJson<TenderRow[]>('/api/tenders');
        setTenders(data);
      }
    } catch {
      // silently fail — table stays empty
    }
    setTabLoading(false);
  }, []);

  useEffect(() => {
    void loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'overview', label: 'Summary' },
    { key: 'projects', label: 'Projects' },
    { key: 'purchase_orders', label: 'Purchase Orders' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'tenders', label: 'Tenders' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Live operations snapshot with drill-down into project, procurement, billing, and tendering data.</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading report metrics...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="card">
                    <div className="card-body">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg}`}>
                          <Icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-gray-900">{card.value}</div>
                          <div className="text-sm text-gray-600">{card.title}</div>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-gray-500">{card.hint}</div>
                      <Link href={card.href} className="mt-3 inline-flex text-sm font-medium text-blue-600 hover:text-blue-800">
                        Open records
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tabular data loading */}
      {activeTab !== 'overview' && tabLoading && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading data...
        </div>
      )}

      {/* Projects tab */}
      {activeTab === 'projects' && !tabLoading && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">All Projects ({projects.length})</h3>
            <button
              onClick={() => exportCsv(
                ['Project', 'Name', 'Status', 'Stage', 'Progress', 'Sites', 'Blocked'],
                projects.map((p) => [p.name, p.project_name, p.status, p.current_project_stage, String(p.spine_progress_pct), String(p.total_sites), String(p.spine_blocked)]),
                'projects-report.csv',
              )}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Sites</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.name} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.project_name || p.name}</div>
                      {p.spine_blocked ? <span className="text-[10px] text-rose-600">Blocked</span> : null}
                    </td>
                    <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">{p.status}</span></td>
                    <td className="px-4 py-3"><span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">{(p.current_project_stage || '').replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-gray-200">
                          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.min(p.spine_progress_pct || 0, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{Math.round(p.spine_progress_pct || 0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.total_sites}</td>
                    <td className="px-4 py-3">
                      <Link href={`/projects/${p.name}`} className="text-xs font-medium text-blue-600 hover:text-blue-800">Open</Link>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No projects found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchase Orders tab */}
      {activeTab === 'purchase_orders' && !tabLoading && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Purchase Orders ({pos.length})</h3>
            <button
              onClick={() => exportCsv(
                ['PO', 'Supplier', 'Amount', 'Status', 'Project', 'Date'],
                pos.map((po) => [po.name, po.supplier_name || '', String(po.grand_total || 0), po.status || '', po.project || '', po.transaction_date || '']),
                'purchase-orders-report.csv',
              )}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
                  <th className="px-4 py-3">PO #</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((po) => (
                  <tr key={po.name} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{po.name}</td>
                    <td className="px-4 py-3 text-gray-700">{po.supplier_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(po.grand_total)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        (po.status || '').toLowerCase().includes('submit') ? 'bg-blue-100 text-blue-700' :
                        (po.status || '').toLowerCase().includes('cancel') ? 'bg-rose-100 text-rose-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{po.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {po.project ? <Link href={`/projects/${po.project}`} className="text-xs text-blue-600 hover:text-blue-800">{po.project}</Link> : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{po.transaction_date || '-'}</td>
                  </tr>
                ))}
                {pos.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No purchase orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoices tab */}
      {activeTab === 'invoices' && !tabLoading && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Invoices ({invoices.length})</h3>
            <button
              onClick={() => exportCsv(
                ['Invoice', 'Client', 'Net Receivable', 'Status', 'Project', 'Date'],
                invoices.map((inv) => [inv.name, inv.client_name || '', String(inv.net_receivable || 0), inv.status || '', inv.linked_project || '', inv.invoice_date || '']),
                'invoices-report.csv',
              )}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Net Receivable</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.name} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{inv.name}</td>
                    <td className="px-4 py-3 text-gray-700">{inv.client_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(inv.net_receivable)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        inv.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        inv.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-700' :
                        inv.status === 'PAYMENT_RECEIVED' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{inv.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {inv.linked_project ? <Link href={`/projects/${inv.linked_project}`} className="text-xs text-blue-600 hover:text-blue-800">{inv.linked_project}</Link> : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{inv.invoice_date || '-'}</td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No invoices found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tenders tab */}
      {activeTab === 'tenders' && !tabLoading && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Tenders ({tenders.length})</h3>
            <button
              onClick={() => exportCsv(
                ['Tender', 'Title', 'Client', 'Status', 'Estimated Value', 'Submission Date'],
                tenders.map((t) => [t.name, t.title || '', t.client || '', t.status || '', String(t.estimated_value || 0), t.submission_date || '']),
                'tenders-report.csv',
              )}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
                  <th className="px-4 py-3">Tender</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Est. Value</th>
                  <th className="px-4 py-3">Submission</th>
                </tr>
              </thead>
              <tbody>
                {tenders.map((t) => (
                  <tr key={t.name} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/pre-sales/${t.name}`} className="font-medium text-blue-600 hover:text-blue-800">{t.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{t.title || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{t.client || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        (t.status || '').includes('WON') ? 'bg-emerald-100 text-emerald-700' :
                        (t.status || '').includes('LOST') ? 'bg-rose-100 text-rose-700' :
                        (t.status || '').includes('SUBMIT') ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(t.estimated_value)}</td>
                    <td className="px-4 py-3 text-gray-500">{t.submission_date || '-'}</td>
                  </tr>
                ))}
                {tenders.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No tenders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
