'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronDown, ChevronUp, Download, Calendar, Loader2 } from 'lucide-react';

interface SalesMISRecord {
  user: string;
  assigned: number;
  in_process: number;
  submitted: number;
  cancelled: number;
  awarded: number;
  lost: number;
  rejected: number;
  dropped: number;
  reopened: number;
  total: number;
}

export default function SalesMISPage() {
  const [showFilters, setShowFilters] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [data, setData] = useState<SalesMISRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fromDate) params.set('from_date', fromDate);
      if (toDate) params.set('to_date', toDate);
      const res = await fetch(`/api/mis/sales?${params.toString()}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { console.error('Failed to fetch:', e); }
    finally { setLoading(false); }
  }, [fromDate, toDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleClear = () => { setFromDate(''); setToDate(''); };

  const exportCsv = () => {
    const lines = [
      ['User', 'Assigned', 'In Process', 'Submitted', 'Cancelled', 'Awarded', 'Lost', 'Rejected', 'Dropped', 'Reopened', 'Total'],
      ...data.map((row) => [row.user, row.assigned, row.in_process, row.submitted, row.cancelled, row.awarded, row.lost, row.rejected, row.dropped, row.reopened, row.total]),
    ];
    const csv = lines.map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sales-mis.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderClickableNumber = (value: number) => {
    if (value === 0) return <span className="text-gray-500">0</span>;
    return <span className="text-blue-600 font-medium">{value}</span>;
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Sales MIS</h1>
        <div className="flex items-center gap-3">
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Sales team performance and tender tracking</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 max-w-2xl">
              <input
                type="date"
                placeholder="From date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                placeholder="To date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
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

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="bg-[#1e6b87] text-white">
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">User</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Assigned</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">In Process</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Submitted</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Cancelled</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Awarded</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Lost</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Rejected</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Dropped</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Reopened</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-gray-500">No data found</td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr key={row.user} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{row.user}</td>
                    <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.assigned)}</td>
                    <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.in_process)}</td>
                    <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.submitted)}</td>
                    <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.cancelled)}</td>
                    <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.awarded)}</td>
                    <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.lost)}</td>
                    <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.rejected)}</td>
                    <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.dropped)}</td>
                    <td className="px-3 py-3 text-sm text-center">{renderClickableNumber(row.reopened)}</td>
                    <td className="px-3 py-3 text-sm text-center font-bold">{row.total}</td>
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
