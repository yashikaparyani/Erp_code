'use client';
import { useEffect, useState } from 'react';
import { 
  Search, ChevronDown, ChevronUp, Download, Clock, MapPin, FileText, Plus, Edit2, Trash2, X
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
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingName, setEditingName] = useState('');
  const emptyForm = { result_id: '', winning_amount: '', result_stage: 'AOC', reference_no: '', winner_company: '', tender: '', organization_name: '', site_location: '', publication_date: '' };
  const [form, setForm] = useState(emptyForm);

  const loadResults = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tender-results');
      const payload = await response.json();
      if (payload.success) setResults(payload.data || []);
    } catch (error) {
      console.error('Failed to fetch tender results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadResults(); }, []);

  function openCreate() {
    setEditingName('');
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(row: TenderResultRow) {
    setEditingName(row.name);
    setForm({
      result_id: row.result_id || '',
      winning_amount: String(row.winning_amount || ''),
      result_stage: row.result_stage || 'AOC',
      reference_no: row.reference_no || '',
      winner_company: row.winner_company || '',
      tender: row.tender || '',
      organization_name: row.organization_name || '',
      site_location: row.site_location || '',
      publication_date: row.publication_date || '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    setBusy(true);
    try {
      const method = editingName ? 'update_tender_result' : 'create_tender_result';
      const args = editingName
        ? { name: editingName, data: { ...form, winning_amount: Number(form.winning_amount) || 0 } }
        : { data: { ...form, winning_amount: Number(form.winning_amount) || 0 } };
      const res = await fetch('/api/ops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method, args }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Save failed');
      setShowModal(false);
      loadResults();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(name: string) {
    if (!confirm('Delete this tender result?')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/ops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method: 'delete_tender_result', args: { name } }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Delete failed');
      loadResults();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

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
      <div className="flex justify-end gap-2 mb-4">
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          New Result
        </button>
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
                    title="Edit"
                    onClick={() => openEdit(result)}
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    className="hover:text-red-500 transition-colors"
                    title="Delete"
                    onClick={() => handleDelete(result.name)}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <span className="text-gray-200">|</span>
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">{editingName ? 'Edit Tender Result' : 'New Tender Result'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Result ID</label>
                  <input className="input w-full" value={form.result_id} onChange={e => setForm({ ...form, result_id: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                  <select className="input w-full" value={form.result_stage} onChange={e => setForm({ ...form, result_stage: e.target.value })}>
                    <option value="AOC">AOC</option><option value="LoI Issued">LoI Issued</option><option value="Work Order">Work Order</option>
                    <option value="Technical Evaluation">Technical Evaluation</option><option value="Financial Evaluation">Financial Evaluation</option>
                  </select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tender</label>
                <input className="input w-full" value={form.tender} onChange={e => setForm({ ...form, tender: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                  <input className="input w-full" value={form.organization_name} onChange={e => setForm({ ...form, organization_name: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Site Location</label>
                  <input className="input w-full" value={form.site_location} onChange={e => setForm({ ...form, site_location: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Winner Company</label>
                  <input className="input w-full" value={form.winner_company} onChange={e => setForm({ ...form, winner_company: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Winning Amount</label>
                  <input type="number" className="input w-full" value={form.winning_amount} onChange={e => setForm({ ...form, winning_amount: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Reference No</label>
                  <input className="input w-full" value={form.reference_no} onChange={e => setForm({ ...form, reference_no: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Publication Date</label>
                  <input type="date" className="input w-full" value={form.publication_date} onChange={e => setForm({ ...form, publication_date: e.target.value })} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={busy} onClick={handleSave}>{busy ? 'Saving…' : editingName ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
