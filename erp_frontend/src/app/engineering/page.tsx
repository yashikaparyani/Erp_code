'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, FileText, IndianRupee, RefreshCw } from 'lucide-react';

type Boq = {
  name: string;
  linked_tender?: string;
  linked_project?: string;
  version?: number;
  status?: string;
  total_amount?: number;
  total_items?: number;
  created_by_user?: string;
  approved_by?: string;
  approved_at?: string;
  creation?: string;
};

type BoqStats = {
  total?: number;
  draft?: number;
  pending_approval?: number;
  approved?: number;
  rejected?: number;
  total_value?: number;
};

const STATUS_BADGES: Record<string, string> = {
  DRAFT: 'badge-gray',
  PENDING_APPROVAL: 'badge-warning',
  APPROVED: 'badge-success',
  REJECTED: 'badge-error',
};

function formatCurrency(value?: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function EngineeringPage() {
  const [boqs, setBoqs] = useState<Boq[]>([]);
  const [stats, setStats] = useState<BoqStats>({});
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    setLoading(true);
    const [boqRes, statsRes] = await Promise.all([
      fetch('/api/boqs').then((response) => response.json()).catch(() => ({ data: [] })),
      fetch('/api/boqs/stats').then((response) => response.json()).catch(() => ({ data: {} })),
    ]);
    setBoqs(boqRes.data || []);
    setStats(statsRes.data || {});
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const latestApproved = useMemo(() => {
    const approved = boqs.filter((boq) => boq.status === 'APPROVED');
    return approved.slice(0, 5);
  }, [boqs]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Engineering & BOQ</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Live bill-of-quantity records and approval state from the backend.</p>
        </div>
        <button
          onClick={refreshData}
          disabled={loading}
          className="btn btn-secondary w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">{stats.total ?? boqs.length}</div>
              <div className="stat-label">Total BOQs</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="stat-value">{stats.approved ?? 0}</div>
              <div className="stat-label">Approved</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="stat-value">{stats.pending_approval ?? 0}</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(stats.total_value)}</div>
              <div className="stat-label">Total BOQ Value</div>
            </div>
          </div>
        </div>
      </div>

      {latestApproved.length > 0 ? (
        <div className="card mb-4 sm:mb-6">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Latest Approved BOQs</h3>
          </div>
          <div className="card-body grid grid-cols-1 lg:grid-cols-2 gap-4">
            {latestApproved.map((boq) => (
              <div key={boq.name} className="rounded-lg border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-gray-900">{boq.name}</div>
                    <div className="text-sm text-gray-500">{boq.linked_project || boq.linked_tender || 'Unlinked BOQ'}</div>
                  </div>
                  <span className="badge badge-success">Approved</span>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  Version {boq.version || 1} • {boq.total_items || 0} items • {formatCurrency(boq.total_amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">BOQ Register</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">Loading BOQ records...</div>
          ) : boqs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No BOQ records found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>BOQ</th>
                  <th>Tender / Project</th>
                  <th>Version</th>
                  <th>Items</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Approved By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {boqs.map((boq) => (
                  <tr key={boq.name}>
                    <td>
                      <div className="font-medium text-gray-900">{boq.name}</div>
                      <div className="text-xs text-gray-500">{formatDate(boq.creation)}</div>
                    </td>
                    <td>
                      <div className="text-gray-700">{boq.linked_project || '-'}</div>
                      <div className="text-xs text-gray-400">{boq.linked_tender || '-'}</div>
                    </td>
                    <td>v{boq.version || 1}</td>
                    <td>{boq.total_items || 0}</td>
                    <td className="font-medium text-gray-900">{formatCurrency(boq.total_amount)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGES[boq.status || ''] || 'badge-gray'}`}>
                        {boq.status || 'Unknown'}
                      </span>
                    </td>
                    <td>{boq.approved_by || '-'}</td>
                    <td>
                      <Link href="/engineering/boq" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                        Review BOQ
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
