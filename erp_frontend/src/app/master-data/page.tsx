'use client';
import { useState, useEffect } from 'react';
import { 
  Users2, Package, Plus, Edit, Trash2, RefreshCw, 
  Search, X, Check, Loader2
} from 'lucide-react';

interface Party {
  name: string;
  party_name: string;
  party_type: string;
  gstin: string;
  phone: string;
  email: string;
  city: string;
  active: number;
}

interface Organization {
  name: string;
  organization_name?: string;
  active?: number;
}

type TabType = 'clients' | 'vendors' | 'organizations';

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<TabType>('clients');
  const [clients, setClients] = useState<Party[]>([]);
  const [vendors, setVendors] = useState<Party[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    gstin: '',
    pan: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    party_type: 'CLIENT'
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [clientsRes, vendorsRes, organizationsRes] = await Promise.all([
        fetch('/api/parties?type=CLIENT'),
        fetch('/api/parties?type=VENDOR'),
        fetch('/api/organizations')
      ]);
      
      const clientsData = await clientsRes.json();
      const vendorsData = await vendorsRes.json();
      const organizationsData = await organizationsRes.json();
      
      if (clientsData.success) setClients(clientsData.data);
      if (vendorsData.success) setVendors(vendorsData.data);
      if (organizationsData.success) setOrganizations(organizationsData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = activeTab === 'organizations'
        ? {
            organization_name: formData.name,
            active: 1
          }
        : {
            party_name: formData.name,
            party_type: activeTab === 'clients' ? 'CLIENT' : 'VENDOR',
            gstin: formData.gstin,
            pan: formData.pan,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode
          };
      
      const response = await fetch(activeTab === 'organizations' ? '/api/organizations' : '/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (result.success) {
        setShowCreateModal(false);
        resetForm();
        fetchAllData();
      } else {
        alert(result.message || 'Failed to create');
      }
    } catch (error) {
      console.error('Error creating:', error);
      alert('Failed to create. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      gstin: '',
      pan: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      party_type: 'CLIENT'
    });
  };

  const getTabData = () => {
    const term = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'clients':
        return clients.filter(c => 
          c.party_name.toLowerCase().includes(term) || 
          c.city?.toLowerCase().includes(term)
        );
      case 'vendors':
        return vendors.filter(v => 
          v.party_name.toLowerCase().includes(term) || 
          v.city?.toLowerCase().includes(term)
        );
      case 'organizations':
        return organizations.filter(org =>
          (org.organization_name || org.name || '').toLowerCase().includes(term)
        );
      default:
        return [];
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'clients': return 'Client';
      case 'vendors': return 'Vendor';
      case 'organizations': return 'Organization';
    }
  };

  const tabs = [
    { id: 'clients' as TabType, label: 'Clients', count: clients.length, icon: Users2 },
    { id: 'vendors' as TabType, label: 'Vendors', count: vendors.length, icon: Package },
    { id: 'organizations' as TabType, label: 'Organizations', count: organizations.length, icon: Users2 },
  ];

  const handleEdit = async (item: any) => {
    const nextName = prompt('Update name', item.party_name || item.organization_name || item.name);
    if (!nextName) return;
    if (activeTab === 'organizations') {
      alert('Organization edit backend is not available yet.');
      return;
    }
    const response = await fetch('/api/parties', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: item.name, party_name: nextName }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      alert(result.message || 'Failed to update');
      return;
    }
    fetchAllData();
  };

  const handleDelete = async (item: any) => {
    if (activeTab === 'organizations') {
      alert('Organization delete backend is not available yet.');
      return;
    }
    if (!confirm(`Delete ${item.party_name || item.name}?`)) return;
    const response = await fetch(`/api/parties?name=${encodeURIComponent(item.name)}`, { method: 'DELETE' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      alert(result.message || 'Failed to delete');
      return;
    }
    fetchAllData();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Master Data</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage clients, vendors and other master data</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchAllData}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add {getTabTitle()}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                isActive ? 'bg-blue-200' : 'bg-gray-100'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="card">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-500">Loading...</span>
            </div>
          ) : getTabData().length === 0 ? (
            <div className="text-center py-12">
              <Users2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No {activeTab} found</p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add your first {getTabTitle()?.toLowerCase()}
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>{activeTab === 'organizations' ? 'Code' : 'GSTIN'}</th>
                  <th>City</th>
                  <th>{activeTab === 'organizations' ? 'Status' : 'Phone'}</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getTabData().map((item: any) => (
                  <tr key={item.name}>
                    <td className="font-medium text-gray-900">{item.party_name || item.organization_name || item.name}</td>
                    <td>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        activeTab === 'organizations'
                          ? 'bg-blue-100 text-blue-700'
                          : item.party_type === 'CLIENT' 
                          ? 'bg-green-100 text-green-700'
                          : item.party_type === 'VENDOR'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {activeTab === 'organizations' ? 'ORGANIZATION' : item.party_type}
                      </span>
                    </td>
                    <td className="text-gray-600">{item.gstin || item.name || '-'}</td>
                    <td className="text-gray-600">{item.city || '-'}</td>
                    <td className="text-gray-600">{activeTab === 'organizations' ? (item.active ? 'Active' : 'Inactive') : (item.phone || '-')}</td>
                    <td>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" onClick={() => void handleEdit(item)}>
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" onClick={() => void handleDelete(item)}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900">Add New {getTabTitle()}</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 overflow-y-auto max-h-[60vh] space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Party Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Punjab Police"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData(prev => ({ ...prev, gstin: e.target.value }))}
                    placeholder="23AAAAA0000A1Z5"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                  <input
                    type="text"
                    value={formData.pan}
                    onChange={(e) => setFormData(prev => ({ ...prev, pan: e.target.value }))}
                    placeholder="AAAAA0000A"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="9876543210"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="info@company.com"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Indore"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="Madhya Pradesh"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                    placeholder="452001"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create {getTabTitle()}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
