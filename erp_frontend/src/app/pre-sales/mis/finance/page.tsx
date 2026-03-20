'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronDown, ChevronUp, Download, Loader2 } from 'lucide-react';

interface FinanceRecord {
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

export default function FinanceMISPage() {
  const [showFilters, setShowFilters] = useState(true);
  const [data, setData] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    tenderId: '',
    status: '',
    instrument_type: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.tenderId) params.set('tender', filters.tenderId);
      if (filters.status) params.set('status', filters.status);
      if (filters.instrument_type) params.set('instrument_type', filters.instrument_type);
      const res = await fetch(`/api/mis/finance?${params.toString()}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { console.error('Failed to fetch:', e); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setFilters({ tenderId: '', status: '', instrument_type: '' });
  };

  const exportCsv = () => {
    const lines = [
      ['Tender', 'Type', 'Bank', 'Amount', 'Status', 'Issue Date', 'Expiry Date', 'Owner'],
      ...data.map((row) => [row.linked_tender, row.instrument_type, row.bank_name, row.amount, row.status, row.issue_date, row.expiry_date, row.owner]),
    ];
    const csv = lines.map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'finance-mis.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Finance MIS</h1>
        <div className="flex items-center gap-3">
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Financial management information system reports</p>
          <button className="btn btn-secondary" onClick={exportCsv} disabled={!data.length}>
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search/Filter Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2 text-gray-600">
            <Search className="w-4 h-4" />
            <span className="font-medium">Search</span>
          </div>
          {showFilters ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        
        {showFilters && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
              <input
                type="text"
                placeholder="Tender Id"
                value={filters.tenderId}
                onChange={(e) => handleFilterChange('tenderId', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filters.instrument_type}
                onChange={(e) => handleFilterChange('instrument_type', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
              >
                <option value="">Select Requirement</option>
                <option value="EMD">EMD</option>
                <option value="PBG">PBG</option>
              </select>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
              >
                <option value="">Status</option>
                <option value="Pending">Pending</option>
                <option value="Active">Active</option>
                <option value="Released">Released</option>
                <option value="Refunded">Refunded</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleClear}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1e6b87] text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Tender</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Bank</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Issue Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Expiry Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">No records found</td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr key={row.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-blue-600 font-medium">{row.linked_tender || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.instrument_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.bank_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium text-center">₹{(row.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : row.status === 'Active' ? 'bg-green-100 text-green-700' : row.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{formatDate(row.issue_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{formatDate(row.expiry_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{row.owner}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
