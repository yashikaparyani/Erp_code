'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, FileText, Calendar, Building2, DollarSign, Clock, 
  Edit, Trash2, RefreshCw, AlertCircle, CheckCircle, XCircle,
  Shield, CreditCard, User, MapPin, FileCheck, Loader2, X, Save, Check
} from 'lucide-react';

interface Tender {
  name: string;
  tender_number: string;
  title: string;
  client: string;
  submission_date: string;
  status: string;
  estimated_value: number;
  emd_required: number;
  emd_amount: number;
  pbg_required: number;
  pbg_amount: number;
  rfp_document: string;
  tender_document: string;
  linked_project: string;
  created_by_user: string;
  creation: string;
  modified: string;
}

interface Party {
  name: string;
  party_name: string;
}

interface Instrument {
  name: string;
  instrument_type: string;
  amount: number;
  instrument_number: string;
  bank_name: string;
  issue_date: string;
  expiry_date: string;
  status: string;
}

export default function TenderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tender, setTender] = useState<Tender | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Tender>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [clients, setClients] = useState<Party[]>([]);
  
  // EMD/PBG Instruments state
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [showAddInstrument, setShowAddInstrument] = useState(false);
  const [instrumentType, setInstrumentType] = useState<'EMD' | 'PBG'>('EMD');
  const [instrumentForm, setInstrumentForm] = useState({
    instrument_number: '',
    bank_name: '',
    amount: 0,
    issue_date: '',
    expiry_date: '',
    status: 'Submitted',
    remarks: ''
  });
  const [isAddingInstrument, setIsAddingInstrument] = useState(false);

  const tenderId = params.id as string;

  useEffect(() => {
    if (tenderId) {
      fetchTender();
      fetchMasterData();
      fetchInstruments();
    }
  }, [tenderId]);

  const fetchInstruments = async () => {
    try {
      const response = await fetch(`/api/emd-pbg?tender=${encodeURIComponent(tenderId)}`);
      const result = await response.json();
      if (result.success) {
        setInstruments(result.data);
      }
    } catch (err) {
      console.error('Error fetching instruments:', err);
    }
  };

  const handleAddInstrument = async () => {
    if (!instrumentForm.instrument_number || !instrumentForm.bank_name) {
      alert('Instrument number and bank name are required');
      return;
    }
    
    setIsAddingInstrument(true);
    try {
      const response = await fetch('/api/emd-pbg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument_type: instrumentType,
          linked_tender: tenderId,
          ...instrumentForm
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setShowAddInstrument(false);
        setInstrumentForm({
          instrument_number: '',
          bank_name: '',
          amount: 0,
          issue_date: '',
          expiry_date: '',
          status: 'Submitted',
          remarks: ''
        });
        fetchInstruments();
      } else {
        alert(result.message || 'Failed to add instrument');
      }
    } catch (err) {
      console.error('Error adding instrument:', err);
      alert('Failed to add instrument');
    } finally {
      setIsAddingInstrument(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const clientsRes = await fetch('/api/parties?type=CLIENT');
      const clientsData = await clientsRes.json();
      if (clientsData.success) setClients(clientsData.data);
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  const fetchTender = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tenders/${encodeURIComponent(tenderId)}`);
      const result = await response.json();
      
      if (result.success) {
        setTender(result.data);
      } else {
        setError(result.message || 'Tender not found');
      }
    } catch (err) {
      console.error('Error fetching tender:', err);
      setError('Failed to load tender details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tenders/${encodeURIComponent(tenderId)}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      
      if (result.success) {
        router.push('/pre-sales');
      } else {
        alert(result.message || 'Failed to delete tender');
      }
    } catch (err) {
      console.error('Error deleting tender:', err);
      alert('Failed to delete tender');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (!value) return '₹0';
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)} Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)} Lacs`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { bg: string; text: string; icon: typeof CheckCircle } } = {
      'Draft': { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
      'Submitted': { bg: 'bg-blue-100', text: 'text-blue-700', icon: FileCheck },
      'Under Evaluation': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertCircle },
      'Won': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      'Lost': { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
      'Cancelled': { bg: 'bg-gray-100', text: 'text-gray-500', icon: XCircle },
    };
    const config = statusConfig[status] || statusConfig['Draft'];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-4 h-4" />
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500">Loading tender details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <Link href="/pre-sales" className="btn btn-primary">
          <ArrowLeft className="w-4 h-4" />
          Back to Tenders
        </Link>
      </div>
    );
  }

  if (!tender) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/pre-sales"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{tender.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Tender No: <span className="font-mono font-medium">{tender.tender_number}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTender}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              setEditFormData({
                title: tender?.title,
                tender_number: tender?.tender_number,
                client: tender?.client,
                submission_date: tender?.submission_date,
                status: tender?.status,
                estimated_value: tender?.estimated_value,
                emd_required: tender?.emd_required,
                emd_amount: tender?.emd_amount,
                pbg_required: tender?.pbg_required,
                pbg_amount: tender?.pbg_amount,
              });
              setShowEditModal(true);
            }}
            className="btn btn-secondary"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="btn bg-red-50 text-red-600 hover:bg-red-100"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6">
        {getStatusBadge(tender.status)}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Tender Information
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500">Client</label>
                <p className="font-medium text-gray-900 mt-1 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  {tender.client || '-'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Submission Date</label>
                <p className="font-medium text-gray-900 mt-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formatDate(tender.submission_date)}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Estimated Value</label>
                <p className="font-medium text-gray-900 mt-1 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  {formatCurrency(tender.estimated_value)}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Created By</label>
                <p className="font-medium text-gray-900 mt-1 flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  {tender.created_by_user || 'System'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Created On</label>
                <p className="font-medium text-gray-900 mt-1 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {formatDate(tender.creation)}
                </p>
              </div>
            </div>
          </div>

          {/* EMD/PBG Card */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                Financial Instruments
              </h3>
              <button
                onClick={() => setShowAddInstrument(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Instrument
              </button>
            </div>
            <div className="p-6">
              {/* Requirements Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* EMD Requirement */}
                <div className={`p-4 rounded-lg border ${tender.emd_required ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">EMD Required</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      tender.emd_required ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tender.emd_required ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {tender.emd_required && (
                    <div className="text-lg font-bold text-amber-700">
                      {formatCurrency(tender.emd_amount)}
                    </div>
                  )}
                </div>

                {/* PBG Requirement */}
                <div className={`p-4 rounded-lg border ${tender.pbg_required ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">PBG Required</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      tender.pbg_required ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tender.pbg_required ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {tender.pbg_required && (
                    <div className="text-lg font-bold text-blue-700">
                      {formatCurrency(tender.pbg_amount)}
                    </div>
                  )}
                </div>
              </div>

              {/* Recorded Instruments */}
              {instruments.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Recorded Instruments ({instruments.length})</h4>
                  <div className="space-y-3">
                    {instruments.map((inst) => (
                      <div key={inst.name} className={`p-4 rounded-lg border ${
                        inst.instrument_type === 'EMD' ? 'border-amber-200 bg-amber-50/50' : 'border-blue-200 bg-blue-50/50'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            inst.instrument_type === 'EMD' ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'
                          }`}>
                            {inst.instrument_type}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            inst.status === 'Submitted' ? 'bg-green-100 text-green-700' :
                            inst.status === 'Released' ? 'bg-gray-100 text-gray-600' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {inst.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Number:</span>{' '}
                            <span className="font-medium">{inst.instrument_number}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Bank:</span>{' '}
                            <span className="font-medium">{inst.bank_name}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Amount:</span>{' '}
                            <span className="font-medium">{formatCurrency(inst.amount)}</span>
                          </div>
                          {inst.expiry_date && (
                            <div>
                              <span className="text-gray-500">Expiry:</span>{' '}
                              <span className="font-medium">{formatDate(inst.expiry_date)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (tender.emd_required || tender.pbg_required) ? (
                <div className="text-center py-6 border-t border-gray-100">
                  <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No instruments recorded yet</p>
                  <button
                    onClick={() => setShowAddInstrument(true)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Record EMD/PBG submission
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Add Instrument Modal */}
          {showAddInstrument && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setShowAddInstrument(false)}
              />
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">Add Instrument</h2>
                  <button
                    onClick={() => setShowAddInstrument(false)}
                    className="p-2 hover:bg-gray-200 rounded-lg"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {/* Instrument Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setInstrumentType('EMD')}
                        className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                          instrumentType === 'EMD' 
                            ? 'bg-amber-100 border-amber-300 text-amber-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        EMD
                      </button>
                      <button
                        onClick={() => setInstrumentType('PBG')}
                        className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                          instrumentType === 'PBG' 
                            ? 'bg-blue-100 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        PBG
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">BG/DD Number *</label>
                    <input
                      type="text"
                      value={instrumentForm.instrument_number}
                      onChange={(e) => setInstrumentForm(prev => ({ ...prev, instrument_number: e.target.value }))}
                      placeholder="e.g., BG-2026-001234"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label>
                    <input
                      type="text"
                      value={instrumentForm.bank_name}
                      onChange={(e) => setInstrumentForm(prev => ({ ...prev, bank_name: e.target.value }))}
                      placeholder="e.g., State Bank of India"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      value={instrumentForm.amount || ''}
                      onChange={(e) => setInstrumentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="Amount"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                      <input
                        type="date"
                        value={instrumentForm.issue_date}
                        onChange={(e) => setInstrumentForm(prev => ({ ...prev, issue_date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                      <input
                        type="date"
                        value={instrumentForm.expiry_date}
                        onChange={(e) => setInstrumentForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={instrumentForm.status}
                      onChange={(e) => setInstrumentForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Submitted">Submitted</option>
                      <option value="Pending">Pending</option>
                      <option value="Released">Released</option>
                      <option value="Encashed">Encashed</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setShowAddInstrument(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddInstrument}
                    disabled={isAddingInstrument}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isAddingInstrument ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Add Instrument
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Documents Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-600" />
                Documents
              </h3>
            </div>
            <div className="p-6">
              {tender.rfp_document || tender.tender_document ? (
                <div className="space-y-3">
                  {tender.rfp_document && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">RFP Document</span>
                      </div>
                      <a 
                        href={`http://localhost:8000${tender.rfp_document}`}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View →
                      </a>
                    </div>
                  )}
                  {tender.tender_document && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-green-600" />
                        <span className="font-medium">Tender Document</span>
                      </div>
                      <a 
                        href={`http://localhost:8000${tender.tender_document}`}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View →
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No documents uploaded yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Timeline & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Stats Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Quick Info</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Status</span>
                <span className="text-sm font-medium">{tender.status}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Days to Submit</span>
                <span className="text-sm font-medium">
                  {tender.submission_date 
                    ? Math.ceil((new Date(tender.submission_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : '-'} days
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Total Security</span>
                <span className="text-sm font-medium">
                  {formatCurrency((tender.emd_amount || 0) + (tender.pbg_amount || 0))}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500">Last Modified</span>
                <span className="text-sm font-medium">{formatDate(tender.modified)}</span>
              </div>
            </div>
          </div>

          {/* Linked Project Card */}
          {tender.linked_project && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-gray-900">Linked Project</h3>
              </div>
              <div className="p-4">
                <p className="font-medium text-blue-600">{tender.linked_project}</p>
                <p className="text-sm text-gray-500 mt-1">This tender is converted to a project</p>
              </div>
            </div>
          )}

          {/* Actions Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Actions</h3>
            </div>
            <div className="p-4 space-y-2">
              <button className="w-full btn btn-secondary justify-start">
                <FileText className="w-4 h-4" />
                Upload Document
              </button>
              <button className="w-full btn btn-secondary justify-start">
                <CreditCard className="w-4 h-4" />
                Record EMD Payment
              </button>
              <button className="w-full btn btn-secondary justify-start">
                <CheckCircle className="w-4 h-4" />
                Update Status
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Tender</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete tender <strong>{tender.tender_number}</strong>? 
              All associated data will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEditModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900">Edit Tender</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-6 overflow-y-auto max-h-[65vh] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tender Number</label>
                  <input
                    type="text"
                    value={editFormData.tender_number || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, tender_number: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editFormData.status || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="UNDER_EVALUATION">Under Evaluation</option>
                    <option value="WON">Won</option>
                    <option value="LOST">Lost</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tender Title</label>
                <input
                  type="text"
                  value={editFormData.title || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select
                  value={editFormData.client || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, client: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Client</option>
                  {clients.map(c => (
                    <option key={c.name} value={c.name}>{c.party_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Submission Date</label>
                  <input
                    type="date"
                    value={editFormData.submission_date || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, submission_date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value</label>
                  <input
                    type="number"
                    value={editFormData.estimated_value || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, estimated_value: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* EMD Section */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editFormData.emd_required}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, emd_required: e.target.checked ? 1 : 0 }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">EMD Required</span>
                  </label>
                </div>
                {editFormData.emd_required ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">EMD Amount</label>
                    <input
                      type="number"
                      value={editFormData.emd_amount || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, emd_amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : null}
              </div>

              {/* PBG Section */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editFormData.pbg_required}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, pbg_required: e.target.checked ? 1 : 0 }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">PBG Required</span>
                  </label>
                </div>
                {editFormData.pbg_required ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PBG Amount</label>
                    <input
                      type="number"
                      value={editFormData.pbg_amount || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, pbg_amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    const response = await fetch(`/api/tenders/${encodeURIComponent(tenderId)}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(editFormData)
                    });
                    const result = await response.json();
                    if (result.success) {
                      setShowEditModal(false);
                      fetchTender();
                    } else {
                      alert(result.message || 'Failed to update tender');
                    }
                  } catch (err) {
                    console.error('Error updating tender:', err);
                    alert('Failed to update tender');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
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
