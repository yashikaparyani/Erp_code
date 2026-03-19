'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, FileText, CheckCircle2, Clock, Edit3, Eye, RefreshCw } from 'lucide-react';
import CreateTenderModal from '@/components/CreateTenderModal';
import { deriveTenderFunnelStatus, getTenderFunnelMeta } from '@/components/tenderFunnel';

interface Tender {
  name: string;
  tender_number: string;
  title: string;
  client: string;
  organization: string;
  submission_date: string;
  computed_funnel_status?: string;
  status: string;
  estimated_value: number;
  emd_amount: number;
  creation: string;
}

interface Stats {
  total_pipeline: number;
  total_count: number;
  won_count: number;
  submitted_count: number;
  draft_count: number;
}

function sortByNearestSubmission<T extends { submission_date?: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const aTs = a.submission_date ? new Date(a.submission_date).getTime() : Number.MAX_SAFE_INTEGER;
    const bTs = b.submission_date ? new Date(b.submission_date).getTime() : Number.MAX_SAFE_INTEGER;
    return aTs - bTs;
  });
}

export default function PreSalesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTenders = async () => {
    try {
      const response = await fetch('/api/tenders');
      const result = await response.json();
      if (result.success) {
        setTenders(sortByNearestSubmission(result.data || []));
      }
    } catch (error) {
      console.error('Error fetching tenders:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/tenders/stats');
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    await Promise.all([fetchTenders(), fetchStats()]);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleTenderCreated = () => {
    refreshData();
  };

  const formatCurrency = (value: number) => {
    if (!value) return '₹0';
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(1)} Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)} Lacs`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { class: string; label: string }> = {
      'DRAFT': { class: 'badge-gray', label: 'Draft' },
      'SUBMITTED': { class: 'badge-info', label: 'Submitted' },
      'UNDER_EVALUATION': { class: 'badge-warning', label: 'Under Evaluation' },
      'WON': { class: 'badge-success', label: 'Won' },
      'LOST': { class: 'badge-error', label: 'Lost' },
      'CANCELLED': { class: 'badge-gray', label: 'Cancelled' },
      'DROPPED': { class: 'badge-gray', label: 'Dropped' },
    };
    return statusMap[status] || { class: 'badge-gray', label: status };
  };

  const getCompletionPercent = (status: string) => {
    const percentMap: Record<string, number> = {
      'DRAFT': 25,
      'SUBMITTED': 75,
      'UNDER_EVALUATION': 85,
      'WON': 100,
      'LOST': 100,
      'CANCELLED': 0,
      'DROPPED': 0,
    };
    return percentMap[status] || 0;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Pre-Sales & Budgeting</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Tender pipeline and cost estimation management</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={refreshData}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Tender
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(stats?.total_pipeline || 0)}</div>
              <div className="stat-label">Total Pipeline</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">{stats?.total_count || 0} active tenders</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="stat-value text-green-600">{stats?.won_count || 0}</div>
              <div className="stat-label">Won Tenders</div>
            </div>
          </div>
          <div className="text-xs text-green-600 mt-2">100% success rate</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="stat-value text-indigo-600">{stats?.submitted_count || 0}</div>
              <div className="stat-label">Under Review</div>
            </div>
          </div>
          <div className="text-xs text-indigo-600 mt-2">Awaiting results</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="stat-value text-amber-700">{stats?.draft_count || 0}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>
          <div className="text-xs text-amber-700 mt-2">Draft stage</div>
        </div>
      </div>

      {/* Tender Pipeline Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Tender Pipeline</h3>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-500">Loading tenders...</span>
            </div>
          ) : tenders.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No tenders found</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Create your first tender
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>TENDER ID</th>
                  <th>PROJECT DETAILS</th>
                  <th>CLIENT / ORG</th>
                  <th>ESTIMATED VALUE</th>
                  <th>PROBABILITY</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {tenders.map(tender => {
                  const statusBadge = getStatusBadge(tender.status);
                  const completion = getCompletionPercent(tender.status);
                  return (
                    <tr key={tender.name}>
                      <td>
                        <div className="font-medium text-gray-900">{tender.tender_number}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(tender.creation).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium text-gray-900 max-w-xs truncate">{tender.title}</div>
                        <div className="mt-1">
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
                        <div className="text-gray-600 max-w-xs truncate">{tender.client || '-'}</div>
                        {tender.organization ? (
                          <div className="text-xs text-gray-400 max-w-xs truncate">{tender.organization}</div>
                        ) : null}
                      </td>
                      <td>
                        <div className="font-semibold text-gray-900">{formatCurrency(tender.estimated_value)}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                              className={`h-2 rounded-full transition-all ${
                                completion >= 75 ? 'bg-emerald-500' : completion >= 25 ? 'bg-indigo-500' : 'bg-slate-400'
                              }`} 
                              style={{ width: `${completion}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{completion}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          tender.status === 'WON' ? 'bg-green-100 text-green-700' :
                          tender.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' :
                          tender.status === 'UNDER_EVALUATION' ? 'bg-amber-100 text-amber-700' :
                          tender.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                          tender.status === 'LOST' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {tender.status === 'WON' && <CheckCircle2 className="w-3 h-3" />}
                          {tender.status === 'SUBMITTED' && <Clock className="w-3 h-3" />}
                          {statusBadge.label}
                        </span>
                      </td>
                      <td>
                        <Link 
                          href={`/pre-sales/${encodeURIComponent(tender.name)}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                        >
                          View Details
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Tender Modal */}
      <CreateTenderModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleTenderCreated}
      />
    </div>
  );
}
