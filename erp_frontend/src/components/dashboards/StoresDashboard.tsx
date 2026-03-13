'use client';
import { Package, Truck, Box, Clock, Activity, TrendingUp, TrendingDown, AlertTriangle, Building2, MapPin } from 'lucide-react';

export default function StoresDashboard() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stores Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">GRN, dispatch, stock & consumption tracking • Last updated: Mar 10, 2026 10:45 AM</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <SummaryCard title="GRN Queue" value="18" change="5 urgent" trend="down" icon={Package} color="blue" />
        <SummaryCard title="Pending Dispatch" value="24" change="12 for today" icon={Truck} color="orange" />
        <SummaryCard title="Stock Value" value="₹8.5 Cr" change="1,248 items" icon={Box} color="green" />
        <SummaryCard title="Aging Stock" value="86" change=">90 days" trend="down" icon={Clock} color="red" />
        <SummaryCard title="Today's Movement" value="156" change="IN: 89 | OUT: 67" icon={Activity} color="purple" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* GRN Queue */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              GRN Queue
            </h3>
            <span className="text-sm text-gray-500">18 pending</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {[
                { po: 'PO-2026-0458', vendor: 'ABC Electronics', items: 'PTZ Cameras x 50', received: 'Mar 10', status: 'QC Pending' },
                { po: 'PO-2026-0456', vendor: 'XYZ Cables', items: 'Fiber 24-Core x 5000m', received: 'Mar 09', status: 'Inspection' },
                { po: 'PO-2026-0455', vendor: 'Tech Solutions', items: 'Network Switches x 20', received: 'Mar 09', status: 'Ready' },
                { po: 'PO-2026-0452', vendor: 'Civil Works', items: 'Junction Boxes x 150', received: 'Mar 08', status: 'Partial' },
                { po: 'PO-2026-0450', vendor: 'Premium Cables', items: 'Power Cables x 3000m', received: 'Mar 07', status: 'QC Pending' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-blue-600 font-medium">{item.po}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      item.status === 'Ready' ? 'bg-green-100 text-green-600' :
                      item.status === 'Partial' ? 'bg-orange-100 text-orange-600' :
                      item.status === 'Inspection' ? 'bg-blue-100 text-blue-600' :
                      'bg-yellow-100 text-yellow-600'
                    }`}>{item.status}</span>
                  </div>
                  <p className="text-sm text-gray-900">{item.vendor}</p>
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                    <span>{item.items}</span>
                    <span>Received: {item.received}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              View All GRN →
            </button>
          </div>
        </div>

        {/* Dispatch Queue */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-600" />
              Pending Dispatch
            </h3>
            <span className="text-sm text-gray-500">24 requests</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {[
                { mrn: 'MRN-2026-0312', site: 'Zone A - Cluster 2', items: 12, requester: 'Amit K.', priority: 'Urgent' },
                { mrn: 'MRN-2026-0311', site: 'Zone B - Junction 5', items: 8, requester: 'Rahul S.', priority: 'High' },
                { mrn: 'MRN-2026-0310', site: 'CCC Building', items: 15, requester: 'Priya M.', priority: 'Medium' },
                { mrn: 'MRN-2026-0309', site: 'Zone C - Market', items: 6, requester: 'Vikash P.', priority: 'Low' },
                { mrn: 'MRN-2026-0308', site: 'Zone A - Cluster 1', items: 20, requester: 'Neha G.', priority: 'High' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-orange-600 font-medium">{item.mrn}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        item.priority === 'Urgent' ? 'bg-red-100 text-red-600' :
                        item.priority === 'High' ? 'bg-orange-100 text-orange-600' :
                        item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>{item.priority}</span>
                    </div>
                    <p className="text-sm text-gray-900 mt-1">{item.site}</p>
                    <p className="text-xs text-gray-500">{item.items} items | {item.requester}</p>
                  </div>
                  <button className="px-3 py-1.5 text-xs bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors">
                    Dispatch
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stock Position */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Box className="w-5 h-5 text-green-600" />
            Stock Position
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">Total Items: <strong className="text-gray-900">1,248</strong></span>
            <span className="text-gray-500">Value: <strong className="text-green-600">₹8.5 Cr</strong></span>
          </div>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="pb-3 font-medium">Item</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">In Stock</th>
                  <th className="pb-3 font-medium">Reserved</th>
                  <th className="pb-3 font-medium">Available</th>
                  <th className="pb-3 font-medium">Reorder Level</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { item: 'PTZ Camera 2MP', category: 'Cameras', stock: 145, reserved: 50, reorder: 100, status: 'OK' },
                  { item: 'Fiber Cable 24-Core', category: 'Cables', stock: 8500, reserved: 3000, reorder: 5000, status: 'OK' },
                  { item: 'Network Switch 48P', category: 'Network', stock: 25, reserved: 20, reorder: 30, status: 'Low' },
                  { item: 'Junction Box IP66', category: 'Accessories', stock: 180, reserved: 100, reorder: 200, status: 'Low' },
                  { item: 'UPS 5KVA', category: 'Power', stock: 8, reserved: 5, reorder: 15, status: 'Critical' },
                  { item: 'Server Rack 42U', category: 'Infrastructure', stock: 12, reserved: 4, reorder: 10, status: 'OK' },
                ].map((row, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="py-3 font-medium text-gray-900">{row.item}</td>
                    <td className="py-3 text-gray-600">{row.category}</td>
                    <td className="py-3 text-gray-900">{row.stock}</td>
                    <td className="py-3 text-orange-600">{row.reserved}</td>
                    <td className="py-3 font-semibold text-green-600">{row.stock - row.reserved}</td>
                    <td className="py-3 text-gray-500">{row.reorder}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        row.status === 'OK' ? 'bg-green-100 text-green-600' :
                        row.status === 'Low' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      }`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Third Row - Aging & Consumption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aging Stock */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-600" />
              Stock Aging Analysis
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-green-600">542</p>
                <p className="text-xs text-gray-600">0-30 days</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-blue-600">328</p>
                <p className="text-xs text-gray-600">31-60 days</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-yellow-600">192</p>
                <p className="text-xs text-gray-600">61-90 days</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-red-600">86</p>
                <p className="text-xs text-gray-600">&gt;90 days</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Top Aging Items (&gt;90 days):</p>
              {[
                { item: 'Old Model Cameras', qty: 24, value: '₹12 L', days: 145 },
                { item: 'Legacy Network Cards', qty: 35, value: '₹8 L', days: 120 },
                { item: 'Discontinued Cables', qty: 500, value: '₹5 L', days: 98 },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <div>
                    <p className="text-sm text-gray-900">{item.item}</p>
                    <p className="text-xs text-gray-500">Qty: {item.qty} | {item.days} days</p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Consumption Analysis */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              Consumption Analysis
            </h3>
          </div>
          <div className="p-4">
            {/* Project Wise */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Project Wise (This Month)</span>
              </div>
              <div className="space-y-2">
                {[
                  { project: 'Indore Smart City Phase II', value: '₹1.8 Cr', percent: 45 },
                  { project: 'Bhopal Traffic Management', value: '₹1.2 Cr', percent: 30 },
                  { project: 'Gwalior Surveillance', value: '₹0.6 Cr', percent: 15 },
                  { project: 'Other Projects', value: '₹0.4 Cr', percent: 10 },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{item.project}</span>
                      <span className="font-semibold text-gray-900">{item.value}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${item.percent}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Site Wise */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Site Wise (This Month)</span>
              </div>
              <div className="space-y-2">
                {[
                  { site: 'Zone A - All Clusters', value: '₹85 L', percent: 35 },
                  { site: 'Zone B - Junctions', value: '₹72 L', percent: 30 },
                  { site: 'CCC Building', value: '₹48 L', percent: 20 },
                  { site: 'Zone C - Markets', value: '₹36 L', percent: 15 },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{item.site}</span>
                      <span className="font-semibold text-gray-900">{item.value}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${item.percent}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, change, trend, icon: Icon, color }: {
  title: string;
  value: string;
  change: string;
  trend?: 'up' | 'down';
  icon: any;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">{title}</span>
        <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className={`text-xs mt-1 flex items-center gap-1 ${
        trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
      }`}>
        {trend === 'up' && <TrendingUp className="w-3 h-3" />}
        {trend === 'down' && <TrendingDown className="w-3 h-3" />}
        {change}
      </div>
    </div>
  );
}
