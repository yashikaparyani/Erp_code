'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, ClipboardList, FileText, Plus, X } from 'lucide-react';

interface TestReport {
  name: string;
  linked_project?: string;
  linked_site?: string;
  test_type?: string;
  test_date?: string;
  reference_document?: string;
  test_description?: string;
  prepared_by?: string;
  reviewed_by?: string;
  status?: string;
  remarks?: string;
}

interface Checklist {
  name: string;
  linked_project?: string;
  linked_site?: string;
  checklist_name?: string;
  total_items?: number;
  done_items?: number;
  status?: string;
  assigned_to?: string;
}

interface ClientSignoff {
  name: string;
  linked_project?: string;
  linked_site?: string;
  signoff_type?: string;
  signoff_date?: string;
  client_name?: string;
  client_designation?: string;
  status?: string;
  remarks?: string;
}

type TabKey = 'reports' | 'checklists' | 'signoffs';

const TEST_TYPES = ['FAT', 'SAT', 'UAT'];
const REPORT_STATUS: Record<string, string> = { Draft: 'badge-gray', Submitted: 'badge-warning', Approved: 'badge-success', Rejected: 'badge-error' };
const CHECKLIST_STATUS: Record<string, string> = { 'Not Started': 'badge-gray', 'In Progress': 'badge-warning', Completed: 'badge-success' };
const SIGNOFF_STATUS: Record<string, string> = { Pending: 'badge-warning', Signed: 'badge-success', Approved: 'badge-success', Rejected: 'badge-error' };

type ReportFormData = { linked_project: string; linked_site: string; test_type: string; test_date: string; test_description: string; reference_document: string };
const initialReportForm: ReportFormData = { linked_project: '', linked_site: '', test_type: 'FAT', test_date: '', test_description: '', reference_document: '' };

export default function CommissioningTestReportsPage() {
  const [reports, setReports] = useState<TestReport[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [signoffs, setSignoffs] = useState<ClientSignoff[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('reports');
  const [showModal, setShowModal] = useState(false);
  const [reportForm, setReportForm] = useState<ReportFormData>(initialReportForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [repRes, clRes, soRes] = await Promise.all([
      fetch('/api/execution/commissioning/test-reports').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/execution/commissioning/checklists').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/execution/commissioning/client-signoffs').then(r => r.json()).catch(() => ({ data: [] })),
    ]);
    setReports(repRes.data || []);
    setChecklists(clRes.data || []);
    setSignoffs(soRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateReport = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/execution/commissioning/test-reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reportForm) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowModal(false);
      setReportForm(initialReportForm);
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setIsSubmitting(false); }
  };

  const handleReportAction = async (action: string, name: string) => {
    try {
      const response = await fetch('/api/execution/commissioning/test-reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, name }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Action failed');
      await loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Action failed'); }
  };

  const handleChecklistAction = async (action: string, name: string) => {
    try {
      const response = await fetch('/api/execution/commissioning/checklists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, name }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Action failed');
      await loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Action failed'); }
  };

  const handleSignoffAction = async (action: string, name: string) => {
    try {
      const response = await fetch('/api/execution/commissioning/client-signoffs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, name }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Action failed');
      await loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Action failed'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Test Reports & Signoffs</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">FAT/SAT/UAT reports, commissioning checklists, and client signoffs.</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Add Report</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard icon={FileText} color="blue" label="Test Reports" value={reports.length} hint={`${reports.filter(r => r.status === 'Approved').length} approved`} />
        <StatCard icon={ClipboardList} color="violet" label="Checklists" value={checklists.length} hint={`${checklists.filter(c => c.status === 'Completed').length} completed`} />
        <StatCard icon={CheckCircle} color="green" label="Client Signoffs" value={signoffs.length} hint={`${signoffs.filter(s => s.status === 'Approved' || s.status === 'Signed').length} signed`} />
        <StatCard icon={FileText} color="amber" label="Pending" value={reports.filter(r => r.status === 'Submitted').length + signoffs.filter(s => s.status === 'Pending').length} hint="Reports + signoffs awaiting action" />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['reports', 'checklists', 'signoffs'] as TabKey[]).map(tab => (
          <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab(tab)}>
            {{reports: `Test Reports (${reports.length})`, checklists: `Checklists (${checklists.length})`, signoffs: `Client Signoffs (${signoffs.length})`}[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'reports' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Test Reports</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Project / Site</th><th>Type</th><th>Date</th><th>Description</th><th>Prepared By</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-500">No test reports</td></tr>
                ) : reports.map(r => (
                  <tr key={r.name}>
                    <td><div className="font-medium text-gray-900">{r.name}</div></td>
                    <td><div className="text-sm text-gray-900">{r.linked_project || '-'}</div><div className="text-xs text-gray-500">{r.linked_site || ''}</div></td>
                    <td><span className="badge badge-gray">{r.test_type || '-'}</span></td>
                    <td><div className="text-sm text-gray-500">{r.test_date || '-'}</div></td>
                    <td><div className="text-sm text-gray-900 max-w-[200px] truncate">{r.test_description || '-'}</div></td>
                    <td><div className="text-sm text-gray-500">{r.prepared_by || '-'}</div></td>
                    <td><span className={`badge ${REPORT_STATUS[r.status || ''] || 'badge-gray'}`}>{r.status || '-'}</span></td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {(r.status === 'Draft' || !r.status) && <button className="btn btn-xs btn-primary" onClick={() => handleReportAction('submit', r.name)}>Submit</button>}
                        {r.status === 'Submitted' && <button className="btn btn-xs btn-success" onClick={() => handleReportAction('approve', r.name)}>Approve</button>}
                        {r.status === 'Submitted' && <button className="btn btn-xs btn-error" onClick={() => handleReportAction('reject', r.name)}>Reject</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'checklists' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Commissioning Checklists</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Checklist</th><th>Project / Site</th><th>Progress</th><th>Assigned To</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {checklists.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-500">No checklists</td></tr>
                ) : checklists.map(c => (
                  <tr key={c.name}>
                    <td><div className="font-medium text-gray-900">{c.name}</div></td>
                    <td><div className="text-sm text-gray-900">{c.checklist_name || '-'}</div></td>
                    <td><div className="text-sm text-gray-900">{c.linked_project || '-'}</div><div className="text-xs text-gray-500">{c.linked_site || ''}</div></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${c.total_items ? (c.done_items || 0) / c.total_items * 100 : 0}%` }} /></div>
                        <span className="text-xs text-gray-500">{c.done_items || 0}/{c.total_items || 0}</span>
                      </div>
                    </td>
                    <td><div className="text-sm text-gray-500">{c.assigned_to || '-'}</div></td>
                    <td><span className={`badge ${CHECKLIST_STATUS[c.status || ''] || 'badge-gray'}`}>{c.status || '-'}</span></td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {c.status === 'Not Started' && <button className="btn btn-xs btn-primary" onClick={() => handleChecklistAction('start', c.name)}>Start</button>}
                        {c.status === 'In Progress' && <button className="btn btn-xs btn-success" onClick={() => handleChecklistAction('complete', c.name)}>Complete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'signoffs' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Client Signoffs</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Project / Site</th><th>Type</th><th>Date</th><th>Client</th><th>Designation</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {signoffs.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-500">No client signoffs</td></tr>
                ) : signoffs.map(s => (
                  <tr key={s.name}>
                    <td><div className="font-medium text-gray-900">{s.name}</div></td>
                    <td><div className="text-sm text-gray-900">{s.linked_project || '-'}</div><div className="text-xs text-gray-500">{s.linked_site || ''}</div></td>
                    <td><div className="text-sm text-gray-900">{s.signoff_type || '-'}</div></td>
                    <td><div className="text-sm text-gray-500">{s.signoff_date || '-'}</div></td>
                    <td><div className="text-sm text-gray-900">{s.client_name || '-'}</div></td>
                    <td><div className="text-sm text-gray-500">{s.client_designation || '-'}</div></td>
                    <td><span className={`badge ${SIGNOFF_STATUS[s.status || ''] || 'badge-gray'}`}>{s.status || '-'}</span></td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {s.status === 'Pending' && <button className="btn btn-xs btn-success" onClick={() => handleSignoffAction('sign', s.name)}>Sign</button>}
                        {s.status === 'Signed' && <button className="btn btn-xs btn-success" onClick={() => handleSignoffAction('approve', s.name)}>Approve</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Add Test Report</h2>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Project"><input className="input" value={reportForm.linked_project} onChange={e => setReportForm({ ...reportForm, linked_project: e.target.value })} /></Field>
              <Field label="Site"><input className="input" value={reportForm.linked_site} onChange={e => setReportForm({ ...reportForm, linked_site: e.target.value })} /></Field>
              <Field label="Test Type">
                <select className="input" value={reportForm.test_type} onChange={e => setReportForm({ ...reportForm, test_type: e.target.value })}>
                  {TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Test Date"><input type="date" className="input" value={reportForm.test_date} onChange={e => setReportForm({ ...reportForm, test_date: e.target.value })} /></Field>
              <div className="md:col-span-2"><Field label="Reference Document"><input className="input" value={reportForm.reference_document} onChange={e => setReportForm({ ...reportForm, reference_document: e.target.value })} /></Field></div>
              <div className="md:col-span-2"><Field label="Description"><textarea className="input" rows={3} value={reportForm.test_description} onChange={e => setReportForm({ ...reportForm, test_description: e.target.value })} /></Field></div>
            </div>
            <div className="px-6 pb-6">
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-3">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateReport} disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Report'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, hint }: { icon: any; color: string; label: string; value: number; hint: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-100 text-blue-600', violet: 'bg-violet-100 text-violet-600', green: 'bg-green-100 text-green-600', amber: 'bg-amber-100 text-amber-600' };
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color] || colors.blue}`}><Icon className="w-5 h-5" /></div>
        <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
      </div>
      <div className="text-xs text-gray-500 mt-2">{hint}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><div className="text-sm font-medium text-gray-700 mb-2">{label}</div>{children}</label>;
}
