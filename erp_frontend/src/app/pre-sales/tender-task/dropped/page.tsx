'use client';
import { useState, useEffect } from 'react';
import { Search, Filter, Download, ChevronDown, Calendar, Eye, XCircle, AlertTriangle, User, Building2, RefreshCw, FileText } from 'lucide-react';

interface Tender {
  name: string;
  tender_number?: string;
  title: string;
  client?: string;
  submission_date?: string;
  status?: string;
  estimated_value?: number;
  creation?: string;
  modified?: string;
}

export default function DroppedTenderPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'New' | 'Live' | 'Archive'>('Live');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetch('/api/tenders?status=DROPPED')
      .then(r => r.json())
      .then(res => setTenders(res.data || []))
      .catch(() => setTenders([]))
      .finally(() => setLoading(false));
  }, []);

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
              <p className="text-2xl font-bold text-gray-800">{tenders.length}</p>
              <p className="text-sm text-gray-500">Total Dropped</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Potential Value Lost</span>
            <span className="font-semibold text-red-600">{formatCurrency(tenders.reduce((s, t) => s + (t.estimated_value || 0), 0))}</span>
          </div>
        </div>

        {/* Placeholder for analytics (no backend API for drop reasons) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:col-span-2">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Drop Reasons Analysis</h3>
          <p className="text-sm text-gray-400">Detailed analytics will be available when drop reason tracking is implemented.</p>
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
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : tenders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No dropped tenders found</div>
          ) : tenders.map((tender) => (
            <div key={tender.name} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-blue-600">{tender.tender_number || tender.name}</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Dropped
                    </span>
                  </div>
                  <h3 className="text-gray-800 font-medium mb-1">{tender.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {tender.client || 'N/A'}
                    </span>
                    {tender.modified && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Dropped: {formatDate(tender.modified)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Estimated Value</p>
                    <p className="text-lg font-semibold text-gray-400 line-through">{formatCurrency(tender.estimated_value || 0)}</p>
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
