'use client';
import { useState, useEffect } from 'react';
import { 
  Search, ChevronDown, ChevronUp, Download, Eye, Heart, Clock, 
  User, MapPin, Filter, SortDesc 
} from 'lucide-react';

interface Tender {
  name: string;
  tender_number?: string;
  title: string;
  client?: string;
  organization?: string;
  submission_date?: string;
  status?: string;
  estimated_value?: number;
  emd_amount?: number;
  creation?: string;
}

type TabType = 'fresh' | 'live' | 'archive' | 'interested';

export default function TenderPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('value');
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/tenders')
      .then(r => r.json())
      .then(res => setTenders(res.data || []))
      .catch(() => setTenders([]))
      .finally(() => setLoading(false));
  }, []);

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'fresh', label: 'Fresh' },
    { key: 'live', label: 'Live', count: tenders.length },
    { key: 'archive', label: 'Archive' },
    { key: 'interested', label: 'Interested' },
  ];

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `\u20B9 ${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `\u20B9 ${(amount / 100000).toFixed(0)} Lacs`;
    }
    return `\u20B9 ${amount.toLocaleString('en-IN')}`;
  };

  const getDaysLeft = (dateStr?: string) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
                <label className="block text-xs text-gray-500 mb-1">Keyword</label>
                <input 
                  type="text" 
                  placeholder="Search tenders..."
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
                <label className="block text-xs text-gray-500 mb-1">State</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>All States</option>
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

      {/* Tabs and Sort */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-6 border-b border-gray-200">
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

        <div className="flex items-center gap-2">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="value">Value</option>
            <option value="date">Date</option>
            <option value="emd">EMD</option>
          </select>
          <button className="p-2 border border-gray-200 rounded-md hover:bg-gray-50">
            <SortDesc className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Tender List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading tenders...</div>
        ) : tenders.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No tenders found</div>
        ) : tenders.map((tender, index) => {
          const daysLeft = getDaysLeft(tender.submission_date);
          const isUrgent = daysLeft !== null && daysLeft <= 1;
          return (
          <div 
            key={tender.name}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              {/* Left Content */}
              <div className="flex-1">
                {/* Header Row */}
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <span className="text-blue-600 font-semibold">
                    {index + 1} | {formatCurrency(tender.estimated_value || 0)}
                  </span>
                  {tender.submission_date && (
                    <span className="text-gray-500 text-sm flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(tender.submission_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  )}
                  {daysLeft !== null && (
                    <span className={`text-sm font-medium ${isUrgent ? 'text-red-500' : 'text-blue-500'}`}>
                      {daysLeft <= 0 ? 'Ending Today' : `${daysLeft} Days Left`}
                    </span>
                  )}
                  {tender.emd_amount ? (
                    <span className="text-gray-600 text-sm">
                      EMD: <span className="text-blue-600 font-medium">{formatCurrency(tender.emd_amount)}</span>
                    </span>
                  ) : null}
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-2">
                  {tender.title}
                </p>

                {/* Status */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                  <span>
                    <span className="font-medium">Status:</span>{' '}
                    <span className="text-blue-600">{tender.status || 'N/A'}</span>
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>{tender.organization || tender.client || 'N/A'}</span>
                </div>
              </div>

              {/* Right Content */}
              <div className="text-right ml-4">
                <p className="text-gray-700 font-medium mb-4">{tender.tender_number || tender.name}</p>
                <div className="flex items-center gap-3 text-gray-400">
                  <button 
                    className="hover:text-blue-500 transition-colors"
                    title="View"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <span className="text-gray-200">|</span>
                  <button 
                    onClick={() => toggleFavorite(tender.name)}
                    className={`hover:text-red-500 transition-colors ${favorites.includes(tender.name) ? 'text-red-500' : ''}`}
                    title="Favorite"
                  >
                    <Heart className={`w-5 h-5 ${favorites.includes(tender.name) ? 'fill-current' : ''}`} />
                  </button>
                  <span className="text-gray-200">|</span>
                  <button className="hover:text-blue-500 transition-colors" title="History">
                    <Clock className="w-5 h-5" />
                  </button>
                  <span className="text-gray-200">|</span>
                  <button className="hover:text-blue-500 transition-colors" title="Assign">
                    <User className="w-5 h-5" />
                  </button>
                  <span className="text-gray-200">|</span>
                  <button className="hover:text-blue-500 transition-colors" title="Download">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Pagination placeholder */}
      <div className="flex justify-center mt-6">
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50">
            Previous
          </button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">1</button>
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50">2</button>
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50">3</button>
          <span className="text-gray-400">...</span>
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50">127</button>
          <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
