'use client';

import Link from 'next/link';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  FileText,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import ActionModal from '@/components/ui/ActionModal';

type OnboardingStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'MAPPED_TO_EMPLOYEE';

type OnboardingSummary = {
  name: string;
  employee_name: string;
  company?: string;
  designation?: string;
  onboarding_status: OnboardingStatus;
  date_of_joining?: string;
  employee_reference?: string;
  submitted_by?: string;
  reviewed_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
  form_source?: string;
  project_location?: string;
  project_city?: string;
  creation?: string;
  modified?: string;
};

type EducationRow = {
  name?: string;
  doctype?: string;
  school_univ?: string;
  qualification?: string;
  level?: string;
  year_of_passing?: string;
  class_per?: string;
};

type ExperienceRow = {
  name?: string;
  doctype?: string;
  company_name?: string;
  designation?: string;
  salary?: number | string;
  total_experience?: string;
};

type DocumentRow = {
  name?: string;
  doctype?: string;
  document_type?: string;
  is_mandatory?: number | boolean;
  file?: string;
  verification_status?: string;
  verified_by?: string;
  verified_on?: string;
  remarks?: string;
};

type OnboardingDetail = OnboardingSummary & {
  salutation?: string;
  gender?: string;
  date_of_birth?: string;
  blood_group?: string;
  marital_status?: string;
  spouse_name?: string;
  father_name?: string;
  mother_name?: string;
  contact_number?: string;
  alternate_contact_number?: string;
  personal_email?: string;
  permanent_address?: string;
  local_address?: string;
  project_state?: string;
  aadhar_number?: string;
  pan_number?: string;
  epf_number?: string;
  esic_number?: string;
  remarks?: string;
  education?: EducationRow[];
  experience?: ExperienceRow[];
  documents?: DocumentRow[];
};

type OnboardingStats = {
  total: number;
  draft: number;
  submitted: number;
  under_review: number;
  approved: number;
  rejected: number;
  mapped_to_employee: number;
};

type MappingPreview = {
  employee_preview: Record<string, string | number | null | undefined>;
  readiness: {
    can_map: boolean;
    status: string;
    linked_employee?: string;
    missing_documents: string[];
    missing_fields: string[];
    blocking_reasons: string[];
    education_rows: number;
    experience_rows: number;
    document_rows: number;
  };
};

type Flash = {
  tone: 'success' | 'error';
  message: string;
};

type Mode = 'view' | 'create' | 'edit';

type ActionKey = 'submit' | 'review' | 'send_back' | 'approve' | 'reject' | 'reopen' | 'map';

const STATUS_ORDER: OnboardingStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'MAPPED_TO_EMPLOYEE',
];

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'MAPPED_TO_EMPLOYEE', label: 'Mapped To Employee' },
];

const FORM_SOURCE_OPTIONS = ['Manual', 'Bulk Import', 'Field App'];
const BLOOD_GROUP_OPTIONS = ['', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const MARITAL_STATUS_OPTIONS = ['', 'Single', 'Married', 'Divorced', 'Widowed'];
const DOCUMENT_TYPE_OPTIONS = [
  'Passport Size Photo',
  'CV',
  '10th Mark Sheet',
  '12th Mark Sheet',
  'Diploma Certificate',
  'UG Certificate',
  'PG Certificate',
  'Aadhar Card',
  'PAN Card',
  'Birth Certificate',
  'Certifications Bundle',
  'Other',
];

const EMPTY_STATS: OnboardingStats = {
  total: 0,
  draft: 0,
  submitted: 0,
  under_review: 0,
  approved: 0,
  rejected: 0,
  mapped_to_employee: 0,
};

function createEmptyDetail(): OnboardingDetail {
  return {
    name: '',
    employee_name: '',
    company: '',
    designation: '',
    onboarding_status: 'DRAFT',
    date_of_joining: '',
    form_source: 'Manual',
    project_state: '',
    project_location: '',
    project_city: '',
    salutation: '',
    gender: '',
    date_of_birth: '',
    blood_group: '',
    marital_status: '',
    spouse_name: '',
    father_name: '',
    mother_name: '',
    contact_number: '',
    alternate_contact_number: '',
    personal_email: '',
    permanent_address: '',
    local_address: '',
    aadhar_number: '',
    pan_number: '',
    epf_number: '',
    esic_number: '',
    remarks: '',
    education: [],
    experience: [],
    documents: [],
  };
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusChip(status: string) {
  const classes: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    SUBMITTED: 'bg-sky-50 text-sky-700',
    UNDER_REVIEW: 'bg-amber-50 text-amber-700',
    APPROVED: 'bg-emerald-50 text-emerald-700',
    REJECTED: 'bg-rose-50 text-rose-700',
    MAPPED_TO_EMPLOYEE: 'bg-violet-50 text-violet-700',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${classes[status] || 'bg-slate-100 text-slate-700'}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}

function mapDetailToForm(detail: OnboardingDetail): OnboardingDetail {
  return {
    ...createEmptyDetail(),
    ...detail,
    education: (detail.education || []).map((row) => ({ ...row })),
    experience: (detail.experience || []).map((row) => ({ ...row })),
    documents: (detail.documents || []).map((row) => ({ ...row })),
  };
}

function buildPayload(form: OnboardingDetail) {
  return {
    employee_name: form.employee_name || '',
    company: form.company || '',
    designation: form.designation || '',
    date_of_joining: form.date_of_joining || '',
    form_source: form.form_source || 'Manual',
    project_state: form.project_state || '',
    project_location: form.project_location || '',
    project_city: form.project_city || '',
    salutation: form.salutation || '',
    gender: form.gender || '',
    date_of_birth: form.date_of_birth || '',
    blood_group: form.blood_group || '',
    marital_status: form.marital_status || '',
    spouse_name: form.spouse_name || '',
    father_name: form.father_name || '',
    mother_name: form.mother_name || '',
    contact_number: form.contact_number || '',
    alternate_contact_number: form.alternate_contact_number || '',
    personal_email: form.personal_email || '',
    permanent_address: form.permanent_address || '',
    local_address: form.local_address || '',
    aadhar_number: form.aadhar_number || '',
    pan_number: form.pan_number || '',
    epf_number: form.epf_number || '',
    esic_number: form.esic_number || '',
    remarks: form.remarks || '',
    education: (form.education || [])
      .filter((row) => row.school_univ || row.qualification || row.level || row.year_of_passing || row.class_per)
      .map((row) => ({
        name: row.name,
        doctype: row.doctype || 'Employee Education',
        school_univ: row.school_univ || '',
        qualification: row.qualification || '',
        level: row.level || '',
        year_of_passing: row.year_of_passing || '',
        class_per: row.class_per || '',
      })),
    experience: (form.experience || [])
      .filter((row) => row.company_name || row.designation || row.total_experience || row.salary)
      .map((row) => ({
        name: row.name,
        doctype: row.doctype || 'Employee External Work History',
        company_name: row.company_name || '',
        designation: row.designation || '',
        total_experience: row.total_experience || '',
        salary: row.salary || '',
      })),
    documents: (form.documents || [])
      .filter((row) => row.document_type || row.file || row.remarks)
      .map((row) => ({
        name: row.name,
        doctype: row.doctype || 'GE Employee Document',
        document_type: row.document_type || 'Other',
        is_mandatory: row.is_mandatory ? 1 : 0,
        file: row.file || '',
        verification_status: row.verification_status || 'PENDING',
        verified_by: row.verified_by || '',
        verified_on: row.verified_on || '',
        remarks: row.remarks || '',
      })),
  };
}

function ReadField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{value || '-'}</dd>
    </div>
  );
}

function FieldShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1e6b87] focus:ring-2 focus:ring-[#1e6b87]/20 ${props.className || ''}`} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1e6b87] focus:ring-2 focus:ring-[#1e6b87]/20 ${props.className || ''}`} />;
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1e6b87] focus:ring-2 focus:ring-[#1e6b87]/20 ${props.className || ''}`} />;
}

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: number; hint: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
          <div className="mt-1 text-xs text-slate-500">{hint}</div>
        </div>
        <div className="rounded-xl bg-[#1e6b87]/10 p-2 text-[#1e6b87]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function StatusRail({ status }: { status: OnboardingStatus }) {
  const statusIndex = STATUS_ORDER.indexOf(status === 'REJECTED' ? 'UNDER_REVIEW' : status);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Workflow progress</div>
          <div className="text-xs text-slate-500">Draft to employee mapping with visible review checkpoints.</div>
        </div>
        {statusChip(status)}
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        {STATUS_ORDER.map((step, index) => {
          const active = index <= statusIndex;
          const current = step === status || (status === 'REJECTED' && step === 'UNDER_REVIEW');
          return (
            <div key={step} className={`rounded-xl border p-3 ${current ? 'border-[#1e6b87] bg-[#1e6b87]/5' : active ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${active ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{index + 1}</span>
                {step.replaceAll('_', ' ')}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {step === 'DRAFT' && 'Capture candidate details and checklist rows.'}
                {step === 'SUBMITTED' && 'Ready for HR screening.'}
                {step === 'UNDER_REVIEW' && 'Reviewer checks docs and statutory data.'}
                {step === 'APPROVED' && 'Approved for employee creation.'}
                {step === 'MAPPED_TO_EMPLOYEE' && 'Employee master created and linked.'}
              </div>
            </div>
          );
        })}
      </div>
      {status === 'REJECTED' && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          This record is rejected. Reopen it to draft, update the missing information, and resubmit.
        </div>
      )}
    </div>
  );
}

export default function HrOnboardingPage() {
  const [items, setItems] = useState<OnboardingSummary[]>([]);
  const [stats, setStats] = useState<OnboardingStats>(EMPTY_STATS);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<OnboardingDetail | null>(null);
  const [preview, setPreview] = useState<MappingPreview | null>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [form, setForm] = useState<OnboardingDetail>(createEmptyDetail());
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<ActionKey | null>(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState<Flash | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadWorkspace = useCallback(async (preferredId?: string) => {
    setLoadingList(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const [listRes, statsRes] = await Promise.all([
        fetch(`/api/hr/onboarding?${params.toString()}`),
        fetch('/api/ops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'get_onboarding_stats' }),
        }),
      ]);

      const listJson = await listRes.json();
      const statsJson = await statsRes.json();

      if (!listRes.ok || listJson.success === false) {
        throw new Error(listJson.message || 'Failed to load onboarding queue');
      }

      setItems(listJson.data || []);
      setStats(statsJson.data || EMPTY_STATS);

      if (mode === 'create') {
        return;
      }

      const nextId = preferredId || selectedId;
      const nextSelection = (listJson.data || []).find((item: OnboardingSummary) => item.name === nextId)?.name
        || listJson.data?.[0]?.name
        || '';

      setSelectedId(nextSelection);
      if (!nextSelection) {
        setDetail(null);
        setPreview(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load onboarding workspace');
    } finally {
      setLoadingList(false);
    }
  }, [mode, search, selectedId, statusFilter]);

  const loadRecord = useCallback(async (name: string) => {
    setLoadingDetail(true);
    setError('');

    try {
      const [detailRes, previewRes] = await Promise.all([
        fetch(`/api/hr/onboarding/${encodeURIComponent(name)}`),
        fetch(`/api/hr/onboarding/${encodeURIComponent(name)}/preview`),
      ]);

      const detailJson = await detailRes.json();
      const previewJson = await previewRes.json().catch(() => ({ success: false }));

      if (!detailRes.ok || detailJson.success === false) {
        throw new Error(detailJson.message || 'Failed to load onboarding record');
      }

      setDetail(detailJson.data);
      if (mode === 'edit') {
        setForm(mapDetailToForm(detailJson.data));
      }
      setPreview(previewJson.success === false ? null : previewJson.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load onboarding record');
    } finally {
      setLoadingDetail(false);
    }
  }, [mode]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!selectedId || mode === 'create') return;
    void loadRecord(selectedId);
  }, [selectedId, mode, loadRecord]);

  function startCreate() {
    setMode('create');
    setSelectedId('');
    setDetail(null);
    setPreview(null);
    setForm(createEmptyDetail());
    setFlash(null);
  }

  function startEdit() {
    if (!detail) return;
    setMode('edit');
    setForm(mapDetailToForm(detail));
    setFlash(null);
  }

  function cancelEdit() {
    setMode('view');
    if (detail) {
      setForm(mapDetailToForm(detail));
    } else {
      setForm(createEmptyDetail());
    }
  }

  function setField<K extends keyof OnboardingDetail>(field: K, value: OnboardingDetail[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addEducationRow() {
    setForm((current) => ({
      ...current,
      education: [...(current.education || []), { doctype: 'Employee Education' }],
    }));
  }

  function addExperienceRow() {
    setForm((current) => ({
      ...current,
      experience: [...(current.experience || []), { doctype: 'Employee External Work History' }],
    }));
  }

  function addDocumentRow() {
    setForm((current) => ({
      ...current,
      documents: [...(current.documents || []), { doctype: 'GE Employee Document', verification_status: 'PENDING' }],
    }));
  }

  async function saveForm() {
    if (!form.employee_name.trim() || !form.company?.trim()) {
      setFlash({ tone: 'error', message: 'Employee name and company are required.' });
      return;
    }

    setSaving(true);
    setFlash(null);

    try {
      const payload = buildPayload(form);
      const response = await fetch(
        mode === 'create'
          ? '/api/hr/onboarding'
          : `/api/hr/onboarding/${encodeURIComponent(form.name)}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Failed to save onboarding record');
      }

      const saved = data.data as OnboardingDetail;
      setMode('view');
      setSelectedId(saved.name);
      setDetail(saved);
      setForm(mapDetailToForm(saved));
      setFlash({ tone: 'success', message: mode === 'create' ? 'Onboarding draft created.' : 'Onboarding record updated.' });
      await loadWorkspace(saved.name);
      await loadRecord(saved.name);
    } catch (saveError) {
      setFlash({ tone: 'error', message: saveError instanceof Error ? saveError.message : 'Failed to save onboarding record' });
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: ActionKey, extra?: Record<string, string>) {
    if (!selectedId) return;

    let reason: string | undefined;
    if (action === 'reject') {
      reason = extra?.reason;
      if (!reason) return;
    }

    setBusyAction(action);
    setFlash(null);

    try {
      const response = await fetch(`/api/hr/onboarding/${encodeURIComponent(selectedId)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Failed to run onboarding action');
      }

      setFlash({ tone: 'success', message: data.message || 'Action completed.' });
      await loadWorkspace(selectedId);
      await loadRecord(selectedId);
    } catch (actionError) {
      setFlash({ tone: 'error', message: actionError instanceof Error ? actionError.message : 'Failed to run onboarding action' });
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteRecord() {
    if (!selectedId) return;

    setSaving(true);
    setFlash(null);

    try {
      const response = await fetch(`/api/hr/onboarding/${encodeURIComponent(selectedId)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Failed to delete onboarding record');
      }

      setFlash({ tone: 'success', message: data.message || 'Onboarding deleted.' });
      setDetail(null);
      setPreview(null);
      setSelectedId('');
      await loadWorkspace();
    } catch (deleteError) {
      setFlash({ tone: 'error', message: deleteError instanceof Error ? deleteError.message : 'Failed to delete onboarding record' });
    } finally {
      setSaving(false);
    }
  }

  async function refreshCurrent() {
    setRefreshing(true);
    try {
      await loadWorkspace(selectedId);
      if (selectedId) {
        await loadRecord(selectedId);
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function uploadDocument(rowIndex: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const recordId = mode === 'edit' ? form.name : selectedId;
    const sourceDocuments = mode === 'edit' ? form.documents || [] : detail?.documents || [];
    if (!recordId) {
      setFlash({ tone: 'error', message: 'Save the onboarding record before uploading documents.' });
      return;
    }

    if (!sourceDocuments[rowIndex]?.name) {
      setFlash({ tone: 'error', message: 'Save the checklist row before uploading a file.' });
      return;
    }

    setUploadingIndex(rowIndex);
    setFlash(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('rowIndex', String(rowIndex));

      const response = await fetch(`/api/hr/onboarding/${encodeURIComponent(recordId)}/documents`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Failed to upload document');
      }

      const updated = data.data as OnboardingDetail;
      setDetail(updated);
      setPreview((current) => current);
      if (mode === 'edit') {
        setForm(mapDetailToForm(updated));
      }
      await loadRecord(recordId);
      setFlash({ tone: 'success', message: data.message || 'Document uploaded.' });
    } catch (uploadError) {
      setFlash({ tone: 'error', message: uploadError instanceof Error ? uploadError.message : 'Failed to upload document' });
    } finally {
      setUploadingIndex(null);
    }
  }

  const documentRows = mode === 'edit' ? form?.documents ?? [] : detail?.documents ?? [];
  const mandatoryDocuments = documentRows
    .filter((row) => Boolean(row.is_mandatory));
  const uploadedMandatoryDocuments = mandatoryDocuments.filter((row) => row.file).length;

  const actionButtons: Array<{ key: ActionKey; label: string; tone: string; show: boolean }> = [
    { key: 'submit', label: 'Submit', tone: 'bg-sky-600 hover:bg-sky-700', show: detail?.onboarding_status === 'DRAFT' },
    { key: 'reopen', label: 'Back To Draft', tone: 'bg-slate-700 hover:bg-slate-800', show: detail?.onboarding_status === 'REJECTED' || detail?.onboarding_status === 'SUBMITTED' },
    { key: 'review', label: 'Start Review', tone: 'bg-amber-500 hover:bg-amber-600', show: detail?.onboarding_status === 'SUBMITTED' },
    { key: 'send_back', label: 'Send Back', tone: 'bg-slate-700 hover:bg-slate-800', show: detail?.onboarding_status === 'UNDER_REVIEW' },
    { key: 'approve', label: 'Approve', tone: 'bg-emerald-600 hover:bg-emerald-700', show: detail?.onboarding_status === 'UNDER_REVIEW' },
    { key: 'reject', label: 'Reject', tone: 'bg-rose-600 hover:bg-rose-700', show: detail?.onboarding_status === 'UNDER_REVIEW' },
    { key: 'map', label: 'Map Employee', tone: 'bg-violet-600 hover:bg-violet-700', show: detail?.onboarding_status === 'APPROVED' && !detail?.employee_reference },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f8fbfd_0%,#e9f3f7_45%,#fff7ec_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#1e6b87]/15 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#1e6b87]">
              Phase 2
              <span className="h-1 w-1 rounded-full bg-[#1e6b87]" />
              Onboarding Upgrade
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Onboarding Console</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Enterprise-style onboarding built on the existing workflow engine: sectioned forms, visible review states, document checklist, and employee sync preview.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => void refreshCurrent()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </button>
            <button
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1e6b87] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#185a73]"
            >
              <Plus className="h-4 w-4" />
              New Onboarding Draft
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Total" value={stats.total} hint="All onboarding records" icon={Users} />
        <StatCard label="Draft" value={stats.draft} hint="Awaiting submission" icon={FileText} />
        <StatCard label="Submitted" value={stats.submitted} hint="Queued for review" icon={Send} />
        <StatCard label="Under Review" value={stats.under_review} hint="Actively being checked" icon={ShieldAlert} />
        <StatCard label="Approved" value={stats.approved} hint="Ready for employee sync" icon={CheckCircle2} />
        <StatCard label="Mapped" value={stats.mapped_to_employee} hint="Employee created" icon={UserCheck} />
      </div>

      {flash && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${flash.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {flash.message}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search candidate, ID, location, phone"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#1e6b87] focus:bg-white focus:ring-2 focus:ring-[#1e6b87]/20"
              />
            </div>
            <div className="mt-3 grid gap-3">
              <SelectInput value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </SelectInput>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Onboarding Queue</div>
                <div className="text-xs text-slate-500">Candidates moving through draft, review, and mapping.</div>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{items.length}</span>
            </div>
            <div className="max-h-[900px] overflow-y-auto p-2">
              {loadingList ? (
                <div className="flex items-center justify-center px-4 py-10 text-sm text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading queue...
                </div>
              ) : !items.length ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">No onboarding records match the current filter.</div>
              ) : (
                items.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      setMode('view');
                      setSelectedId(item.name);
                    }}
                    className={`mb-2 w-full rounded-2xl border p-4 text-left transition ${selectedId === item.name && mode !== 'create' ? 'border-[#1e6b87] bg-[#1e6b87]/5' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{item.employee_name || item.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{item.name}</div>
                      </div>
                      {statusChip(item.onboarding_status)}
                    </div>
                    <div className="mt-3 space-y-2 text-xs text-slate-500">
                      <div className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5" /> {item.designation || 'Designation pending'}</div>
                      <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> {item.company || 'Company pending'}</div>
                      <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {[item.project_location, item.project_city].filter(Boolean).join(', ') || 'Location pending'}</div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>{item.date_of_joining ? formatDate(item.date_of_joining) : 'Join date pending'}</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="space-y-4">
          {(mode === 'create' || mode === 'edit') ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{mode === 'create' ? 'Create onboarding draft' : 'Edit onboarding details'}</div>
                    <div className="mt-1 text-sm text-slate-500">Sectioned data entry with document checklist and review-ready fields.</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Mandatory docs</div>
                      <div className="mt-1 font-semibold text-slate-900">{uploadedMandatoryDocuments}/{mandatoryDocuments.length}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Education</div>
                      <div className="mt-1 font-semibold text-slate-900">{form.education?.length || 0}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Experience</div>
                      <div className="mt-1 font-semibold text-slate-900">{form.experience?.length || 0}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 text-sm font-semibold text-slate-900">Employment details</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldShell label="Employee Name"><TextInput value={form.employee_name || ''} onChange={(event) => setField('employee_name', event.target.value)} /></FieldShell>
                    <FieldShell label="Company"><TextInput value={form.company || ''} onChange={(event) => setField('company', event.target.value)} /></FieldShell>
                    <FieldShell label="Designation"><TextInput value={form.designation || ''} onChange={(event) => setField('designation', event.target.value)} /></FieldShell>
                    <FieldShell label="Date Of Joining"><TextInput type="date" value={form.date_of_joining || ''} onChange={(event) => setField('date_of_joining', event.target.value)} /></FieldShell>
                    <FieldShell label="Form Source">
                      <SelectInput value={form.form_source || 'Manual'} onChange={(event) => setField('form_source', event.target.value)}>
                        {FORM_SOURCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </SelectInput>
                    </FieldShell>
                    <FieldShell label="Project State"><TextInput value={form.project_state || ''} onChange={(event) => setField('project_state', event.target.value)} /></FieldShell>
                    <FieldShell label="Project Location"><TextInput value={form.project_location || ''} onChange={(event) => setField('project_location', event.target.value)} /></FieldShell>
                    <FieldShell label="Project City"><TextInput value={form.project_city || ''} onChange={(event) => setField('project_city', event.target.value)} /></FieldShell>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 text-sm font-semibold text-slate-900">Personal details</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldShell label="Salutation"><TextInput value={form.salutation || ''} onChange={(event) => setField('salutation', event.target.value)} /></FieldShell>
                    <FieldShell label="Gender"><TextInput value={form.gender || ''} onChange={(event) => setField('gender', event.target.value)} /></FieldShell>
                    <FieldShell label="Date Of Birth"><TextInput type="date" value={form.date_of_birth || ''} onChange={(event) => setField('date_of_birth', event.target.value)} /></FieldShell>
                    <FieldShell label="Blood Group">
                      <SelectInput value={form.blood_group || ''} onChange={(event) => setField('blood_group', event.target.value)}>
                        {BLOOD_GROUP_OPTIONS.map((option) => <option key={option} value={option}>{option || 'Select blood group'}</option>)}
                      </SelectInput>
                    </FieldShell>
                    <FieldShell label="Marital Status">
                      <SelectInput value={form.marital_status || ''} onChange={(event) => setField('marital_status', event.target.value)}>
                        {MARITAL_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option || 'Select marital status'}</option>)}
                      </SelectInput>
                    </FieldShell>
                    <FieldShell label="Spouse Name"><TextInput value={form.spouse_name || ''} onChange={(event) => setField('spouse_name', event.target.value)} /></FieldShell>
                    <FieldShell label="Father's Name"><TextInput value={form.father_name || ''} onChange={(event) => setField('father_name', event.target.value)} /></FieldShell>
                    <FieldShell label="Mother's Name"><TextInput value={form.mother_name || ''} onChange={(event) => setField('mother_name', event.target.value)} /></FieldShell>
                  </div>
                </section>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 text-sm font-semibold text-slate-900">Contact details</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldShell label="Contact Number"><TextInput value={form.contact_number || ''} onChange={(event) => setField('contact_number', event.target.value)} /></FieldShell>
                    <FieldShell label="Alternate Contact"><TextInput value={form.alternate_contact_number || ''} onChange={(event) => setField('alternate_contact_number', event.target.value)} /></FieldShell>
                    <FieldShell label="Personal Email"><TextInput type="email" value={form.personal_email || ''} onChange={(event) => setField('personal_email', event.target.value)} /></FieldShell>
                    <div className="md:col-span-2">
                      <FieldShell label="Permanent Address"><TextArea value={form.permanent_address || ''} onChange={(event) => setField('permanent_address', event.target.value)} /></FieldShell>
                    </div>
                    <div className="md:col-span-2">
                      <FieldShell label="Local Address"><TextArea value={form.local_address || ''} onChange={(event) => setField('local_address', event.target.value)} /></FieldShell>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 text-sm font-semibold text-slate-900">Statutory details</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldShell label="Aadhar Number"><TextInput value={form.aadhar_number || ''} onChange={(event) => setField('aadhar_number', event.target.value)} /></FieldShell>
                    <FieldShell label="PAN Number"><TextInput value={form.pan_number || ''} onChange={(event) => setField('pan_number', event.target.value.toUpperCase())} /></FieldShell>
                    <FieldShell label="EPF Number"><TextInput value={form.epf_number || ''} onChange={(event) => setField('epf_number', event.target.value)} /></FieldShell>
                    <FieldShell label="ESIC Number"><TextInput value={form.esic_number || ''} onChange={(event) => setField('esic_number', event.target.value)} /></FieldShell>
                  </div>
                </section>
              </div>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Education history</div>
                    <div className="text-xs text-slate-500">Capture degrees and school records in the same flow.</div>
                  </div>
                  <button onClick={addEducationRow} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" />Add Row</button>
                </div>
                <div className="space-y-3">
                  {(form.education || []).map((row, index) => (
                    <div key={row.name || `edu-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-5">
                      <TextInput placeholder="School / University" value={row.school_univ || ''} onChange={(event) => setForm((current) => ({ ...current, education: (current.education || []).map((item, itemIndex) => itemIndex === index ? { ...item, school_univ: event.target.value } : item) }))} />
                      <TextInput placeholder="Qualification" value={row.qualification || ''} onChange={(event) => setForm((current) => ({ ...current, education: (current.education || []).map((item, itemIndex) => itemIndex === index ? { ...item, qualification: event.target.value } : item) }))} />
                      <TextInput placeholder="Level" value={row.level || ''} onChange={(event) => setForm((current) => ({ ...current, education: (current.education || []).map((item, itemIndex) => itemIndex === index ? { ...item, level: event.target.value } : item) }))} />
                      <TextInput placeholder="Year" value={row.year_of_passing || ''} onChange={(event) => setForm((current) => ({ ...current, education: (current.education || []).map((item, itemIndex) => itemIndex === index ? { ...item, year_of_passing: event.target.value } : item) }))} />
                      <div className="flex gap-3">
                        <TextInput placeholder="Score" value={row.class_per || ''} onChange={(event) => setForm((current) => ({ ...current, education: (current.education || []).map((item, itemIndex) => itemIndex === index ? { ...item, class_per: event.target.value } : item) }))} />
                        <button onClick={() => setForm((current) => ({ ...current, education: (current.education || []).filter((_, itemIndex) => itemIndex !== index) }))} className="rounded-xl border border-rose-200 px-3 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                  {!form.education?.length && <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">No education rows yet.</div>}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Experience history</div>
                    <div className="text-xs text-slate-500">Make the employment background visible before approval.</div>
                  </div>
                  <button onClick={addExperienceRow} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" />Add Row</button>
                </div>
                <div className="space-y-3">
                  {(form.experience || []).map((row, index) => (
                    <div key={row.name || `exp-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-4">
                      <TextInput placeholder="Company" value={row.company_name || ''} onChange={(event) => setForm((current) => ({ ...current, experience: (current.experience || []).map((item, itemIndex) => itemIndex === index ? { ...item, company_name: event.target.value } : item) }))} />
                      <TextInput placeholder="Designation" value={row.designation || ''} onChange={(event) => setForm((current) => ({ ...current, experience: (current.experience || []).map((item, itemIndex) => itemIndex === index ? { ...item, designation: event.target.value } : item) }))} />
                      <TextInput placeholder="Total Experience" value={row.total_experience || ''} onChange={(event) => setForm((current) => ({ ...current, experience: (current.experience || []).map((item, itemIndex) => itemIndex === index ? { ...item, total_experience: event.target.value } : item) }))} />
                      <div className="flex gap-3">
                        <TextInput placeholder="Salary" value={row.salary?.toString() || ''} onChange={(event) => setForm((current) => ({ ...current, experience: (current.experience || []).map((item, itemIndex) => itemIndex === index ? { ...item, salary: event.target.value } : item) }))} />
                        <button onClick={() => setForm((current) => ({ ...current, experience: (current.experience || []).filter((_, itemIndex) => itemIndex !== index) }))} className="rounded-xl border border-rose-200 px-3 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                  {!form.experience?.length && <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">No experience rows yet.</div>}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Document checklist</div>
                    <div className="text-xs text-slate-500">Mandatory document visibility before approval and employee mapping.</div>
                  </div>
                  <button onClick={addDocumentRow} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" />Add Checklist Row</button>
                </div>
                <div className="space-y-3">
                  {(form.documents || []).map((row, index) => (
                    <div key={row.name || `doc-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[minmax(0,1.4fr)_120px_minmax(0,1fr)_160px_44px]">
                      <SelectInput value={row.document_type || 'Other'} onChange={(event) => setForm((current) => ({ ...current, documents: (current.documents || []).map((item, itemIndex) => itemIndex === index ? { ...item, document_type: event.target.value } : item) }))}>
                        {DOCUMENT_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </SelectInput>
                      <label className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                        <input type="checkbox" checked={Boolean(row.is_mandatory)} onChange={(event) => setForm((current) => ({ ...current, documents: (current.documents || []).map((item, itemIndex) => itemIndex === index ? { ...item, is_mandatory: event.target.checked ? 1 : 0 } : item) }))} />
                        Mandatory
                      </label>
                      <TextInput placeholder="Remarks" value={row.remarks || ''} onChange={(event) => setForm((current) => ({ ...current, documents: (current.documents || []).map((item, itemIndex) => itemIndex === index ? { ...item, remarks: event.target.value } : item) }))} />
                      <div className="flex items-center gap-2">
                        {row.file ? <a href={row.file} target="_blank" className="truncate text-sm text-[#1e6b87] underline">Open file</a> : <span className="text-sm text-slate-400">No file</span>}
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                          {uploadingIndex === index ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          Upload
                          <input type="file" className="hidden" onChange={(event) => void uploadDocument(index, event)} />
                        </label>
                      </div>
                      <button onClick={() => setForm((current) => ({ ...current, documents: (current.documents || []).filter((_, itemIndex) => itemIndex !== index) }))} className="rounded-xl border border-rose-200 px-3 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {!form.documents?.length && <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">No checklist rows yet. Add mandatory documents before approval.</div>}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 text-sm font-semibold text-slate-900">Remarks</div>
                <TextArea value={form.remarks || ''} onChange={(event) => setField('remarks', event.target.value)} placeholder="Internal HR remarks, review notes, and checklist context." />
              </section>

              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => void saveForm()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#1e6b87] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#185a73] disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {mode === 'create' ? 'Save Draft' : 'Save Changes'}
                </button>
                <button onClick={cancelEdit} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <X className="h-4 w-4" /> Cancel
                </button>
              </div>
            </div>
          ) : loadingDetail ? (
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-24 text-sm text-slate-500 shadow-sm">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading onboarding record...
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-semibold text-slate-950">{detail.employee_name || detail.name}</h2>
                      {statusChip(detail.onboarding_status)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span>{detail.name}</span>
                      {detail.designation && <span>{detail.designation}</span>}
                      {detail.company && <span>{detail.company}</span>}
                      {detail.date_of_joining && <span>Joining {formatDate(detail.date_of_joining)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {actionButtons.filter((action) => action.show).map((action) => (
                      <button
                        key={action.key}
                        onClick={() => action.key === 'reject' ? setRejectModal(true) : void runAction(action.key)}
                        disabled={Boolean(busyAction)}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-60 ${action.tone}`}
                      >
                        {busyAction === action.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                        {action.label}
                      </button>
                    ))}
                    <button onClick={startEdit} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><Pencil className="h-4 w-4" />Edit</button>
                    {!detail.employee_reference && (
                      <button onClick={() => setShowDeleteConfirm(true)} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"><Trash2 className="h-4 w-4" />Delete</button>
                    )}
                  </div>
                </div>
              </div>

              <StatusRail status={detail.onboarding_status} />

              <div className="grid gap-4 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Form source</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{detail.form_source || 'Manual'}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Project location</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{[detail.project_location, detail.project_city].filter(Boolean).join(', ') || '-'}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Mandatory docs</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{uploadedMandatoryDocuments}/{mandatoryDocuments.length}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Employee mapping</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{detail.employee_reference || 'Pending'}</div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 text-sm font-semibold text-slate-900">Employment details</div>
                    <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <ReadField label="Company" value={detail.company} />
                      <ReadField label="Designation" value={detail.designation} />
                      <ReadField label="Date Of Joining" value={formatDate(detail.date_of_joining)} />
                      <ReadField label="Project State" value={detail.project_state} />
                      <ReadField label="Project Location" value={detail.project_location} />
                      <ReadField label="Project City" value={detail.project_city} />
                    </dl>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 text-sm font-semibold text-slate-900">Personal details</div>
                    <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <ReadField label="Salutation" value={detail.salutation} />
                      <ReadField label="Gender" value={detail.gender} />
                      <ReadField label="Date Of Birth" value={formatDate(detail.date_of_birth)} />
                      <ReadField label="Blood Group" value={detail.blood_group} />
                      <ReadField label="Marital Status" value={detail.marital_status} />
                      <ReadField label="Spouse Name" value={detail.spouse_name} />
                      <ReadField label="Father's Name" value={detail.father_name} />
                      <ReadField label="Mother's Name" value={detail.mother_name} />
                    </dl>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 text-sm font-semibold text-slate-900">Contact and statutory details</div>
                    <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <ReadField label="Contact Number" value={detail.contact_number} />
                      <ReadField label="Alternate Contact" value={detail.alternate_contact_number} />
                      <ReadField label="Personal Email" value={detail.personal_email} />
                      <ReadField label="Aadhar Number" value={detail.aadhar_number} />
                      <ReadField label="PAN Number" value={detail.pan_number} />
                      <ReadField label="EPF Number" value={detail.epf_number} />
                      <ReadField label="ESIC Number" value={detail.esic_number} />
                      <ReadField label="Permanent Address" value={detail.permanent_address} />
                      <ReadField label="Local Address" value={detail.local_address} />
                    </dl>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 text-sm font-semibold text-slate-900">Education</div>
                    {!detail.education?.length ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">No education rows added.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="text-slate-400">
                            <tr>
                              <th className="pb-3 pr-4 font-medium">School / University</th>
                              <th className="pb-3 pr-4 font-medium">Qualification</th>
                              <th className="pb-3 pr-4 font-medium">Level</th>
                              <th className="pb-3 pr-4 font-medium">Year</th>
                              <th className="pb-3 font-medium">Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(detail.education || []).map((row, index) => (
                              <tr key={row.name || `edu-read-${index}`}>
                                <td className="py-3 pr-4 text-slate-800">{row.school_univ || '-'}</td>
                                <td className="py-3 pr-4 text-slate-600">{row.qualification || '-'}</td>
                                <td className="py-3 pr-4 text-slate-600">{row.level || '-'}</td>
                                <td className="py-3 pr-4 text-slate-600">{row.year_of_passing || '-'}</td>
                                <td className="py-3 text-slate-600">{row.class_per || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 text-sm font-semibold text-slate-900">Experience</div>
                    {!detail.experience?.length ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">No work history rows added.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="text-slate-400">
                            <tr>
                              <th className="pb-3 pr-4 font-medium">Company</th>
                              <th className="pb-3 pr-4 font-medium">Designation</th>
                              <th className="pb-3 pr-4 font-medium">Total Experience</th>
                              <th className="pb-3 font-medium">Salary</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(detail.experience || []).map((row, index) => (
                              <tr key={row.name || `exp-read-${index}`}>
                                <td className="py-3 pr-4 text-slate-800">{row.company_name || '-'}</td>
                                <td className="py-3 pr-4 text-slate-600">{row.designation || '-'}</td>
                                <td className="py-3 pr-4 text-slate-600">{row.total_experience || '-'}</td>
                                <td className="py-3 text-slate-600">{row.salary || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Document checklist</div>
                        <div className="text-xs text-slate-500">Approval is blocked until mandatory documents are uploaded.</div>
                      </div>
                      <button onClick={startEdit} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Pencil className="h-4 w-4" />Manage Checklist</button>
                    </div>
                    {!detail.documents?.length ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">No checklist rows added.</div>
                    ) : (
                      <div className="space-y-3">
                        {(detail.documents || []).map((row, index) => (
                          <div key={row.name || `doc-read-${index}`} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-sm font-semibold text-slate-900">{row.document_type || 'Document row'}</div>
                                  {row.is_mandatory ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Mandatory</span> : null}
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{row.verification_status || 'PENDING'}</span>
                                </div>
                                <div className="mt-1 text-xs text-slate-500">{row.remarks || 'No remarks'}</div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {row.file ? <a href={row.file} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-[#1e6b87] hover:bg-slate-50"><FileCheck2 className="h-4 w-4" />Open file</a> : <span className="text-sm text-slate-400">No file uploaded</span>}
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                  {uploadingIndex === index ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                  Upload
                                  <input type="file" className="hidden" onChange={(event) => void uploadDocument(index, event)} />
                                </label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 text-sm font-semibold text-slate-900">Remarks</div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">{detail.remarks || 'No remarks recorded.'}</div>
                  </section>
                </div>

                <div className="space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">Review trail</div>
                    <dl className="mt-4 space-y-4">
                      <ReadField label="Submitted By" value={detail.submitted_by} />
                      <ReadField label="Reviewed By" value={detail.reviewed_by} />
                      <ReadField label="Approved By" value={detail.approved_by} />
                      <ReadField label="Approved At" value={formatDate(detail.approved_at)} />
                      <ReadField label="Rejected By" value={detail.rejected_by} />
                      <ReadField label="Rejection Reason" value={detail.rejection_reason} />
                    </dl>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Employee mapping visibility</div>
                        <div className="mt-1 text-xs text-slate-500">Preview exactly what will land in Employee before sync.</div>
                      </div>
                      <div className="rounded-xl bg-violet-50 p-2 text-violet-700"><Users className="h-4 w-4" /></div>
                    </div>
                    {detail.employee_reference ? (
                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="text-sm font-semibold text-emerald-800">Already mapped to employee</div>
                        <Link href={`/hr/employees/${encodeURIComponent(detail.employee_reference)}`} className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#1e6b87] underline">
                          Open {detail.employee_reference}
                        </Link>
                      </div>
                    ) : preview ? (
                      <div className="mt-4 space-y-4">
                        <div className={`rounded-2xl border p-4 ${preview.readiness.can_map ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                          <div className="text-sm font-semibold text-slate-900">{preview.readiness.can_map ? 'Ready to map' : 'Mapping not ready yet'}</div>
                          <div className="mt-1 text-sm text-slate-600">Status: {preview.readiness.status.replaceAll('_', ' ')}</div>
                          {!preview.readiness.can_map && preview.readiness.blocking_reasons.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {preview.readiness.blocking_reasons.map((reason) => (
                                <div key={reason} className="text-sm text-amber-800">{reason}</div>
                              ))}
                            </div>
                          )}
                        </div>
                        <dl className="grid gap-3">
                          <ReadField label="Employee Name" value={String(preview.employee_preview.first_name || '')} />
                          <ReadField label="Company" value={String(preview.employee_preview.company || '')} />
                          <ReadField label="Designation" value={String(preview.employee_preview.designation || '')} />
                          <ReadField label="Contact" value={String(preview.employee_preview.cell_number || '')} />
                          <ReadField label="Personal Email" value={String(preview.employee_preview.personal_email || '')} />
                          <ReadField label="Education Rows" value={preview.readiness.education_rows} />
                          <ReadField label="Experience Rows" value={preview.readiness.experience_rows} />
                          <ReadField label="Checklist Rows" value={preview.readiness.document_rows} />
                        </dl>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">Preview unavailable for this record.</div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1e6b87]/10 text-[#1e6b87]">
                <Users className="h-6 w-6" />
              </div>
              <div className="mt-4 text-lg font-semibold text-slate-900">Select an onboarding record</div>
              <div className="mt-2 text-sm text-slate-500">Pick a record from the queue or start a new onboarding draft.</div>
            </div>
          )}
        </main>
      </div>

      <ActionModal
        open={rejectModal}
        title="Reject Onboarding"
        description="Enter a reason for rejecting this onboarding record."
        confirmLabel="Reject"
        variant="danger"
        fields={[{ name: 'reason', label: 'Rejection Reason', type: 'textarea' }]}
        onCancel={() => setRejectModal(false)}
        onConfirm={async (values) => {
          await runAction('reject', { reason: values.reason || '' });
          setRejectModal(false);
        }}
      />

      <ActionModal
        open={showDeleteConfirm}
        title="Delete Onboarding Record"
        description="Delete this onboarding record? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        fields={[]}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          await deleteRecord();
          setShowDeleteConfirm(false);
        }}
      />
    </div>
  );
}
