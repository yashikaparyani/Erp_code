'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GitBranch, Link2, Plus, Shield, ShieldCheck, X } from 'lucide-react';

interface DependencyRule {
  name: string;
  linked_task?: string;
  prerequisite_type?: string;
  prerequisite_task?: string;
  hard_block?: boolean;
  required_status?: string;
  block_message?: string;
  is_active?: boolean;
}

interface DependencyOverride {
  name: string;
  dependency_rule?: string;
  linked_task?: string;
  status?: string;
  requested_by?: string;
  approved_by?: string;
  reason?: string;
  creation?: string;
}

type RuleFormData = {
  linked_task: string;
  prerequisite_type: string;
  prerequisite_task: string;
  hard_block: boolean;
  required_status: string;
  block_message: string;
};

const initialRuleForm: RuleFormData = {
  linked_task: '',
  prerequisite_type: 'TASK',
  prerequisite_task: '',
  hard_block: true,
  required_status: 'Completed',
  block_message: '',
};

type OverrideFormData = {
  dependency_rule: string;
  reason: string;
};

const initialOverrideForm: OverrideFormData = { dependency_rule: '', reason: '' };

const STATUS_BADGES: Record<string, string> = {
  REQUESTED: 'badge-warning',
  APPROVED: 'badge-success',
  REJECTED: 'badge-error',
};

export default function DependenciesPage() {
  const [rules, setRules] = useState<DependencyRule[]>([]);
  const [overrides, setOverrides] = useState<DependencyOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rules' | 'overrides'>('rules');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [ruleForm, setRuleForm] = useState<RuleFormData>(initialRuleForm);
  const [overrideForm, setOverrideForm] = useState<OverrideFormData>(initialOverrideForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [rulesRes, overridesRes] = await Promise.all([
      fetch('/api/execution/dependency-rules').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/execution/dependency-overrides').then(r => r.json()).catch(() => ({ data: [] })),
    ]);
    setRules(rulesRes.data || []);
    setOverrides(overridesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateRule = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/execution/dependency-rules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ruleForm),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Failed to create rule');
      setShowRuleModal(false);
      setRuleForm(initialRuleForm);
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setIsSubmitting(false); }
  };

  const handleCreateOverride = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/execution/dependency-overrides', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(overrideForm),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Failed to create override');
      setShowOverrideModal(false);
      setOverrideForm(initialOverrideForm);
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setIsSubmitting(false); }
  };

  const handleOverrideAction = async (action: string, name: string) => {
    try {
      const response = await fetch('/api/execution/dependency-overrides', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, name }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Action failed');
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Action failed'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dependency Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Define task prerequisites and manage override requests for blocked workflows.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => setShowRuleModal(true)}><Plus className="w-4 h-4" /> Add Rule</button>
          <button className="btn btn-secondary" onClick={() => setShowOverrideModal(true)}><Shield className="w-4 h-4" /> Request Override</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard icon={GitBranch} color="blue" label="Total Rules" value={rules.length} />
        <StatCard icon={Link2} color="amber" label="Hard Blocks" value={rules.filter(r => r.hard_block).length} />
        <StatCard icon={Shield} color="violet" label="Override Requests" value={overrides.length} />
        <StatCard icon={ShieldCheck} color="green" label="Approved Overrides" value={overrides.filter(o => o.status === 'APPROVED').length} />
      </div>

      <div className="flex gap-2 mb-4">
        <button className={`btn ${activeTab === 'rules' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('rules')}>Rules ({rules.length})</button>
        <button className={`btn ${activeTab === 'overrides' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('overrides')}>Overrides ({overrides.length})</button>
      </div>

      {activeTab === 'rules' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Dependency Rules</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Rule</th><th>Task</th><th>Prerequisite</th><th>Type</th><th>Hard Block</th><th>Required Status</th></tr></thead>
              <tbody>
                {rules.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500">No dependency rules defined</td></tr>
                ) : rules.map(rule => (
                  <tr key={rule.name}>
                    <td><Link href={`/execution/dependencies/${encodeURIComponent(rule.name)}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{rule.name}</Link></td>
                    <td><div className="text-sm text-gray-900">{rule.linked_task || '-'}</div></td>
                    <td><div className="text-sm text-gray-900">{rule.prerequisite_task || '-'}</div></td>
                    <td><div className="text-sm text-gray-900">{rule.prerequisite_type || '-'}</div></td>
                    <td><span className={`badge ${rule.hard_block ? 'badge-error' : 'badge-gray'}`}>{rule.hard_block ? 'Hard' : 'Soft'}</span></td>
                    <td><div className="text-sm text-gray-500">{rule.required_status || '-'}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'overrides' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Override Requests</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Override ID</th><th>Rule</th><th>Reason</th><th>Requested By</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {overrides.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500">No override requests</td></tr>
                ) : overrides.map(ov => (
                  <tr key={ov.name}>
                    <td><div className="font-medium text-gray-900">{ov.name}</div></td>
                    <td><div className="text-sm text-gray-900">{ov.dependency_rule || '-'}</div></td>
                    <td><div className="text-sm text-gray-900 max-w-[200px] truncate">{ov.reason || '-'}</div></td>
                    <td><div className="text-sm text-gray-500">{ov.requested_by || '-'}</div></td>
                    <td><span className={`badge ${STATUS_BADGES[ov.status || ''] || 'badge-gray'}`}>{ov.status || '-'}</span></td>
                    <td>
                      {ov.status === 'REQUESTED' && (
                        <div className="flex gap-1">
                          <button className="btn btn-xs btn-success" onClick={() => handleOverrideAction('approve', ov.name)}>Approve</button>
                          <button className="btn btn-xs btn-error" onClick={() => handleOverrideAction('reject', ov.name)}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Add Dependency Rule</h2>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowRuleModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Task"><input className="input" value={ruleForm.linked_task} onChange={e => setRuleForm({ ...ruleForm, linked_task: e.target.value })} /></Field>
              <Field label="Prerequisite Type">
                <select className="input" value={ruleForm.prerequisite_type} onChange={e => setRuleForm({ ...ruleForm, prerequisite_type: e.target.value })}>
                  <option value="TASK">Task</option><option value="MILESTONE">Milestone</option><option value="DOCUMENT">Document</option>
                  <option value="APPROVAL">Approval</option><option value="INSPECTION">Inspection</option><option value="MATERIAL">Material</option>
                  <option value="EQUIPMENT">Equipment</option><option value="OTHER">Other</option>
                </select>
              </Field>
              <Field label="Prerequisite Task"><input className="input" value={ruleForm.prerequisite_task} onChange={e => setRuleForm({ ...ruleForm, prerequisite_task: e.target.value })} /></Field>
              <Field label="Required Status"><input className="input" value={ruleForm.required_status} onChange={e => setRuleForm({ ...ruleForm, required_status: e.target.value })} /></Field>
              <Field label="Hard Block">
                <select className="input" value={ruleForm.hard_block ? 'yes' : 'no'} onChange={e => setRuleForm({ ...ruleForm, hard_block: e.target.value === 'yes' })}>
                  <option value="yes">Yes - blocks progress</option><option value="no">No - soft warning</option>
                </select>
              </Field>
              <Field label="Block Message"><input className="input" value={ruleForm.block_message} onChange={e => setRuleForm({ ...ruleForm, block_message: e.target.value })} /></Field>
            </div>
            <div className="px-6 pb-6">
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-3">
                <button className="btn btn-secondary" onClick={() => setShowRuleModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateRule} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Add Rule'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Request Override</h2>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowOverrideModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 gap-4">
              <Field label="Dependency Rule"><input className="input" value={overrideForm.dependency_rule} onChange={e => setOverrideForm({ ...overrideForm, dependency_rule: e.target.value })} placeholder="Rule name or ID" /></Field>
              <Field label="Reason"><textarea className="input min-h-[88px]" value={overrideForm.reason} onChange={e => setOverrideForm({ ...overrideForm, reason: e.target.value })} placeholder="Why is this override needed?" /></Field>
            </div>
            <div className="px-6 pb-6">
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-3">
                <button className="btn btn-secondary" onClick={() => setShowOverrideModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateOverride} disabled={isSubmitting}>{isSubmitting ? 'Requesting...' : 'Request Override'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: number }) {
  const colors: Record<string, string> = { blue: 'bg-blue-100 text-blue-600', amber: 'bg-amber-100 text-amber-600', green: 'bg-green-100 text-green-600', violet: 'bg-violet-100 text-violet-600' };
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color] || colors.blue}`}><Icon className="w-5 h-5" /></div>
        <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
      </div>
    </div>
  );
}

function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={full ? 'md:col-span-2' : ''}><div className="text-sm font-medium text-gray-700 mb-2">{label}</div>{children}</label>;
}
