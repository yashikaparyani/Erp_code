'use client';
import { useState } from 'react';
import { Search, Filter, Download, ChevronDown, Calendar, Eye, Edit2, MoreVertical, FileText, Clock, User, AlertCircle, ArrowRight } from 'lucide-react';

interface Tender {
  id: string;
  tenderNo: string;
  title: string;
  client: string;
  submissionDate: string;
  daysLeft: number;
  stage: string;
  assignee: string;
  value: number;
  progress: number;
}

const mockTenders: Tender[] = [
  {
    id: '1',
    tenderNo: 'TEN-2026-001',
    title: 'Smart City Surveillance System - Phase II',
    client: 'Indore Municipal Corporation',
    submissionDate: '2026-03-25',
    daysLeft: 16,
    stage: 'Technical Evaluation',
    assignee: 'Rahul Sharma',
    value: 45000000,
    progress: 65,
  },
  {
    id: '2',
    tenderNo: 'TEN-2026-004',
    title: 'Highway Toll Management System',
    client: 'NHAI',
    submissionDate: '2026-03-30',
    daysLeft: 21,
    stage: 'Document Preparation',
    assignee: 'Priya Singh',
    value: 82000000,
    progress: 40,
  },
  {
    id: '3',
    tenderNo: 'TEN-2026-005',
    title: 'Enterprise Resource Planning Implementation',
    client: 'ONGC',
    submissionDate: '2026-04-05',
    daysLeft: 27,
    stage: 'BOQ Preparation',
    assignee: 'Amit Kumar',
    value: 35000000,
    progress: 25,
  },
];

export default function InProcessTenderPage() {
  const [activeTab, setActiveTab] = useState<'New' | 'Live' | 'Archive'>('Live');
  const [showFilters, setShowFilters] = useState(false);

  const tabs = [
    { name: 'New', count: 3 },
    { name: 'Live', count: 8 },
    { name: 'Archive', count: 22 },
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

  const getDaysLeftColor = (days: number) => {
    if (days <= 7) return 'text-red-600 bg-red-50';
    if (days <= 14) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">In-Process Tender</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Tenders currently being processed</p>
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
                <label className="block text-xs text-gray-500 mb-1">Stage</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Stages</option>
                  <option value="technical">Technical Evaluation</option>
                  <option value="document">Document Preparation</option>
                  <option value="boq">BOQ Preparation</option>
                  <option value="review">Final Review</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Assignee</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Assignees</option>
                  <option value="rahul">Rahul Sharma</option>
                  <option value="priya">Priya Singh</option>
                  <option value="amit">Amit Kumar</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Due Date</label>
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
            <option value="date">Date</option>
            <option value="progress">Progress</option>
          </select>
          <button className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Tender List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="divide-y divide-gray-100">
          {mockTenders.map((tender) => (
            <div key={tender.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-blue-600">{tender.tenderNo}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getDaysLeftColor(tender.daysLeft)}`}>
                      {tender.daysLeft} days left
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {tender.stage}
                    </span>
                  </div>
                  <h3 className="text-gray-800 font-medium mb-1">{tender.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {tender.client}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Due: {formatDate(tender.submissionDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      Assignee: {tender.assignee}
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${tender.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600">{tender.progress}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Estimated Value</p>
                    <p className="text-lg font-semibold text-gray-800">{formatCurrency(tender.value)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-2 hover:bg-gray-100 rounded-lg" title="View">
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button className="p-2 hover:bg-blue-100 rounded-lg" title="Move to Next Stage">
                      <ArrowRight className="w-4 h-4 text-blue-500" />
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
