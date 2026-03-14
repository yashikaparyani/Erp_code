'use client';
import { useEffect, useState } from 'react';
import { Package, CheckCircle2, AlertTriangle, Truck, Eye, ArrowDownCircle, ArrowUpCircle, ArrowRightCircle } from 'lucide-react';

interface DispatchChallan {
  name: string;
  dispatch_date?: string;
  dispatch_type?: string;
  status?: string;
  from_warehouse?: string;
  to_warehouse?: string;
  target_site_name?: string;
  linked_project?: string;
  total_items?: number;
  total_qty?: number;
  creation?: string;
}

interface DCStats {
  total?: number;
  draft?: number;
  pending_approval?: number;
  approved?: number;
  dispatched?: number;
  cancelled?: number;
  total_qty?: number;
}

interface StockBin {
  warehouse?: string;
  item_code?: string;
  actual_qty?: number;
  reserved_qty?: number;
  ordered_qty?: number;
  projected_qty?: number;
}

export default function InventoryPage() {
  const [challans, setChallans] = useState<DispatchChallan[]>([]);
  const [stats, setStats] = useState<DCStats>({});
  const [stockBins, setStockBins] = useState<StockBin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/dispatch-challans').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/dispatch-challans/stats').then(r => r.json()).catch(() => ({ data: {} })),
      fetch('/api/stock-snapshot').then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([challansRes, statsRes, stockRes]) => {
      setChallans(challansRes.data || []);
      setStats(statsRes.data || {});
      setStockBins(stockRes.data || []);
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
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventory & Logistics</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Dispatch challans, stock, and warehouse operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">{stats.total ?? challans.length}</div>
              <div className="stat-label">Total Challans</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">{stats.total_qty ?? 0} total qty</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="stat-value">{stats.dispatched ?? 0}</div>
              <div className="stat-label">Dispatched</div>
            </div>
          </div>
          <div className="text-xs text-green-600 mt-2">Delivered</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="stat-value">{stats.pending_approval ?? 0}</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          </div>
          <div className="text-xs text-yellow-600 mt-2">Awaiting sign-off</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="stat-value">{stockBins.length}</div>
              <div className="stat-label">Stock Items</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">In warehouse</div>
        </div>
      </div>

      {/* Dispatch Challans Table */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Dispatch Challans</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Challan ID</th>
                <th>Date</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Items</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {challans.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-500">No dispatch challans found</td></tr>
              ) : challans.map(ch => (
                <tr key={ch.name}>
                  <td>
                    <div className="font-medium text-gray-900">{ch.name}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{ch.dispatch_date || '-'}</div>
                  </td>
                  <td>
                    <span className="badge badge-info">{ch.dispatch_type || '-'}</span>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{ch.from_warehouse || '-'}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{ch.to_warehouse || ch.target_site_name || '-'}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{ch.total_items ?? 0}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{ch.total_qty ?? 0}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      ch.status === 'DISPATCHED' ? 'badge-success' : 
                      ch.status === 'APPROVED' ? 'badge-info' :
                      ch.status === 'PENDING_APPROVAL' ? 'badge-warning' : 
                      ch.status === 'CANCELLED' ? 'badge-error' :
                      'badge-gray'
                    }`}>
                      {ch.status}
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

      {/* Stock Snapshot */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Stock Snapshot</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Warehouse</th>
                <th>Actual Qty</th>
                <th>Reserved</th>
                <th>Ordered</th>
                <th>Projected</th>
              </tr>
            </thead>
            <tbody>
              {stockBins.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No stock data available</td></tr>
              ) : stockBins.map((bin, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="font-medium text-gray-900">{bin.item_code}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{bin.warehouse}</div>
                  </td>
                  <td>
                    <div className="text-gray-900">{bin.actual_qty ?? 0}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{bin.reserved_qty ?? 0}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{bin.ordered_qty ?? 0}</div>
                  </td>
                  <td>
                    <div className="font-semibold text-gray-900">{bin.projected_qty ?? 0}</div>
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