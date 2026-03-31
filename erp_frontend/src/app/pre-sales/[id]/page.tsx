'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import ModalFrame from '@/components/ui/ModalFrame';
import { getFileProxyUrl } from '@/lib/fileLinks';
import { deriveTenderFunnelStatus, getTenderFunnelMeta } from '@/components/tenderFunnel';
import { useRole } from '@/context/RoleContext';
import { AccountabilityTimeline } from '@/components/accountability/AccountabilityTimeline';
import RecordDocumentsPanel from '@/components/ui/RecordDocumentsPanel';
import LinkedRecordsPanel from '@/components/ui/LinkedRecordsPanel';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FilePlus2,
  FileText,
  FolderPlus,
  Loader2,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';

type Tender = {
  name: string;
  tender_number: string;
  title: string;
  linked_project?: string;
  client?: string;
  organization?: string;
  submission_date?: string;
  estimated_value?: number;
  status: string;
  computed_funnel_status?: string;
  go_no_go_status?: string;
  go_no_go_remarks?: string;
  commercial_readiness?: string;
  qualification_reason?: string;
  technical_readiness?: string;
  technical_rejection_reason?: string;
  bid_denied_by_presales?: number;
  bid_denied_reason?: string;
  tender_document?: string;
  rfp_document?: string;
  /* Contract lifecycle fields */
  loa_date?: string;
  work_order_date?: string;
  work_order_no?: string;
  agreement_date?: string;
  awarded_value?: number;
  go_live_date?: string;
  om_start_date?: string;
  sla_holiday_from?: string;
  sla_holiday_to?: string;
  implementation_completion_date?: string;
  physical_completion_date?: string;
};

type TenderApproval = {
  name: string;
  approval_type?: string;
  status?: string;
  requested_by?: string;
  approver_role?: string;
  request_remarks?: string;
  action_remarks?: string;
  creation?: string;
  acted_on?: string;
  attached_document?: string;
};

type WorkspaceDocument = {
  label: string;
  file: string;
  helper: string;
};

type Instrument = {
  name: string;
  instrument_type?: string;
  amount?: number;
  instrument_number?: string;
  bank_name?: string;
  issue_date?: string;
  expiry_date?: string;
  instrument_document?: string;
  status?: string;
  remarks?: string;
};

type BidRow = {
  name: string;
  status?: string;
  bid_amount?: number;
  bid_date?: string;
};

type TenderResultRow = {
  name: string;
  result_stage?: string;
  winning_bidder?: string;
  winning_amount?: number;
  result_date?: string;
  remarks?: string;
};

type TenderReminderRow = {
  name: string;
  title?: string;
  reminder_date?: string;
  reminder_time?: string;
  reminder_kind?: string;
  status?: string;
};

type SurveyRow = {
  name: string;
  status?: string;
  site_name?: string;
  linked_site?: string;
  survey_date?: string;
};

type BoqRow = {
  name: string;
  status?: string;
  boq_name?: string;
  total_amount?: number;
};

type CostSheetRow = {
  name: string;
  status?: string;
  sheet_name?: string;
  sell_value?: number;
};

type TenderChecklistRow = {
  name: string;
  checklist_name?: string;
  completion_pct?: number;
};

type WorkspaceResponse = {
  tender: Tender | null;
  results: TenderResultRow[];
  reminders: TenderReminderRow[];
  surveys: SurveyRow[];
  boqs: BoqRow[];
  costSheets: CostSheetRow[];
  approvals: TenderApproval[];
  financeRequests: Instrument[];
  instruments: Instrument[];
  checklistTemplates: TenderChecklistRow[];
  bids: BidRow[];
};

type ReasonEditor =
  | { field: 'go_no_go_remarks' | 'qualification_reason' | 'technical_rejection_reason' | 'bid_denied_reason'; title: string; value: string }
  | null;

type ReasonTrailItem = NonNullable<ReasonEditor>;

const presalesRoles = new Set(['Presales Tendering Head', 'Presales Executive']);

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value?: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function labelize(value?: string) {
  return value ? value.replace(/_/g, ' ') : '-';
}

function formatDateTime(date?: string, time?: string) {
  if (!date && !time) return '-';
  const raw = [date, time].filter(Boolean).join(' ');
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return raw;
}

function ActionButton({
  onClick,
  disabled,
  children,
  tone = 'dark',
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  tone?: 'dark' | 'light' | 'ghost';
}) {
  const className =
    tone === 'light'
      ? 'bg-white text-[#0f5164] hover:bg-[#eef6f8]'
      : tone === 'ghost'
        ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        : 'bg-[#0f5164] text-white hover:bg-[#0a4251]';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

type StageCardAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'dark' | 'light' | 'ghost';
};

type StageCard = {
  title: string;
  state: string;
  tone: string;
  help: string;
  cta: StageCardAction | null;
};

export default function TenderWorkspacePage() {
  const { currentRole } = useRole();
  const params = useParams();
  const tenderId = decodeURIComponent((params?.id as string | undefined) || '');

  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [reasonEditor, setReasonEditor] = useState<ReasonEditor>(null);
  const [rejectMode, setRejectMode] = useState<'qualification' | 'technical' | 'observation' | 'nogo' | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [instrumentForm, setInstrumentForm] = useState({
    instrument_type: 'EMD',
    amount: '',
    instrument_number: '',
    bank_name: '',
    issue_date: '',
    expiry_date: '',
    linked_project: '',
    linked_agreement_no: '',
    beneficiary_name: '',
    release_condition: '',
    remarks: '',
  });
  const [showInstrumentModal, setShowInstrumentModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentType, setDocumentType] = useState<'tender' | 'rfp'>('tender');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [instrumentFile, setInstrumentFile] = useState<File | null>(null);
  const [showTechnicalModal, setShowTechnicalModal] = useState(false);
  const [technicalRemark, setTechnicalRemark] = useState('');
  const [technicalFile, setTechnicalFile] = useState<File | null>(null);
  const [viewDocUrl, setViewDocUrl] = useState<string | null>(null);

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/tender-workspace/${encodeURIComponent(tenderId)}`);
      const json = await response.json();
      if (!json.success) throw new Error(json.message || 'Failed to load tender workspace');
      setWorkspace(json.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load tender workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [tenderId]);

  const tender = workspace?.tender ?? null;
  const latestBid = workspace?.bids?.[0] ?? null;
  const derivedFunnel = tender ? (tender.computed_funnel_status || deriveTenderFunnelStatus(tender)) : '';
  const funnelMeta = getTenderFunnelMeta(derivedFunnel);
  const isDirector = currentRole === 'Director';
  const isPresales = currentRole ? presalesRoles.has(currentRole) : false;

  const goNoGoApproval = useMemo(
    () => workspace?.approvals.find((row) => row.approval_type === 'GO_NO_GO' && row.status === 'Pending') || null,
    [workspace?.approvals],
  );
  const technicalApproval = useMemo(
    () => workspace?.approvals.find((row) => row.approval_type === 'TECHNICAL' && row.status === 'Pending') || null,
    [workspace?.approvals],
  );
  const workspaceDocuments = useMemo<WorkspaceDocument[]>(() => {
    const docs: WorkspaceDocument[] = [];

    if (tender?.tender_document) {
      docs.push({
        label: 'Tender Document',
        file: tender.tender_document,
        helper: 'Primary tender file visible directly in workspace.',
      });
    }

    if (tender?.rfp_document) {
      docs.push({
        label: 'RFP Document',
        file: tender.rfp_document,
        helper: 'Source RFP file uploaded against this tender.',
      });
    }

    (workspace?.approvals || []).forEach((approval) => {
      if (!approval.attached_document) return;
      const typeLabel = labelize(approval.approval_type) || 'Approval';
      docs.push({
        label: `${typeLabel} Supporting Document`,
        file: approval.attached_document,
        helper: `Uploaded with ${typeLabel.toLowerCase()} request${approval.requested_by ? ` by ${approval.requested_by}` : ''}.`,
      });
    });

    return docs.filter((doc, index, list) => list.findIndex((item) => item.file === doc.file) === index);
  }, [tender?.rfp_document, tender?.tender_document, workspace?.approvals]);

  const canObserve = derivedFunnel === 'Not Qualified Tender' || derivedFunnel === 'Locked Tender';
  const surveyCount = workspace?.surveys?.length || 0;
  const boqCount = workspace?.boqs?.length || 0;
  const costSheetCount = workspace?.costSheets?.length || 0;
  const reminderCount = workspace?.reminders?.length || 0;
  const checklistAvg = workspace?.checklistTemplates?.length
    ? Math.round(workspace.checklistTemplates.reduce((sum, row) => sum + Number(row.completion_pct || 0), 0) / workspace.checklistTemplates.length)
    : 0;
  const instrumentRows = (workspace?.instruments?.length ? workspace.instruments : workspace?.financeRequests) || [];
  const emdInstruments = instrumentRows.filter((row) => row.instrument_type === 'EMD');
  const pbgInstruments = instrumentRows.filter((row) => row.instrument_type === 'PBG');
  const instrumentDocumentCount = instrumentRows.filter((row) => Boolean(row.instrument_document)).length;

  const reasonTrail: ReasonTrailItem[] = tender ? [
    tender.go_no_go_status === 'NO_GO' ? { field: 'go_no_go_remarks' as const, title: 'No-Go Reason', value: tender.go_no_go_remarks || '' } : null,
    tender.commercial_readiness === 'REJECTED' ? { field: 'qualification_reason' as const, title: 'Qualification Reason', value: tender.qualification_reason || '' } : null,
    tender.technical_readiness === 'REJECTED' ? { field: 'technical_rejection_reason' as const, title: 'Technical Rejection Reason', value: tender.technical_rejection_reason || '' } : null,
    tender.bid_denied_by_presales ? { field: 'bid_denied_reason' as const, title: 'Observation Reason', value: tender.bid_denied_reason || '' } : null,
  ].filter((value): value is ReasonTrailItem => Boolean(value)) : [];

  const updateTender = async (payload: Record<string, unknown>) => {
    try {
      setBusy('UPDATE');
      setError('');
      const response = await fetch(`/api/tenders/${encodeURIComponent(tenderId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || 'Failed to update tender');
      await loadWorkspace();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to update tender');
    } finally {
      setBusy('');
    }
  };

  const runWorkflow = async (action: string, reason?: string) => {
    try {
      setBusy(action);
      setError('');
      const response = await fetch(`/api/tenders/${encodeURIComponent(tenderId)}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || `Failed to ${action}`);
      setRejectMode(null);
      setReasonInput('');
      await loadWorkspace();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Failed to ${action}`);
    } finally {
      setBusy('');
    }
  };

  const submitApproval = async (approvalType: 'GO_NO_GO' | 'TECHNICAL', remarks = '') => {
    try {
      setBusy(`submit-${approvalType}`);
      setError('');
      const response = await fetch('/api/tender-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tenderId, approval_type: approvalType, remarks }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || 'Failed to submit approval');
      await loadWorkspace();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to submit approval');
    } finally {
      setBusy('');
    }
  };

  const submitTechnicalRequest = async () => {
    try {
      setBusy('submit-TECHNICAL');
      setError('');
      const response = await fetch('/api/tender-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tenderId, approval_type: 'TECHNICAL', remarks: technicalRemark }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || 'Failed to submit technical request');
      // Upload document if provided
      if (technicalFile && json.data?.name) {
        const form = new FormData();
        form.append('file', technicalFile);
        await fetch(`/api/tender-approvals/${encodeURIComponent(json.data.name)}/document`, {
          method: 'POST',
          body: form,
        });
      }
      setShowTechnicalModal(false);
      setTechnicalRemark('');
      setTechnicalFile(null);
      await loadWorkspace();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to submit technical request');
    } finally {
      setBusy('');
    }
  };

  const actOnApproval = async (approvalName: string, action: 'approve' | 'reject', remarks = '') => {
    try {
      setBusy(`${action}-${approvalName}`);
      setError('');
      const response = await fetch(`/api/tender-approvals/${encodeURIComponent(approvalName)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remarks }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || `Failed to ${action} approval`);
      setRejectMode(null);
      setReasonInput('');
      await loadWorkspace();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Failed to ${action} approval`);
    } finally {
      setBusy('');
    }
  };

  const createInstrument = async () => {
    try {
      setBusy('instrument');
      setError('');
      const response = await fetch('/api/emd-pbg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linked_tender: tenderId,
          instrument_type: instrumentForm.instrument_type,
          amount: Number(instrumentForm.amount || 0),
          instrument_number: instrumentForm.instrument_number,
          bank_name: instrumentForm.bank_name,
          issue_date: instrumentForm.issue_date,
          expiry_date: instrumentForm.expiry_date,
          linked_project: instrumentForm.linked_project,
          linked_agreement_no: instrumentForm.linked_agreement_no,
          beneficiary_name: instrumentForm.beneficiary_name,
          release_condition: instrumentForm.release_condition,
          remarks: instrumentForm.remarks,
        }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || 'Failed to create instrument');
      if (instrumentFile && json.data?.name) {
        const form = new FormData();
        form.append('file', instrumentFile);
        const uploadResponse = await fetch(`/api/emd-pbg/${encodeURIComponent(json.data.name)}/document`, {
          method: 'POST',
          body: form,
        });
        const uploadJson = await uploadResponse.json();
        if (!uploadJson.success) throw new Error(uploadJson.message || 'Instrument created but document upload failed');
      }
      setShowInstrumentModal(false);
      setInstrumentForm({
        instrument_type: 'EMD',
        amount: '',
        instrument_number: '',
        bank_name: '',
        issue_date: '',
        expiry_date: '',
        linked_project: workspace?.tender?.linked_project || '',
        linked_agreement_no: '',
        beneficiary_name: '',
        release_condition: '',
        remarks: '',
      });
      setInstrumentFile(null);
      await loadWorkspace();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to create instrument');
    } finally {
      setBusy('');
    }
  };

  const uploadDocument = async () => {
    if (!documentFile) {
      setError('Please choose a file before uploading');
      return;
    }
    try {
      setBusy('document');
      setError('');
      const form = new FormData();
      form.append('file', documentFile);
      const route = documentType === 'rfp' ? 'rfp-document' : 'tender-document';
      const response = await fetch(`/api/tenders/${encodeURIComponent(tenderId)}/${route}`, {
        method: 'POST',
        body: form,
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || 'Failed to upload document');
      setShowDocumentModal(false);
      setDocumentFile(null);
      await loadWorkspace();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to upload document');
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center gap-3 text-sm text-gray-500"><Loader2 className="h-5 w-5 animate-spin" />Loading tender workspace...</div>;
  }

  if (!tender) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Tender not found.'}
      </div>
    );
  }

  const stageCards: StageCard[] = [
    {
      title: '1. GO / NO-GO',
      state: tender.go_no_go_status === 'GO' ? 'GO approved' : tender.go_no_go_status === 'NO_GO' ? 'NO-GO' : goNoGoApproval ? 'Pending with Director' : 'Pending',
      tone: derivedFunnel === 'Tender under evaluation for GO-NOGO' ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white',
      help: goNoGoApproval
        ? 'The request has already been sent to the Director.'
        : isDirector
          ? 'This request is raised by Presales. You will act after it is submitted.'
          : 'Send the request from here so the Director can decide Go or No-Go.',
      cta: !goNoGoApproval && tender.go_no_go_status === 'PENDING'
        ? isPresales
          ? { label: busy === 'submit-GO_NO_GO' ? 'Sending...' : 'Send GO / NO-GO Request', onClick: () => void submitApproval('GO_NO_GO') }
          : { label: 'Waiting For Presales Request', onClick: () => {}, disabled: true, tone: 'ghost' }
        : null,
    },
    {
      title: '2. Qualification',
      state: tender.commercial_readiness === 'APPROVED' ? 'Qualified' : tender.commercial_readiness === 'REJECTED' ? 'Not qualified' : 'Awaiting',
      tone: derivedFunnel === 'Working but not confirmed by technical' ? 'border-yellow-200 bg-yellow-50' : derivedFunnel === 'Not Qualified Tender' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white',
      help: 'After the Director marks Go, Presales updates qualification here.',
      cta: null,
    },
    {
      title: '3. Technical Director Review',
      state: tender.technical_readiness === 'APPROVED' ? 'Approved' : tender.technical_readiness === 'REJECTED' ? 'Rejected' : technicalApproval ? 'Pending with Director' : 'Awaiting request',
      tone: derivedFunnel === 'EMD done and technical confirmed' ? 'border-green-200 bg-green-50' : derivedFunnel === 'Locked Tender' ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white',
      help: technicalApproval
        ? 'The technical request is pending with the Director.'
        : isDirector
          ? 'Presales sends this request after qualification is completed.'
          : 'After qualification, send the technical approval request from here.',
      cta: !technicalApproval && derivedFunnel === 'Working but not confirmed by technical'
        ? isPresales
          ? { label: busy === 'submit-TECHNICAL' ? 'Sending...' : 'Send Technical Request', onClick: () => setShowTechnicalModal(true) }
          : { label: 'Waiting For Presales Request', onClick: () => {}, disabled: true, tone: 'ghost' }
        : null,
    },
    {
      title: '4. Bid Conversion',
      state: latestBid ? `Bid created: ${latestBid.name}` : 'Not converted',
      tone: latestBid ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white',
      help: 'After technical approval, the bid is created from here.',
      cta: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-[#0f5164] via-[#1d708c] to-[#7bb7c6] px-6 py-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/pre-sales/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to pre-sales dashboard
          </Link>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${funnelMeta.toneClass}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${funnelMeta.dotClass}`} />
            {derivedFunnel}
          </span>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.24em] text-white/65">Tender Workspace</div>
            <h1 className="text-2xl font-semibold">{tender.title}</h1>
            <p className="text-sm text-white/80">{tender.tender_number} • {tender.client || 'Client pending'} • {tender.organization || 'Organization pending'}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wide text-white/65">Submission</div>
                <div className="mt-2 text-lg font-semibold">{formatDate(tender.submission_date)}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wide text-white/65">Estimated Value</div>
                <div className="mt-2 text-lg font-semibold">{formatCurrency(tender.estimated_value)}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wide text-white/65">Latest Bid</div>
                <div className="mt-2 text-lg font-semibold">{latestBid?.name || 'Not created'}</div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wide text-white/65">Tender Doc</div>
                <div className="mt-2 text-lg font-semibold">{tender.tender_document ? 'Available' : 'Missing'}</div>
                <div className="mt-1 text-xs text-white/70">{tender.tender_document ? 'Visible in workspace' : 'Upload from Add Document'}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wide text-white/65">RFP Doc</div>
                <div className="mt-2 text-lg font-semibold">{tender.rfp_document ? 'Available' : 'Missing'}</div>
                <div className="mt-1 text-xs text-white/70">{tender.rfp_document ? 'Visible in workspace' : 'Upload from Add Document'}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wide text-white/65">EMD Docs</div>
                <div className="mt-2 text-lg font-semibold">{emdInstruments.filter((row) => row.instrument_document).length}</div>
                <div className="mt-1 text-xs text-white/70">{emdInstruments.length} instrument row(s)</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wide text-white/65">PBG Docs</div>
                <div className="mt-2 text-lg font-semibold">{pbgInstruments.filter((row) => row.instrument_document).length}</div>
                <div className="mt-1 text-xs text-white/70">{pbgInstruments.length} instrument row(s)</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-5">
            <div className="text-sm font-semibold text-white">Workspace Actions</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton tone="light" onClick={() => setShowInstrumentModal(true)} disabled={busy.length > 0}>
                Add Instrument
              </ActionButton>
              <ActionButton tone="light" onClick={() => setShowDocumentModal(true)} disabled={busy.length > 0}>
                Add Document
              </ActionButton>
              {isPresales && !goNoGoApproval && tender.go_no_go_status === 'PENDING' ? (
                <ActionButton onClick={() => void submitApproval('GO_NO_GO')} disabled={busy.length > 0}>
                  Send GO / NO-GO To Director
                </ActionButton>
              ) : null}
              {isPresales && tender.go_no_go_status === 'GO' && tender.commercial_readiness !== 'APPROVED' && tender.commercial_readiness !== 'REJECTED' ? (
                <>
                  <ActionButton onClick={() => void runWorkflow('qualify')} disabled={busy.length > 0}>Mark Qualified</ActionButton>
                  <ActionButton tone="ghost" onClick={() => { setRejectMode('qualification'); setReasonInput(tender.qualification_reason || ''); }} disabled={busy.length > 0}>Mark Not Qualified</ActionButton>
                </>
              ) : null}
              {isPresales && derivedFunnel === 'Working but not confirmed by technical' && !technicalApproval ? (
                <ActionButton onClick={() => setShowTechnicalModal(true)} disabled={busy.length > 0}>Send Technical To Director</ActionButton>
              ) : null}
              {isPresales && canObserve ? (
                <ActionButton tone="ghost" onClick={() => { setRejectMode('observation'); setReasonInput(tender.bid_denied_reason || ''); }} disabled={busy.length > 0}>Keep Under Observation</ActionButton>
              ) : null}
              {isPresales && derivedFunnel === 'EMD done and technical confirmed' && !latestBid ? (
                <ActionButton onClick={() => void runWorkflow('convert_to_bid')} disabled={busy.length > 0}>
                  Convert To Bid
                </ActionButton>
              ) : null}
            </div>

            {isDirector && goNoGoApproval ? (
              <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4">
                <div className="text-sm font-semibold">Director Decision: GO / NO-GO</div>
                <div className="mt-1 text-sm text-white/75">Requested by {goNoGoApproval.requested_by || '-'} on {formatDate(goNoGoApproval.creation)}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton tone="light" onClick={() => void actOnApproval(goNoGoApproval.name, 'approve')} disabled={busy.length > 0}>Go</ActionButton>
                  <ActionButton tone="ghost" onClick={() => { setRejectMode('nogo'); setReasonInput(goNoGoApproval.request_remarks || tender.go_no_go_remarks || ''); }} disabled={busy.length > 0}>No Go</ActionButton>
                  <Link href={`/pre-sales/${encodeURIComponent(tenderId)}`} className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">View Detail</Link>
                </div>
              </div>
            ) : null}

            {isDirector && technicalApproval ? (
              <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4">
                <div className="text-sm font-semibold">Director Decision: Technical Review</div>
                <div className="mt-1 text-sm text-white/75">Requested by {technicalApproval.requested_by || '-'} on {formatDate(technicalApproval.creation)}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton tone="light" onClick={() => void actOnApproval(technicalApproval.name, 'approve')} disabled={busy.length > 0}>Approve Technical</ActionButton>
                  <ActionButton tone="ghost" onClick={() => { setRejectMode('technical'); setReasonInput(tender.technical_rejection_reason || technicalApproval.request_remarks || ''); }} disabled={busy.length > 0}>Reject Technical</ActionButton>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#0f5164]" />
            <h2 className="text-base font-semibold text-gray-900">Tender Flow</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {stageCards.map((card) => (
              <div key={card.title} className={`rounded-2xl border p-4 ${card.tone}`}>
                <div className="text-sm font-semibold text-gray-900">{card.title}</div>
                <div className="mt-2 text-sm text-gray-600">{card.state}</div>
                <div className="mt-2 text-xs leading-5 text-gray-500">{card.help}</div>
                {card.cta ? (
                  <div className="mt-4">
                    <ActionButton onClick={card.cta.onClick} disabled={card.cta.disabled || busy.length > 0} tone={card.cta.tone || 'dark'}>
                      {card.cta.label}
                    </ActionButton>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[#0f5164]" />
            <h2 className="text-base font-semibold text-gray-900">Reason Trail</h2>
          </div>
          <div className="mt-4 space-y-3">
            {reasonTrail.length ? reasonTrail.map((item) => (
              <div key={item.field} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                    <p className="mt-2 text-sm text-gray-600">{item.value || 'Reason not available yet.'}</p>
                  </div>
                  {isPresales ? (
                    <div className="flex gap-2">
                      <button type="button" className="text-xs font-semibold text-[#0f5164]" onClick={() => setReasonEditor(item)}>Edit</button>
                      <button type="button" className="text-xs font-semibold text-rose-600" onClick={() => void updateTender({ [item.field]: '' })}>Clear</button>
                    </div>
                  ) : null}
                </div>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">Red, orange, and pink stages will capture reasons here.</div>}
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#0f5164]" />
            <h2 className="text-base font-semibold text-gray-900">Bid Readiness Signals</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Surveys</div>
              <div className="mt-2 text-lg font-semibold text-gray-900">{surveyCount}</div>
              <div className="mt-2 text-sm text-gray-600">
                {surveyCount ? `${workspace?.surveys?.filter((row) => row.status === 'Completed').length || 0} completed` : 'No survey records linked yet'}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">BOQs</div>
              <div className="mt-2 text-lg font-semibold text-gray-900">{boqCount}</div>
              <div className="mt-2 text-sm text-gray-600">
                {boqCount ? `${workspace?.boqs?.filter((row) => row.status === 'APPROVED').length || 0} approved` : 'No BOQ prepared yet'}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Cost Sheets</div>
              <div className="mt-2 text-lg font-semibold text-gray-900">{costSheetCount}</div>
              <div className="mt-2 text-sm text-gray-600">
                {costSheetCount ? `${workspace?.costSheets?.filter((row) => row.status === 'APPROVED').length || 0} approved` : 'No cost sheet prepared yet'}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Checklist Readiness</div>
              <div className="mt-2 text-lg font-semibold text-gray-900">{checklistAvg}%</div>
              <div className="mt-2 text-sm text-gray-600">
                {workspace?.checklistTemplates?.length ? `${workspace.checklistTemplates.length} checklist template rows available` : 'No checklist templates linked yet'}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <WalletCards className="h-5 w-5 text-[#0f5164]" />
            <h2 className="text-base font-semibold text-gray-900">Instruments</h2>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {instrumentRows.length ? `${instrumentRows.length} instrument row(s), ${instrumentDocumentCount} document link(s)` : 'Track EMD and PBG rows with their actual instrument files here.'}
          </div>
          <div className="mt-4 space-y-3">
            {instrumentRows.length ? instrumentRows.map((instrument) => (
              <div key={instrument.name} className="rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-900">{instrument.instrument_type || 'Instrument'} • {formatCurrency(instrument.amount)}</div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{instrument.status || 'Pending'}</span>
                </div>
                <div className="mt-2 text-sm text-gray-600">{instrument.instrument_number || 'Number pending'} • {instrument.bank_name || 'Bank pending'}</div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <Link href={`/pre-sales/emd-tracking/${encodeURIComponent(instrument.name)}`} className="text-[#0f5164] underline">
                    Open instrument workspace
                  </Link>
                  {instrument.instrument_document ? (
                    <a href={getFileProxyUrl(instrument.instrument_document)} target="_blank" rel="noreferrer" className="text-[#0f5164] underline">
                      Open instrument document
                    </a>
                  ) : (
                    <span className="text-gray-500">No instrument document uploaded</span>
                  )}
                </div>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">No EMD/PBG instrument added yet.</div>}
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#0f5164]" />
            <h2 className="text-base font-semibold text-gray-900">Tender Documents</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-900">Tender Document</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-gray-400">{tender.tender_document ? 'Available in workspace' : 'Missing'}</div>
              <div className="mt-2 text-sm text-gray-600">
                {tender.tender_document ? <a href={getFileProxyUrl(tender.tender_document)} target="_blank" rel="noreferrer" className="text-[#0f5164] underline">Open uploaded document</a> : 'No tender document uploaded'}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-900">RFP Document</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-gray-400">{tender.rfp_document ? 'Available in workspace' : 'Missing'}</div>
              <div className="mt-2 text-sm text-gray-600">
                {tender.rfp_document ? <a href={getFileProxyUrl(tender.rfp_document)} target="_blank" rel="noreferrer" className="text-[#0f5164] underline">Open uploaded RFP</a> : 'No RFP uploaded'}
              </div>
            </div>
          </div>
        </section>
      </div>

      {(tender.loa_date || tender.work_order_date || tender.agreement_date || tender.awarded_value || tender.go_live_date || tender.om_start_date || tender.implementation_completion_date || tender.physical_completion_date) ? (
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#0f5164]" />
            <h2 className="text-base font-semibold text-gray-900">Contract Lifecycle</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tender.loa_date ? <div className="rounded-2xl border border-gray-200 p-4"><div className="text-xs uppercase tracking-wide text-gray-500">LOA Date</div><div className="mt-2 text-sm font-semibold text-gray-900">{formatDate(tender.loa_date)}</div></div> : null}
            {tender.work_order_date ? <div className="rounded-2xl border border-gray-200 p-4"><div className="text-xs uppercase tracking-wide text-gray-500">Work Order Date</div><div className="mt-2 text-sm font-semibold text-gray-900">{formatDate(tender.work_order_date)}</div>{tender.work_order_no ? <div className="mt-1 text-xs text-gray-500">#{tender.work_order_no}</div> : null}</div> : null}
            {tender.agreement_date ? <div className="rounded-2xl border border-gray-200 p-4"><div className="text-xs uppercase tracking-wide text-gray-500">Agreement Date</div><div className="mt-2 text-sm font-semibold text-gray-900">{formatDate(tender.agreement_date)}</div></div> : null}
            {tender.awarded_value ? <div className="rounded-2xl border border-gray-200 p-4"><div className="text-xs uppercase tracking-wide text-gray-500">Awarded Value</div><div className="mt-2 text-sm font-semibold text-gray-900">{formatCurrency(tender.awarded_value)}</div></div> : null}
            {tender.go_live_date ? <div className="rounded-2xl border border-gray-200 p-4"><div className="text-xs uppercase tracking-wide text-gray-500">Go-Live Date</div><div className="mt-2 text-sm font-semibold text-gray-900">{formatDate(tender.go_live_date)}</div></div> : null}
            {tender.om_start_date ? <div className="rounded-2xl border border-gray-200 p-4"><div className="text-xs uppercase tracking-wide text-gray-500">O&amp;M Start Date</div><div className="mt-2 text-sm font-semibold text-gray-900">{formatDate(tender.om_start_date)}</div></div> : null}
            {(tender.sla_holiday_from || tender.sla_holiday_to) ? <div className="rounded-2xl border border-gray-200 p-4"><div className="text-xs uppercase tracking-wide text-gray-500">SLA Holiday Period</div><div className="mt-2 text-sm font-semibold text-gray-900">{formatDate(tender.sla_holiday_from)} – {formatDate(tender.sla_holiday_to)}</div></div> : null}
            {tender.implementation_completion_date ? <div className="rounded-2xl border border-gray-200 p-4"><div className="text-xs uppercase tracking-wide text-gray-500">Implementation Completion</div><div className="mt-2 text-sm font-semibold text-gray-900">{formatDate(tender.implementation_completion_date)}</div></div> : null}
            {tender.physical_completion_date ? <div className="rounded-2xl border border-gray-200 p-4"><div className="text-xs uppercase tracking-wide text-gray-500">Physical Completion</div><div className="mt-2 text-sm font-semibold text-gray-900">{formatDate(tender.physical_completion_date)}</div></div> : null}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[#0f5164]" />
            <h2 className="text-base font-semibold text-gray-900">Tender Results</h2>
          </div>
          <div className="mt-4 space-y-3">
            {workspace?.results?.length ? workspace.results.map((result) => (
              <div key={result.name} className="rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-900">{labelize(result.result_stage) || 'Result Stage'}</div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{formatDate(result.result_date)}</span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {result.winning_bidder ? `Winning bidder: ${result.winning_bidder}` : 'Bidder decision not recorded yet'}
                </div>
                {result.winning_amount ? <div className="mt-1 text-sm text-gray-500">Winning amount: {formatCurrency(result.winning_amount)}</div> : null}
                {result.remarks ? <div className="mt-1 text-sm text-gray-500">Remarks: {result.remarks}</div> : null}
              </div>
            )) : <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">No tender result rows recorded yet.</div>}
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <FilePlus2 className="h-5 w-5 text-[#0f5164]" />
            <h2 className="text-base font-semibold text-gray-900">Reminders And Inputs</h2>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">Tender Reminders</div>
              <div className="mt-2 space-y-2">
                {reminderCount ? workspace?.reminders?.slice(0, 4).map((reminder) => (
                  <div key={reminder.name} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    <div className="text-sm font-medium text-gray-900">{reminder.title || reminder.reminder_kind || 'Reminder'}</div>
                    <div className="mt-1 text-xs text-gray-500">{formatDateTime(reminder.reminder_date, reminder.reminder_time)} • {reminder.status || 'Active'}</div>
                  </div>
                )) : <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">No tender reminders yet.</div>}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-900">Latest Delivery Inputs</div>
              <div className="mt-2 space-y-2">
                {workspace?.surveys?.slice(0, 2).map((row) => (
                  <div key={row.name} className="rounded-2xl border border-gray-200 p-3">
                    <div className="text-sm font-medium text-gray-900">Survey • {row.site_name || row.linked_site || row.name}</div>
                    <div className="mt-1 text-xs text-gray-500">{row.status || 'Draft'} {row.survey_date ? `• ${formatDate(row.survey_date)}` : ''}</div>
                  </div>
                ))}
                {workspace?.boqs?.slice(0, 1).map((row) => (
                  <div key={row.name} className="rounded-2xl border border-gray-200 p-3">
                    <div className="text-sm font-medium text-gray-900">BOQ • {row.boq_name || row.name}</div>
                    <div className="mt-1 text-xs text-gray-500">{row.status || 'Draft'} {row.total_amount ? `• ${formatCurrency(row.total_amount)}` : ''}</div>
                  </div>
                ))}
                {workspace?.costSheets?.slice(0, 1).map((row) => (
                  <div key={row.name} className="rounded-2xl border border-gray-200 p-3">
                    <div className="text-sm font-medium text-gray-900">Cost Sheet • {row.sheet_name || row.name}</div>
                    <div className="mt-1 text-xs text-gray-500">{row.status || 'Draft'} {row.sell_value ? `• ${formatCurrency(row.sell_value)}` : ''}</div>
                  </div>
                ))}
                {!surveyCount && !boqCount && !costSheetCount ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                    No survey, BOQ, or cost sheet records are linked yet.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[#0f5164]" />
          <h2 className="text-base font-semibold text-gray-900">Approval Trail</h2>
        </div>
        <div className="mt-4 space-y-3">
          {workspace?.approvals?.length ? workspace.approvals.map((approval) => (
            <div key={approval.name} className="rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-900">{labelize(approval.approval_type)} • {approval.approver_role || '-'}</div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  approval.status === 'Approved' ? 'bg-green-100 text-green-700' :
                  approval.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>{approval.status || '-'}</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">Requested by {approval.requested_by || '-'} on {formatDate(approval.creation)}</div>
              {approval.request_remarks ? (
                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-1">Presales Remark</div>
                  <div className="text-sm text-gray-700">{approval.request_remarks}</div>
                </div>
              ) : null}
              {approval.attached_document ? (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                  <FileText className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-0.5">Attached Document</div>
                    <div className="text-sm text-gray-700 truncate">{approval.attached_document.split('/').pop()}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewDocUrl(getFileProxyUrl(approval.attached_document!))}
                    className="shrink-0 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    View Document
                  </button>
                </div>
              ) : null}
              {approval.action_remarks ? <div className="mt-2 text-sm text-gray-500">Director note: {approval.action_remarks}</div> : null}
            </div>
          )) : <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">No approval request created yet.</div>}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#0f5164]" />
          <h2 className="text-base font-semibold text-gray-900">Supporting Documents</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">Presales uploaded files stay visible here permanently so anyone opening this workspace can view them anytime.</p>
        <div className="mt-4 space-y-3">
          {workspaceDocuments.length ? workspaceDocuments.map((doc) => (
            <div key={`${doc.label}-${doc.file}`} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <FileText className="h-5 w-5 flex-shrink-0 text-[#0f5164]" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-900">{doc.label}</div>
                <div className="mt-1 text-xs text-gray-500">{doc.helper}</div>
                <div className="mt-1 truncate text-xs text-gray-400">{doc.file.split('/').pop()}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewDocUrl(getFileProxyUrl(doc.file))}
                  className="rounded-full bg-[#0f5164] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0a4251]"
                >
                  View
                </button>
                <a
                  href={getFileProxyUrl(doc.file, true)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                >
                  Open
                </a>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
              No supporting documents have been uploaded yet.
            </div>
          )}
        </div>
      </section>

      <LinkedRecordsPanel links={[
        { label: 'Bids', doctype: 'GE Bid', method: 'frappe.client.get_list', args: { doctype: 'GE Bid', filters: JSON.stringify({ tender: tenderId }), fields: JSON.stringify(['name', 'bid_amount', 'status', 'bid_date']), limit_page_length: '10' }, href: (name: string) => `/pre-sales/bids/${name}` },
      ]} />

      <RecordDocumentsPanel referenceDoctype="GE Tender" referenceName={tenderId} title="Linked Documents" initialLimit={5} />

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"><div className="mb-3 font-semibold text-gray-900">Accountability Trail</div><AccountabilityTimeline subjectDoctype="GE Tender" subjectName={tenderId} compact={false} initialLimit={10} /></div>

      <ModalFrame open={Boolean(rejectMode)} onClose={() => { setRejectMode(null); setReasonInput(''); }} title="Reason Required">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">This color change needs a reason. It will be saved in the tender workspace and shown in the funnel trail.</p>
          <textarea
            value={reasonInput}
            onChange={(event) => setReasonInput(event.target.value)}
            rows={5}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#0f5164]"
            placeholder="Write the reason here"
          />
          <div className="flex justify-end gap-2">
            <ActionButton tone="ghost" onClick={() => { setRejectMode(null); setReasonInput(''); }}>Cancel</ActionButton>
            {rejectMode === 'qualification' ? <ActionButton onClick={() => void runWorkflow('reject_qualification', reasonInput)} disabled={!reasonInput.trim() || busy.length > 0}>Save Reason</ActionButton> : null}
            {rejectMode === 'observation' ? <ActionButton onClick={() => void runWorkflow('observe', reasonInput)} disabled={!reasonInput.trim() || busy.length > 0}>Save Reason</ActionButton> : null}
            {rejectMode === 'nogo' && goNoGoApproval ? <ActionButton onClick={() => void actOnApproval(goNoGoApproval.name, 'reject', reasonInput)} disabled={!reasonInput.trim() || busy.length > 0}>Save Reason</ActionButton> : null}
            {rejectMode === 'technical' && technicalApproval ? <ActionButton onClick={() => void actOnApproval(technicalApproval.name, 'reject', reasonInput)} disabled={!reasonInput.trim() || busy.length > 0}>Save Reason</ActionButton> : null}
          </div>
        </div>
      </ModalFrame>

      <ModalFrame open={Boolean(reasonEditor)} onClose={() => setReasonEditor(null)} title={reasonEditor?.title || 'Edit Reason'}>
        <div className="space-y-4">
          <textarea
            value={reasonEditor?.value || ''}
            onChange={(event) => setReasonEditor((prev) => prev ? { ...prev, value: event.target.value } : prev)}
            rows={5}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#0f5164]"
          />
          <div className="flex justify-end gap-2">
            <ActionButton tone="ghost" onClick={() => setReasonEditor(null)}>Cancel</ActionButton>
            <ActionButton
              onClick={() => {
                if (!reasonEditor) return;
                void updateTender({ [reasonEditor.field]: reasonEditor.value });
                setReasonEditor(null);
              }}
              disabled={busy.length > 0}
            >
              Update Reason
            </ActionButton>
          </div>
        </div>
      </ModalFrame>

      <ModalFrame open={showInstrumentModal} onClose={() => { setShowInstrumentModal(false); setInstrumentFile(null); }} title="Add Instrument">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-gray-600">Type
            <select className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" value={instrumentForm.instrument_type} onChange={(event) => setInstrumentForm((prev) => ({ ...prev, instrument_type: event.target.value }))}>
              <option value="EMD">EMD</option>
              <option value="PBG">PBG</option>
              <option value="ADDITIONAL_PBG">Additional PBG</option>
              <option value="SECURITY_DEPOSIT">Security Deposit</option>
              <option value="RETENTION_BG">Retention BG</option>
            </select>
          </label>
          <label className="text-sm text-gray-600">Amount
            <input className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" value={instrumentForm.amount} onChange={(event) => setInstrumentForm((prev) => ({ ...prev, amount: event.target.value }))} />
          </label>
          <label className="text-sm text-gray-600">Instrument Number
            <input className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" value={instrumentForm.instrument_number} onChange={(event) => setInstrumentForm((prev) => ({ ...prev, instrument_number: event.target.value }))} />
          </label>
          <label className="text-sm text-gray-600">Bank Name
            <input className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" value={instrumentForm.bank_name} onChange={(event) => setInstrumentForm((prev) => ({ ...prev, bank_name: event.target.value }))} />
          </label>
          <label className="text-sm text-gray-600">Issue Date
            <input type="date" className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" value={instrumentForm.issue_date} onChange={(event) => setInstrumentForm((prev) => ({ ...prev, issue_date: event.target.value }))} />
          </label>
          <label className="text-sm text-gray-600">Expiry Date
            <input type="date" className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" value={instrumentForm.expiry_date} onChange={(event) => setInstrumentForm((prev) => ({ ...prev, expiry_date: event.target.value }))} />
          </label>
          <label className="text-sm text-gray-600">Linked Project
            <input className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" value={instrumentForm.linked_project} onChange={(event) => setInstrumentForm((prev) => ({ ...prev, linked_project: event.target.value }))} placeholder={workspace?.tender?.linked_project || 'Project ID'} />
          </label>
          <label className="text-sm text-gray-600">Agreement Number
            <input className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" value={instrumentForm.linked_agreement_no} onChange={(event) => setInstrumentForm((prev) => ({ ...prev, linked_agreement_no: event.target.value }))} />
          </label>
          <label className="sm:col-span-2 text-sm text-gray-600">Beneficiary Name
            <input className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" value={instrumentForm.beneficiary_name} onChange={(event) => setInstrumentForm((prev) => ({ ...prev, beneficiary_name: event.target.value }))} />
          </label>
          <label className="sm:col-span-2 text-sm text-gray-600">Release Condition
            <textarea rows={3} className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" value={instrumentForm.release_condition} onChange={(event) => setInstrumentForm((prev) => ({ ...prev, release_condition: event.target.value }))} />
          </label>
          <label className="sm:col-span-2 text-sm text-gray-600">Remarks
            <textarea rows={4} className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" value={instrumentForm.remarks} onChange={(event) => setInstrumentForm((prev) => ({ ...prev, remarks: event.target.value }))} />
          </label>
          <label className="sm:col-span-2 text-sm text-gray-600">Instrument Document
            <input type="file" className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" onChange={(event) => setInstrumentFile(event.target.files?.[0] || null)} />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <ActionButton tone="ghost" onClick={() => { setShowInstrumentModal(false); setInstrumentFile(null); }}>Cancel</ActionButton>
          <ActionButton onClick={() => void createInstrument()} disabled={busy.length > 0}>
            <FolderPlus className="mr-2 inline h-4 w-4" />
            Save Instrument
          </ActionButton>
        </div>
      </ModalFrame>

      <ModalFrame open={showDocumentModal} onClose={() => setShowDocumentModal(false)} title="Add Document">
        <div className="space-y-4">
          <label className="text-sm text-gray-600">Document Type
            <select className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" value={documentType} onChange={(event) => setDocumentType(event.target.value as 'tender' | 'rfp')}>
              <option value="tender">Tender Document</option>
              <option value="rfp">RFP Document</option>
            </select>
          </label>
          <label className="text-sm text-gray-600">Choose File
            <input type="file" className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <ActionButton tone="ghost" onClick={() => setShowDocumentModal(false)}>Cancel</ActionButton>
          <ActionButton onClick={() => void uploadDocument()} disabled={busy.length > 0 || !documentFile}>
            <FilePlus2 className="mr-2 inline h-4 w-4" />
            Upload Document
          </ActionButton>
        </div>
      </ModalFrame>

      {/* Technical Request Modal */}
      <ModalFrame
        open={showTechnicalModal}
        onClose={() => { setShowTechnicalModal(false); setTechnicalRemark(''); setTechnicalFile(null); }}
        title="Send Technical Approval Request"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <span className="font-semibold">Note:</span> This request will be sent to the Director for technical review. Please add a remark and optionally attach a supporting document.
          </div>
          <label className="block text-sm font-medium text-gray-700">
            Remark / Comment
            <textarea
              value={technicalRemark}
              onChange={(e) => setTechnicalRemark(e.target.value)}
              rows={4}
              placeholder="Write your technical remarks or observations here..."
              className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#0f5164] focus:ring-2 focus:ring-[#0f5164]/10 resize-none transition"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Supporting Document <span className="text-gray-400 font-normal">(optional)</span>
            <div className="mt-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center transition hover:border-[#0f5164]/40 hover:bg-[#0f5164]/5">
              <FilePlus2 className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500 mb-2">Upload PDF, Word, image or any file</p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.xls"
                className="cursor-pointer text-sm text-[#0f5164]"
                onChange={(e) => setTechnicalFile(e.target.files?.[0] || null)}
              />
              {technicalFile && (
                <p className="mt-2 text-xs font-medium text-green-700">✓ {technicalFile.name}</p>
              )}
            </div>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <ActionButton tone="ghost" onClick={() => { setShowTechnicalModal(false); setTechnicalRemark(''); setTechnicalFile(null); }}>Cancel</ActionButton>
          <ActionButton
            onClick={() => void submitTechnicalRequest()}
            disabled={busy.length > 0 || !technicalRemark.trim()}
          >
            {busy === 'submit-TECHNICAL' ? 'Sending...' : 'Send Technical Request'}
          </ActionButton>
        </div>
      </ModalFrame>

      {/* Document Viewer Modal */}
      <ModalFrame
        open={Boolean(viewDocUrl)}
        onClose={() => setViewDocUrl(null)}
        title="View Document"
      >
        {viewDocUrl ? (
          <div className="space-y-3">
            {viewDocUrl.toLowerCase().includes('.pdf') || !viewDocUrl.match(/\.(png|jpg|jpeg|gif|webp|svg)($|\?)/) ? (
              <iframe
                src={viewDocUrl}
                title="Document Viewer"
                className="w-full rounded-2xl border border-gray-200"
                style={{ height: '70vh' }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewDocUrl} alt="Document" className="w-full rounded-2xl object-contain max-h-[65vh]" />
            )}
            <div className="flex justify-end gap-2">
              <a
                href={viewDocUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Open in new tab
              </a>
              <ActionButton tone="ghost" onClick={() => setViewDocUrl(null)}>Close</ActionButton>
            </div>
          </div>
        ) : null}
      </ModalFrame>
    </div>
  );
}
