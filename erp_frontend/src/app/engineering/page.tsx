'use client';
import { Plus, Settings, CheckCircle2, Clock, FileText, Eye, Edit } from 'lucide-react';

const bomList = [
  {
    id: 'BOM-001',
    name: 'Rajwada Square - BOM',
    surveyId: 'SUR-001',
    tenderId: 'TEN-2024-001',
    version: 'v2.1',
    value: '₹2.85 Cr',
    items: 24,
    approvedBy: 'Rajesh Verma',
    status: 'Approved',
  },
  {
    id: 'BOM-002',
    name: 'Treasure Island - BOM',
    surveyId: 'SUR-002',
    tenderId: 'TEN-2024-001',
    version: 'v1.3',
    value: '₹4.12 Cr',
    items: 32,
    approvedBy: 'Rajesh Verma',
    status: 'Approved',
  },
  {
    id: 'BOM-003',
    name: 'MR 10 Signal - BOM',
    surveyId: 'SUR-004',
    tenderId: 'TEN-2024-001',
    version: 'v1.0',
    value: '₹1.68 Cr',
    items: 18,
    approvedBy: '-',
    status: 'Pending Approval',
  },
];

export default function EngineeringPage() {
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Engineering & BOM</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Bill of Materials and engineering approvals</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Create BOM
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">3</div>
              <div className="stat-label">Total BOMs</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">All sites</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="stat-value">2</div>
              <div className="stat-label">Approved</div>
            </div>
          </div>
          <div className="text-xs text-green-600 mt-2">Ready for procurement</div>
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
          <div className="text-xs text-gray-500 mt-2">Awaiting review</div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="stat-value">0</div>
              <div className="stat-label">Draft</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">In progress</div>
        </div>
      </div>

      {/* BOM List Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">BOM List</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>BOM ID</th>
                <th>Name</th>
                <th>Survey ID</th>
                <th>Tender ID</th>
                <th>Version</th>
                <th>Value</th>
                <th>Items</th>
                <th>Approved By</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bomList.map(bom => (
                <tr key={bom.id}>
                  <td>
                    <div className="font-medium text-gray-900">{bom.id}</div>
                  </td>
                  <td>
                    <div className="font-medium text-gray-900">{bom.name}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{bom.surveyId}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{bom.tenderId}</div>
                  </td>
                  <td>
                    <span className="badge badge-info">{bom.version}</span>
                  </td>
                  <td>
                    <div className="font-semibold text-gray-900">{bom.value}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{bom.items}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{bom.approvedBy}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      bom.status === 'Approved' ? 'badge-success' : 
                      bom.status === 'Pending Approval' ? 'badge-warning' : 
                      'badge-gray'
                    }`}>
                      {bom.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      <button className="text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center gap-1">
                        <Edit className="w-4 h-4" />
                        Edit BOM
                      </button>
                    </div>
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