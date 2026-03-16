'use client';
import { useEffect, useState } from 'react';
import { Box, Plus, Users, X } from 'lucide-react';

interface TeamMember {
  name: string;
  linked_project?: string;
  employee?: string;
  employee_name?: string;
  role?: string;
  designation?: string;
  is_active?: boolean;
  from_date?: string;
  to_date?: string;
}

interface ProjectAsset {
  name: string;
  linked_project?: string;
  linked_site?: string;
  asset_name?: string;
  asset_type?: string;
  make_model?: string;
  serial_no?: string;
  quantity?: number;
  unit_cost?: number;
  vendor?: string;
  status?: string;
  deployment_date?: string;
  warranty_end_date?: string;
}

type MemberFormData = { linked_project: string; employee: string; employee_name: string; role: string; designation: string; from_date: string };
const initialMemberForm: MemberFormData = { linked_project: '', employee: '', employee_name: '', role: '', designation: '', from_date: '' };

type AssetFormData = { linked_project: string; linked_site: string; asset_name: string; asset_type: string; make_model: string; serial_no: string; quantity: number; unit_cost: number; vendor: string };
const initialAssetForm: AssetFormData = { linked_project: '', linked_site: '', asset_name: '', asset_type: 'Equipment', make_model: '', serial_no: '', quantity: 1, unit_cost: 0, vendor: '' };

const ASSET_STATUS_BADGES: Record<string, string> = { Deployed: 'badge-success', 'In Transit': 'badge-warning', Returned: 'badge-gray', Damaged: 'badge-error', Expired: 'badge-error' };

export default function ProjectStructurePage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'team' | 'assets'>('team');
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [memberForm, setMemberForm] = useState<MemberFormData>(initialMemberForm);
  const [assetForm, setAssetForm] = useState<AssetFormData>(initialAssetForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [membersRes, assetsRes] = await Promise.all([
      fetch('/api/execution/project-team-members').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/execution/project-assets').then(r => r.json()).catch(() => ({ data: [] })),
    ]);
    setMembers(membersRes.data || []);
    setAssets(assetsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateMember = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/execution/project-team-members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(memberForm) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowMemberModal(false);
      setMemberForm(initialMemberForm);
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setIsSubmitting(false); }
  };

  const handleCreateAsset = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/execution/project-assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assetForm) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowAssetModal(false);
      setAssetForm(initialAssetForm);
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); } finally { setIsSubmitting(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Project Structure</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage team members and assets assigned to execution projects.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => setShowMemberModal(true)}><Plus className="w-4 h-4" /> Add Member</button>
          <button className="btn btn-secondary" onClick={() => setShowAssetModal(true)}><Box className="w-4 h-4" /> Add Asset</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard icon={Users} color="blue" label="Team Members" value={members.length} />
        <StatCard icon={Users} color="green" label="Active Members" value={members.filter(m => m.is_active !== false).length} />
        <StatCard icon={Box} color="violet" label="Total Assets" value={assets.length} />
        <StatCard icon={Box} color="amber" label="Deployed Assets" value={assets.filter(a => a.status === 'Deployed').length} />
      </div>

      <div className="flex gap-2 mb-4">
        <button className={`btn ${activeTab === 'team' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('team')}>Team ({members.length})</button>
        <button className={`btn ${activeTab === 'assets' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('assets')}>Assets ({assets.length})</button>
      </div>

      {activeTab === 'team' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Team Members</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Employee</th><th>Role</th><th>Designation</th><th>Project</th><th>From Date</th><th>Active</th></tr></thead>
              <tbody>
                {members.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-500">No team members assigned</td></tr>
                ) : members.map(m => (
                  <tr key={m.name}>
                    <td><div className="font-medium text-gray-900">{m.name}</div></td>
                    <td>
                      <div className="text-sm text-gray-900">{m.employee_name || m.employee || '-'}</div>
                      <div className="text-xs text-gray-500">{m.employee || ''}</div>
                    </td>
                    <td><div className="text-sm text-gray-900">{m.role || '-'}</div></td>
                    <td><div className="text-sm text-gray-900">{m.designation || '-'}</div></td>
                    <td><div className="text-sm text-gray-900">{m.linked_project || '-'}</div></td>
                    <td><div className="text-sm text-gray-500">{m.from_date || '-'}</div></td>
                    <td><span className={`badge ${m.is_active !== false ? 'badge-success' : 'badge-gray'}`}>{m.is_active !== false ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Project Assets</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Asset</th><th>Type / Make</th><th>Serial No</th><th>Project / Site</th><th>Qty</th><th>Status</th></tr></thead>
              <tbody>
                {assets.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-500">No project assets registered</td></tr>
                ) : assets.map(a => (
                  <tr key={a.name}>
                    <td><div className="font-medium text-gray-900">{a.name}</div></td>
                    <td><div className="text-sm text-gray-900">{a.asset_name || '-'}</div></td>
                    <td>
                      <div className="text-sm text-gray-900">{a.asset_type || '-'}</div>
                      <div className="text-xs text-gray-500">{a.make_model || ''}</div>
                    </td>
                    <td><div className="text-sm text-gray-900">{a.serial_no || '-'}</div></td>
                    <td>
                      <div className="text-sm text-gray-900">{a.linked_project || '-'}</div>
                      <div className="text-xs text-gray-500">{a.linked_site || ''}</div>
                    </td>
                    <td><div className="text-sm text-gray-900">{a.quantity ?? 1}</div></td>
                    <td><span className={`badge ${ASSET_STATUS_BADGES[a.status || ''] || 'badge-gray'}`}>{a.status || '-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Add Team Member</h2>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowMemberModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Project"><input className="input" value={memberForm.linked_project} onChange={e => setMemberForm({ ...memberForm, linked_project: e.target.value })} /></Field>
              <Field label="Employee"><input className="input" value={memberForm.employee} onChange={e => setMemberForm({ ...memberForm, employee: e.target.value })} /></Field>
              <Field label="Employee Name"><input className="input" value={memberForm.employee_name} onChange={e => setMemberForm({ ...memberForm, employee_name: e.target.value })} /></Field>
              <Field label="Role"><input className="input" value={memberForm.role} onChange={e => setMemberForm({ ...memberForm, role: e.target.value })} /></Field>
              <Field label="Designation"><input className="input" value={memberForm.designation} onChange={e => setMemberForm({ ...memberForm, designation: e.target.value })} /></Field>
              <Field label="From Date"><input className="input" type="date" value={memberForm.from_date} onChange={e => setMemberForm({ ...memberForm, from_date: e.target.value })} /></Field>
            </div>
            <div className="px-6 pb-6">
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-3">
                <button className="btn btn-secondary" onClick={() => setShowMemberModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateMember} disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Member'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Add Project Asset</h2>
              <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowAssetModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Project"><input className="input" value={assetForm.linked_project} onChange={e => setAssetForm({ ...assetForm, linked_project: e.target.value })} /></Field>
              <Field label="Site"><input className="input" value={assetForm.linked_site} onChange={e => setAssetForm({ ...assetForm, linked_site: e.target.value })} /></Field>
              <Field label="Asset Name"><input className="input" value={assetForm.asset_name} onChange={e => setAssetForm({ ...assetForm, asset_name: e.target.value })} /></Field>
              <Field label="Asset Type">
                <select className="input" value={assetForm.asset_type} onChange={e => setAssetForm({ ...assetForm, asset_type: e.target.value })}>
                  <option value="Equipment">Equipment</option><option value="Vehicle">Vehicle</option><option value="Tool">Tool</option>
                  <option value="Instrument">Instrument</option><option value="IT Asset">IT Asset</option><option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Make / Model"><input className="input" value={assetForm.make_model} onChange={e => setAssetForm({ ...assetForm, make_model: e.target.value })} /></Field>
              <Field label="Serial No"><input className="input" value={assetForm.serial_no} onChange={e => setAssetForm({ ...assetForm, serial_no: e.target.value })} /></Field>
              <Field label="Quantity"><input className="input" type="number" min="1" value={assetForm.quantity} onChange={e => setAssetForm({ ...assetForm, quantity: Number(e.target.value || 1) })} /></Field>
              <Field label="Vendor"><input className="input" value={assetForm.vendor} onChange={e => setAssetForm({ ...assetForm, vendor: e.target.value })} /></Field>
            </div>
            <div className="px-6 pb-6">
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-3">
                <button className="btn btn-secondary" onClick={() => setShowAssetModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateAsset} disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Asset'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: number }) {
  const colors: Record<string, string> = { blue: 'bg-blue-100 text-blue-600', green: 'bg-green-100 text-green-600', violet: 'bg-violet-100 text-violet-600', amber: 'bg-amber-100 text-amber-600' };
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
