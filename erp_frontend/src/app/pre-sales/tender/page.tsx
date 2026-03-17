'use client';

import { useMemo, useState, useEffect } from 'react';
import CreateTenderModal from '@/components/CreateTenderModal';
import ModalFrame from '@/components/ui/ModalFrame';
import {
  Search, ChevronDown, ChevronUp, Download, Eye, Heart, Clock,
  User, MapPin, SortDesc,
} from 'lucide-react';

interface Tender {
  name: string;
  tender_number?: string;
  title: string;
  client?: string;
  organization?: string;
  submission_date?: string;
  status?: string;
  estimated_value?: number;
  emd_amount?: number;
  creation?: string;
}

type TabType = 'fresh' | 'live' | 'archive' | 'interested';
type TenderDialogState =
  | { mode: 'view'; tender: Tender }
  | { mode: 'history'; tender: Tender }
  | { mode: 'assign'; tender: Tender; assignee: string }
  | null;

type FilterState = {
  keyword: string;
  organization: string;
  state: string;
  valueRange: string;
};

const initialFilters: FilterState = {
  keyword: '',
  organization: '',
  state: '',
  valueRange: '',
};

export default function TenderPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('value');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [draftFilters, setDraftFilters] = useState<FilterState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(initialFilters);
  const [dialog, setDialog] = useState<TenderDialogState>(null);
  const pageSize = 10;

  useEffect(() => {
    fetch('/api/tenders')
      .then((r) => r.json())
      .then((res) => setTenders(res.data || []))
      .catch(() => setTenders([]))
      .finally(() => setLoading(false));
  }, []);

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'fresh', label: 'Fresh' },
    { key: 'live', label: 'Live', count: tenders.length },
    { key: 'archive', label: 'Archive', count: tenders.filter((row) => ['closed', 'cancelled', 'lost', 'awarded'].includes(String(row.status || '').toLowerCase())).length },
    { key: 'interested', label: 'Interested', count: favorites.length },
  ];

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `Rs ${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(0)} Lacs`;
    return `Rs ${amount.toLocaleString('en-IN')}`;
  };

  const getDaysLeft = (dateStr?: string) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const getTabRows = () => {
    switch (activeTab) {
      case 'fresh':
        return tenders.filter((row) => {
          if (!row.creation) return false;
          const ageInDays = (Date.now() - new Date(row.creation).getTime()) / (1000 * 60 * 60 * 24);
          return ageInDays <= 7;
        });
      case 'archive':
        return tenders.filter((row) => ['closed', 'cancelled', 'lost', 'awarded'].includes(String(row.status || '').toLowerCase()));
      case 'interested':
        return tenders.filter((row) => favorites.includes(row.name));
      case 'live':
      default:
        return tenders.filter((row) => !['closed', 'cancelled'].includes(String(row.status || '').toLowerCase()));
    }
  };

  const filterRows = (rows: Tender[]) => rows.filter((row) => {
    const keyword = appliedFilters.keyword.trim().toLowerCase();
    const organization = appliedFilters.organization;
    const state = appliedFilters.state.trim().toLowerCase();
    const valueRange = appliedFilters.valueRange;
    const haystack = [row.title, row.tender_number, row.name, row.client, row.organization].join(' ').toLowerCase();
    const amount = row.estimated_value || 0;

    if (keyword && !haystack.includes(keyword)) return false;
    if (organization && (row.organization || row.client || '') !== organization) return false;
    if (state && !haystack.includes(state)) return false;
    if (valueRange === 'lt_1cr' && amount >= 10000000) return false;
    if (valueRange === '1cr_5cr' && (amount < 10000000 || amount > 50000000)) return false;
    if (valueRange === 'gt_5cr' && amount <= 50000000) return false;
    return true;
  });

  const sortRows = (rows: Tender[]) => [...rows].sort((a, b) => {
    if (sortBy === 'date') return new Date(b.submission_date || 0).getTime() - new Date(a.submission_date || 0).getTime();
    if (sortBy === 'emd') return (b.emd_amount || 0) - (a.emd_amount || 0);
    if (sortBy === 'title') return String(a.title || '').localeCompare(String(b.title || ''));
    return (b.estimated_value || 0) - (a.estimated_value || 0);
  });

  const filteredTenders = sortRows(filterRows(getTabRows()));
  const totalPages = Math.max(1, Math.ceil(filteredTenders.length / pageSize));
  const paginatedTenders = filteredTenders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const organizationOptions = useMemo(
    () => [...new Set(tenders.map((row) => row.organization || row.client).filter(Boolean) as string[])].sort(),
    [tenders],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, sortBy, favorites.length, tenders.length, appliedFilters]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const exportRows = (rows: Tender[], suffix: string) => {
    const header = ['Tender ID', 'Tender Number', 'Title', 'Client', 'Organization', 'Submission Date', 'Status', 'Estimated Value', 'EMD Amount'];
    const csv = [header, ...rows.map((row) => [
      row.name,
      row.tender_number || '',
      row.title || '',
      row.client || '',
      row.organization || '',
      row.submission_date || '',
      row.status || '',
      row.estimated_value || 0,
      row.emd_amount || 0,
    ])]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tenders-${suffix}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border border-gray-200 rounded-lg mb-4 shadow-sm">
        <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="w-full px-4 py-3 flex items-center justify-between text-gray-600 hover:bg-gray-50">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span className="text-sm">Tender Filter</span>
          </div>
          {isFilterOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {isFilterOpen ? (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Keyword</label>
                <input
                  type="text"
                  value={draftFilters.keyword}
                  onChange={(e) => setDraftFilters((prev) => ({ ...prev, keyword: e.target.value }))}
                  placeholder="Search tenders..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Organization</label>
                <select
                  value={draftFilters.organization}
                  onChange={(e) => setDraftFilters((prev) => ({ ...prev, organization: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Organizations</option>
                  {organizationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">State / Region</label>
                <input
                  type="text"
                  value={draftFilters.state}
                  onChange={(e) => setDraftFilters((prev) => ({ ...prev, state: e.target.value }))}
                  placeholder="Type state or city"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Value Range</label>
                <select
                  value={draftFilters.valueRange}
                  onChange={(e) => setDraftFilters((prev) => ({ ...prev, valueRange: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Any Value</option>
                  <option value="lt_1cr">Below 1 Cr</option>
                  <option value="1cr_5cr">1 Cr to 5 Cr</option>
                  <option value="gt_5cr">Above 5 Cr</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <button
                onClick={() => {
                  setDraftFilters(initialFilters);
                  setAppliedFilters(initialFilters);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Clear
              </button>
              <button onClick={() => setAppliedFilters(draftFilters)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Apply Filter
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex justify-end gap-3 mb-4">
        <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
          New Tender
        </button>
        <button onClick={() => exportRows(filteredTenders, `${activeTab}-page-${currentPage}`)} className="flex items-center gap-2 px-4 py-2 border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50 text-sm">
          <Download className="w-4 h-4" />
          Export To Excel
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-6 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === tab.key ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
              {tab.count ? <span className={`ml-1 ${activeTab === tab.key ? 'text-blue-600' : 'text-gray-400'}`}>({tab.count.toLocaleString()})</span> : null}
              {activeTab === tab.key ? <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" /> : null}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="value">Value</option>
            <option value="date">Date</option>
            <option value="emd">EMD</option>
            <option value="title">Title</option>
          </select>
          <button className="p-2 border border-gray-200 rounded-md hover:bg-gray-50">
            <SortDesc className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading tenders...</div>
        ) : filteredTenders.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No tenders found</div>
        ) : paginatedTenders.map((tender, index) => {
          const daysLeft = getDaysLeft(tender.submission_date);
          const isUrgent = daysLeft !== null && daysLeft <= 1;
          return (
            <div key={tender.name} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className="text-blue-600 font-semibold">{(currentPage - 1) * pageSize + index + 1} | {formatCurrency(tender.estimated_value || 0)}</span>
                    {tender.submission_date ? (
                      <span className="text-gray-500 text-sm flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(tender.submission_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    ) : null}
                    {daysLeft !== null ? (
                      <span className={`text-sm font-medium ${isUrgent ? 'text-red-500' : 'text-blue-500'}`}>
                        {daysLeft <= 0 ? 'Ending Today' : `${daysLeft} Days Left`}
                      </span>
                    ) : null}
                    {tender.emd_amount ? <span className="text-gray-600 text-sm">EMD: <span className="text-blue-600 font-medium">{formatCurrency(tender.emd_amount)}</span></span> : null}
                  </div>

                  <p className="text-gray-600 text-sm mb-2">{tender.title}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                    <span><span className="font-medium">Status:</span> <span className="text-blue-600">{tender.status || 'N/A'}</span></span>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    <span>{tender.organization || tender.client || 'N/A'}</span>
                  </div>
                </div>

                <div className="text-right ml-4">
                  <p className="text-gray-700 font-medium mb-4">{tender.tender_number || tender.name}</p>
                  <div className="flex items-center gap-3 text-gray-400">
                    <button className="hover:text-blue-500 transition-colors" title="View" onClick={() => setDialog({ mode: 'view', tender })}>
                      <Eye className="w-5 h-5" />
                    </button>
                    <span className="text-gray-200">|</span>
                    <button onClick={() => toggleFavorite(tender.name)} className={`hover:text-red-500 transition-colors ${favorites.includes(tender.name) ? 'text-red-500' : ''}`} title="Favorite">
                      <Heart className={`w-5 h-5 ${favorites.includes(tender.name) ? 'fill-current' : ''}`} />
                    </button>
                    <span className="text-gray-200">|</span>
                    <button className="hover:text-blue-500 transition-colors" title="History" onClick={() => setDialog({ mode: 'history', tender })}>
                      <Clock className="w-5 h-5" />
                    </button>
                    <span className="text-gray-200">|</span>
                    <button className="hover:text-blue-500 transition-colors" title="Assign" onClick={() => setDialog({ mode: 'assign', tender, assignee: '' })}>
                      <User className="w-5 h-5" />
                    </button>
                    <span className="text-gray-200">|</span>
                    <button className="hover:text-blue-500 transition-colors" title="Download" onClick={() => exportRows([tender], tender.name)}>
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center mt-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1)
            .filter((page) => Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages)
            .map((page, index, pages) => {
              const previous = pages[index - 1];
              const showGap = previous !== undefined && page - previous > 1;
              return (
                <div key={page} className="flex items-center gap-2">
                  {showGap ? <span className="text-gray-400">...</span> : null}
                  <button onClick={() => setCurrentPage(page)} className={`px-3 py-1 rounded text-sm ${page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    {page}
                  </button>
                </div>
              );
            })}
          <button onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            Next
          </button>
        </div>
      </div>

      <ModalFrame
        open={dialog?.mode === 'view'}
        title="Tender Details"
        onClose={() => setDialog(null)}
        footer={<button className="btn btn-secondary" onClick={() => setDialog(null)}>Close</button>}
      >
        {dialog?.mode === 'view' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Tender ID', dialog.tender.name],
              ['Tender Number', dialog.tender.tender_number || '-'],
              ['Title', dialog.tender.title || '-'],
              ['Client', dialog.tender.client || '-'],
              ['Organization', dialog.tender.organization || '-'],
              ['Submission Date', dialog.tender.submission_date || '-'],
              ['Status', dialog.tender.status || '-'],
              ['Estimated Value', formatCurrency(dialog.tender.estimated_value || 0)],
              ['EMD Amount', formatCurrency(dialog.tender.emd_amount || 0)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
                <div className="mt-1 text-sm font-medium text-gray-900">{value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </ModalFrame>

      <ModalFrame
        open={dialog?.mode === 'history'}
        title="Tender Activity"
        onClose={() => setDialog(null)}
        footer={<button className="btn btn-secondary" onClick={() => setDialog(null)}>Close</button>}
      >
        {dialog?.mode === 'history' ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-sm font-semibold text-gray-900">Created</div>
              <div className="text-sm text-gray-500">{dialog.tender.creation || 'Not available'}</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-sm font-semibold text-gray-900">Submission Date</div>
              <div className="text-sm text-gray-500">{dialog.tender.submission_date || 'Not available'}</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-sm font-semibold text-gray-900">Current Status</div>
              <div className="text-sm text-gray-500">{dialog.tender.status || 'Not available'}</div>
            </div>
          </div>
        ) : null}
      </ModalFrame>

      <ModalFrame
        open={dialog?.mode === 'assign'}
        title="Assign Tender"
        onClose={() => setDialog(null)}
        widthClassName="max-w-lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDialog(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => setDialog(null)}>Save Assignment</button>
          </>
        }
      >
        {dialog?.mode === 'assign' ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">Assign <span className="font-medium text-gray-900">{dialog.tender.tender_number || dialog.tender.name}</span> to a team member.</div>
            <input
              className="input"
              placeholder="Enter assignee name"
              value={dialog.assignee}
              onChange={(e) => setDialog({ ...dialog, assignee: e.target.value })}
            />
          </div>
        ) : null}
      </ModalFrame>

      <CreateTenderModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={() => window.location.reload()} />
    </div>
  );
}
