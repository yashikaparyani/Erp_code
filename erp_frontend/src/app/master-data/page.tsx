'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users2, Package, Plus, Edit, Trash2, RefreshCw, Search, Check, Loader2 } from 'lucide-react';
import ModalFrame from '@/components/ui/ModalFrame';

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

<<<<<<< HEAD
type TabType = 'clients' | 'vendors';
=======
interface Organization {
  name: string;
  organization_name?: string;
  active?: number;
}

type TabType = 'clients' | 'vendors' | 'organizations';
type EditableRecord = Party | Organization;
>>>>>>> 41b381c (improved ui)

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<TabType>('clients');
  const [clients, setClients] = useState<Party[]>([]);
  const [vendors, setVendors] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageError, setPageError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
<<<<<<< HEAD
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [editForm, setEditForm] = useState({ party_name: '', gstin: '', phone: '', email: '', city: '' });
=======
  const [editState, setEditState] = useState<{ item: Party; name: string } | null>(null);
  const [deleteState, setDeleteState] = useState<Party | null>(null);
>>>>>>> 41b381c (improved ui)
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
    party_type: 'CLIENT',
  });

  useEffect(() => {
    void fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    setPageError('');
    try {
      const [clientsRes, vendorsRes] = await Promise.all([
        fetch('/api/parties?type=CLIENT'),
<<<<<<< HEAD
        fetch('/api/parties?type=VENDOR')
=======
        fetch('/api/parties?type=VENDOR'),
        fetch('/api/organizations'),
>>>>>>> 41b381c (improved ui)
      ]);

      const clientsData = await clientsRes.json();
      const vendorsData = await vendorsRes.json();
<<<<<<< HEAD
      
=======
      const organizationsData = await organizationsRes.json();

>>>>>>> 41b381c (improved ui)
      if (clientsData.success) setClients(clientsData.data);
      if (vendorsData.success) setVendors(vendorsData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setPageError(error instanceof Error ? error.message : 'Failed to fetch master data');
    } finally {
      setIsLoading(false);
    }
  };

<<<<<<< HEAD
  const handleCreateSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
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
      
      const response = await fetch('/api/parties', {
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

=======
>>>>>>> 41b381c (improved ui)
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
      party_type: 'CLIENT',
    });
  };

<<<<<<< HEAD
  const handleEditParty = async () => {
    if (!editingParty) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/ops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method: 'update_party', args: { name: editingParty.name, ...editForm } }) });
      if (res.ok) { setEditingParty(null); fetchAllData(); }
    } catch (e) { console.error('Edit failed:', e); }
    setIsSubmitting(false);
  };

  const handleDeleteParty = async (party: Party) => {
    if (!confirm(`Delete "${party.party_name}"? This cannot be undone.`)) return;
    try {
      await fetch('/api/ops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method: 'delete_party', args: { name: party.name } }) });
      fetchAllData();
    } catch (e) { console.error('Delete failed:', e); }
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
      default:
        return [];
=======
  const handleCreateSubmit = async () => {
    if (!formData.name.trim()) {
      setPageError('Name is required.');
      return;
    }

    setIsSubmitting(true);
    setPageError('');
    try {
      const payload = activeTab === 'organizations'
        ? {
            organization_name: formData.name,
            active: 1,
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
            pincode: formData.pincode,
          };

      const response = await fetch(activeTab === 'organizations' ? '/api/organizations' : '/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to create record');
      }

      setShowCreateModal(false);
      resetForm();
      await fetchAllData();
    } catch (error) {
      console.error('Error creating:', error);
      setPageError(error instanceof Error ? error.message : 'Failed to create record');
    } finally {
      setIsSubmitting(false);
>>>>>>> 41b381c (improved ui)
    }
  };

  const getTabData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'clients':
        return clients.filter((c) => c.party_name.toLowerCase().includes(term) || c.city?.toLowerCase().includes(term));
      case 'vendors':
        return vendors.filter((v) => v.party_name.toLowerCase().includes(term) || v.city?.toLowerCase().includes(term));
      case 'organizations':
        return organizations.filter((org) => (org.organization_name || org.name || '').toLowerCase().includes(term));
      default:
        return [];
    }
  }, [activeTab, clients, organizations, searchTerm, vendors]);

  const getTabTitle = () => {
    switch (activeTab) {
<<<<<<< HEAD
      case 'clients': return 'Client';
      case 'vendors': return 'Vendor';
=======
      case 'clients':
        return 'Client';
      case 'vendors':
        return 'Vendor';
      case 'organizations':
        return 'Organization';
>>>>>>> 41b381c (improved ui)
    }
  };

  const tabs = [
    { id: 'clients' as TabType, label: 'Clients', count: clients.length, icon: Users2 },
    { id: 'vendors' as TabType, label: 'Vendors', count: vendors.length, icon: Package },
  ];

<<<<<<< HEAD
=======
  const openEdit = (item: EditableRecord) => {
    if (activeTab === 'organizations') return;
    const party = item as Party;
    setEditState({ item: party, name: party.party_name || party.name });
  };

  const handleEdit = async () => {
    if (!editState?.name.trim()) {
      setPageError('Updated name is required.');
      return;
    }
    setIsSubmitting(true);
    setPageError('');
    try {
      const response = await fetch('/api/parties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editState.item.name, party_name: editState.name.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update');
      }
      setEditState(null);
      await fetchAllData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteState) return;
    setIsSubmitting(true);
    setPageError('');
    try {
      const response = await fetch(`/api/parties?name=${encodeURIComponent(deleteState.name)}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete');
      }
      setDeleteState(null);
      await fetchAllData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to delete');
    } finally {
      setIsSubmitting(false);
    }
  };

>>>>>>> 41b381c (improved ui)
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Master Data</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage clients, vendors and other master data</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => void fetchAllData()} disabled={isLoading} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Add {getTabTitle()}
          </button>
        </div>
      </div>

      {pageError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</div>
      ) : null}

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-blue-200' : 'bg-gray-100'}`}>{tab.count}</span>
            </button>
          );
        })}
      </div>

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

      <div className="card">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-500">Loading...</span>
            </div>
          ) : getTabData.length === 0 ? (
            <div className="text-center py-12">
              <Users2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No {activeTab} found</p>
              <button onClick={() => setShowCreateModal(true)} className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium">
                + Add your first {getTabTitle()?.toLowerCase()}
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>GSTIN</th>
                  <th>City</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
<<<<<<< HEAD
                {getTabData().map((item: any) => (
                  <tr key={item.name}>
                    <td className="font-medium text-gray-900">{item.party_name}</td>
                    <td>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.party_type === 'CLIENT' 
                          ? 'bg-green-100 text-green-700'
                          : item.party_type === 'VENDOR'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.party_type}
                      </span>
                    </td>
                    <td className="text-gray-600">{item.gstin || '-'}</td>
                    <td className="text-gray-600">{item.city || '-'}</td>
                    <td className="text-gray-600">{item.phone || '-'}</td>
                    <td>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingParty(item); setEditForm({ party_name: item.party_name, gstin: item.gstin || '', phone: item.phone || '', email: item.email || '', city: item.city || '' }); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteParty(item)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
=======
                {getTabData.map((item: EditableRecord) => {
                  const isOrganization = activeTab === 'organizations';
                  const label = (item as Party).party_name || (item as Organization).organization_name || item.name;
                  return (
                    <tr key={item.name}>
                      <td className="font-medium text-gray-900">{label}</td>
                      <td>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          isOrganization ? 'bg-blue-100 text-blue-700' : (item as Party).party_type === 'CLIENT' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {isOrganization ? 'ORGANIZATION' : (item as Party).party_type}
                        </span>
                      </td>
                      <td className="text-gray-600">{(item as Party).gstin || item.name || '-'}</td>
                      <td className="text-gray-600">{(item as Party).city || '-'}</td>
                      <td className="text-gray-600">{isOrganization ? (item.active ? 'Active' : 'Inactive') : ((item as Party).phone || '-')}</td>
                      <td>
                        <span className={`px-2 py-1 text-xs rounded-full ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {item.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {isOrganization ? (
                          <span className="text-xs font-medium text-gray-400">Managed via backend sync</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" onClick={() => openEdit(item)}>
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" onClick={() => setDeleteState(item as Party)}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
>>>>>>> 41b381c (improved ui)
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ModalFrame
        open={showCreateModal}
        title={`Add New ${getTabTitle()}`}
        onClose={() => setShowCreateModal(false)}
        footer={
          <>
            <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={() => void handleCreateSubmit()} disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Create {getTabTitle()}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {activeTab === 'organizations' ? 'Organization Name' : 'Party Name'} <span className="text-red-500">*</span>
            </label>
            <input type="text" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} placeholder="Enter name" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {activeTab !== 'organizations' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input type="text" value={formData.gstin} onChange={(e) => setFormData((prev) => ({ ...prev, gstin: e.target.value }))} placeholder="23AAAAA0000A1Z5" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                  <input type="text" value={formData.pan} onChange={(e) => setFormData((prev) => ({ ...prev, pan: e.target.value }))} placeholder="AAAAA0000A" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} placeholder="9876543210" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} placeholder="info@company.com" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea value={formData.address} onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))} placeholder="Street address" rows={2} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input type="text" value={formData.city} onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))} placeholder="Indore" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input type="text" value={formData.state} onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))} placeholder="Madhya Pradesh" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                  <input type="text" value={formData.pincode} onChange={(e) => setFormData((prev) => ({ ...prev, pincode: e.target.value }))} placeholder="452001" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-700">
              Organization records can be created here. Edit and delete stay hidden until backend support is available.
            </div>
          )}
        </div>
<<<<<<< HEAD
      )}

      {/* Edit Modal */}
      {editingParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingParty(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900">Edit Party</h2>
              <button onClick={() => setEditingParty(null)} className="p-2 hover:bg-gray-200 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Party Name</label>
                <input type="text" value={editForm.party_name} onChange={(e) => setEditForm(p => ({ ...p, party_name: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label><input type="text" value={editForm.gstin} onChange={(e) => setEditForm(p => ({ ...p, gstin: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="text" value={editForm.phone} onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={editForm.email} onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">City</label><input type="text" value={editForm.city} onChange={(e) => setEditForm(p => ({ ...p, city: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button onClick={() => setEditingParty(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleEditParty} disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
=======
      </ModalFrame>

      <ModalFrame
        open={Boolean(editState)}
        title="Update Party"
        onClose={() => setEditState(null)}
        widthClassName="max-w-lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditState(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={isSubmitting} onClick={() => void handleEdit()}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Party Name</label>
          <input
            className="input"
            value={editState?.name || ''}
            onChange={(e) => setEditState((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
          />
        </div>
      </ModalFrame>

      <ModalFrame
        open={Boolean(deleteState)}
        title="Delete Party"
        onClose={() => setDeleteState(null)}
        widthClassName="max-w-lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeleteState(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={isSubmitting} onClick={() => void handleDelete()}>
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Delete <span className="font-semibold text-gray-900">{deleteState?.party_name || deleteState?.name}</span> from master data?
        </p>
      </ModalFrame>
>>>>>>> 41b381c (improved ui)
    </div>
  );
}
