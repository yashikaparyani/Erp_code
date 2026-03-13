'use client';
import { FileText, Clock, Percent, Receipt, AlertCircle, TrendingUp, TrendingDown, IndianRupee, Calendar, MinusCircle } from 'lucide-react';

export default function AccountsDashboard() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Accounts Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Billing, payments, retention & compliance • Last updated: Mar 10, 2026 10:45 AM</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <SummaryCard title="Pending Billing" value="₹12.4 Cr" change="18 invoices" icon={FileText} color="blue" />
        <SummaryCard title="Payment Aging" value="₹8.5 Cr" change="12 overdue" trend="down" icon={Clock} color="orange" />
        <SummaryCard title="Retention Held" value="₹4.2 Cr" change="5% of billing" icon={Percent} color="purple" />
        <SummaryCard title="GST Pending" value="24" change="₹1.8 Cr liability" icon={Receipt} color="green" />
        <SummaryCard title="TDS Entries" value="38" change="₹45 L deducted" icon={Receipt} color="cyan" />
        <SummaryCard title="Penalties" value="₹12.5 L" change="4 deductions" trend="down" icon={MinusCircle} color="red" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Billing Tracker */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Billing Tracker
            </h3>
            <span className="text-sm text-gray-500">₹12.4 Cr pending</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {[
                { invoice: 'INV-2026-0089', client: 'Indore Municipal Corp', amount: '₹4.2 Cr', milestone: 'Phase 2 Completion', status: 'Submitted', date: 'Mar 05' },
                { invoice: 'INV-2026-0088', client: 'MPSEDC', amount: '₹2.8 Cr', milestone: 'Fiber 50KM', status: 'Under Review', date: 'Mar 01' },
                { invoice: 'INV-2026-0087', client: 'Smart City SPV', amount: '₹3.2 Cr', milestone: 'CCC Integration', status: 'Approved', date: 'Feb 25' },
                { invoice: 'INV-2026-0086', client: 'Traffic Police', amount: '₹2.2 Cr', milestone: 'Zone A Complete', status: 'Payment Due', date: 'Feb 20' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-blue-600 font-medium">{item.invoice}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      item.status === 'Approved' ? 'bg-green-100 text-green-600' :
                      item.status === 'Payment Due' ? 'bg-orange-100 text-orange-600' :
                      item.status === 'Under Review' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>{item.status}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{item.client}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.milestone}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-semibold text-green-600">{item.amount}</span>
                    <span className="text-xs text-gray-500">{item.date}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              View All Invoices →
            </button>
          </div>
        </div>

        {/* Payment Aging */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Payment Aging Analysis
            </h3>
            <span className="text-sm text-red-500 font-medium">₹8.5 Cr overdue</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-green-600">₹2.1 Cr</p>
                <p className="text-xs text-gray-600">0-30 days</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-yellow-600">₹2.8 Cr</p>
                <p className="text-xs text-gray-600">31-60 days</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-orange-600">₹1.9 Cr</p>
                <p className="text-xs text-gray-600">61-90 days</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-red-600">₹1.7 Cr</p>
                <p className="text-xs text-gray-600">&gt;90 days</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { client: 'Indore Municipal Corp', amount: '₹2.4 Cr', days: 45, followUp: 'Mar 12' },
                { client: 'MPSEDC', amount: '₹1.8 Cr', days: 62, followUp: 'Mar 10' },
                { client: 'Smart City SPV', amount: '₹2.1 Cr', days: 38, followUp: 'Mar 15' },
                { client: 'Traffic Police', amount: '₹1.2 Cr', days: 95, followUp: 'Escalated' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.client}</p>
                    <p className={`text-xs ${item.days > 60 ? 'text-red-600' : 'text-gray-500'}`}>
                      {item.days} days overdue
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{item.amount}</p>
                    <p className="text-xs text-gray-500">F/U: {item.followUp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Retention */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Percent className="w-5 h-5 text-purple-600" />
              Retention Tracker
            </h3>
          </div>
          <div className="p-4">
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-purple-600">₹4.2 Cr</p>
              <p className="text-sm text-gray-500">Total Retention Held</p>
            </div>
            <div className="space-y-3">
              {[
                { project: 'Indore Smart City Phase II', retention: '₹2.1 Cr', release: 'Jun 2026' },
                { project: 'Bhopal Traffic System', retention: '₹1.2 Cr', release: 'Sep 2026' },
                { project: 'Gwalior Surveillance', retention: '₹0.9 Cr', release: 'Dec 2026' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{item.project}</span>
                    <span className="text-sm font-semibold text-purple-600">{item.retention}</span>
                  </div>
                  <p className="text-xs text-gray-500">Expected Release: {item.release}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* GST/TDS Entry */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-green-600" />
              GST / TDS Entries
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">GST Payable</p>
                <p className="text-xl font-bold text-green-600">₹1.8 Cr</p>
                <p className="text-xs text-gray-500 mt-1">24 entries pending</p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">TDS Deducted</p>
                <p className="text-xl font-bold text-cyan-600">₹45 L</p>
                <p className="text-xs text-gray-500 mt-1">38 certificates</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Pending GST Returns:</p>
              {[
                { period: 'Feb 2026 - GSTR-3B', due: 'Mar 20', amount: '₹62 L' },
                { period: 'Feb 2026 - GSTR-1', due: 'Mar 11', amount: '₹58 L' },
                { period: 'Jan 2026 - Reconciliation', due: 'Mar 15', amount: '-' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm text-gray-900">{item.period}</p>
                    <p className="text-xs text-gray-500">Due: {item.due}</p>
                  </div>
                  {item.amount !== '-' && (
                    <span className="text-sm font-semibold text-gray-900">{item.amount}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Penalty Deductions */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MinusCircle className="w-5 h-5 text-red-600" />
              Penalty Deductions
            </h3>
          </div>
          <div className="p-4">
            <div className="text-center mb-4 p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">₹12.5 L</p>
              <p className="text-sm text-gray-600">Total Penalties This Quarter</p>
            </div>
            <div className="space-y-3">
              {[
                { invoice: 'INV-2026-0082', reason: 'SLA Breach - Site 23', amount: '₹4.5 L', date: 'Feb 28' },
                { invoice: 'INV-2026-0078', reason: 'Delay Liquidation', amount: '₹3.8 L', date: 'Feb 15' },
                { invoice: 'INV-2026-0075', reason: 'Quality Issue - Cameras', amount: '₹2.5 L', date: 'Feb 05' },
                { invoice: 'INV-2026-0071', reason: 'Documentation Penalty', amount: '₹1.7 L', date: 'Jan 28' },
              ].map((item, idx) => (
                <div key={idx} className="p-2 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-red-600 font-medium">{item.invoice}</span>
                    <span className="text-sm font-semibold text-red-600">{item.amount}</span>
                  </div>
                  <p className="text-sm text-gray-900">{item.reason}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Monthly Financial Summary</h3>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="pb-3 font-medium">Month</th>
                  <th className="pb-3 font-medium">Billing</th>
                  <th className="pb-3 font-medium">Collection</th>
                  <th className="pb-3 font-medium">Outstanding</th>
                  <th className="pb-3 font-medium">GST Paid</th>
                  <th className="pb-3 font-medium">TDS</th>
                  <th className="pb-3 font-medium">Penalties</th>
                  <th className="pb-3 font-medium">Net</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { month: 'Mar 2026', billing: '₹8.2 Cr', collection: '₹5.4 Cr', outstanding: '₹2.8 Cr', gst: '₹65 L', tds: '₹18 L', penalty: '₹4.5 L', net: '₹4.5 Cr' },
                  { month: 'Feb 2026', billing: '₹7.8 Cr', collection: '₹6.2 Cr', outstanding: '₹1.6 Cr', gst: '₹58 L', tds: '₹15 L', penalty: '₹3.8 L', net: '₹5.3 Cr' },
                  { month: 'Jan 2026', billing: '₹6.5 Cr', collection: '₹5.8 Cr', outstanding: '₹0.7 Cr', gst: '₹52 L', tds: '₹12 L', penalty: '₹2.5 L', net: '₹5.0 Cr' },
                ].map((row, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="py-3 font-medium text-gray-900">{row.month}</td>
                    <td className="py-3 text-blue-600">{row.billing}</td>
                    <td className="py-3 text-green-600">{row.collection}</td>
                    <td className="py-3 text-orange-600">{row.outstanding}</td>
                    <td className="py-3 text-gray-600">{row.gst}</td>
                    <td className="py-3 text-gray-600">{row.tds}</td>
                    <td className="py-3 text-red-600">{row.penalty}</td>
                    <td className="py-3 font-semibold text-gray-900">{row.net}</td>
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
    cyan: 'bg-cyan-50 text-cyan-600',
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
