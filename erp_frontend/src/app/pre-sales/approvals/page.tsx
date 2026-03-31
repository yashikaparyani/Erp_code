'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ChevronDown, ChevronUp, Eye, ChevronsLeft, ChevronsRight, Loader2, FileText } from 'lucide-react';
import { getFileProxyUrl } from '@/lib/fileLinks';
import ModalFrame from '@/components/ui/ModalFrame';
import { useRole } from '@/context/RoleContext';

interface ApprovalData {
  id: string;
  tender_id: string;
  approval_for: string;
  approval_from: string;
  action_owner?: string;
  action_hint?: string;
  age_days?: number;
  requester: string;
  request_date: string;
  status: string;
  type: string;
  request_remarks?: string;
  attached_document?: string;
}

type ApprovalDialogState =
  | { mode: 'view'; row: ApprovalData }
  | { mode: 'reject'; row: ApprovalData; value: string }
  | null;

export default function ApprovalsPage() {
  const router = useRouter();
  const { currentRole } = useRole();
  const [showFilters, setShowFilters] = useState(false);
  const [data, setData] = useState<ApprovalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dialog, setDialog] = useState<ApprovalDialogState>(null);
  const [processingId, setProcessingId] = useState('');
  const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    tenderId: '',
    approvalType: '',
    status: '',
    requester: '',
  });

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
    if (currentRole !== 'Director') {
      router.replace('/pre-sales/dashboard');
      return;
    }

    void fetchData();
  }, [currentRole, fetchData, router]);

  if (currentRole !== 'Director') {
    return null;
  }

  const getApprovalKind = (row: ApprovalData) => {
    const approvalFor = row.approval_for.toLowerCase();
    const approvalType = row.type.toLowerCase();

    if (approvalType === 'finance' || approvalFor.includes('finance request')) return 'finance_request';
    if (approvalFor.includes('boq')) return 'boq';
    if (approvalFor.includes('cost sheet')) return 'cost_sheet';
    if (approvalFor.includes('estimate')) return 'estimate';
    if (approvalFor.includes('proforma')) return 'proforma';
    if (approvalType === 'tender approval' || approvalFor.includes('tender approval')) return 'tender_approval';
    if (approvalFor.includes('vendor comparison')) return 'vendor_comparison';
    if (approvalType === 'indent' || approvalFor.includes('indent')) return 'indent';
    return '';
  };

  const filteredRows = useMemo(() => {
    return data.filter((row) => {
      const matchesTender = !filters.tenderId || row.tender_id.toLowerCase().includes(filters.tenderId.toLowerCase());
      const matchesType =
        !filters.approvalType ||
        row.approval_for.toLowerCase().includes(filters.approvalType.toLowerCase()) ||
        row.type.toLowerCase().includes(filters.approvalType.toLowerCase());
      const matchesStatus = !filters.status || row.status.toLowerCase() === filters.status.toLowerCase();
      const matchesRequester = !filters.requester || row.requester.toLowerCase().includes(filters.requester.toLowerCase());
      return matchesTender && matchesType && matchesStatus && matchesRequester;
    });
  }, [data, filters]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [currentPage, filteredRows, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

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

  const clearFilters = () => {
    setFilters({
      tenderId: '',
      approvalType: '',
      status: '',
      requester: '',
    });
  };

  const getActionLabels = (row: ApprovalData) => {
    const normalized = row.approval_for.toLowerCase();
    if (normalized.includes('indent')) return { approve: 'Accept', reject: 'Reject' };
    if (normalized.includes('go_no_go')) return { approve: 'Go', reject: 'No Go' };
    if (normalized.includes('technical')) return { approve: 'Approve Technical', reject: 'Reject Technical' };
    return { approve: 'Approve', reject: 'Reject' };
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
              <input
                type="text"
                placeholder="Tender ID"
                value={filters.tenderId}
                onChange={(e) => setFilters((prev) => ({ ...prev, tenderId: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Approval Type"
                value={filters.approvalType}
                onChange={(e) => setFilters((prev) => ({ ...prev, approvalType: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <input
                type="text"
                placeholder="Requester"
                value={filters.requester}
                onChange={(e) => setFilters((prev) => ({ ...prev, requester: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-sm text-gray-500">{filteredRows.length} approval item(s) match current filters.</div>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Clear Filters
              </button>
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
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Action Owner</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Requester</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Request Date</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">Workflow</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider w-44">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                      No approvals found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, index) => {
                    const supported = Boolean(getApprovalKind(row));
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const actionLabels = getActionLabels(row);

                    return (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-sm text-gray-900 text-center">{rowNumber}</td>
                        <td className="px-3 py-3 text-sm text-center font-medium">
                          {row.tender_id && row.tender_id !== '-' ? (
                            <Link href={`/pre-sales/${encodeURIComponent(row.tender_id)}`} className="text-blue-600 hover:text-blue-800">
                              {row.tender_id}
                            </Link>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 text-center">{row.type}</td>
                        <td className="px-3 py-3 text-sm text-gray-900 text-center">{row.approval_for}</td>
                        <td className="px-3 py-3 text-sm text-gray-900 text-center">
                          <div className="font-medium">{row.action_owner || row.approval_from}</div>
                          <div className="text-xs text-gray-400">{row.age_days ?? 0}d open</div>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 text-center">{row.requester}</td>
                        <td className="px-3 py-3 text-sm text-gray-600 text-center">{formatDate(row.request_date)}</td>
                        <td className={`px-3 py-3 text-sm text-center font-medium ${getStatusStyle(row.status)}`}>{row.status}</td>
                        <td className="px-3 py-3 text-center">
                          <div className="space-y-1">
                            <div>
                              {supported ? (
                                <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">Ready</span>
                              ) : (
                                <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">Read only</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{row.action_hint || 'Review and take the next approval action.'}</div>
                          </div>
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
                                  {actionLabels.approve}
                                </button>
                                <button
                                  className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                                  disabled={processingId === row.id}
                                  onClick={() => setDialog({ mode: 'reject', row, value: '' })}
                                >
                                  {actionLabels.reject}
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ['Approval ID', dialog.row.id],
                ['Tender ID', dialog.row.tender_id || '-'],
                ['Type', dialog.row.type || '-'],
                ['Approval For', dialog.row.approval_for || '-'],
                ['Action Owner', dialog.row.action_owner || dialog.row.approval_from || '-'],
                ['Requester', dialog.row.requester || '-'],
                ['Request Date', formatDate(dialog.row.request_date)],
                ['Status', dialog.row.status || '-'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
                  <div className={`mt-1 text-sm font-medium ${
                    label === 'Status' && value === 'Approved' ? 'text-green-700' :
                    label === 'Status' && value === 'Rejected' ? 'text-red-700' :
                    label === 'Status' && value === 'Pending' ? 'text-amber-700' :
                    'text-gray-900'
                  }`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Presales Remark */}
            {dialog.row.request_remarks ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-2">Presales Remark</div>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{dialog.row.request_remarks}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-400">
                No remark provided by Presales.
              </div>
            )}

            {/* Attached Document */}
            {dialog.row.attached_document ? (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-3">Attached Document</div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {dialog.row.attached_document.split('/').pop()}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">Click to view or open</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewDocUrl(getFileProxyUrl(dialog.row.attached_document))}
                    className="shrink-0 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    View Document
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-400">
                No document attached to this request.
              </div>
            )}

            {/* Director Actions hint */}
            {dialog.row.status === 'Pending' && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-800">
                <span className="font-semibold">Action Required:</span> Use the Approve / Reject buttons in the table to act on this request after reviewing the document and remark above.
              </div>
            )}
          </div>
        ) : null}
      </ModalFrame>

      {/* Document Viewer Modal */}
      <ModalFrame
        open={Boolean(viewDocUrl)}
        onClose={() => setViewDocUrl(null)}
        title="View Document"
        widthClassName="max-w-4xl"
      >
        {viewDocUrl ? (
          <div className="space-y-3">
            {!viewDocUrl.match(/\.(png|jpg|jpeg|gif|webp|svg)($|\?)/i) ? (
              <iframe
                src={viewDocUrl}
                title="Document Viewer"
                className="w-full rounded-2xl border border-gray-200"
                style={{ height: '68vh' }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewDocUrl} alt="Document" className="w-full rounded-2xl object-contain max-h-[65vh]" />
            )}
            <div className="flex justify-end gap-2">
              <a
                href={viewDocUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Open in new tab
              </a>
              <button
                type="button"
                onClick={() => setViewDocUrl(null)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
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
              disabled={
                dialog?.mode !== 'reject' ||
                processingId === dialog.row.id ||
                (dialog?.mode === 'reject' &&
                  getApprovalKind(dialog.row) === 'indent' &&
                  dialog.value.trim().length === 0)
              }
              onClick={() => dialog?.mode === 'reject' ? void runApproval(dialog.row, 'reject', dialog.value.trim()) : undefined}
            >
              {dialog?.mode === 'reject' && processingId === dialog.row.id ? 'Rejecting...' : 'Confirm Reject'}
            </button>
          </>
        }
      >
        {dialog?.mode === 'reject' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Add a written reason for rejecting <span className="font-medium text-gray-900">{dialog.row.id}</span>.</p>
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
