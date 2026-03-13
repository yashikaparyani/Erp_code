'use client';
import { Ticket, Clock, AlertTriangle, RefreshCw, TrendingUp, TrendingDown, Timer, CheckCircle, XCircle, Package } from 'lucide-react';

export default function OMDashboard() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">O&M Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Ticket management, SLA tracking & RMA • Last updated: Mar 10, 2026 10:45 AM</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <SummaryCard title="Open Tickets" value="42" change="8 critical" trend="down" icon={Ticket} color="blue" />
        <SummaryCard title="SLA At Risk" value="6" change="<2 hrs left" trend="down" icon={Clock} color="red" />
        <SummaryCard title="SLA Compliance" value="97.2%" change="+0.5% today" trend="up" icon={CheckCircle} color="green" />
        <SummaryCard title="Avg Resolution" value="4.2 hrs" change="-0.3 hrs" trend="up" icon={Timer} color="purple" />
        <SummaryCard title="RMA Pending" value="12" change="₹8.5 L value" icon={RefreshCw} color="orange" />
        <SummaryCard title="Breached Today" value="2" change="Escalated" trend="down" icon={XCircle} color="red" />
      </div>

      {/* Ticket Queue with SLA Timer */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-blue-600" />
            Ticket Queue
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Critical: 8</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded-full"></span> High: 14</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-full"></span> Medium: 12</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Low: 8</span>
          </div>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="pb-3 font-medium">Ticket ID</th>
                  <th className="pb-3 font-medium">Issue</th>
                  <th className="pb-3 font-medium">Site</th>
                  <th className="pb-3 font-medium">Priority</th>
                  <th className="pb-3 font-medium">Assigned To</th>
                  <th className="pb-3 font-medium">SLA Timer</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { id: 'TKT-2026-1245', issue: 'Camera Offline - PTZ malfunction', site: 'Zone A - Site 23', priority: 'Critical', assignee: 'Amit K.', sla: '0:45', slaPercent: 85, status: 'In Progress' },
                  { id: 'TKT-2026-1244', issue: 'Network connectivity lost', site: 'Zone B - Junction 5', priority: 'Critical', assignee: 'Rahul S.', sla: '1:15', slaPercent: 70, status: 'In Progress' },
                  { id: 'TKT-2026-1243', issue: 'Storage server alert', site: 'CCC Building', priority: 'High', assignee: 'Vikash P.', sla: '2:30', slaPercent: 50, status: 'Assigned' },
                  { id: 'TKT-2026-1242', issue: 'Video feed quality degraded', site: 'Zone C - Market', priority: 'High', assignee: 'Neha G.', sla: '3:45', slaPercent: 35, status: 'Assigned' },
                  { id: 'TKT-2026-1241', issue: 'Power backup failure', site: 'Zone A - Site 45', priority: 'Critical', assignee: 'Priya M.', sla: '0:30', slaPercent: 92, status: 'In Progress' },
                  { id: 'TKT-2026-1240', issue: 'Fiber cut detected', site: 'Route B-5', priority: 'High', assignee: 'Amit K.', sla: '4:00', slaPercent: 30, status: 'Dispatched' },
                  { id: 'TKT-2026-1239', issue: 'Camera lens cleaning required', site: 'Zone B - Site 12', priority: 'Medium', assignee: 'Unassigned', sla: '5:30', slaPercent: 20, status: 'Open' },
                  { id: 'TKT-2026-1238', issue: 'NVR disk space warning', site: 'Zone A - Cluster 2', priority: 'Low', assignee: 'Rahul S.', sla: '8:00', slaPercent: 10, status: 'Scheduled' },
                ].map((row, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="py-3">
                      <span className="text-blue-600 font-medium">{row.id}</span>
                    </td>
                    <td className="py-3 text-gray-900 max-w-xs truncate">{row.issue}</td>
                    <td className="py-3 text-gray-600">{row.site}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        row.priority === 'Critical' ? 'bg-red-100 text-red-600' :
                        row.priority === 'High' ? 'bg-orange-100 text-orange-600' :
                        row.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-green-100 text-green-600'
                      }`}>{row.priority}</span>
                    </td>
                    <td className="py-3 text-gray-600">{row.assignee}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              row.slaPercent > 80 ? 'bg-red-500' :
                              row.slaPercent > 50 ? 'bg-orange-500' :
                              row.slaPercent > 25 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${row.slaPercent}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-mono ${
                          row.slaPercent > 80 ? 'text-red-600' :
                          row.slaPercent > 50 ? 'text-orange-600' :
                          'text-gray-600'
                        }`}>
                          {row.sla} left
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        row.status === 'In Progress' ? 'bg-blue-100 text-blue-600' :
                        row.status === 'Assigned' ? 'bg-purple-100 text-purple-600' :
                        row.status === 'Dispatched' ? 'bg-cyan-100 text-cyan-600' :
                        row.status === 'Scheduled' ? 'bg-gray-100 text-gray-600' :
                        'bg-yellow-100 text-yellow-600'
                      }`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* SLA Summary */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600" />
              SLA Performance
            </h3>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                  <circle 
                    cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="12"
                    strokeDasharray={`${97.2 * 2.51} ${100 * 2.51}`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">97.2%</span>
                  <span className="text-xs text-gray-500">Compliance</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tickets Resolved in SLA</span>
                <span className="font-semibold text-green-600">486</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">SLA Breached</span>
                <span className="font-semibold text-red-600">14</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Average Resolution Time</span>
                <span className="font-semibold text-gray-900">4.2 hrs</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Target SLA</span>
                <span className="font-semibold text-gray-900">99.5%</span>
              </div>
            </div>
          </div>
        </div>

        {/* SLA at Risk */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              SLA At Risk (&lt; 2 hrs)
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {[
              { id: 'TKT-2026-1245', site: 'Zone A - Site 23', issue: 'Camera Offline', remaining: '0:45', tech: 'Amit K.' },
              { id: 'TKT-2026-1244', site: 'Zone B - Junction 5', issue: 'Network Lost', remaining: '1:15', tech: 'Rahul S.' },
              { id: 'TKT-2026-1241', site: 'Zone A - Site 45', issue: 'Power Failure', remaining: '0:30', tech: 'Priya M.' },
              { id: 'TKT-2026-1250', site: 'Zone C - Market', issue: 'NVR Down', remaining: '1:45', tech: 'Vikash P.' },
            ].map((item, idx) => (
              <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-red-600 font-medium">{item.id}</span>
                  <span className="text-sm font-mono font-bold text-red-600 flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    {item.remaining}
                  </span>
                </div>
                <p className="text-sm text-gray-900">{item.issue}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{item.site}</span>
                  <span>{item.tech}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Resolved */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Recently Resolved
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {[
              { id: 'TKT-2026-1235', issue: 'Camera realignment', resolution: '2.5 hrs', sla: 'Met', tech: 'Amit K.' },
              { id: 'TKT-2026-1234', issue: 'Network switch replacement', resolution: '1.8 hrs', sla: 'Met', tech: 'Rahul S.' },
              { id: 'TKT-2026-1233', issue: 'Fiber splice repair', resolution: '3.2 hrs', sla: 'Met', tech: 'Team B' },
              { id: 'TKT-2026-1232', issue: 'UPS battery replacement', resolution: '5.5 hrs', sla: 'Breached', tech: 'Vikash P.' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-600 font-medium">{item.id}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      item.sla === 'Met' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>{item.sla}</span>
                  </div>
                  <p className="text-sm text-gray-900 mt-1">{item.issue}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{item.resolution}</p>
                  <p className="text-xs text-gray-500">{item.tech}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RMA Tracker */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-orange-600" />
            RMA Tracker
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">Total: <strong className="text-gray-900">12</strong></span>
            <span className="text-gray-500">Value: <strong className="text-orange-600">₹8.5 L</strong></span>
          </div>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="pb-3 font-medium">RMA ID</th>
                  <th className="pb-3 font-medium">Item</th>
                  <th className="pb-3 font-medium">Vendor</th>
                  <th className="pb-3 font-medium">Qty</th>
                  <th className="pb-3 font-medium">Value</th>
                  <th className="pb-3 font-medium">Initiated</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">ETA</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { id: 'RMA-2026-0089', item: 'PTZ Camera 2MP', vendor: 'ABC Electronics', qty: 5, value: '₹2.5 L', initiated: 'Feb 28', status: 'In Transit', eta: 'Mar 12' },
                  { id: 'RMA-2026-0088', item: 'Network Switch 24P', vendor: 'Tech Solutions', qty: 2, value: '₹1.8 L', initiated: 'Feb 25', status: 'At Vendor', eta: 'Mar 18' },
                  { id: 'RMA-2026-0087', item: 'NVR 32CH', vendor: 'Storage Systems', qty: 1, value: '₹2.2 L', initiated: 'Feb 20', status: 'Replacement Shipped', eta: 'Mar 10' },
                  { id: 'RMA-2026-0086', item: 'SFP Module', vendor: 'Network Parts', qty: 8, value: '₹0.8 L', initiated: 'Feb 15', status: 'Credit Note Issued', eta: '-' },
                  { id: 'RMA-2026-0085', item: 'Power Supply Unit', vendor: 'ABC Electronics', qty: 4, value: '₹1.2 L', initiated: 'Feb 10', status: 'Under Inspection', eta: 'Mar 20' },
                ].map((row, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="py-3">
                      <span className="text-orange-600 font-medium">{row.id}</span>
                    </td>
                    <td className="py-3 text-gray-900">{row.item}</td>
                    <td className="py-3 text-gray-600">{row.vendor}</td>
                    <td className="py-3 text-gray-600">{row.qty}</td>
                    <td className="py-3 font-semibold text-gray-900">{row.value}</td>
                    <td className="py-3 text-gray-600">{row.initiated}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        row.status === 'In Transit' ? 'bg-blue-100 text-blue-600' :
                        row.status === 'Replacement Shipped' ? 'bg-green-100 text-green-600' :
                        row.status === 'Credit Note Issued' ? 'bg-purple-100 text-purple-600' :
                        row.status === 'At Vendor' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>{row.status}</span>
                    </td>
                    <td className="py-3 text-gray-600">{row.eta}</td>
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
