'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  GraduationCap,
  Heart,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Save,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react';

/* ─── Types ────────────────────────────────────────────────── */

type EmployeeDetail = {
  name: string;
  employee_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  designation?: string;
  department?: string;
  branch?: string;
  status: string;
  gender?: string;
  date_of_birth?: string;
  date_of_joining?: string;
  salutation?: string;
  cell_number?: string;
  company_email?: string;
  personal_email?: string;
  image?: string;
  reports_to?: string;
  company?: string;
  employee_number?: string;

  // Personal
  marital_status?: string;
  blood_group?: string;
  current_address?: string;
  current_accommodation_type?: string;
  permanent_address?: string;
  permanent_accommodation_type?: string;

  // Emergency
  person_to_be_contacted?: string;
  emergency_phone_number?: string;
  relation?: string;

  // Bank
  bank_name?: string;
  bank_ac_no?: string;
  iban?: string;
  salary_mode?: string;
  ctc?: number;
  salary_currency?: string;

  // Passport
  passport_number?: string;
  valid_upto?: string;
  date_of_issue?: string;
  place_of_issue?: string;

  // Employment
  holiday_list?: string;
  attendance_device_id?: string;
  date_of_retirement?: string;
  contract_end_date?: string;
  notice_number_of_days?: number;
  scheduled_confirmation_date?: string;
  final_confirmation_date?: string;

  // Exit
  resignation_letter_date?: string;
  relieving_date?: string;
  reason_for_leaving?: string;

  bio?: string;

  // Child tables
  education?: EducationRow[];
  experience?: ExperienceRow[];
};

type EducationRow = {
  school_univ?: string;
  qualification?: string;
  level?: string;
  year_of_passing?: string;
  class_per?: string;
};

type ExperienceRow = {
  company_name?: string;
  designation?: string;
  salary?: number;
  total_experience?: string;
};

/* ─── Tabs ─────────────────────────────────────────────────── */

const TABS = [
  { key: 'personal', label: 'Personal', icon: User },
  { key: 'employment', label: 'Employment', icon: Briefcase },
  { key: 'bank', label: 'Bank / PF / ESI', icon: CreditCard },
  { key: 'family', label: 'Family', icon: Heart },
  { key: 'education', label: 'Education', icon: GraduationCap },
  { key: 'experience', label: 'Experience', icon: Building2 },
  { key: 'contracts', label: 'Contracts', icon: Calendar },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'separation', label: 'Separation', icon: Shield },
] as const;

type TabKey = typeof TABS[number]['key'];

/* ─── Helpers ──────────────────────────────────────────────── */

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusChip(status: string) {
  const colors: Record<string, string> = {
    Active: 'bg-emerald-50 text-emerald-700',
    Inactive: 'bg-gray-100 text-gray-500',
    Suspended: 'bg-amber-50 text-amber-700',
    Left: 'bg-rose-50 text-rose-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

function Field({ label, value, wide }: { label: string; value?: string | number | null; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || '-'}</dd>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────── */

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const employeeId = decodeURIComponent(id);

  const [emp, setEmp] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('personal');

  // Edit mode for personal tab
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadEmployee = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/hr/employees/${encodeURIComponent(employeeId)}`);
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || 'Failed to load employee');
      setEmp(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEmployee(); }, [employeeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = () => {
    if (!emp) return;
    setEditForm({
      cell_number: emp.cell_number || '',
      personal_email: emp.personal_email || '',
      current_address: emp.current_address || '',
      permanent_address: emp.permanent_address || '',
      marital_status: emp.marital_status || '',
      blood_group: emp.blood_group || '',
      person_to_be_contacted: emp.person_to_be_contacted || '',
      emergency_phone_number: emp.emergency_phone_number || '',
      relation: emp.relation || '',
      bank_name: emp.bank_name || '',
      bank_ac_no: emp.bank_ac_no || '',
      iban: emp.iban || '',
      passport_number: emp.passport_number || '',
    });
    setEditing(true);
    setSaveError('');
  };

  const saveEdit = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/hr/employees/${encodeURIComponent(employeeId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || 'Save failed');
      setEditing(false);
      loadEmployee();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading employee profile...
      </div>
    );
  }

  if (error || !emp) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-red-600">{error || 'Employee not found'}</p>
        <Link href="/hr/employees" className="mt-4 inline-block rounded-lg bg-[#1e6b87] px-4 py-2 text-sm font-medium text-white hover:bg-[#185a73]">Back to Directory</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back + Header */}
      <div className="mb-6">
        <Link href="/hr/employees" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1e6b87] mb-4">
          <ArrowLeft className="h-4 w-4" /> Employee Directory
        </Link>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1e6b87] text-lg font-bold text-white uppercase shrink-0">
              {(emp.first_name?.[0] || emp.employee_name?.[0] || '?')}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{emp.employee_name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span>{emp.name}</span>
                {emp.designation && <span className="text-gray-400">•</span>}
                {emp.designation && <span>{emp.designation}</span>}
                {emp.department && <span className="text-gray-400">•</span>}
                {emp.department && <span>{emp.department}</span>}
                {statusChip(emp.status)}
              </div>
            </div>
          </div>
          {!editing && (
            <button onClick={startEdit} className="inline-flex items-center gap-2 rounded-lg bg-[#1e6b87] px-4 py-2 text-sm font-medium text-white hover:bg-[#185a73]">
              <Pencil className="h-4 w-4" /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-[#1e6b87] text-[#1e6b87]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab contents */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {activeTab === 'personal' && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Personal Information</h3>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <EditField label="Phone" value={editForm.cell_number} onChange={v => setEditForm(f => ({ ...f, cell_number: v }))} />
                  <EditField label="Personal Email" value={editForm.personal_email} onChange={v => setEditForm(f => ({ ...f, personal_email: v }))} />
                  <EditField label="Marital Status" value={editForm.marital_status} onChange={v => setEditForm(f => ({ ...f, marital_status: v }))} />
                  <EditField label="Blood Group" value={editForm.blood_group} onChange={v => setEditForm(f => ({ ...f, blood_group: v }))} />
                  <EditField label="Passport No." value={editForm.passport_number} onChange={v => setEditForm(f => ({ ...f, passport_number: v }))} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <EditField label="Current Address" value={editForm.current_address} onChange={v => setEditForm(f => ({ ...f, current_address: v }))} textarea />
                  <EditField label="Permanent Address" value={editForm.permanent_address} onChange={v => setEditForm(f => ({ ...f, permanent_address: v }))} textarea />
                </div>
                <h4 className="text-sm font-semibold text-gray-700 mt-4">Emergency Contact</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <EditField label="Contact Person" value={editForm.person_to_be_contacted} onChange={v => setEditForm(f => ({ ...f, person_to_be_contacted: v }))} />
                  <EditField label="Phone" value={editForm.emergency_phone_number} onChange={v => setEditForm(f => ({ ...f, emergency_phone_number: v }))} />
                  <EditField label="Relation" value={editForm.relation} onChange={v => setEditForm(f => ({ ...f, relation: v }))} />
                </div>
                <h4 className="text-sm font-semibold text-gray-700 mt-4">Bank Details</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <EditField label="Bank Name" value={editForm.bank_name} onChange={v => setEditForm(f => ({ ...f, bank_name: v }))} />
                  <EditField label="Account No." value={editForm.bank_ac_no} onChange={v => setEditForm(f => ({ ...f, bank_ac_no: v }))} />
                  <EditField label="IBAN" value={editForm.iban} onChange={v => setEditForm(f => ({ ...f, iban: v }))} />
                </div>
                {saveError && <p className="text-sm text-red-600">{saveError}</p>}
                <div className="flex items-center gap-3 pt-2">
                  <button onClick={saveEdit} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#1e6b87] px-4 py-2 text-sm font-medium text-white hover:bg-[#185a73] disabled:opacity-50">
                    <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditing(false)} className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">
                    <X className="h-4 w-4" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Full Name" value={emp.employee_name} />
                <Field label="Salutation" value={emp.salutation} />
                <Field label="Gender" value={emp.gender} />
                <Field label="Date of Birth" value={formatDate(emp.date_of_birth)} />
                <Field label="Marital Status" value={emp.marital_status} />
                <Field label="Blood Group" value={emp.blood_group} />
                <div className="sm:col-span-2 lg:col-span-3 border-t border-gray-100 pt-4 mt-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Phone className="h-4 w-4" /> Contact</h4>
                </div>
                <Field label="Phone" value={emp.cell_number} />
                <Field label="Personal Email" value={emp.personal_email} />
                <Field label="Company Email" value={emp.company_email} />
                <div className="sm:col-span-2 lg:col-span-3 border-t border-gray-100 pt-4 mt-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><MapPin className="h-4 w-4" /> Address</h4>
                </div>
                <Field label="Current Address" value={emp.current_address} wide />
                <Field label="Accommodation" value={emp.current_accommodation_type} />
                <Field label="Permanent Address" value={emp.permanent_address} wide />
                <Field label="Accommodation" value={emp.permanent_accommodation_type} />
                <div className="sm:col-span-2 lg:col-span-3 border-t border-gray-100 pt-4 mt-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Shield className="h-4 w-4" /> Passport</h4>
                </div>
                <Field label="Passport No." value={emp.passport_number} />
                <Field label="Valid Upto" value={formatDate(emp.valid_upto)} />
                <Field label="Place of Issue" value={emp.place_of_issue} />
              </dl>
            )}
          </div>
        )}

        {activeTab === 'employment' && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Employment Details</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Employee ID" value={emp.name} />
              <Field label="Employee Number" value={emp.employee_number} />
              <Field label="Company" value={emp.company} />
              <Field label="Department" value={emp.department} />
              <Field label="Designation" value={emp.designation} />
              <Field label="Branch" value={emp.branch} />
              <Field label="Reports To" value={emp.reports_to} />
              <Field label="Date of Joining" value={formatDate(emp.date_of_joining)} />
              <Field label="Status" value={emp.status} />
              <Field label="Holiday List" value={emp.holiday_list} />
              <Field label="Attendance Device ID" value={emp.attendance_device_id} />
              <Field label="Scheduled Confirmation" value={formatDate(emp.scheduled_confirmation_date)} />
              <Field label="Final Confirmation" value={formatDate(emp.final_confirmation_date)} />
              <Field label="Contract End Date" value={formatDate(emp.contract_end_date)} />
              <Field label="Notice Period (days)" value={emp.notice_number_of_days} />
              <Field label="Date of Retirement" value={formatDate(emp.date_of_retirement)} />
            </dl>
          </div>
        )}

        {activeTab === 'bank' && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Bank / PF / ESI</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Bank Name" value={emp.bank_name} />
              <Field label="Account Number" value={emp.bank_ac_no} />
              <Field label="IBAN" value={emp.iban} />
              <Field label="Salary Mode" value={emp.salary_mode} />
              <Field label="CTC" value={emp.ctc ? `${emp.salary_currency || 'INR'} ${Number(emp.ctc).toLocaleString('en-IN')}` : undefined} />
            </dl>
            <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
              PF/ESI statutory details are tracked in the <Link href="/hr" className="font-medium underline">Statutory Ledger</Link> section. Employee-level statutory numbers are synced from onboarding records.
            </div>
          </div>
        )}

        {activeTab === 'family' && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Family & Emergency</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Marital Status" value={emp.marital_status} />
              <Field label="Blood Group" value={emp.blood_group} />
            </dl>
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Emergency Contact</h4>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
                <Field label="Contact Person" value={emp.person_to_be_contacted} />
                <Field label="Phone" value={emp.emergency_phone_number} />
                <Field label="Relation" value={emp.relation} />
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'education' && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Education</h3>
            {emp.education && emp.education.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Level</th>
                      <th className="px-4 py-3 font-medium">Qualification</th>
                      <th className="px-4 py-3 font-medium">School / University</th>
                      <th className="px-4 py-3 font-medium">Year</th>
                      <th className="px-4 py-3 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {emp.education.map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.level || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{row.qualification || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{row.school_univ || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{row.year_of_passing || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{row.class_per || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">No education records found.</p>
            )}
          </div>
        )}

        {activeTab === 'experience' && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Work Experience</h3>
            {emp.experience && emp.experience.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Company</th>
                      <th className="px-4 py-3 font-medium">Designation</th>
                      <th className="px-4 py-3 font-medium">Experience</th>
                      <th className="px-4 py-3 font-medium">Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {emp.experience.map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.company_name || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{row.designation || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{row.total_experience || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{row.salary ? Number(row.salary).toLocaleString('en-IN') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">No work experience records found.</p>
            )}
          </div>
        )}

        {activeTab === 'contracts' && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Contracts & Confirmation</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Company" value={emp.company} />
              <Field label="Designation" value={emp.designation} />
              <Field label="Branch" value={emp.branch} />
              <Field label="Date of Joining" value={formatDate(emp.date_of_joining)} />
              <Field label="Scheduled Confirmation" value={formatDate(emp.scheduled_confirmation_date)} />
              <Field label="Final Confirmation" value={formatDate(emp.final_confirmation_date)} />
              <Field label="Contract End Date" value={formatDate(emp.contract_end_date)} />
              <Field label="Notice Period (days)" value={emp.notice_number_of_days} />
              <Field label="Date of Retirement" value={formatDate(emp.date_of_retirement)} />
              <Field label="Salary Mode" value={emp.salary_mode} />
              <Field
                label="CTC"
                value={emp.ctc ? `${emp.salary_currency || 'INR'} ${Number(emp.ctc).toLocaleString('en-IN')}` : undefined}
              />
            </dl>
            <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              Signed contracts, offer letters, and amendments should be stored in the <Link href="/documents" className="font-medium underline">Document Management System</Link> so the employee profile stays aligned with governed document versions.
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Documents</h3>
            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
              Employee documents are managed through the <Link href="/documents" className="font-medium underline">Document Management System</Link>. Use the DMS to upload, version, and govern employee documents like ID proofs, certificates, and contracts.
            </div>
          </div>
        )}

        {activeTab === 'separation' && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Separation & Exit</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Resignation Date" value={formatDate(emp.resignation_letter_date)} />
              <Field label="Relieving Date" value={formatDate(emp.relieving_date)} />
              <Field label="Reason for Leaving" value={emp.reason_for_leaving} wide />
            </dl>
            {emp.status !== 'Left' && emp.status !== 'Inactive' && (
              <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                This employee is currently <strong>{emp.status}</strong>. Separation details become relevant when the employee exits.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Edit Field Component ─────────────────────────────────── */

function EditField({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  const cls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e6b87]";
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className={cls} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className={cls} />
      )}
    </div>
  );
}
