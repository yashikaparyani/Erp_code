'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, ClipboardList, ExternalLink, FileText, Plus, X } from 'lucide-react';

interface TestReport {
  name: string;
  report_name?: string;
  linked_project?: string;
  linked_site?: string;
  test_type?: string;
  test_date?: string;
  tested_by?: string;
  status?: string;
  file?: string;
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
  commissioned_by?: string;
}

interface ClientSignoff {
  name: string;
  linked_project?: string;
  linked_site?: string;
  signoff_type?: string;
  signoff_date?: string;
  signed_by_client?: string;
  status?: string;
  attachment?: string;
  remarks?: string;
}

type TabKey = 'reports' | 'checklists' | 'signoffs';

const TEST_TYPES = ['FAT', 'SAT', 'UAT'];
const REPORT_STATUS: Record<string, string> = {
  Submitted: 'badge-warning',
  Approved: 'badge-success',
  Rejected: 'badge-error',
};
const CHECKLIST_STATUS: Record<string, string> = {
  Draft: 'badge-gray',
  'In Progress': 'badge-warning',
  Completed: 'badge-success',
};
const SIGNOFF_STATUS: Record<string, string> = {
  Pending: 'badge-warning',
  Signed: 'badge-success',
  Approved: 'badge-success',
};

type ReportFormData = {
  report_name: string;
  linked_project: string;
  linked_site: string;
  test_type: string;
  test_date: string;
  remarks: string;
  file: File | null;
};

const initialReportForm: ReportFormData = {
  report_name: '',
  linked_project: '',
  linked_site: '',
  test_type: 'FAT',
  test_date: '',
  remarks: '',
  file: null,
};

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

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreateReport = async () => {
    setError('');
    if (!reportForm.report_name.trim()) {
      setError('Report name is required.');
      return;
    }
    if (!reportForm.linked_project.trim()) {
      setError('Linked project is required.');
      return;
    }
    if (!reportForm.file) {
      setError('Please select a report file.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('report_name', reportForm.report_name);
      formData.append('linked_project', reportForm.linked_project);
      formData.append('linked_site', reportForm.linked_site);
      formData.append('test_type', reportForm.test_type);
      formData.append('test_date', reportForm.test_date);
      formData.append('remarks', reportForm.remarks);
      formData.append('file', reportForm.file);

      const response = await fetch('/api/execution/commissioning/test-reports', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowModal(false);
      setReportForm(initialReportForm);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportAction = async (action: string, name: string) => {
    try {
      const response = await fetch('/api/execution/commissioning/test-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, name }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Action failed');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleChecklistAction = async (action: string, name: string) => {
    try {
      const response = await fetch('/api/execution/commissioning/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, name }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Action failed');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleSignoffAction = async (action: string, name: string) => {
    try {
      const response = await fetch('/api/execution/commissioning/client-signoffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, name }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Action failed');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Test Reports & Signoffs</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Test evidence, commissioning checklists, and client signoff actions in one lane.
          </p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Add Report
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard icon={FileText} color="blue" label="Test Reports" value={reports.length} hint={`${reports.filter(r => r.status === 'Approved').length} approved`} />
        <StatCard icon={ClipboardList} color="violet" label="Checklists" value={checklists.length} hint={`${checklists.filter(c => c.status === 'Completed').length} completed`} />
        <StatCard icon={CheckCircle} color="green" label="Client Signoffs" value={signoffs.length} hint={`${signoffs.filter(s => s.status === 'Approved' || s.status === 'Signed').length} signed`} />
        <StatCard icon={FileText} color="amber" label="Pending Actions" value={reports.filter(r => r.status === 'Submitted').length + checklists.filter(c => c.status === 'In Progress').length + signoffs.filter(s => s.status === 'Pending').length} hint="Reports, checklists, and signoffs" />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['reports', 'checklists', 'signoffs'] as TabKey[]).map(tab => (
          <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab(tab)}>
            {{ reports: `Test Reports (${reports.length})`, checklists: `Checklists (${checklists.length})`, signoffs: `Client Signoffs (${signoffs.length})` }[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'reports' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Test Reports</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Project / Site</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Tested By</th>
                  <th>Evidence</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-500">No test reports</td></tr>
                ) : reports.map(r => (
                  <tr key={r.name}>
                    <td>
                      <Link href={`/execution/commissioning/test-reports/${encodeURIComponent(r.name)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{r.report_name || r.name}</Link>
                      <div className="text-xs text-gray-500">{r.name}</div>
                    </td>
                    <td>
                      <div className="text-sm text-gray-900">{r.linked_project || '-'}</div>
                      <div className="text-xs text-gray-500">{r.linked_site || ''}</div>
                    </td>
                    <td><span className="badge badge-gray">{r.test_type || '-'}</span></td>
                    <td><div className="text-sm text-gray-500">{r.test_date || '-'}</div></td>
                    <td>
                      <div className="text-sm text-gray-900">{r.tested_by || '-'}</div>
                      {r.remarks ? <div className="text-xs text-gray-500 max-w-[220px] truncate">{r.remarks}</div> : null}
                    </td>
                    <td>
                      {r.file ? (
                        <a href={r.file} target="_blank" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                          <ExternalLink className="w-4 h-4" />
                          Open file
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">No file</span>
                      )}
                    </td>
                    <td><span className={`badge ${REPORT_STATUS[r.status || ''] || 'badge-gray'}`}>{r.status || '-'}</span></td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
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
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Checklist</th>
                  <th>Project / Site</th>
                  <th>Progress</th>
                  <th>Commissioned By</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {checklists.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-500">No checklists</td></tr>
                ) : checklists.map(c => {
                  const totalItems = c.total_items || 0;
                  const doneItems = c.done_items || 0;
                  const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;
                  return (
                    <tr key={c.name}>
                      <td><Link href={`/execution/commissioning/checklists/${encodeURIComponent(c.name)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{c.name}</Link></td>
                      <td><div className="text-sm text-gray-900">{c.checklist_name || '-'}</div></td>
                      <td>
                        <div className="text-sm text-gray-900">{c.linked_project || '-'}</div>
                        <div className="text-xs text-gray-500">{c.linked_site || ''}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${pct}%` }} /></div>
                          <span className="text-xs text-gray-500">{doneItems}/{totalItems}</span>
                        </div>
                      </td>
                      <td><div className="text-sm text-gray-500">{c.commissioned_by || '-'}</div></td>
                      <td><span className={`badge ${CHECKLIST_STATUS[c.status || ''] || 'badge-gray'}`}>{c.status || '-'}</span></td>
                      <td>
                        <div className="flex gap-1 flex-wrap">
                          {c.status === 'Draft' && <button className="btn btn-xs btn-primary" onClick={() => handleChecklistAction('start', c.name)}>Start</button>}
                          {c.status === 'In Progress' && <button className="btn btn-xs btn-success" onClick={() => handleChecklistAction('complete', c.name)}>Complete</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Project / Site</th>
                  <th>Type</th>
                  <th>Signed By Client</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Attachment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {signoffs.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-500">No client signoffs</td></tr>
                ) : signoffs.map(s => (
                  <tr key={s.name}>
                    <td><Link href={`/execution/commissioning/client-signoffs/${encodeURIComponent(s.name)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{s.name}</Link></td>
                    <td>
                      <div className="text-sm text-gray-900">{s.linked_project || '-'}</div>
                      <div className="text-xs text-gray-500">{s.linked_site || ''}</div>
                    </td>
                    <td><div className="text-sm text-gray-900">{s.signoff_type || '-'}</div></td>
                    <td>
                      <div className="text-sm text-gray-900">{s.signed_by_client || '-'}</div>
                      {s.remarks ? <div className="text-xs text-gray-500 max-w-[220px] truncate">{s.remarks}</div> : null}
                    </td>
                    <td><div className="text-sm text-gray-500">{s.signoff_date || '-'}</div></td>
                    <td><span className={`badge ${SIGNOFF_STATUS[s.status || ''] || 'badge-gray'}`}>{s.status || '-'}</span></td>
                    <td>
                      {s.attachment ? (
                        <a href={`/api/files?url=${encodeURIComponent(s.attachment)}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                          <ExternalLink className="w-4 h-4" />
                          Open
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">No attachment</span>
                      )}
                    </td>
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
              <Field label="Report Name *"><input className="input" value={reportForm.report_name} onChange={e => setReportForm({ ...reportForm, report_name: e.target.value })} /></Field>
              <Field label="Project *"><input className="input" value={reportForm.linked_project} onChange={e => setReportForm({ ...reportForm, linked_project: e.target.value })} /></Field>
              <Field label="Site"><input className="input" value={reportForm.linked_site} onChange={e => setReportForm({ ...reportForm, linked_site: e.target.value })} /></Field>
              <Field label="Test Type">
                <select className="input" value={reportForm.test_type} onChange={e => setReportForm({ ...reportForm, test_type: e.target.value })}>
                  {TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Test Date"><input type="date" className="input" value={reportForm.test_date} onChange={e => setReportForm({ ...reportForm, test_date: e.target.value })} /></Field>
              <Field label="Evidence File *">
                <input
                  type="file"
                  className="input pt-2"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={e => setReportForm({ ...reportForm, file: e.target.files?.[0] || null })}
                />
              </Field>
              <div className="md:col-span-2"><Field label="Remarks"><textarea className="input" rows={3} value={reportForm.remarks} onChange={e => setReportForm({ ...reportForm, remarks: e.target.value })} /></Field></div>
            </div>
            <div className="px-6 pb-6">
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                New reports are created in <span className="font-semibold">Submitted</span> state and move through approval from this page.
              </div>
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
