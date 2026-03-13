'use client';
import { FileText, BarChart3, CheckCircle, ClipboardCheck, Truck, IndianRupee, Calendar, CreditCard, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export default function ProcurementDashboard() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Procurement Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Indents, quotations, POs & delivery tracking • Last updated: Mar 10, 2026 10:45 AM</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
        <SummaryCard title="Pending Indents" value="32" change="8 urgent" trend="down" icon={FileText} color="blue" />
        <SummaryCard title="Comparison Sheets" value="14" change="5 ready" icon={BarChart3} color="purple" />
        <SummaryCard title="3-Quote Compliance" value="92%" change="+3% this week" trend="up" icon={CheckCircle} color="green" />
        <SummaryCard title="PO Approval Queue" value="18" change="₹2.4 Cr value" icon={ClipboardCheck} color="orange" />
        <SummaryCard title="In Transit" value="24" change="8 delayed" trend="down" icon={Truck} color="cyan" />
        <SummaryCard title="Payment Dues" value="₹8.2 Cr" change="12 vendors" icon={IndianRupee} color="red" />
        <SummaryCard title="Advance Required" value="₹1.8 Cr" change="6 POs" icon={CreditCard} color="amber" />
        <SummaryCard title="PDC Pending" value="8" change="₹3.2 Cr" icon={Calendar} color="pink" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pending Indents */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Pending Indents
            </h3>
            <span className="text-sm text-gray-500">32 total</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {[
                { id: 'IND-2026-0298', item: 'PTZ Cameras 2MP', qty: 50, site: 'Zone A', priority: 'Urgent', days: 5 },
                { id: 'IND-2026-0297', item: '24-Core Fiber Cable', qty: '8000m', site: 'Zone B', priority: 'High', days: 3 },
                { id: 'IND-2026-0296', item: 'Network Switches 48P', qty: 15, site: 'CCC', priority: 'Medium', days: 7 },
                { id: 'IND-2026-0295', item: 'UPS 5KVA Online', qty: 10, site: 'Zone C', priority: 'Urgent', days: 2 },
                { id: 'IND-2026-0294', item: 'Junction Boxes IP66', qty: 200, site: 'Multiple', priority: 'Low', days: 10 },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-600 font-medium">{item.id}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        item.priority === 'Urgent' ? 'bg-red-100 text-red-600' :
                        item.priority === 'High' ? 'bg-orange-100 text-orange-600' :
                        item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>{item.priority}</span>
                    </div>
                    <p className="text-sm text-gray-900 mt-1">{item.item} × {item.qty}</p>
                    <p className="text-xs text-gray-500">{item.site}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs ${item.days <= 3 ? 'text-red-600' : 'text-gray-500'}`}>
                      {item.days} days pending
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              View All Indents →
            </button>
          </div>
        </div>

        {/* Comparison Sheets */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Comparison Sheets Status
            </h3>
            <span className="text-sm text-gray-500">14 in progress</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {[
                { id: 'CS-2026-0089', item: 'PTZ Cameras 2MP', quotes: 4, l1: 'Vendor A', savings: '12%', status: 'Ready' },
                { id: 'CS-2026-0088', item: 'Fiber Cable 24-Core', quotes: 3, l1: 'Vendor C', savings: '8%', status: 'Ready' },
                { id: 'CS-2026-0087', item: 'Network Switches', quotes: 2, l1: '-', savings: '-', status: 'Pending Quote' },
                { id: 'CS-2026-0086', item: 'Server Rack 42U', quotes: 3, l1: 'Vendor B', savings: '15%', status: 'Ready' },
                { id: 'CS-2026-0085', item: 'UPS Systems', quotes: 1, l1: '-', savings: '-', status: 'Pending Quote' },
              ].map((item) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-purple-600 font-medium">{item.id}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        item.status === 'Ready' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                      }`}>{item.status}</span>
                    </div>
                    <span className="text-xs text-gray-500">{item.quotes} quotes</span>
                  </div>
                  <p className="text-sm text-gray-900">{item.item}</p>
                  {item.l1 !== '-' && (
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-gray-500">L1: <strong className="text-gray-900">{item.l1}</strong></span>
                      <span className="text-green-600">Savings: {item.savings}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 3-Quotation Compliance */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              3-Quotation Compliance
            </h3>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                  <circle 
                    cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="12"
                    strokeDasharray={`${92 * 2.51} ${100 * 2.51}`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">92%</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Compliant POs</span>
                <span className="font-semibold text-green-600">184</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Non-Compliant</span>
                <span className="font-semibold text-red-600">16</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Exempted (Single Source)</span>
                <span className="font-semibold text-gray-600">8</span>
              </div>
            </div>
          </div>
        </div>

        {/* PO Approval Queue */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-orange-600" />
              PO Approval Queue
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {[
              { po: 'PO-2026-0456', vendor: 'ABC Electronics', amount: '₹48.5 L', level: 'Manager', days: 2 },
              { po: 'PO-2026-0455', vendor: 'XYZ Cables', amount: '₹32.0 L', level: 'Director', days: 3 },
              { po: 'PO-2026-0454', vendor: 'Tech Solutions', amount: '₹1.2 Cr', level: 'CFO', days: 1 },
              { po: 'PO-2026-0453', vendor: 'Civil Works', amount: '₹28.5 L', level: 'Manager', days: 4 },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-orange-600 font-medium">{item.po}</span>
                    <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-600 rounded-full">{item.level}</span>
                  </div>
                  <p className="text-sm text-gray-900 mt-1">{item.vendor}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{item.amount}</p>
                  <p className="text-xs text-gray-500">{item.days}d pending</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Tracking */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-cyan-600" />
              Delivery Tracking
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-cyan-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-cyan-600">24</p>
                <p className="text-xs text-gray-600">In Transit</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-red-600">8</p>
                <p className="text-xs text-gray-600">Delayed</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-green-600">156</p>
                <p className="text-xs text-gray-600">Delivered</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-orange-600">12</p>
                <p className="text-xs text-gray-600">Due Today</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { item: 'PTZ Cameras', eta: 'Mar 11', status: 'On Time' },
                { item: 'Fiber Cable', eta: 'Mar 12', status: 'Delayed' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-900">{item.item}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{item.eta}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      item.status === 'On Time' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Payment & Financial Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Dues */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-red-600" />
              Payment Dues
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {[
              { vendor: 'ABC Electronics', amount: '₹2.8 Cr', due: 'Overdue', days: 15 },
              { vendor: 'XYZ Cables Ltd', amount: '₹1.8 Cr', due: 'Due Today', days: 0 },
              { vendor: 'Tech Solutions', amount: '₹1.5 Cr', due: 'Due in 3 days', days: 3 },
              { vendor: 'Civil Works Co', amount: '₹2.1 Cr', due: 'Due in 7 days', days: 7 },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.vendor}</p>
                  <p className={`text-xs ${item.days === 0 ? 'text-orange-600' : item.days < 0 || item.due === 'Overdue' ? 'text-red-600' : 'text-gray-500'}`}>
                    {item.due}
                  </p>
                </div>
                <span className="font-semibold text-sm text-gray-900">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Advance Requirements */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-600" />
              Advance Requirements
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {[
              { po: 'PO-2026-0460', vendor: 'Import Tech', amount: '₹65 L', percent: '30%', status: 'Pending' },
              { po: 'PO-2026-0458', vendor: 'Overseas Supplies', amount: '₹48 L', percent: '25%', status: 'Processing' },
              { po: 'PO-2026-0455', vendor: 'Premium Cables', amount: '₹35 L', percent: '20%', status: 'Pending' },
              { po: 'PO-2026-0452', vendor: 'Speciality Items', amount: '₹32 L', percent: '50%', status: 'Approved' },
            ].map((item, idx) => (
              <div key={idx} className="p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-amber-600 font-medium">{item.po}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.status === 'Approved' ? 'bg-green-100 text-green-600' :
                    item.status === 'Processing' ? 'bg-blue-100 text-blue-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>{item.status}</span>
                </div>
                <p className="text-sm text-gray-900">{item.vendor}</p>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-gray-500">{item.percent} advance</span>
                  <span className="font-semibold text-gray-900">{item.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PDC Requirements */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-pink-600" />
              PDC Requirements
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {[
              { vendor: 'ABC Electronics', cheques: 3, total: '₹1.2 Cr', nextDate: 'Mar 15' },
              { vendor: 'XYZ Cables', cheques: 2, total: '₹85 L', nextDate: 'Mar 20' },
              { vendor: 'Tech Solutions', cheques: 4, total: '₹1.8 Cr', nextDate: 'Mar 25' },
              { vendor: 'Civil Works', cheques: 2, total: '₹45 L', nextDate: 'Apr 01' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.vendor}</p>
                  <p className="text-xs text-gray-500">{item.cheques} cheques | Next: {item.nextDate}</p>
                </div>
                <span className="font-semibold text-sm text-pink-600">{item.total}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total PDC Value</span>
                <span className="font-bold text-gray-900">₹4.3 Cr</span>
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
    cyan: 'bg-cyan-50 text-cyan-600',
    amber: 'bg-amber-50 text-amber-600',
    pink: 'bg-pink-50 text-pink-600',
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
