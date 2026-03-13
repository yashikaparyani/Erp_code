'use client';
import { useState } from 'react';
import { 
  Search, ChevronDown, ChevronUp, Download, Clock, MapPin, FileText 
} from 'lucide-react';

// Mock data for tender results
const mockResults = [
  {
    id: 15310628,
    value: 2.22,
    unit: 'Lacs',
    stage: 'AOC',
    referDocument: true,
    description: '432012910018: electrically operated doorbell, wall-mounted type ding dong bell working on single phase 230v ac, 50 hz. as per gem specification - 5116877-3070104764 confirming to...',
    organization: 'Western Railway',
    location: 'Mumbai, Maharashtra',
  },
  {
    id: 15334170,
    value: 1.12,
    unit: 'CR',
    stage: 'AOC',
    referDocument: true,
    description: '29500308: supply, installation, testing and commissioning of ip based video surveillance system for rolling stock of indian railways for wag-9hc, wap-7, wap-5 & wag-9hc twin locos consisting ...',
    organization: 'Chittaranjan Locomotive Works',
    location: 'Chittaranjan, West Bengal',
  },
  {
    id: 15334430,
    value: 1.49,
    unit: 'Lacs',
    stage: 'AOC',
    referDocument: true,
    description: '509041406069: portable data extractor specification as per annexure attached. make- hp, lenovo, dell or similar.',
    organization: 'Eastern Railway',
    location: 'Bardhaman, West Bengal',
  },
  {
    id: 15334891,
    value: 45.67,
    unit: 'Lacs',
    stage: 'LoI Issued',
    referDocument: true,
    description: '783921045: supply and installation of network switches and routers for smart city command center infrastructure upgrade project phase 3.',
    organization: 'Indore Smart City Development Corporation',
    location: 'Indore, Madhya Pradesh',
  },
  {
    id: 15335012,
    value: 8.92,
    unit: 'CR',
    stage: 'Work Order',
    referDocument: true,
    description: '456789012: design, supply, installation, testing and commissioning of integrated traffic management system including adaptive signal control.',
    organization: 'Bhopal Municipal Corporation',
    location: 'Bhopal, Madhya Pradesh',
  },
];

type TabType = 'fresh' | 'result';

export default function TenderResultPage() {
  const [activeTab, setActiveTab] = useState<TabType>('result');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
      default:
        return 'text-gray-600';
    }
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
        {mockResults.map((result, index) => (
          <div 
            key={result.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              {/* Left Content */}
              <div className="flex-1">
                {/* Header Row */}
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <span className="text-blue-600 font-semibold">
                    {index + 1} | ₹ {result.value.toFixed(2)} {result.unit}
                  </span>
                  <span className="text-gray-500 text-sm flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Refer Document
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-sm">
                    <span className="text-gray-500">Stage:</span>{' '}
                    <span className={`font-medium ${getStageColor(result.stage)}`}>
                      {result.stage}
                    </span>
                  </span>
                  <span className="text-blue-600 text-sm hover:underline cursor-pointer">
                    Refer To Document
                  </span>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                  {result.description}
                </p>

                {/* Location */}
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>{result.organization} - {result.location}</span>
                </div>
              </div>

              {/* Right Content */}
              <div className="text-right ml-4">
                <p className="text-gray-700 font-medium mb-4">Result ID- {result.id}</p>
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
