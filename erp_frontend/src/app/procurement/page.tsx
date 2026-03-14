'use client';
import { useEffect, useState } from 'react';
import { Plus, ShoppingCart, Truck, Clock, CheckCircle2, Eye } from 'lucide-react';

interface VendorComparison {
  name: string;
  linked_material_request?: string;
  linked_rfq?: string;
  linked_project?: string;
  linked_tender?: string;
  status?: string;
  recommended_supplier?: string;
  quote_count?: number;
  distinct_supplier_count?: number;
  lowest_total_amount?: number;
  selected_total_amount?: number;
  approved_by?: string;
  approved_at?: string;
  creation?: string;
}

interface VCStats {
  total?: number;
  draft?: number;
  pending_approval?: number;
  approved?: number;
  rejected?: number;
  three_quote_ready?: number;
  selected_total_amount?: number;
}

function formatCurrency(val?: number): string {
  if (!val) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

export default function ProcurementPage() {
  const [items, setItems] = useState<VendorComparison[]>([]);
  const [stats, setStats] = useState<VCStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/vendor-comparisons').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/vendor-comparisons/stats').then(r => r.json()).catch(() => ({ data: {} })),
    ]).then(([listRes, statsRes]) => {
      setItems(listRes.data || []);
      setStats(statsRes.data || {});
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Procurement</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Vendor comparisons and purchase management</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          New Comparison
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(stats.selected_total_amount)}</div>
              <div className="stat-label">Total Selected Value</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">{stats.total ?? items.length} comparisons</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="stat-value">{stats.pending_approval ?? 0}</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Awaiting sign-off</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="stat-value">{stats.three_quote_ready ?? 0}</div>
              <div className="stat-label">3-Quote Ready</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Compliant comparisons</div>
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
          <div className="text-xs text-green-600 mt-2">Ready for PO</div>
        </div>
      </div>

      {/* Vendor Comparisons Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Vendor Comparisons</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Material Request</th>
                <th>Project / Tender</th>
                <th>Suppliers</th>
                <th>Recommended</th>
                <th>Selected Value</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">No vendor comparisons found</td></tr>
              ) : items.map(vc => (
                <tr key={vc.name}>
                  <td>
                    <div className="font-medium text-gray-900">{vc.name}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{vc.linked_material_request || '-'}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{vc.linked_project || '-'}</div>
                    <div className="text-xs text-gray-500">{vc.linked_tender || ''}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{vc.distinct_supplier_count ?? 0} suppliers</div>
                    <div className="text-xs text-gray-500">{vc.quote_count ?? 0} quotes</div>
                  </td>
                  <td>
                    <div className="text-gray-900">{vc.recommended_supplier || '-'}</div>
                  </td>
                  <td>
                    <div className="font-semibold text-gray-900">{formatCurrency(vc.selected_total_amount)}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      vc.status === 'APPROVED' ? 'badge-success' : 
                      vc.status === 'PENDING_APPROVAL' ? 'badge-warning' :
                      vc.status === 'REJECTED' ? 'badge-error' :
                      'badge-gray'
                    }`}>
                      {vc.status}
                    </span>
                  </td>
                  <td>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}