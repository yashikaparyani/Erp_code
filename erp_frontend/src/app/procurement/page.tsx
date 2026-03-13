'use client';
import { Plus, ShoppingCart, Truck, Clock, CheckCircle2, Eye } from 'lucide-react';

const purchaseOrders = [
  {
    id: 'PO-2024-001',
    vendor: 'Hikvision India Pvt Ltd',
    bom: 'BOM-001',
    site: 'Rajwada Square Junction',
    items: 8,
    value: '₹1.48 Cr',
    orderDate: '1/2/2024',
    deliveryDate: '15/3/2024',
    status: 'Delivered',
  },
  {
    id: 'PO-2024-002',
    vendor: 'Sterlite Technologies',
    bom: 'BOM-001',
    site: 'Rajwada Square Junction',
    items: 4,
    value: '₹0.85 Cr',
    orderDate: '5/2/2024',
    deliveryDate: '10/3/2024',
    status: 'Delivered',
  },
  {
    id: 'PO-2024-003',
    vendor: 'Hikvision India Pvt Ltd',
    bom: 'BOM-002',
    site: 'Treasure Island Mall Area',
    items: 12,
    value: '₹2.16 Cr',
    orderDate: '10/2/2024',
    deliveryDate: '20/3/2024',
    status: 'Issued',
  },
  {
    id: 'PO-2024-004',
    vendor: 'Cisco Systems India',
    bom: 'BOM-002',
    site: 'Treasure Island Mall Area',
    items: 8,
    value: '₹1.28 Cr',
    orderDate: '12/2/2024',
    deliveryDate: '18/3/2024',
    status: 'Approved',
  },
];

export default function ProcurementPage() {
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Procurement</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Purchase orders and vendor management</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Create PO
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
              <div className="stat-value">₹5.8 Cr</div>
              <div className="stat-label">Total PO Value</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">4 orders</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="stat-value">1</div>
              <div className="stat-label">Issued</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">In transit</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="stat-value">1</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Awaiting sign-off</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="stat-value">2</div>
              <div className="stat-label">Delivered</div>
            </div>
          </div>
          <div className="text-xs text-green-600 mt-2">Received at warehouse</div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Purchase Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO ID</th>
                <th>Vendor</th>
                <th>BOM / Site</th>
                <th>Items</th>
                <th>Value</th>
                <th>Order Date</th>
                <th>Delivery Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map(po => (
                <tr key={po.id}>
                  <td>
                    <div className="font-medium text-gray-900">{po.id}</div>
                  </td>
                  <td>
                    <div className="font-medium text-gray-900">{po.vendor}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{po.bom}</div>
                    <div className="text-xs text-gray-500">{po.site}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{po.items}</div>
                  </td>
                  <td>
                    <div className="font-semibold text-gray-900">{po.value}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{po.orderDate}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{po.deliveryDate}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      po.status === 'Delivered' ? 'badge-success' : 
                      po.status === 'Issued' ? 'badge-info' :
                      po.status === 'Approved' ? 'badge-warning' : 
                      'badge-gray'
                    }`}>
                      {po.status}
                    </span>
                  </td>
                  <td>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      View PO Details
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