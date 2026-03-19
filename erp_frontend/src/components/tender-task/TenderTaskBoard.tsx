'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, Calendar, FileText, Filter, IndianRupee, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { deriveTenderFunnelStatus, getTenderFunnelMeta } from '@/components/tenderFunnel';

type Tender = {
  name: string;
  tender_number?: string;
  title: string;
  client?: string;
  organization?: string;
  submission_date?: string;
  computed_funnel_status?: string;
  status?: string;
  estimated_value?: number;
  emd_amount?: number;
  tender_owner?: string;
  creation?: string;
  modified?: string;
};

type Props = {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyHint: string;
  statusFilter?: string[];
  disclaimer?: string;
  currentUserOnly?: boolean;
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  NEW: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  SUBMITTED: 'bg-green-100 text-green-700',
  UNDER_EVALUATION: 'bg-purple-100 text-purple-700',
  WON: 'bg-emerald-100 text-emerald-700',
  LOST: 'bg-red-100 text-red-700',
  DROPPED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

function formatCurrency(value?: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(dateString?: string) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getDaysToSubmission(dateString?: string) {
  if (!dateString) return null;
  const target = new Date(dateString).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

function sortByNearestSubmission(rows: Tender[]) {
  return [...rows].sort((a, b) => {
    const aTs = a.submission_date ? new Date(a.submission_date).getTime() : Number.MAX_SAFE_INTEGER;
    const bTs = b.submission_date ? new Date(b.submission_date).getTime() : Number.MAX_SAFE_INTEGER;
    return aTs - bTs;
  });
}

async function updateTenderStatus(name: string, status: string) {
  const response = await fetch(`/api/tenders/${encodeURIComponent(name)}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_status: status }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Failed to update tender');
  }
}

export default function TenderTaskBoard({
  title,
  subtitle,
  emptyTitle,
  emptyHint,
  statusFilter,
  disclaimer,
  currentUserOnly,
}: Props) {
  const { currentUser } = useAuth();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [statusSelection, setStatusSelection] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    fetch('/api/tenders')
      .then((response) => response.json())
      .then((result) => {
        if (!mounted) return;
        const rows: Tender[] = result.data || [];
        setTenders(sortByNearestSubmission(rows));
      })
      .catch(() => {
        if (!mounted) return;
        setTenders([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const filteredBase = useMemo(() => {
    const statusFiltered = !statusFilter || statusFilter.length === 0
      ? tenders
      : tenders.filter((tender) => statusFilter.includes(tender.status || ''));

    if (!currentUserOnly || !currentUser?.username) {
      return statusFiltered;
    }

    return statusFiltered.filter((tender) => tender.tender_owner === currentUser.username);
  }, [tenders, statusFilter, currentUserOnly, currentUser?.username]);

  const clientOptions = useMemo(() => {
    return Array.from(new Set(filteredBase.map((tender) => tender.client).filter(Boolean))) as string[];
  }, [filteredBase]);

  const availableStatuses = useMemo(() => {
    return Array.from(new Set(filteredBase.map((tender) => tender.status).filter(Boolean))) as string[];
  }, [filteredBase]);

  const rows = useMemo(() => {
    return filteredBase.filter((tender) => {
      const haystack = [
        tender.tender_number,
        tender.title,
        tender.client,
        tender.organization,
        tender.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !searchQuery || haystack.includes(searchQuery.toLowerCase());
      const matchesClient = !clientFilter || tender.client === clientFilter;
      const matchesStatus = !statusSelection || tender.status === statusSelection;
      return matchesSearch && matchesClient && matchesStatus;
    });
  }, [filteredBase, searchQuery, clientFilter, statusSelection]);

  const summary = useMemo(() => {
    const totalValue = rows.reduce((sum, tender) => sum + (tender.estimated_value || 0), 0);
    const dueSoon = rows.filter((tender) => {
      const days = getDaysToSubmission(tender.submission_date);
      return days !== null && days >= 0 && days <= 7;
    }).length;
    const overdue = rows.filter((tender) => {
      const days = getDaysToSubmission(tender.submission_date);
      return days !== null && days < 0;
    }).length;

    return {
      total: rows.length,
      totalValue,
      dueSoon,
      overdue,
    };
  }, [rows]);

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{title}</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">{subtitle}</p>
      </div>

      {disclaimer ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{disclaimer}</span>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
          <div className="text-sm text-gray-500 mt-1">Visible tenders</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalValue)}</div>
          <div className="text-sm text-gray-500 mt-1">Visible pipeline value</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-amber-600">{summary.dueSoon}</div>
          <div className="text-sm text-gray-500 mt-1">Due in next 7 days</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">{summary.overdue}</div>
          <div className="text-sm text-gray-500 mt-1">Past submission date</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
        <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-2 text-gray-700">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Live Filters</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <label>
            <div className="text-xs text-gray-500 mb-1">Search</div>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tender no, title, client, organization"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </label>

          <label>
            <div className="text-xs text-gray-500 mb-1">Client</div>
            <select
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All clients</option>
              {clientOptions.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div className="text-xs text-gray-500 mb-1">Status</div>
            <select
              value={statusSelection}
              onChange={(event) => setStatusSelection(event.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All statuses in this view</option>
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">Loading live tender data...</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">{emptyTitle}</p>
            <p className="text-gray-400 text-sm mt-1">{emptyHint}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tender</th>
                <th>Client / Org</th>
                <th>Submission</th>
                <th>Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tender) => {
                const days = getDaysToSubmission(tender.submission_date);
                return (
                  <tr key={tender.name}>
                    <td>
                      <div className="font-medium text-gray-900">{tender.tender_number || tender.name}</div>
                      <div className="text-sm text-gray-600 max-w-xs truncate">{tender.title}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-gray-700">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span>{tender.client || '-'}</span>
                      </div>
                      <div className="text-xs text-gray-400 max-w-xs truncate">{tender.organization || '-'}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-gray-700">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatDate(tender.submission_date)}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {days === null ? 'No submission date' : days < 0 ? `${Math.abs(days)} days overdue` : `${days} days left`}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 font-medium text-gray-900">
                        <IndianRupee className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatCurrency(tender.estimated_value)}</span>
                      </div>
                      <div className="text-xs text-gray-400">EMD {formatCurrency(tender.emd_amount)}</div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[tender.status || ''] || 'bg-gray-100 text-gray-700'}`}>
                          {tender.status || 'Unknown'}
                        </span>
                        {(() => {
                          const derivedFunnel = tender.computed_funnel_status || deriveTenderFunnelStatus(tender);
                          const funnelMeta = getTenderFunnelMeta(derivedFunnel);
                          return (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${funnelMeta.toneClass}`}>
                              <span className={`h-2 w-2 rounded-full ${funnelMeta.dotClass}`} />
                              {derivedFunnel}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/pre-sales/${encodeURIComponent(tender.name)}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                          Open
                        </Link>
                        {!['SUBMITTED', 'WON', 'LOST', 'DROPPED', 'CANCELLED'].includes(tender.status || '') ? (
                          <button
                            className="text-sm font-medium text-green-600 hover:text-green-700"
                            disabled={actionBusy === tender.name}
                            onClick={async () => {
                              try {
                                setActionBusy(tender.name);
                                await updateTenderStatus(tender.name, 'SUBMITTED');
                                setRefreshKey((current) => current + 1);
                              } finally {
                                setActionBusy('');
                              }
                            }}
                          >
                            Submit
                          </button>
                        ) : null}
                        {!['DROPPED', 'WON', 'LOST', 'CANCELLED'].includes(tender.status || '') ? (
                          <button
                            className="text-sm font-medium text-red-600 hover:text-red-700"
                            disabled={actionBusy === tender.name}
                            onClick={async () => {
                              try {
                                setActionBusy(tender.name);
                                await updateTenderStatus(tender.name, 'DROPPED');
                                setRefreshKey((current) => current + 1);
                              } finally {
                                setActionBusy('');
                              }
                            }}
                          >
                            Drop
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
