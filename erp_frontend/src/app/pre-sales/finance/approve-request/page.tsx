'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, ChevronDown, Download, CheckCircle, XCircle, Clock, IndianRupee, FileText, Loader2 } from 'lucide-react';

interface FinanceInstrument {
  name: string;
  instrument_type: string;
  linked_tender: string;
  instrument_number: string;
  amount: number;
  status: string;
  bank_name: string;
  issue_date: string;
  expiry_date: string;
  remarks: string;
  creation: string;
  owner: string;
}

interface Stats {
  pending: number;
  pending_amount: number;
  emd_count: number;
  total: number;
}

type Filters = {
  tenderId: string;
  requirement: string;
  urgency: string;
  requester: string;
};

const initialFilters: Filters = { tenderId: '', requirement: '', urgency: '', requester: '' };

export default function ApproveRequestPage() {
  const [data, setData] = useState<FinanceInstrument[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, pending_amount: 0, emd_count: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [draftFilters, setDraftFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [reqRes, statsRes] = await Promise.all([
        fetch('/api/finance-requests?status=Pending'),
        fetch('/api/finance-requests/stats'),
      ]);
      const [reqJson, statsJson] = await Promise.all([reqRes.json(), statsRes.json()]);
      if (reqJson.success) setData(reqJson.data || []);
      if (statsJson.success) setStats(statsJson.data);
    } catch (e) {
      console.error('Failed to fetch:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getUrgency = (row: FinanceInstrument) => {
    if (!row.expiry_date) return 'normal';
    const days = Math.ceil((new Date(row.expiry_date).getTime() - Date.now()) / 86400000);
    if (days < 5) return 'urgent';
    if (days <= 10) return 'medium';
    return 'normal';
  };

  const filteredRows = useMemo(() => data.filter((row) => {
    if (appliedFilters.tenderId && !`${row.linked_tender} ${row.instrument_number} ${row.name}`.toLowerCase().includes(appliedFilters.tenderId.toLowerCase())) return false;
    if (appliedFilters.requirement && row.instrument_type.toLowerCase() !== appliedFilters.requirement.toLowerCase()) return false;
    if (appliedFilters.urgency && getUrgency(row) !== appliedFilters.urgency) return false;
    if (appliedFilters.requester && !(row.owner || '').toLowerCase().includes(appliedFilters.requester.toLowerCase())) return false;
    return true;
  }), [appliedFilters, data]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [pageSize, appliedFilters]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const exportRows = () => {
    const csv = [['Tender', 'Type', 'Bank', 'Amount', 'Requester', 'Created', 'Expiry', 'Status'], ...filteredRows.map((row) => [
      row.linked_tender || '',
      row.instrument_type || '',
      row.bank_name || '',
      row.amount || 0,
      row.owner || '',
      row.creation || '',
      row.expiry_date || '',
      row.status || '',
    ])]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'approve-request.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleApprove = async (name: string) => {
    try {
      const res = await fetch('/api/finance-requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (json.success) void fetchData();
    } catch (e) {
      console.error('Approve failed:', e);
    }
  };

  const handleDeny = async (name: string) => {
    try {
      const res = await fetch('/api/finance-requests/deny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, reason: '' }),
      });
      const json = await res.json();
      if (json.success) void fetchData();
    } catch (e) {
      console.error('Deny failed:', e);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Approve Request</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Review and approve pending finance requests</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"><div className="flex items-center gap-3"><div className="p-2 bg-yellow-100 rounded-lg"><Clock className="w-5 h-5 text-yellow-600" /></div><div><p className="text-2xl font-bold text-gray-800">{stats.pending}</p><p className="text-sm text-gray-500">Pending Approval</p></div></div></div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"><div className="flex items-center gap-3"><div className="p-2 bg-red-100 rounded-lg"><Clock className="w-5 h-5 text-red-600" /></div><div><p className="text-2xl font-bold text-gray-800">{stats.total}</p><p className="text-sm text-gray-500">Total Requests</p></div></div></div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><IndianRupee className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold text-gray-800">Rs {((stats.pending_amount || 0) / 100000).toFixed(1)}L</p><p className="text-sm text-gray-500">Total Pending Amount</p></div></div></div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><FileText className="w-5 h-5 text-green-600" /></div><div><p className="text-2xl font-bold text-gray-800">{stats.emd_count}</p><p className="text-sm text-gray-500">EMD Requests</p></div></div></div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <button onClick={() => setShowFilters(!showFilters)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50">
          <div className="flex items-center gap-2 text-gray-600"><Search className="w-4 h-4" /><span>Tender Filter</span></div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {showFilters ? (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <input value={draftFilters.tenderId} onChange={(e) => setDraftFilters((prev) => ({ ...prev, tenderId: e.target.value }))} placeholder="Search tender ID..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={draftFilters.requirement} onChange={(e) => setDraftFilters((prev) => ({ ...prev, requirement: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Requirements</option><option value="EMD">EMD</option><option value="PBG">PBG</option><option value="SD">Security Deposit</option>
              </select>
              <select value={draftFilters.urgency} onChange={(e) => setDraftFilters((prev) => ({ ...prev, urgency: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Urgency</option><option value="urgent">Urgent (&lt;5 days)</option><option value="medium">Medium (5-10 days)</option><option value="normal">Normal (&gt;10 days)</option>
              </select>
              <input value={draftFilters.requester} onChange={(e) => setDraftFilters((prev) => ({ ...prev, requester: e.target.value }))} placeholder="Requester name..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <button onClick={() => { setDraftFilters(initialFilters); setAppliedFilters(initialFilters); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Clear Filters</button>
              <button onClick={() => setAppliedFilters(draftFilters)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Apply Filters</button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={exportRows} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"><Download className="w-4 h-4" />Export To Excel</button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1e6b87] text-white">
                {['#', 'Tender', 'Type', 'Bank', 'Amount', 'Requester', 'Created', 'Expiry', 'Validity', 'Status', 'Action'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</td></tr>
              ) : paginatedRows.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-500">No pending requests found</td></tr>
              ) : (
                paginatedRows.map((row, index) => (
                  <tr key={row.name} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="px-4 py-3 text-sm text-blue-600 font-medium">{row.linked_tender || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.instrument_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.bank_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">Rs {(row.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.owner}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(row.creation)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(row.expiry_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.issue_date && row.expiry_date ? `${Math.ceil((new Date(row.expiry_date).getTime() - new Date(row.issue_date).getTime()) / 86400000)} days` : '-'}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">PENDING</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => void handleApprove(row.name)} className="p-1.5 hover:bg-green-100 rounded text-green-600" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => void handleDeny(row.name)} className="p-1.5 hover:bg-red-100 rounded text-red-600" title="Deny"><XCircle className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="px-2 py-1 border border-gray-200 rounded text-sm">
              <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(1)} className="px-2 py-1 text-gray-500 hover:text-gray-700" disabled={currentPage === 1}>{'<<'}</button>
            <button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} className="px-2 py-1 text-gray-500 hover:text-gray-700" disabled={currentPage === 1}>Prev</button>
            <button onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} className="px-2 py-1 text-gray-500 hover:text-gray-700" disabled={currentPage === totalPages}>Next</button>
            <button onClick={() => setCurrentPage(totalPages)} className="px-2 py-1 text-gray-500 hover:text-gray-700" disabled={currentPage === totalPages}>{'>>'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
