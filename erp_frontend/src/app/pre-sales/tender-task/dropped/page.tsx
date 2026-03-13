'use client';
import { useState } from 'react';
import { Search, Filter, Download, ChevronDown, Calendar, Eye, XCircle, AlertTriangle, User, Building2, RefreshCw, FileText } from 'lucide-react';

interface DroppedTender {
  id: string;
  tenderNo: string;
  title: string;
  client: string;
  droppedDate: string;
  originalDeadline: string;
  reason: string;
  droppedBy: string;
  estimatedValue: number;
  stage: string;
}

const mockDroppedTenders: DroppedTender[] = [
  {
    id: '1',
    tenderNo: 'TEN-2026-008',
    title: 'Municipal Waste Management System',
    client: 'Bhopal Municipal Corporation',
    droppedDate: '2026-03-05',
    originalDeadline: '2026-03-15',
    reason: 'Budget constraints - EMD amount too high',
    droppedBy: 'Management Decision',
    estimatedValue: 65000000,
    stage: 'BOQ Preparation',
  },
  {
    id: '2',
    tenderNo: 'TEN-2026-009',
    title: 'Water Treatment Plant Automation',
    client: 'PHED Rajasthan',
    droppedDate: '2026-02-28',
    originalDeadline: '2026-03-20',
    reason: 'Technical requirements beyond scope',
    droppedBy: 'Technical Team',
    estimatedValue: 45000000,
    stage: 'Technical Evaluation',
  },
  {
    id: '3',
    tenderNo: 'TEN-2026-010',
    title: 'Hospital Information Management System',
    client: 'AIIMS Delhi',
    droppedDate: '2026-02-20',
    originalDeadline: '2026-03-10',
    reason: 'Competitor has OEM partnership advantage',
    droppedBy: 'Pre-Sales Team',
    estimatedValue: 32000000,
    stage: 'Competitor Analysis',
  },
  {
    id: '4',
    tenderNo: 'TEN-2026-011',
    title: 'Railway Station WiFi Infrastructure',
    client: 'Indian Railways',
    droppedDate: '2026-02-15',
    originalDeadline: '2026-02-25',
    reason: 'Insufficient time for bid preparation',
    droppedBy: 'Rahul Sharma',
    estimatedValue: 28000000,
    stage: 'Document Review',
  },
];

const dropReasons = [
  { reason: 'Budget constraints', count: 12, percentage: 35 },
  { reason: 'Technical mismatch', count: 8, percentage: 24 },
  { reason: 'Time constraints', count: 7, percentage: 21 },
  { reason: 'Competitive disadvantage', count: 5, percentage: 15 },
  { reason: 'Other', count: 2, percentage: 5 },
];

export default function DroppedTenderPage() {
  const [activeTab, setActiveTab] = useState<'New' | 'Live' | 'Archive'>('Live');
  const [showFilters, setShowFilters] = useState(false);

  const tabs = [
    { name: 'New', count: 0 },
    { name: 'Live', count: 34 },
    { name: 'Archive', count: 156 },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Dropped Tender</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Tenders that were dropped without submission</p>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Stats Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">34</p>
              <p className="text-sm text-gray-500">Total Dropped (This Year)</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Potential Value Lost</span>
            <span className="font-semibold text-red-600">₹45.2 Cr</span>
          </div>
        </div>

        {/* Drop Reasons Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:col-span-2">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Drop Reasons Analysis</h3>
          <div className="space-y-2">
            {dropReasons.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-32 text-xs text-gray-600 truncate">{item.reason}</div>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <div className="w-16 text-xs text-gray-600 text-right">
                  {item.count} ({item.percentage}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2 text-gray-600">
            <Search className="w-4 h-4" />
            <span>Tender Filter</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        
        {showFilters && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tender No</label>
                <input
                  type="text"
                  placeholder="Search tender number..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Drop Reason</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Reasons</option>
                  <option value="budget">Budget constraints</option>
                  <option value="technical">Technical mismatch</option>
                  <option value="time">Time constraints</option>
                  <option value="competitive">Competitive disadvantage</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dropped By</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All</option>
                  <option value="management">Management Decision</option>
                  <option value="technical">Technical Team</option>
                  <option value="presales">Pre-Sales Team</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date Range</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Clear Filters
              </button>
              <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Button */}
      <div className="flex justify-end mb-4">
        <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm">
          <Download className="w-4 h-4" />
          Export To Excel
        </button>
      </div>

      {/* Tabs and Sort */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.name
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none">
            <option value="value">Value</option>
            <option value="date">Drop Date</option>
            <option value="reason">Reason</option>
          </select>
          <button className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Dropped Tender List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="divide-y divide-gray-100">
          {mockDroppedTenders.map((tender) => (
            <div key={tender.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-blue-600">{tender.tenderNo}</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Dropped
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Stage: {tender.stage}
                    </span>
                  </div>
                  <h3 className="text-gray-800 font-medium mb-1">{tender.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {tender.client}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Dropped: {formatDate(tender.droppedDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      By: {tender.droppedBy}
                    </span>
                  </div>
                  {/* Reason */}
                  <div className="flex items-start gap-2 mt-2 p-2 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{tender.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Estimated Value</p>
                    <p className="text-lg font-semibold text-gray-400 line-through">{formatCurrency(tender.estimatedValue)}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button className="p-2 hover:bg-gray-100 rounded-lg" title="View Details">
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                    <button className="p-2 hover:bg-green-100 rounded-lg" title="Revive Tender">
                      <RefreshCw className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
