'use client';
import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Download } from 'lucide-react';

export default function FinanceMISPage() {
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({
    tenderId: '',
    searchText: '',
    organizationName: '',
    requirement: '',
    requestFrom: '',
    requestTo: '',
    status: '',
    paymentMode: '',
    paymentDateFrom: '',
    paymentDateTo: '',
    favourOf: '',
    valueType: '',
    amount: '',
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    console.log('Searching with filters:', filters);
  };

  const handleClear = () => {
    setFilters({
      tenderId: '',
      searchText: '',
      organizationName: '',
      requirement: '',
      requestFrom: '',
      requestTo: '',
      status: '',
      paymentMode: '',
      paymentDateFrom: '',
      paymentDateTo: '',
      favourOf: '',
      valueType: '',
      amount: '',
    });
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Finance MIS</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Financial management information system reports</p>
      </div>

      {/* Search/Filter Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2 text-gray-600">
            <Search className="w-4 h-4" />
            <span className="font-medium">Search</span>
          </div>
          {showFilters ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        
        {showFilters && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
              {/* Row 1 */}
              <input
                type="text"
                placeholder="Tender Id"
                value={filters.tenderId}
                onChange={(e) => handleFilterChange('tenderId', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Search Text"
                value={filters.searchText}
                onChange={(e) => handleFilterChange('searchText', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filters.organizationName}
                onChange={(e) => handleFilterChange('organizationName', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
              >
                <option value="">Organization Name</option>
                <option value="org1">Organization 1</option>
                <option value="org2">Organization 2</option>
              </select>
              <select
                value={filters.requirement}
                onChange={(e) => handleFilterChange('requirement', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
              >
                <option value="">Select Requirement</option>
                <option value="emd">EMD</option>
                <option value="sd">Security Deposit</option>
                <option value="bg">Bank Guarantee</option>
                <option value="tender_fee">Tender Fee</option>
              </select>

              {/* Row 2 */}
              <select
                value={filters.requestFrom}
                onChange={(e) => handleFilterChange('requestFrom', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
              >
                <option value="">Select Request from</option>
                <option value="user1">User 1</option>
                <option value="user2">User 2</option>
              </select>
              <select
                value={filters.requestTo}
                onChange={(e) => handleFilterChange('requestTo', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
              >
                <option value="">Select Request To</option>
                <option value="finance">Finance Team</option>
                <option value="management">Management</option>
              </select>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
              >
                <option value="">Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={filters.paymentMode}
                onChange={(e) => handleFilterChange('paymentMode', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
              >
                <option value="">Payment mode</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="dd">Demand Draft</option>
                <option value="online">Online</option>
              </select>

              {/* Row 3 */}
              <input
                type="text"
                placeholder="Payment Date From"
                value={filters.paymentDateFrom}
                onChange={(e) => handleFilterChange('paymentDateFrom', e.target.value)}
                onFocus={(e) => (e.target.type = 'date')}
                onBlur={(e) => (e.target.type = 'text')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Payment Date To"
                value={filters.paymentDateTo}
                onChange={(e) => handleFilterChange('paymentDateTo', e.target.value)}
                onFocus={(e) => (e.target.type = 'date')}
                onBlur={(e) => (e.target.type = 'text')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Favour Of"
                value={filters.favourOf}
                onChange={(e) => handleFilterChange('favourOf', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <select
                  value={filters.valueType}
                  onChange={(e) => handleFilterChange('valueType', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
                >
                  <option value="">Select Value</option>
                  <option value="greater">Greater Than</option>
                  <option value="less">Less Than</option>
                  <option value="equal">Equal To</option>
                </select>
                <input
                  type="number"
                  placeholder="Amount"
                  value={filters.amount}
                  onChange={(e) => handleFilterChange('amount', e.target.value)}
                  className="w-24 sm:w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-[#1e6b87] text-white rounded-lg hover:bg-[#185a73] transition-colors text-sm font-medium"
              >
                Search
              </button>
              <button
                onClick={handleClear}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Empty State or Results would go here */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Use the search filters above to find finance records</p>
      </div>
    </div>
  );
}
