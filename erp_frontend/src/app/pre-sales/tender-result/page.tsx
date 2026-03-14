'use client';
import { useEffect, useState } from 'react';
import { 
  Search, ChevronDown, ChevronUp, Download, Clock, MapPin, FileText 
} from 'lucide-react';

interface TenderResultRow {
  name: string;
  result_id: string;
  winning_amount: number;
  result_stage: string;
  reference_no: string;
  winner_company: string;
  tender: string;
  organization_name: string;
  site_location: string;
  publication_date: string;
}

type TabType = 'fresh' | 'result';

export default function TenderResultPage() {
  const [activeTab, setActiveTab] = useState<TabType>('result');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [results, setResults] = useState<TenderResultRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/tender-results');
        const payload = await response.json();
        if (payload.success) {
          setResults(payload.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch tender results:', error);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'fresh', label: 'Fresh Result' },
    { key: 'result', label: 'Tender Result', count: 52815 },
  ];

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'AOC':
        return 'text-blue-600';
      case 'LoI Issued':
        return 'text-green-600';
      case 'Work Order':
        return 'text-purple-600';
      case 'Technical Evaluation':
      case 'Financial Evaluation':
        return 'text-amber-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return '₹ 0';
    if (amount >= 10000000) return `₹ ${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹ ${(amount / 100000).toFixed(2)} Lacs`;
    return `₹ ${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Tender Result</h1>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Purnima Nigam</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border border-gray-200 rounded-lg mb-4 shadow-sm">
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-gray-600 hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span className="text-sm">Tender Filter</span>
          </div>
          {isFilterOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        
        {isFilterOpen && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Result ID / Tender ID</label>
                <input 
                  type="text" 
                  placeholder="Search by ID..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Organization</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>All Organizations</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Stage</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>All Stages</option>
                  <option>AOC</option>
                  <option>LoI Issued</option>
                  <option>Work Order</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Value Range</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Any Value</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md">
                Clear
              </button>
              <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Apply Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex justify-end mb-4">
        <button className="flex items-center gap-2 px-4 py-2 border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50 text-sm">
          <Download className="w-4 h-4" />
          Export To Excel
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.key 
                ? 'text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count && (
              <span className={`ml-1 ${activeTab === tab.key ? 'text-blue-600' : 'text-gray-400'}`}>
                ({tab.count.toLocaleString()})
              </span>
            )}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        ))}
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-500">
            Loading tender results...
          </div>
        ) : results.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-500">
            No tender results found.
          </div>
        ) : results.map((result, index) => (
          <div 
            key={result.name}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              {/* Left Content */}
              <div className="flex-1">
                {/* Header Row */}
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <span className="text-blue-600 font-semibold">
                    {index + 1} | {formatCurrency(result.winning_amount)}
                  </span>
                  <span className="text-gray-500 text-sm flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {result.publication_date || 'Refer Document'}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-sm">
                    <span className="text-gray-500">Stage:</span>{' '}
                    <span className={`font-medium ${getStageColor(result.result_stage)}`}>
                      {result.result_stage}
                    </span>
                  </span>
                  {result.reference_no ? (
                    <span className="text-blue-600 text-sm">
                      Ref: {result.reference_no}
                    </span>
                  ) : null}
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                  {result.winner_company
                    ? `Winner: ${result.winner_company}`
                    : result.tender
                      ? `Tender: ${result.tender}`
                      : 'No tender result summary available.'}
                </p>

                {/* Location */}
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>{result.organization_name || 'Unknown Organization'} - {result.site_location || 'Location not set'}</span>
                </div>
              </div>

              {/* Right Content */}
              <div className="text-right ml-4">
                <p className="text-gray-700 font-medium mb-4">Result ID- {result.result_id || result.name}</p>
                <div className="flex items-center gap-3 text-gray-400">
                  <button 
                    className="hover:text-blue-500 transition-colors"
                    title="View Document"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                  <span className="text-gray-200">|</span>
                  <button 
                    className="hover:text-blue-500 transition-colors"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-6">
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50">
            Previous
          </button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">1</button>
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50">2</button>
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50">3</button>
          <span className="text-gray-400">...</span>
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50">5282</button>
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
