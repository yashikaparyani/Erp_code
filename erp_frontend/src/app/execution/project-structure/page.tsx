'use client';

import { type ComponentType, type ReactNode, useEffect, useState } from 'react';
import { Box, Briefcase, Pencil, Plus, Trash2, Users, X } from 'lucide-react';

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

interface StaffingAssignment {
  name: string;
  linked_project?: string;
  linked_site?: string;
  employee_name?: string;
  employee_code?: string;
  position?: string;
  qualifications?: string;
  contact_number?: string;
  email?: string;
  join_date?: string;
  leave_date?: string;
  total_days_on_project?: number;
  is_active?: boolean;
  remarks?: string;
}

type MemberFormData = {
  linked_project: string;
  employee: string;
  employee_name: string;
  role: string;
  designation: string;
  from_date: string;
};

type AssetFormData = {
  linked_project: string;
  linked_site: string;
  asset_name: string;
  asset_type: string;
  make_model: string;
  serial_no: string;
  quantity: number;
  unit_cost: number;
  vendor: string;
};

type StaffingFormData = {
  linked_project: string;
  linked_site: string;
  employee_name: string;
  employee_code: string;
  position: string;
  qualifications: string;
  contact_number: string;
  email: string;
  join_date: string;
  leave_date: string;
  is_active: boolean;
  remarks: string;
};

const initialMemberForm: MemberFormData = {
  linked_project: '',
  employee: '',
  employee_name: '',
  role: '',
  designation: '',
  from_date: '',
};

const initialAssetForm: AssetFormData = {
  linked_project: '',
  linked_site: '',
  asset_name: '',
  asset_type: 'Equipment',
  make_model: '',
  serial_no: '',
  quantity: 1,
  unit_cost: 0,
  vendor: '',
};

const initialStaffingForm: StaffingFormData = {
  linked_project: '',
  linked_site: '',
  employee_name: '',
  employee_code: '',
  position: '',
  qualifications: '',
  contact_number: '',
  email: '',
  join_date: '',
  leave_date: '',
  is_active: true,
  remarks: '',
};

const ASSET_STATUS_BADGES: Record<string, string> = {
  Deployed: 'badge-success',
  'In Transit': 'badge-warning',
  Returned: 'badge-gray',
  Damaged: 'badge-error',
  Expired: 'badge-error',
};

export default function ProjectStructurePage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [staffingAssignments, setStaffingAssignments] = useState<StaffingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'team' | 'assets' | 'staffing'>('team');
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showStaffingModal, setShowStaffingModal] = useState(false);
  const [memberForm, setMemberForm] = useState<MemberFormData>(initialMemberForm);
  const [assetForm, setAssetForm] = useState<AssetFormData>(initialAssetForm);
  const [staffingForm, setStaffingForm] = useState<StaffingFormData>(initialStaffingForm);
  const [editingStaffing, setEditingStaffing] = useState<StaffingAssignment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [membersRes, assetsRes, staffingRes] = await Promise.all([
      fetch('/api/execution/project-team-members').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/execution/project-assets').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/execution/staffing-assignments').then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setMembers(membersRes.data || []);
    setAssets(assetsRes.data || []);
    setStaffingAssignments(staffingRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreateMember = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/execution/project-team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberForm),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowMemberModal(false);
      setMemberForm(initialMemberForm);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAsset = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/execution/project-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetForm),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowAssetModal(false);
      setAssetForm(initialAssetForm);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openStaffingCreate = () => {
    setEditingStaffing(null);
    setStaffingForm(initialStaffingForm);
    setError('');
    setShowStaffingModal(true);
  };

  const openStaffingEdit = (assignment: StaffingAssignment) => {
    setEditingStaffing(assignment);
    setStaffingForm({
      linked_project: assignment.linked_project || '',
      linked_site: assignment.linked_site || '',
      employee_name: assignment.employee_name || '',
      employee_code: assignment.employee_code || '',
      position: assignment.position || '',
      qualifications: assignment.qualifications || '',
      contact_number: assignment.contact_number || '',
      email: assignment.email || '',
      join_date: assignment.join_date || '',
      leave_date: assignment.leave_date || '',
      is_active: assignment.is_active !== false,
      remarks: assignment.remarks || '',
    });
    setError('');
    setShowStaffingModal(true);
  };

  const handleSaveStaffing = async () => {
    if (!staffingForm.linked_project.trim() || !staffingForm.employee_name.trim()) {
      setError('Project and employee name are required.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const body = editingStaffing
        ? { action: 'update', name: editingStaffing.name, ...staffingForm }
        : staffingForm;
      const response = await fetch('/api/execution/staffing-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowStaffingModal(false);
      setEditingStaffing(null);
      setStaffingForm(initialStaffingForm);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaffing = async (assignment: StaffingAssignment) => {
    if (!window.confirm(`Delete staffing assignment for ${assignment.employee_name || assignment.name}?`)) {
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/execution/staffing-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', name: assignment.name }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Failed');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndStaffing = async (assignment: StaffingAssignment) => {
    const leaveDate = window.prompt('Leave date (YYYY-MM-DD)', assignment.leave_date || '');
    if (leaveDate === null) return;
    const remarks = window.prompt('Closing remarks (optional)', assignment.remarks || '') || '';

    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/execution/staffing-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', name: assignment.name, leave_date: leaveDate || undefined, remarks }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Failed');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col justify-between gap-3 sm:mb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Project Structure</h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Manage execution team members, project assets, and staffing assignments from one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => setShowMemberModal(true)}>
            <Plus className="h-4 w-4" /> Add Member
          </button>
          <button className="btn btn-secondary" onClick={() => setShowAssetModal(true)}>
            <Box className="h-4 w-4" /> Add Asset
          </button>
          <button className="btn btn-secondary" onClick={openStaffingCreate}>
            <Briefcase className="h-4 w-4" /> Add Staffing
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 sm:gap-4 sm:mb-6">
        <StatCard icon={Users} color="blue" label="Team Members" value={members.length} />
        <StatCard icon={Users} color="green" label="Active Members" value={members.filter((m) => m.is_active !== false).length} />
        <StatCard icon={Box} color="violet" label="Total Assets" value={assets.length} />
        <StatCard icon={Box} color="amber" label="Deployed Assets" value={assets.filter((a) => a.status === 'Deployed').length} />
        <StatCard icon={Briefcase} color="slate" label="Staffing Assignments" value={staffingAssignments.length} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button className={`btn ${activeTab === 'team' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('team')}>
          Team ({members.length})
        </button>
        <button className={`btn ${activeTab === 'assets' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('assets')}>
          Assets ({assets.length})
        </button>
        <button className={`btn ${activeTab === 'staffing' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('staffing')}>
          Staffing ({staffingAssignments.length})
        </button>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {activeTab === 'team' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Team Members</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Employee</th><th>Role</th><th>Designation</th><th>Project</th><th>From Date</th><th>Active</th></tr></thead>
              <tbody>
                {members.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-500">No team members assigned</td></tr>
                ) : members.map((m) => (
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
                  <tr><td colSpan={7} className="py-8 text-center text-gray-500">No project assets registered</td></tr>
                ) : assets.map((a) => (
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

      {activeTab === 'staffing' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Staffing Assignments</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Employee</th>
                  <th>Position</th>
                  <th>Project / Site</th>
                  <th>Join / Leave</th>
                  <th>Total Days</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffingAssignments.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-gray-500">No staffing assignments found</td></tr>
                ) : staffingAssignments.map((assignment) => (
                  <tr key={assignment.name}>
                    <td><div className="font-medium text-gray-900">{assignment.name}</div></td>
                    <td>
                      <div className="text-sm text-gray-900">{assignment.employee_name || '-'}</div>
                      <div className="text-xs text-gray-500">{assignment.employee_code || ''}</div>
                    </td>
                    <td>
                      <div className="text-sm text-gray-900">{assignment.position || '-'}</div>
                      <div className="text-xs text-gray-500">{assignment.qualifications || ''}</div>
                    </td>
                    <td>
                      <div className="text-sm text-gray-900">{assignment.linked_project || '-'}</div>
                      <div className="text-xs text-gray-500">{assignment.linked_site || ''}</div>
                    </td>
                    <td>
                      <div className="text-sm text-gray-900">{assignment.join_date || '-'}</div>
                      <div className="text-xs text-gray-500">{assignment.leave_date || 'Active'}</div>
                    </td>
                    <td><div className="text-sm text-gray-900">{assignment.total_days_on_project ?? 0}</div></td>
                    <td>
                      <span className={`badge ${assignment.is_active !== false ? 'badge-success' : 'badge-gray'}`}>
                        {assignment.is_active !== false ? 'Active' : 'Closed'}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button className="btn btn-secondary !px-2.5 !py-1.5" onClick={() => openStaffingEdit(assignment)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {assignment.is_active !== false && (
                          <button className="btn btn-secondary !px-2.5 !py-1.5" onClick={() => void handleEndStaffing(assignment)}>
                            End
                          </button>
                        )}
                        <button className="btn btn-secondary !px-2.5 !py-1.5 text-red-600" onClick={() => void handleDeleteStaffing(assignment)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showMemberModal && (
        <Modal title="Add Team Member" onClose={() => setShowMemberModal(false)}>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
            <Field label="Project"><input className="input" value={memberForm.linked_project} onChange={(e) => setMemberForm({ ...memberForm, linked_project: e.target.value })} /></Field>
            <Field label="Employee"><input className="input" value={memberForm.employee} onChange={(e) => setMemberForm({ ...memberForm, employee: e.target.value })} /></Field>
            <Field label="Employee Name"><input className="input" value={memberForm.employee_name} onChange={(e) => setMemberForm({ ...memberForm, employee_name: e.target.value })} /></Field>
            <Field label="Role"><input className="input" value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })} /></Field>
            <Field label="Designation"><input className="input" value={memberForm.designation} onChange={(e) => setMemberForm({ ...memberForm, designation: e.target.value })} /></Field>
            <Field label="From Date"><input className="input" type="date" value={memberForm.from_date} onChange={(e) => setMemberForm({ ...memberForm, from_date: e.target.value })} /></Field>
          </div>
          <ModalFooter
            busy={isSubmitting}
            busyLabel="Adding..."
            submitLabel="Add Member"
            onCancel={() => setShowMemberModal(false)}
            onSubmit={() => void handleCreateMember()}
          />
        </Modal>
      )}

      {showAssetModal && (
        <Modal title="Add Project Asset" onClose={() => setShowAssetModal(false)}>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
            <Field label="Project"><input className="input" value={assetForm.linked_project} onChange={(e) => setAssetForm({ ...assetForm, linked_project: e.target.value })} /></Field>
            <Field label="Site"><input className="input" value={assetForm.linked_site} onChange={(e) => setAssetForm({ ...assetForm, linked_site: e.target.value })} /></Field>
            <Field label="Asset Name"><input className="input" value={assetForm.asset_name} onChange={(e) => setAssetForm({ ...assetForm, asset_name: e.target.value })} /></Field>
            <Field label="Asset Type">
              <select className="input" value={assetForm.asset_type} onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value })}>
                <option value="Equipment">Equipment</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Tool">Tool</option>
                <option value="Instrument">Instrument</option>
                <option value="IT Asset">IT Asset</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Make / Model"><input className="input" value={assetForm.make_model} onChange={(e) => setAssetForm({ ...assetForm, make_model: e.target.value })} /></Field>
            <Field label="Serial No"><input className="input" value={assetForm.serial_no} onChange={(e) => setAssetForm({ ...assetForm, serial_no: e.target.value })} /></Field>
            <Field label="Quantity"><input className="input" type="number" min="1" value={assetForm.quantity} onChange={(e) => setAssetForm({ ...assetForm, quantity: Number(e.target.value || 1) })} /></Field>
            <Field label="Vendor"><input className="input" value={assetForm.vendor} onChange={(e) => setAssetForm({ ...assetForm, vendor: e.target.value })} /></Field>
          </div>
          <ModalFooter
            busy={isSubmitting}
            busyLabel="Adding..."
            submitLabel="Add Asset"
            onCancel={() => setShowAssetModal(false)}
            onSubmit={() => void handleCreateAsset()}
          />
        </Modal>
      )}

      {showStaffingModal && (
        <Modal title={editingStaffing ? 'Edit Staffing Assignment' : 'Add Staffing Assignment'} onClose={() => setShowStaffingModal(false)}>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
            <Field label="Project *"><input className="input" value={staffingForm.linked_project} onChange={(e) => setStaffingForm({ ...staffingForm, linked_project: e.target.value })} /></Field>
            <Field label="Site"><input className="input" value={staffingForm.linked_site} onChange={(e) => setStaffingForm({ ...staffingForm, linked_site: e.target.value })} /></Field>
            <Field label="Employee Name *"><input className="input" value={staffingForm.employee_name} onChange={(e) => setStaffingForm({ ...staffingForm, employee_name: e.target.value })} /></Field>
            <Field label="Employee Code"><input className="input" value={staffingForm.employee_code} onChange={(e) => setStaffingForm({ ...staffingForm, employee_code: e.target.value })} /></Field>
            <Field label="Position"><input className="input" value={staffingForm.position} onChange={(e) => setStaffingForm({ ...staffingForm, position: e.target.value })} /></Field>
            <Field label="Qualifications"><input className="input" value={staffingForm.qualifications} onChange={(e) => setStaffingForm({ ...staffingForm, qualifications: e.target.value })} /></Field>
            <Field label="Contact Number"><input className="input" value={staffingForm.contact_number} onChange={(e) => setStaffingForm({ ...staffingForm, contact_number: e.target.value })} /></Field>
            <Field label="Email"><input className="input" type="email" value={staffingForm.email} onChange={(e) => setStaffingForm({ ...staffingForm, email: e.target.value })} /></Field>
            <Field label="Join Date"><input className="input" type="date" value={staffingForm.join_date} onChange={(e) => setStaffingForm({ ...staffingForm, join_date: e.target.value })} /></Field>
            <Field label="Leave Date"><input className="input" type="date" value={staffingForm.leave_date} onChange={(e) => setStaffingForm({ ...staffingForm, leave_date: e.target.value })} /></Field>
            <Field label="Remarks" full><textarea className="input min-h-[110px]" value={staffingForm.remarks} onChange={(e) => setStaffingForm({ ...staffingForm, remarks: e.target.value })} /></Field>
            <label className="flex items-center gap-3 md:col-span-2">
              <input type="checkbox" checked={staffingForm.is_active} onChange={(e) => setStaffingForm({ ...staffingForm, is_active: e.target.checked })} />
              <span className="text-sm text-gray-700">Keep assignment active</span>
            </label>
          </div>
          <ModalFooter
            busy={isSubmitting}
            busyLabel="Saving..."
            submitLabel={editingStaffing ? 'Save Assignment' : 'Create Assignment'}
            onCancel={() => setShowStaffingModal(false)}
            onSubmit={() => void handleSaveStaffing()}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button className="rounded-lg p-2 hover:bg-gray-100" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({
  busy,
  busyLabel,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  busyLabel: string;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="px-6 pb-6">
      <div className="flex justify-end gap-3">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={onSubmit} disabled={busy}>{busy ? busyLabel : submitLabel}</button>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  color: string;
  label: string;
  value: number;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    violet: 'bg-violet-100 text-violet-600',
    amber: 'bg-amber-100 text-amber-600',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors[color] || colors.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
      </div>
    </div>
  );
}

function Field({ label, children, full = false }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={full ? 'md:col-span-2' : ''}>
      <div className="mb-2 text-sm font-medium text-gray-700">{label}</div>
      {children}
    </label>
  );
}
