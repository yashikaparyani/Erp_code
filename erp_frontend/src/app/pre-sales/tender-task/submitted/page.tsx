'use client';
import { useState, useEffect } from 'react';
import { Search, Filter, Download, ChevronDown, Calendar, Eye, FileCheck, CheckCircle2, Clock, User, Building2, IndianRupee } from 'lucide-react';

interface Tender {
  name: string;
  tender_number?: string;
  title: string;
  client?: string;
  submission_date?: string;
  status?: string;
  estimated_value?: number;
  emd_amount?: number;
  creation?: string;
}

export default function SubmittedTenderPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'New' | 'Live' | 'Archive'>('Live');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetch('/api/tenders?status=SUBMITTED')
      .then(r => r.json())
      .then(res => setTenders(res.data || []))
      .catch(() => setTenders([]))
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { name: 'New', count: 0 },
    { name: 'Live', count: 15 },
    { name: 'Archive', count: 67 },
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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Submitted Tender</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Tenders that have been submitted and awaiting results</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{tenders.length}</p>
              <p className="text-sm text-gray-500">Total Submitted</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <IndianRupee className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(tenders.reduce((s, t) => s + (t.estimated_value || 0), 0))}</p>
              <p className="text-sm text-gray-500">Total Bid Value</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{tenders.length}</p>
              <p className="text-sm text-gray-500">Awaiting Result</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(tenders.reduce((s, t) => s + (t.emd_amount || 0), 0))}</p>
              <p className="text-sm text-gray-500">EMD Blocked</p>
            </div>
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
                <label className="block text-xs text-gray-500 mb-1">Client</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Clients</option>
                  <option value="sbi">State Bank of India</option>
                  <option value="bhel">BHEL</option>
                  <option value="lic">LIC</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Submitted By</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Users</option>
                  <option value="rahul">Rahul Sharma</option>
                  <option value="priya">Priya Singh</option>
                  <option value="amit">Amit Kumar</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Result Date</label>
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
            <option value="date">Submission Date</option>
            <option value="result">Result Date</option>
          </select>
          <button className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Submitted Tender List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : tenders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No submitted tenders found</div>
          ) : tenders.map((tender) => {
            return (
              <div key={tender.name} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-blue-600">{tender.tender_number || tender.name}</span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Submitted
                      </span>
                    </div>
                    <h3 className="text-gray-800 font-medium mb-1">{tender.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {tender.client || 'N/A'}
                      </span>
                      {tender.submission_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Submitted: {formatDate(tender.submission_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 ml-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Bid Amount</p>
                      <p className="text-lg font-semibold text-gray-800">{formatCurrency(tender.estimated_value || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">EMD</p>
                      <p className="text-sm font-medium text-gray-600">{formatCurrency(tender.emd_amount || 0)}</p>
                    </div>
                    <button className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
