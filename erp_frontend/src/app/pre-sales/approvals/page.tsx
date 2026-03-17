'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ChevronDown, ChevronUp, Eye, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';
import ModalFrame from '@/components/ui/ModalFrame';

interface ApprovalData {
  id: string;
  tender_id: string;
  approval_for: string;
  approval_from: string;
  requester: string;
  request_date: string;
  status: string;
  type: string;
}

type ApprovalDialogState =
  | { mode: 'view'; row: ApprovalData }
  | { mode: 'reject'; row: ApprovalData; value: string }
  | null;

export default function ApprovalsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [data, setData] = useState<ApprovalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dialog, setDialog] = useState<ApprovalDialogState>(null);
  const [processingId, setProcessingId] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/approvals');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        return;
      }
      setError(json.message || 'Failed to fetch approvals');
    } catch (fetchError) {
      console.error('Failed to fetch:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const getApprovalKind = (row: ApprovalData) => {
    if (row.approval_for.toLowerCase().includes('vendor comparison')) return 'vendor_comparison';
    return '';
  };

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }, [currentPage, data, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'text-green-600';
      case 'Pending':
        return 'text-yellow-600';
      case 'Rejected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const runApproval = async (row: ApprovalData, action: 'approve' | 'reject', reason = '') => {
    const kind = getApprovalKind(row);
    if (!kind) return;

    setProcessingId(row.id);
    setError('');
    try {
      const response = await fetch('/api/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, action, name: row.id, reason }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || `Failed to ${action}`);
      }
      setDialog(null);
      await fetchData();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Failed to ${action}`);
    } finally {
      setProcessingId('');
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Approvals</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Manage approval requests and workflows</p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2 text-gray-600">
            <Search className="w-4 h-4" />
            <span className="font-medium">Search</span>
          </div>
          {showFilters ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showFilters ? (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
              <input type="text" placeholder="Tender ID" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="Approval Type" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="Status" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="Requester" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#1e6b87]" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-[#1e6b87] text-white">
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider w-12">#</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Tender ID</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Type</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Approval For</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Approval From</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Requester</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Request Date</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Workflow</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider w-44">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                      No approvals found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, index) => {
                    const supported = Boolean(getApprovalKind(row));
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;

                    return (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-sm text-gray-900 text-center">{rowNumber}</td>
                        <td className="px-3 py-3 text-sm text-blue-600 text-center font-medium">{row.tender_id}</td>
                        <td className="px-3 py-3 text-sm text-gray-900 text-center">{row.type}</td>
                        <td className="px-3 py-3 text-sm text-gray-900 text-center">{row.approval_for}</td>
                        <td className="px-3 py-3 text-sm text-gray-900 text-center">{row.approval_from}</td>
                        <td className="px-3 py-3 text-sm text-gray-900 text-center">{row.requester}</td>
                        <td className="px-3 py-3 text-sm text-gray-600 text-center">{formatDate(row.request_date)}</td>
                        <td className={`px-3 py-3 text-sm text-center font-medium ${getStatusStyle(row.status)}`}>{row.status}</td>
                        <td className="px-3 py-3 text-center">
                          {supported ? (
                            <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">Ready</span>
                          ) : (
                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">Read only</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                              onClick={() => setDialog({ mode: 'view', row })}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {supported ? (
                              <>
                                <button
                                  className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-50"
                                  disabled={processingId === row.id}
                                  onClick={() => void runApproval(row, 'approve')}
                                >
                                  Approve
                                </button>
                                <button
                                  className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                                  disabled={processingId === row.id}
                                  onClick={() => setDialog({ mode: 'reject', row, value: '' })}
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>Page {currentPage} of {totalPages}</span>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                Prev
              </button>
              <span className="px-3 py-1 bg-[#1e6b87] text-white rounded text-sm font-medium">{currentPage}</span>
              <button onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                Next
              </button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalFrame
        open={dialog?.mode === 'view'}
        title="Approval Details"
        onClose={() => setDialog(null)}
        footer={<button className="btn btn-secondary" onClick={() => setDialog(null)}>Close</button>}
      >
        {dialog?.mode === 'view' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Approval ID', dialog.row.id],
              ['Tender ID', dialog.row.tender_id || '-'],
              ['Type', dialog.row.type || '-'],
              ['Approval For', dialog.row.approval_for || '-'],
              ['Approval From', dialog.row.approval_from || '-'],
              ['Requester', dialog.row.requester || '-'],
              ['Request Date', formatDate(dialog.row.request_date)],
              ['Status', dialog.row.status || '-'],
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
        open={dialog?.mode === 'reject'}
        title="Reject Approval"
        onClose={() => setDialog(null)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDialog(null)}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={dialog?.mode !== 'reject' || processingId === dialog.row.id}
              onClick={() => dialog?.mode === 'reject' ? void runApproval(dialog.row, 'reject', dialog.value.trim()) : undefined}
            >
              {dialog?.mode === 'reject' && processingId === dialog.row.id ? 'Rejecting...' : 'Confirm Reject'}
            </button>
          </>
        }
      >
        {dialog?.mode === 'reject' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Add an optional reason for rejecting <span className="font-medium text-gray-900">{dialog.row.id}</span>.</p>
            <textarea
              className="input min-h-28"
              placeholder="Reason for rejection"
              value={dialog.value}
              onChange={(e) => setDialog({ ...dialog, value: e.target.value })}
            />
          </div>
        ) : null}
      </ModalFrame>
    </div>
  );
}
