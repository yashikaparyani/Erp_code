'use client';
import { Package, CheckCircle2, AlertTriangle, Truck, Eye, ArrowDownCircle, ArrowUpCircle, ArrowRightCircle } from 'lucide-react';

const inventoryItems = [
  {
    id: 'INV-001',
    name: '5MP Bullet Camera',
    category: 'Surveillance',
    source: 'PO-2024-001',
    vendor: 'Hikvision India Pvt Ltd',
    total: 480,
    used: 328,
    usedPercent: 68,
    available: 152,
    location: 'Warehouse A - Zone 1',
    status: 'In Stock',
  },
  {
    id: 'INV-002',
    name: '2MP PTZ Camera',
    category: 'Surveillance',
    source: 'PO-2024-001',
    vendor: 'Hikvision India Pvt Ltd',
    total: 120,
    used: 98,
    usedPercent: 82,
    available: 22,
    location: 'Warehouse A - Zone 1',
    status: 'Low Stock',
  },
  {
    id: 'INV-003',
    name: 'Single Mode Fiber 24 Core',
    category: 'Network',
    source: 'PO-2024-002',
    vendor: 'Sterlite Technologies',
    total: 15000,
    used: 8500,
    usedPercent: 57,
    available: 6500,
    location: 'Warehouse B - Zone 2',
    status: 'In Stock',
  },
  {
    id: 'INV-004',
    name: '24 Port PoE Switch',
    category: 'Network',
    source: 'PO-2024-002',
    vendor: 'Sterlite Technologies',
    total: 85,
    used: 62,
    usedPercent: 73,
    available: 23,
    location: 'Warehouse A - Zone 3',
    status: 'In Stock',
  },
  {
    id: 'INV-005',
    name: '4MP Dome Camera',
    category: 'Surveillance',
    source: 'PO-2024-003',
    vendor: 'Hikvision India Pvt Ltd',
    total: 0,
    used: 0,
    usedPercent: 0,
    available: 0,
    location: 'In Transit',
    status: 'In Transit',
  },
];

const stockMovements = [
  {
    type: 'in',
    title: 'Stock In - PO-2024-001',
    description: '480 × 5MP Bullet Camera • Warehouse A',
    time: 'Today, 10:30 AM',
    by: 'Sunil Kumar',
  },
  {
    type: 'out',
    title: 'Stock Out - EXE-001',
    description: '8 × 5MP Bullet Camera • Rajwada Square',
    time: 'Today, 09:15 AM',
    by: 'Amit Patel',
  },
  {
    type: 'transfer',
    title: 'Transfer - WH-A to WH-B',
    description: '50 × PoE Switch • Internal Transfer',
    time: 'Yesterday, 04:45 PM',
    by: 'Warehouse Manager',
  },
];

export default function InventoryPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventory & Logistics</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Stock management and warehouse operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">₹11.7 Cr</div>
              <div className="stat-label">Total Inventory Value</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">5 total items</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="stat-value">3</div>
              <div className="stat-label">In Stock</div>
            </div>
          </div>
          <div className="text-xs text-green-600 mt-2">Available for allocation</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="stat-value">1</div>
              <div className="stat-label">Low Stock</div>
            </div>
          </div>
          <div className="text-xs text-red-600 mt-2">Requires restocking</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="stat-value">1</div>
              <div className="stat-label">In Transit</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Expected delivery soon</div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Inventory Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Source</th>
                <th>Total</th>
                <th>Used</th>
                <th>Available</th>
                <th>Location</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {inventoryItems.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className="font-medium text-gray-900">{item.id}</div>
                  </td>
                  <td>
                    <div className="font-medium text-gray-900">{item.name}</div>
                  </td>
                  <td>
                    <span className="badge badge-info">{item.category}</span>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{item.source}</div>
                    <div className="text-xs text-gray-500">{item.vendor}</div>
                  </td>
                  <td>
                    <div className="text-gray-900">{item.total.toLocaleString()}</div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="progress-bar w-16">
                        <div 
                          className={`progress-fill ${item.usedPercent > 75 ? 'bg-red-500' : 'bg-blue-500'}`}
                          style={{ width: `${item.usedPercent}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{item.used.toLocaleString()} <span className="text-xs text-gray-400">{item.usedPercent}% used</span></span>
                    </div>
                  </td>
                  <td>
                    <div className="font-semibold text-gray-900">{item.available.toLocaleString()}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-600">{item.location}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      item.status === 'In Stock' ? 'badge-success' : 
                      item.status === 'Low Stock' ? 'badge-error' :
                      item.status === 'In Transit' ? 'badge-warning' : 
                      'badge-gray'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      View Item Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Stock Movements */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Recent Stock Movements</h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {stockMovements.map((movement, idx) => (
              <div key={idx} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  movement.type === 'in' ? 'bg-green-100' :
                  movement.type === 'out' ? 'bg-red-100' :
                  'bg-blue-100'
                }`}>
                  {movement.type === 'in' && <ArrowDownCircle className="w-5 h-5 text-green-600" />}
                  {movement.type === 'out' && <ArrowUpCircle className="w-5 h-5 text-red-600" />}
                  {movement.type === 'transfer' && <ArrowRightCircle className="w-5 h-5 text-blue-600" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{movement.title}</div>
                  <div className="text-sm text-gray-600">{movement.description}</div>
                  <div className="text-xs text-gray-500 mt-1">{movement.time} • By {movement.by}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}