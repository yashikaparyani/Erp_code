'use client';
import { FileText, Download, Calendar, AlertTriangle, IndianRupee, Users, MapPin, Package, Target } from 'lucide-react';

const availableReports = [
  {
    icon: AlertTriangle,
    title: 'SLA Breach Report',
    description: 'Detailed report of SLA breaches and tickets',
    color: 'text-red-600',
    bg: 'bg-red-100',
  },
  {
    icon: IndianRupee,
    title: 'Budget Deviation Report',
    description: 'Budget vs actual spending analysis',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  {
    icon: Users,
    title: 'Vendor Performance Report',
    description: 'Vendor ratings and delivery metrics',
    color: 'text-purple-600',
    bg: 'bg-purple-100',
  },
  {
    icon: MapPin,
    title: 'Site Progress Report',
    description: 'Physical and financial progress by site',
    color: 'text-green-600',
    bg: 'bg-green-100',
  },
  {
    icon: Package,
    title: 'Inventory Status Report',
    description: 'Current stock levels and valuation',
    color: 'text-orange-600',
    bg: 'bg-orange-100',
  },
  {
    icon: Target,
    title: 'Milestone Tracking Report',
    description: 'Project milestone achievement status',
    color: 'text-cyan-600',
    bg: 'bg-cyan-100',
  },
];

const recentReports = [
  {
    name: 'SLA Breach Report - January 2026',
    generatedBy: 'Rajesh Kumar',
    date: 'Feb 10, 2026',
    format: 'PDF',
  },
  {
    name: 'Budget Deviation Report - Q3 FY26',
    generatedBy: 'Suresh Kumar',
    date: 'Feb 08, 2026',
    format: 'Excel',
  },
  {
    name: 'Vendor Performance Report - 2025',
    generatedBy: 'Priya Sharma',
    date: 'Feb 05, 2026',
    format: 'PDF',
  },
];

export default function ReportsPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Generate and download project reports</p>
      </div>

      {/* Report Builder */}
      <div className="card mb-4 sm:mb-6">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Report Builder</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Report Type</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>SLA Breach Report</option>
                <option>Budget Deviation Report</option>
                <option>Vendor Performance Report</option>
                <option>Site Progress Report</option>
                <option>Inventory Status Report</option>
                <option>Milestone Tracking Report</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Indore Smart City Surveillance Phase II</option>
                <option>All Projects</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="flex gap-2">
                <input type="text" placeholder="dd-mm-yyyy" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" placeholder="dd-mm-yyyy" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1">
                <FileText className="w-4 h-4" />
                Download PDF
              </button>
              <button className="btn btn-secondary flex-1">
                <Download className="w-4 h-4" />
                Download Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Available Reports */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Available Reports</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableReports.map((report, idx) => {
              const Icon = report.icon;
              return (
                <div key={idx} className="flex items-start gap-4 p-4 border border-gray-100 rounded-lg hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${report.bg}`}>
                    <Icon className={`w-5 h-5 ${report.color}`} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{report.title}</div>
                    <div className="text-sm text-gray-500">{report.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recently Generated */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Recently Generated</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Report Name</th>
                <th>Generated By</th>
                <th>Date</th>
                <th>Format</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.map((report, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="font-medium text-gray-900">{report.name}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{report.generatedBy}</div>
                  </td>
                  <td>
                    <div className="text-gray-600">{report.date}</div>
                  </td>
                  <td>
                    <span className={`badge ${report.format === 'PDF' ? 'badge-error' : 'badge-success'}`}>
                      {report.format}
                    </span>
                  </td>
                  <td>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                      <Download className="w-4 h-4" />
                      Download
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