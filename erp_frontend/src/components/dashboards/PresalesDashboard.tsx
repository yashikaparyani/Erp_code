'use client';
import { FileText, Calendar, ClipboardList, MapPin, CheckSquare, Wallet, TrendingUp, TrendingDown, Clock, AlertCircle } from 'lucide-react';

export default function PresalesDashboard() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Presales Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Tender tracking, submissions, and compliance overview • Last updated: Mar 10, 2026 10:45 AM</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <SummaryCard title="Active Tenders" value="18" change="+3 this week" trend="up" icon={FileText} color="blue" />
        <SummaryCard title="Submission Due" value="5" change="Next 7 days" trend="down" icon={Calendar} color="red" />
        <SummaryCard title="BOQ Ready" value="12" change="68% complete" icon={ClipboardList} color="green" />
        <SummaryCard title="Survey Pending" value="8" change="4 in progress" icon={MapPin} color="purple" />
        <SummaryCard title="Compliance Done" value="85%" change="+5% this week" trend="up" icon={CheckSquare} color="teal" />
        <SummaryCard title="EMD/PBG Active" value="₹4.2 Cr" change="14 active" icon={Wallet} color="orange" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Active Tenders */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Active Tenders
            </h3>
            <span className="text-sm text-gray-500">18 total</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {[
                { id: 'TND-2026-0089', title: 'Smart City Surveillance - Phase III', value: '₹45 Cr', stage: 'Technical', progress: 65 },
                { id: 'TND-2026-0088', title: 'Traffic Management System - Bhopal', value: '₹28 Cr', stage: 'BOQ', progress: 45 },
                { id: 'TND-2026-0087', title: 'CCTV Installation - Railway Station', value: '₹12 Cr', stage: 'Survey', progress: 30 },
                { id: 'TND-2026-0086', title: 'Data Center Infrastructure', value: '₹18 Cr', stage: 'Documentation', progress: 80 },
              ].map((item) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs text-blue-600 font-medium">{item.id}</span>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{item.title}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{item.value}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">{item.stage}</span>
                    <span className="text-gray-500">{item.progress}% complete</span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${item.progress}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              View All Tenders →
            </button>
          </div>
        </div>

        {/* Submission Deadlines */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-600" />
              Upcoming Submission Deadlines
            </h3>
            <span className="text-sm text-red-500 font-medium">5 this week</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {[
                { id: 'TND-2026-0089', title: 'Smart City Phase III', deadline: 'Mar 12', daysLeft: 2, status: 'Urgent' },
                { id: 'TND-2026-0085', title: 'Police Communication Network', deadline: 'Mar 14', daysLeft: 4, status: 'On Track' },
                { id: 'TND-2026-0084', title: 'Highway Surveillance', deadline: 'Mar 15', daysLeft: 5, status: 'On Track' },
                { id: 'TND-2026-0083', title: 'Municipal CCTV Project', deadline: 'Mar 17', daysLeft: 7, status: 'At Risk' },
                { id: 'TND-2026-0082', title: 'Airport Security System', deadline: 'Mar 20', daysLeft: 10, status: 'On Track' },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-600 font-medium">{item.id}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        item.status === 'Urgent' ? 'bg-red-100 text-red-600' :
                        item.status === 'At Risk' ? 'bg-orange-100 text-orange-600' :
                        'bg-green-100 text-green-600'
                      }`}>{item.status}</span>
                    </div>
                    <p className="text-sm text-gray-900 mt-1">{item.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{item.deadline}</p>
                    <p className={`text-xs ${item.daysLeft <= 3 ? 'text-red-600' : 'text-gray-500'}`}>
                      {item.daysLeft} days left
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* BOQ Readiness */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-green-600" />
              BOQ Readiness Status
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {[
                { tender: 'Smart City Phase III', items: 245, completed: 230, status: 'Ready' },
                { tender: 'Traffic Management', items: 180, completed: 145, status: 'In Progress' },
                { tender: 'Railway CCTV', items: 120, completed: 60, status: 'In Progress' },
                { tender: 'Data Center', items: 95, completed: 90, status: 'Ready' },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-900">{item.tender}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      item.status === 'Ready' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                    }`}>{item.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${item.status === 'Ready' ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${(item.completed / item.items) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">{item.completed}/{item.items}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Survey Status */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              Survey Status
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">24</p>
                <p className="text-xs text-gray-600">Completed</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">4</p>
                <p className="text-xs text-gray-600">In Progress</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-600">8</p>
                <p className="text-xs text-gray-600">Pending</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">2</p>
                <p className="text-xs text-gray-600">Blocked</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { site: 'Zone D Survey', surveyor: 'Amit K.', status: 'In Progress' },
                { site: 'Highway Route', surveyor: 'Rahul S.', status: 'Pending' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.site}</p>
                    <p className="text-xs text-gray-500">{item.surveyor}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.status === 'In Progress' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                  }`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compliance Checklist */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-teal-600" />
              Compliance Checklist
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {[
                { tender: 'Smart City Phase III', total: 25, done: 24, pending: ['GST Certificate'] },
                { tender: 'Traffic Management', total: 22, done: 18, pending: ['PAN Card', 'Bank Guarantee', 'Work Order Copy', 'Experience Certificate'] },
                { tender: 'Railway CCTV', total: 20, done: 15, pending: ['ISO Certificate', 'MSME', 'EMD Receipt', 'Technical Specs', 'Company Profile'] },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{item.tender}</span>
                    <span className="text-xs text-gray-500">{item.done}/{item.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full ${item.done === item.total ? 'bg-green-500' : 'bg-teal-500'}`}
                      style={{ width: `${(item.done / item.total) * 100}%` }}
                    ></div>
                  </div>
                  {item.pending.length > 0 && (
                    <p className="text-xs text-orange-600">
                      Pending: {item.pending.slice(0, 2).join(', ')}{item.pending.length > 2 ? ` +${item.pending.length - 2} more` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* EMD/PBG Tracker */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-orange-600" />
            EMD / PBG Tracker
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">Total Active: <strong className="text-gray-900">₹4.2 Cr</strong></span>
            <span className="text-gray-500">EMD: <strong className="text-blue-600">₹1.8 Cr</strong></span>
            <span className="text-gray-500">PBG: <strong className="text-green-600">₹2.4 Cr</strong></span>
          </div>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="pb-3 font-medium">Tender</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Bank</th>
                  <th className="pb-3 font-medium">Valid Till</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { tender: 'Smart City Phase III', type: 'EMD', amount: '₹45 L', bank: 'SBI', validTill: 'Jun 15, 2026', status: 'Active', daysLeft: 97 },
                  { tender: 'Traffic Management', type: 'PBG', amount: '₹1.2 Cr', bank: 'HDFC', validTill: 'Dec 20, 2026', status: 'Active', daysLeft: 285 },
                  { tender: 'Railway CCTV', type: 'EMD', amount: '₹25 L', bank: 'ICICI', validTill: 'Apr 10, 2026', status: 'Expiring Soon', daysLeft: 31 },
                  { tender: 'Data Center', type: 'PBG', amount: '₹80 L', bank: 'Axis', validTill: 'Sep 30, 2026', status: 'Active', daysLeft: 204 },
                  { tender: 'Highway Surveillance', type: 'EMD', amount: '₹35 L', bank: 'SBI', validTill: 'Mar 25, 2026', status: 'Expiring Soon', daysLeft: 15 },
                ].map((row, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="py-3 font-medium text-gray-900">{row.tender}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        row.type === 'EMD' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                      }`}>{row.type}</span>
                    </td>
                    <td className="py-3 font-semibold text-gray-900">{row.amount}</td>
                    <td className="py-3 text-gray-600">{row.bank}</td>
                    <td className="py-3 text-gray-600">{row.validTill}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          row.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                        }`}>{row.status}</span>
                        {row.daysLeft <= 30 && (
                          <span className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {row.daysLeft}d
                          </span>
                        )}
                      </div>
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
    teal: 'bg-teal-50 text-teal-600',
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
