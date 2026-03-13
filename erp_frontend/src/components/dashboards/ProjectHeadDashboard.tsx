'use client';
import { AlertTriangle, Clock, IndianRupee, Users, Link2, AlertCircle, Flag, FileText, TrendingUp, TrendingDown } from 'lucide-react';

export default function ProjectHeadDashboard() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Project Head Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of project status, risks, and pending actions • Last updated: Mar 10, 2026 10:45 AM</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
        <SummaryCard title="Indents Pending" value="28" change="5 urgent" trend="down" icon={FileText} color="blue" />
        <SummaryCard title="Milestone Billing" value="₹4.2 Cr" change="Due this week" icon={IndianRupee} color="green" />
        <SummaryCard title="Payment Pending" value="₹12.8 Cr" change="8 invoices" trend="down" icon={IndianRupee} color="orange" />
        <SummaryCard title="Dependencies" value="14" change="3 critical" trend="down" icon={Link2} color="purple" />
        <SummaryCard title="SLA Risk" value="6" change="Sites at risk" trend="down" icon={Clock} color="red" />
        <SummaryCard title="Manpower Short" value="18" change="Across 4 sites" trend="down" icon={Users} color="amber" />
        <SummaryCard title="Red Flags" value="5" change="Needs attention" trend="down" icon={Flag} color="red" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Indents Pending */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Indents Pending Approval
            </h3>
            <span className="text-sm text-gray-500">28 total</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {[
                { id: 'IND-2026-0234', desc: 'CCTV Cameras - PTZ 2MP', qty: 45, site: 'Zone A', priority: 'Urgent', days: 3 },
                { id: 'IND-2026-0233', desc: 'Fiber Optic Cable 24-Core', qty: 5000, site: 'Zone B', priority: 'High', days: 5 },
                { id: 'IND-2026-0232', desc: 'Network Switches 24-Port', qty: 12, site: 'Zone C', priority: 'Medium', days: 7 },
                { id: 'IND-2026-0231', desc: 'UPS 3KVA Online', qty: 8, site: 'CCC', priority: 'High', days: 4 },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-600 text-sm">{item.id}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        item.priority === 'Urgent' ? 'bg-red-100 text-red-600' :
                        item.priority === 'High' ? 'bg-orange-100 text-orange-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>{item.priority}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{item.desc} × {item.qty}</p>
                    <p className="text-xs text-gray-500">{item.site}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">Pending {item.days} days</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              View All Indents →
            </button>
          </div>
        </div>

        {/* Milestone Billing Upcoming */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-green-600" />
              Upcoming Milestone Billing
            </h3>
            <span className="text-sm text-gray-500">₹8.4 Cr this month</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {[
                { milestone: 'Phase 2 - Zone A Completion', amount: '₹2.4 Cr', due: 'Mar 15', status: 'Ready', progress: 98 },
                { milestone: 'Fiber Network - 50KM', amount: '₹1.8 Cr', due: 'Mar 20', status: 'In Progress', progress: 85 },
                { milestone: 'CCC Integration', amount: '₹3.2 Cr', due: 'Mar 25', status: 'In Progress', progress: 72 },
                { milestone: 'Testing & Commissioning', amount: '₹1.0 Cr', due: 'Mar 30', status: 'Pending', progress: 40 },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 text-sm">{item.milestone}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      item.status === 'Ready' ? 'bg-green-100 text-green-600' :
                      item.status === 'In Progress' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>{item.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600 font-semibold">{item.amount}</span>
                    <span className="text-gray-500">Due: {item.due}</span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${item.progress}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Payment Pending */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-orange-600" />
              Payment Pending
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {[
              { vendor: 'ABC Electronics', amount: '₹4.2 Cr', days: 45 },
              { vendor: 'XYZ Cables Ltd', amount: '₹3.8 Cr', days: 30 },
              { vendor: 'Tech Solutions', amount: '₹2.5 Cr', days: 21 },
              { vendor: 'Civil Works Co', amount: '₹2.3 Cr', days: 15 },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item.vendor}</p>
                  <p className="text-xs text-gray-500">{item.days} days overdue</p>
                </div>
                <span className={`font-semibold text-sm ${item.days > 30 ? 'text-red-600' : 'text-orange-600'}`}>
                  {item.amount}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Dependencies */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-purple-600" />
              Critical Dependencies
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {[
              { task: 'Power connection at Site 45', blocking: 'Camera Installation', eta: 'Mar 12' },
              { task: 'Civil work at Junction 8', blocking: 'Fiber Laying', eta: 'Mar 14' },
              { task: 'NOC from Traffic Police', blocking: 'Zone B Execution', eta: 'Mar 18' },
            ].map((item, idx) => (
              <div key={idx} className="p-3 bg-purple-50 rounded-lg">
                <p className="font-medium text-gray-900 text-sm">{item.task}</p>
                <p className="text-xs text-purple-600 mt-1">Blocking: {item.blocking}</p>
                <p className="text-xs text-gray-500 mt-1">ETA: {item.eta}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SLA Risk & Red Flags */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Red Flags & SLA Risk
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {[
              { issue: 'Site 23 - Camera offline 48hrs', type: 'SLA', severity: 'Critical' },
              { issue: 'Vendor ABC delivery delayed', type: 'Supply', severity: 'High' },
              { issue: 'Budget overrun - Zone C', type: 'Finance', severity: 'High' },
              { issue: 'Manpower shortage - Night shift', type: 'Resource', severity: 'Medium' },
              { issue: 'Pending NOC approval', type: 'Compliance', severity: 'Medium' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2 rounded hover:bg-red-50">
                <Flag className={`w-4 h-4 mt-0.5 ${
                  item.severity === 'Critical' ? 'text-red-600' :
                  item.severity === 'High' ? 'text-orange-500' : 'text-yellow-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{item.issue}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{item.type}</span>
                    <span className={`px-1.5 py-0.5 text-xs rounded ${
                      item.severity === 'Critical' ? 'bg-red-100 text-red-600' :
                      item.severity === 'High' ? 'bg-orange-100 text-orange-600' :
                      'bg-yellow-100 text-yellow-600'
                    }`}>{item.severity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manpower Shortage */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            Manpower Shortage by Site
          </h3>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="pb-3 font-medium">Site</th>
                  <th className="pb-3 font-medium">Required</th>
                  <th className="pb-3 font-medium">Available</th>
                  <th className="pb-3 font-medium">Shortage</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Impact</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { site: 'Zone A - Cluster 1', required: 15, available: 10, category: 'Technicians', impact: 'High' },
                  { site: 'Zone B - Junction', required: 8, available: 5, category: 'Fiber Splicers', impact: 'Critical' },
                  { site: 'CCC Building', required: 12, available: 9, category: 'Engineers', impact: 'Medium' },
                  { site: 'Zone C - Market', required: 10, available: 8, category: 'Helpers', impact: 'Low' },
                ].map((row, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="py-3 font-medium text-gray-900">{row.site}</td>
                    <td className="py-3 text-gray-600">{row.required}</td>
                    <td className="py-3 text-gray-600">{row.available}</td>
                    <td className="py-3 text-red-600 font-semibold">{row.required - row.available}</td>
                    <td className="py-3 text-gray-600">{row.category}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        row.impact === 'Critical' ? 'bg-red-100 text-red-600' :
                        row.impact === 'High' ? 'bg-orange-100 text-orange-600' :
                        row.impact === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-green-100 text-green-600'
                      }`}>{row.impact}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    amber: 'bg-amber-50 text-amber-600',
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
