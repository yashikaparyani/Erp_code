'use client';
import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Loader2, Plus } from 'lucide-react';

interface CreateTenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Party {
  name: string;
  party_name: string;
  party_type: string;
}

interface Organization {
  name: string;
  organization_name: string;
}

interface TenderFormData {
  // Step 1: Basic Info
  tender_number: string;
  title: string;
  client: string;
  organization: string;
  
  // Step 2: Dates & Status
  submission_date: string;
  status: string;
  
  // Step 3: Financial Details
  estimated_value: number;
  emd_required: boolean;
  emd_amount: number;
  pbg_required: boolean;
  pbg_amount: number;
}

const initialFormData: TenderFormData = {
  tender_number: '',
  title: '',
  client: '',
  organization: '',
  submission_date: '',
  status: 'DRAFT',
  estimated_value: 0,
  emd_required: false,
  emd_amount: 0,
  pbg_required: false,
  pbg_amount: 0,
};

const steps = [
  { id: 1, name: 'Basic Info', description: 'Tender identification details' },
  { id: 2, name: 'Schedule', description: 'Dates and status' },
  { id: 3, name: 'Financials', description: 'EMD, PBG & Value' },
];

export default function CreateTenderModal({ isOpen, onClose, onSuccess }: CreateTenderModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<TenderFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof TenderFormData, string>>>({});
  
  // Master data state
  const [clients, setClients] = useState<Party[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  const [showQuickAddClient, setShowQuickAddClient] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');

  // Fetch master data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMasterData();
    }
  }, [isOpen]);

  const fetchMasterData = async () => {
    setIsLoadingMaster(true);
    try {
      const [clientsResponse, organizationsResponse] = await Promise.all([
        fetch('/api/parties?type=CLIENT&active=1'),
        fetch('/api/organizations?active=1'),
      ]);

      const clientsData = await clientsResponse.json();
      const organizationsData = await organizationsResponse.json();

      if (clientsData.success) {
        setClients(clientsData.data);
      }
      if (organizationsData.success) {
        setOrganizations(organizationsData.data);
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
    } finally {
      setIsLoadingMaster(false);
    }
  };

  const handleQuickAddClient = async () => {
    if (!quickAddName.trim()) return;
    
    try {
      const response = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          party_name: quickAddName,
          party_type: 'CLIENT'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        // Add to clients list and select it
        const newClient = result.data;
        setClients(prev => [...prev, { name: newClient.name, party_name: newClient.party_name, party_type: 'CLIENT' }]);
        setFormData(prev => ({ ...prev, client: newClient.name }));
        setQuickAddName('');
        setShowQuickAddClient(false);
      } else {
        alert(result.message || 'Failed to create client');
      }
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  const updateFormData = (field: keyof TenderFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof TenderFormData, string>> = {};
    
    if (step === 1) {
      if (!formData.tender_number.trim()) {
        newErrors.tender_number = 'Tender number is required';
      }
      if (!formData.title.trim()) {
        newErrors.title = 'Title is required';
      }
      if (!formData.client) {
        newErrors.client = 'Client is required';
      }
    }
    
    if (step === 2) {
      if (!formData.submission_date) {
        newErrors.submission_date = 'Submission date is required';
      }
    }
    
    if (step === 3) {
      if (formData.emd_required && formData.emd_amount <= 0) {
        newErrors.emd_amount = 'EMD amount is required when EMD is enabled';
      }
      if (formData.pbg_required && formData.pbg_amount <= 0) {
        newErrors.pbg_amount = 'PBG amount is required when PBG is enabled';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/tenders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        alert(result.message || 'Failed to create tender');
      }
    } catch (error) {
      console.error('Error creating tender:', error);
      alert('Failed to create tender. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData(initialFormData);
    setErrors({});
    setShowQuickAddClient(false);
    setQuickAddName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create New Tender</h2>
            <p className="text-sm text-gray-500 mt-0.5">Fill in the tender details</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                    ${currentStep > step.id 
                      ? 'bg-green-500 text-white' 
                      : currentStep === step.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-500'}
                  `}>
                    {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <div className="ml-3 hidden sm:block">
                    <p className={`text-sm font-medium ${currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'}`}>
                      {step.name}
                    </p>
                    <p className="text-xs text-gray-400">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 sm:w-20 h-0.5 mx-2 sm:mx-4 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[400px]">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tender Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.tender_number}
                  onChange={(e) => updateFormData('tender_number', e.target.value)}
                  placeholder="e.g., TEN-2026-001"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.tender_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.tender_number && (
                  <p className="text-red-500 text-xs mt-1">{errors.tender_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tender Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  placeholder="e.g., Indore Smart City Surveillance Phase II"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.title && (
                  <p className="text-red-500 text-xs mt-1">{errors.title}</p>
                )}
              </div>

              {/* Client Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.client}
                    onChange={(e) => updateFormData('client', e.target.value)}
                    className={`flex-1 px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.client ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isLoadingMaster}
                  >
                    <option value="">Select Client</option>
                    {clients.map((c) => (
                      <option key={c.name} value={c.name}>{c.party_name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddClient(!showQuickAddClient)}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Add new client"
                  >
                    <Plus className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                {errors.client && (
                  <p className="text-red-500 text-xs mt-1">{errors.client}</p>
                )}
                
                {/* Quick Add Client */}
                {showQuickAddClient && (
                  <div className="mt-2 p-3 border border-blue-200 rounded-lg bg-blue-50">
                    <p className="text-xs text-blue-700 mb-2">Quick Add Client:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={quickAddName}
                        onChange={(e) => setQuickAddName(e.target.value)}
                        placeholder="Client name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleQuickAddClient}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization
                </label>
                <select
                  value={formData.organization}
                  onChange={(e) => updateFormData('organization', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoadingMaster}
                >
                  <option value="">Select Organization</option>
                  {organizations.map((organization) => (
                    <option key={organization.name} value={organization.name}>
                      {organization.organization_name}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          )}

          {/* Step 2: Dates & Status */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Submission Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.submission_date}
                  onChange={(e) => updateFormData('submission_date', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.submission_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.submission_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.submission_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => updateFormData('status', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_EVALUATION">Under Evaluation</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="DROPPED">Dropped</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Financial Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Project Value (₹)
                </label>
                <input
                  type="number"
                  value={formData.estimated_value}
                  onChange={(e) => updateFormData('estimated_value', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 84000000"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {formData.estimated_value > 0 && 
                    `= ₹${(formData.estimated_value / 10000000).toFixed(2)} Cr`
                  }
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">EMD Required</label>
                  <button
                    type="button"
                    onClick={() => updateFormData('emd_required', !formData.emd_required)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.emd_required ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.emd_required ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                {formData.emd_required && (
                  <div>
                    <input
                      type="number"
                      value={formData.emd_amount}
                      onChange={(e) => updateFormData('emd_amount', parseFloat(e.target.value) || 0)}
                      placeholder="EMD Amount (₹)"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.emd_amount ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.emd_amount && (
                      <p className="text-red-500 text-xs mt-1">{errors.emd_amount}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">PBG Required</label>
                  <button
                    type="button"
                    onClick={() => updateFormData('pbg_required', !formData.pbg_required)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.pbg_required ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.pbg_required ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                {formData.pbg_required && (
                  <div>
                    <input
                      type="number"
                      value={formData.pbg_amount}
                      onChange={(e) => updateFormData('pbg_amount', parseFloat(e.target.value) || 0)}
                      placeholder="PBG Amount (₹)"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.pbg_amount ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.pbg_amount && (
                      <p className="text-red-500 text-xs mt-1">{errors.pbg_amount}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentStep === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create Tender
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
