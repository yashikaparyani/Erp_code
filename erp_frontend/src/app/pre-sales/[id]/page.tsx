'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { deriveTenderFunnelStatus, getTenderFunnelMeta } from '@/components/tenderFunnel';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Loader2,
  MapPinned,
  Trophy,
} from 'lucide-react';

type Tender = {
  name: string;
  tender_number: string;
  title: string;
  client?: string;
  organization?: string;
  submission_date?: string;
  computed_funnel_status?: string;
  status: string;
  estimated_value?: number;
  emd_required?: number;
  emd_amount?: number;
  pbg_required?: number;
  pbg_amount?: number;
  linked_project?: string;
  tender_owner?: string;
  go_no_go_status?: string;
  go_no_go_by?: string;
  go_no_go_on?: string;
  go_no_go_remarks?: string;
  technical_readiness?: string;
  commercial_readiness?: string;
  finance_readiness?: string;
  approval_status?: string;
  submission_status?: string;
};

type SimpleRow = {
  name: string;
  status?: string;
  creation?: string;
  modified?: string;
};

type Reminder = SimpleRow & {
  reminder_date?: string;
  reminder_time?: string;
  remind_user?: string;
};

type Survey = SimpleRow & {
  site_name?: string;
  survey_date?: string;
  surveyed_by?: string;
  summary?: string;
};

type Boq = SimpleRow & {
  version?: number;
  total_amount?: number;
  total_items?: number;
  approved_by?: string;
};

type CostSheet = SimpleRow & {
  version?: number;
  base_cost?: number;
  sell_value?: number;
  margin_percent?: number;
  approved_by?: string;
};

type FinanceRequest = SimpleRow & {
  instrument_type?: string;
  amount?: number;
  instrument_number?: string;
  bank_name?: string;
};

type TenderResult = SimpleRow & {
  result_stage?: string;
  winner_company?: string;
  winning_amount?: number;
  publication_date?: string;
};

type ChecklistTemplate = {
  name: string;
  checklist_name?: string;
  checklist_type?: string;
  status?: string;
};

type TenderApproval = {
  name: string;
  linked_tender?: string;
  approval_type?: string;
  status?: string;
  requested_by?: string;
  approver_role?: string;
  approver_user?: string;
  request_remarks?: string;
  action_remarks?: string;
  acted_on?: string;
  creation?: string;
};

type WorkspaceResponse = {
  tender: Tender | null;
  results: TenderResult[];
  reminders: Reminder[];
  surveys: Survey[];
  boqs: Boq[];
  costSheets: CostSheet[];
  financeRequests: FinanceRequest[];
  checklistTemplates: ChecklistTemplate[];
  approvals: TenderApproval[];
};

const statusTone: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_EVALUATION: 'bg-amber-100 text-amber-700',
  WON: 'bg-emerald-100 text-emerald-700',
  LOST: 'bg-rose-100 text-rose-700',
  DROPPED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-slate-100 text-slate-600',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Denied: 'bg-rose-100 text-rose-700',
  Completed: 'bg-emerald-100 text-emerald-700',
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value?: number) {
  if (!value) return 'Rs 0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatStatusLabel(status?: string) {
  if (!status) return '-';
  return status.replace(/_/g, ' ');
}

function SectionCard({
  title,
  icon: Icon,
  subtitle,
  action,
  children,
}: {
  title: string;
  icon: any;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef6f8] text-[#1e6b87]">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">{message}</div>;
}

export default function TenderWorkspacePage() {
  const params = useParams();
  const tenderId = decodeURIComponent(params.id as string);

  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [approvalBusy, setApprovalBusy] = useState('');

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/tender-workspace/${encodeURIComponent(tenderId)}`);
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to load tender workspace');
      }
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
  const latestResult = useMemo(() => workspace?.results?.[0] ?? null, [workspace?.results]);
  const latestBoq = useMemo(() => workspace?.boqs?.[0] ?? null, [workspace?.boqs]);
  const latestCostSheet = useMemo(() => workspace?.costSheets?.[0] ?? null, [workspace?.costSheets]);
  const derivedFunnel = tender ? (tender.computed_funnel_status || deriveTenderFunnelStatus(tender)) : null;
  const derivedFunnelMeta = getTenderFunnelMeta(derivedFunnel || undefined);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-[#1e6b87]" />
        <span className="text-sm text-gray-500">Loading tender workspace...</span>
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
          <div>
            <h1 className="text-base font-semibold text-red-800">Tender workspace unavailable</h1>
            <p className="mt-1 text-sm text-red-700">{error || 'Tender not found.'}</p>
            <Link href="/pre-sales/tender" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-red-700">
              <ArrowLeft className="h-4 w-4" />
              Back to tender list
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const daysLeft = tender.submission_date
    ? Math.ceil((new Date(tender.submission_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const updateTenderStatus = async (status: string) => {
    try {
      setActionLoading(status);
      setError('');
      const response = await fetch(`/api/tenders/${encodeURIComponent(tenderId)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_status: status }),
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to update tender status');
      }
      await loadWorkspace();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to update tender status');
    } finally {
      setActionLoading('');
    }
  };

  const convertToProject = async () => {
    try {
      setActionLoading('CONVERT');
      setError('');
      const response = await fetch('/api/tender-convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tender_name: tenderId }),
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to convert tender');
      }
      await loadWorkspace();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to convert tender');
    } finally {
      setActionLoading('');
    }
  };

  const submitApproval = async (approvalType: string) => {
    try {
      setApprovalBusy(approvalType);
      setError('');
      const response = await fetch('/api/tender-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tenderId, approval_type: approvalType }),
      });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to submit tender approval');
      }
      await loadWorkspace();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to submit tender approval');
    } finally {
      setApprovalBusy('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[2rem] bg-gradient-to-br from-[#0f5164] via-[#1e6b87] to-[#5ca0b8] px-6 py-6 text-white shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <Link href="/pre-sales/tender" className="inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to tender list
          </Link>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[tender.status] || 'bg-white/15 text-white'}`}>
            {formatStatusLabel(tender.status)}
          </span>
        </div>

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.22em] text-white/70">Tender Workspace</div>
          <h1 className="text-2xl font-semibold">{tender.title}</h1>
          <div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${derivedFunnelMeta.toneClass}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${derivedFunnelMeta.dotClass}`} />
              Funnel: {derivedFunnel}
            </span>
          </div>
          <p className="text-sm text-white/80">
            {tender.tender_number} • {tender.client || 'Client not mapped'} • {tender.organization || 'Organization pending'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-white/65">Submission Date</div>
            <div className="mt-2 text-lg font-semibold">{formatDate(tender.submission_date)}</div>
            <div className="mt-1 text-sm text-white/75">{daysLeft === null ? 'Deadline not set' : `${daysLeft} day(s) left`}</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-white/65">Estimated Value</div>
            <div className="mt-2 text-lg font-semibold">{formatCurrency(tender.estimated_value)}</div>
            <div className="mt-1 text-sm text-white/75">Internal reference value</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-white/65">EMD / PBG</div>
            <div className="mt-2 text-lg font-semibold">
              {tender.emd_required ? formatCurrency(tender.emd_amount) : 'No EMD'}
            </div>
            <div className="mt-1 text-sm text-white/75">
              {tender.pbg_required ? `PBG ${formatCurrency(tender.pbg_amount)}` : 'No PBG'}
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-white/65">Project Link</div>
            <div className="mt-2 text-lg font-semibold">{tender.linked_project || 'Not converted'}</div>
            <div className="mt-1 text-sm text-white/75">{tender.linked_project ? 'Ready for project handoff' : 'Still in pre-sales flow'}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            ['SUBMITTED', 'Mark Submitted'],
            ['UNDER_EVALUATION', 'Mark Under Evaluation'],
            ['WON', 'Mark Won'],
            ['LOST', 'Mark Lost'],
            ['DROPPED', 'Mark Dropped'],
          ].map(([status, label]) => (
            <button
              key={status}
              type="button"
              onClick={() => void updateTenderStatus(status)}
              disabled={actionLoading.length > 0 || tender.status === status}
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === status ? 'Updating...' : label}
            </button>
          ))}
          {tender.status === 'WON' && !tender.linked_project ? (
            <button
              type="button"
              onClick={() => void convertToProject()}
              disabled={actionLoading.length > 0}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0f5164] hover:bg-[#eef6f8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === 'CONVERT' ? 'Converting...' : 'Convert To Project'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <SectionCard
            title="Bid Flow"
            icon={CheckCircle2}
            subtitle="Simple single-page view of what is ready and what still needs attention."
          >
            <div className="grid gap-3 md:grid-cols-2">
              {[
                {
                  label: '1. Tender identified',
                  state: tender.tender_number ? 'Done' : 'Pending',
                  note: 'Basic tender master is created.',
                },
                {
                  label: '2. Checklist ready',
                  state: workspace.checklistTemplates.length ? 'Ready' : 'Pending',
                  note: `${workspace.checklistTemplates.length} checklist template(s) available for pre-sales use.`,
                },
                {
                  label: '3. Survey / assumptions',
                  state: workspace.surveys.length ? 'In progress' : 'Pending',
                  note: workspace.surveys.length ? `${workspace.surveys.length} survey record(s) linked.` : 'No survey linked yet.',
                },
                {
                  label: '4. BOQ preparation',
                  state: latestBoq?.status ? formatStatusLabel(latestBoq.status) : 'Pending',
                  note: latestBoq ? `Latest BOQ ${latestBoq.name} • version ${latestBoq.version || 1}` : 'No BOQ linked yet.',
                },
                {
                  label: '5. Costing and margin',
                  state: latestCostSheet?.status ? formatStatusLabel(latestCostSheet.status) : 'Pending',
                  note: latestCostSheet ? `Latest cost sheet ${latestCostSheet.name}` : 'No cost sheet linked yet.',
                },
                {
                  label: '6. Finance readiness',
                  state: workspace.financeRequests.length ? 'Tracked' : 'Pending',
                  note: workspace.financeRequests.length ? `${workspace.financeRequests.length} finance request(s) raised.` : 'No finance request raised yet.',
                },
                {
                  label: '7. Submission tracking',
                  state: tender.status === 'SUBMITTED' || tender.status === 'UNDER_EVALUATION' || tender.status === 'WON' || tender.status === 'LOST' ? 'Tracked' : 'Pending',
                  note: `Current tender status is ${formatStatusLabel(tender.status)}.`,
                },
                {
                  label: '8. Result and closure',
                  state: latestResult ? 'Tracked' : 'Pending',
                  note: latestResult ? `Latest result stage: ${latestResult.result_stage || '-'}` : 'No tender result linked yet.',
                },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {item.state}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{item.note}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Survey, BOQ, and Costing"
            icon={FileSpreadsheet}
            subtitle="Technical preparation and commercial readiness in one place."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <MapPinned className="h-4 w-4 text-[#1e6b87]" />
                  Survey
                </div>
                <div className="mt-3 text-2xl font-semibold text-gray-900">{workspace.surveys.length}</div>
                <p className="mt-1 text-sm text-gray-500">
                  {workspace.surveys[0]?.site_name ? `Latest site: ${workspace.surveys[0].site_name}` : 'No survey linked yet.'}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <FileCheck className="h-4 w-4 text-[#1e6b87]" />
                  BOQ
                </div>
                <div className="mt-3 text-2xl font-semibold text-gray-900">{workspace.boqs.length}</div>
                <p className="mt-1 text-sm text-gray-500">
                  {latestBoq ? `${formatStatusLabel(latestBoq.status)} • ${formatCurrency(latestBoq.total_amount)}` : 'No BOQ prepared yet.'}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Briefcase className="h-4 w-4 text-[#1e6b87]" />
                  Cost Sheet
                </div>
                <div className="mt-3 text-2xl font-semibold text-gray-900">{workspace.costSheets.length}</div>
                <p className="mt-1 text-sm text-gray-500">
                  {latestCostSheet ? `${formatStatusLabel(latestCostSheet.status)} • sell ${formatCurrency(latestCostSheet.sell_value)}` : 'No cost sheet prepared yet.'}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {workspace.surveys.slice(0, 2).map((survey) => (
                <div key={survey.name} className="flex items-start justify-between gap-4 rounded-2xl border border-gray-100 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{survey.site_name || survey.name}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      Survey date {formatDate(survey.survey_date)} • {survey.surveyed_by || 'Owner not mapped'}
                    </div>
                    {survey.summary ? <div className="mt-2 text-sm text-gray-600">{survey.summary}</div> : null}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[survey.status || ''] || 'bg-slate-100 text-slate-700'}`}>
                    {formatStatusLabel(survey.status)}
                  </span>
                </div>
              ))}
              {!workspace.surveys.length ? <EmptyBlock message="No survey records are linked yet. A survey snapshot will appear here as soon as one is created for this tender." /> : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Ownership and Approval State"
            icon={CheckCircle2}
            subtitle="Tender owner, go/no-go, readiness signals, and approval trail in one place."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-400">Tender Owner</div>
                <div className="mt-2 text-base font-semibold text-gray-900">{tender.tender_owner || '-'}</div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-400">Go / No-Go</div>
                    <div className="mt-1 font-medium text-gray-800">{formatStatusLabel(tender.go_no_go_status)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Approval Status</div>
                    <div className="mt-1 font-medium text-gray-800">{formatStatusLabel(tender.approval_status)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Technical</div>
                    <div className="mt-1 font-medium text-gray-800">{formatStatusLabel(tender.technical_readiness)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Commercial</div>
                    <div className="mt-1 font-medium text-gray-800">{formatStatusLabel(tender.commercial_readiness)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Finance</div>
                    <div className="mt-1 font-medium text-gray-800">{formatStatusLabel(tender.finance_readiness)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Submission</div>
                    <div className="mt-1 font-medium text-gray-800">{formatStatusLabel(tender.submission_status)}</div>
                  </div>
                </div>
                {(tender.go_no_go_by || tender.go_no_go_on || tender.go_no_go_remarks) ? (
                  <div className="mt-4 rounded-2xl bg-gray-50 p-3 text-sm text-gray-600">
                    <div>Decision by: {tender.go_no_go_by || '-'}</div>
                    <div>Decision on: {formatDate(tender.go_no_go_on)}</div>
                    {tender.go_no_go_remarks ? <div className="mt-1">Remarks: {tender.go_no_go_remarks}</div> : null}
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-sm font-semibold text-gray-900">Raise approval request</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    ['GO_NO_GO', 'Go / No-Go'],
                    ['TECHNICAL', 'Technical'],
                    ['COMMERCIAL', 'Commercial'],
                    ['FINANCE', 'Finance'],
                    ['SUBMISSION', 'Submission'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => void submitApproval(value)}
                      disabled={approvalBusy.length > 0}
                      className="rounded-full border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-[#1e6b87] hover:text-[#1e6b87] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {approvalBusy === value ? 'Submitting...' : label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm text-gray-500">
                  These requests will appear in the `Approvals` inbox, where the `Presales Tendering Head` or `Director` can review and take action.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {workspace.approvals.slice(0, 5).map((approval) => (
                <div key={approval.name} className="rounded-2xl border border-gray-200 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{approval.approval_type || approval.name}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Requested by {approval.requested_by || '-'} • {formatDate(approval.creation)}
                      </div>
                      {approval.request_remarks ? <div className="mt-2 text-sm text-gray-600">Request: {approval.request_remarks}</div> : null}
                      {approval.action_remarks ? <div className="mt-1 text-sm text-gray-600">Action: {approval.action_remarks}</div> : null}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[approval.status || ''] || 'bg-slate-100 text-slate-700'}`}>
                      {formatStatusLabel(approval.status)}
                    </span>
                  </div>
                </div>
              ))}
              {!workspace.approvals.length ? <EmptyBlock message="No tender-specific approval history is available yet. The approval trail will appear here once a request is submitted." /> : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Result Tracking"
            icon={Trophy}
            subtitle="Track tender results and competitive outcomes from this section after submission."
            action={<Link href="/pre-sales/tender-result" className="text-sm font-medium text-[#1e6b87]">Open result page</Link>}
          >
            {latestResult ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400">Stage</div>
                  <div className="mt-2 text-base font-semibold text-gray-900">{latestResult.result_stage || '-'}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400">Winner</div>
                  <div className="mt-2 text-base font-semibold text-gray-900">{latestResult.winner_company || '-'}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400">Winning Amount</div>
                  <div className="mt-2 text-base font-semibold text-gray-900">{formatCurrency(latestResult.winning_amount)}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400">Published</div>
                  <div className="mt-2 text-base font-semibold text-gray-900">{formatDate(latestResult.publication_date)}</div>
                </div>
              </div>
            ) : (
              <EmptyBlock message="No tender result is linked yet. The latest outcome will appear here once a result is published." />
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Checklist and Reminders"
            icon={Calendar}
            subtitle="Execution se pehle internal readiness aur deadline control."
            action={<Link href="/pre-sales/approvals" className="text-sm font-medium text-[#1e6b87]">Open approvals</Link>}
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-sm font-semibold text-gray-900">Checklist templates</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">{workspace.checklistTemplates.length}</div>
                <p className="mt-1 text-sm text-gray-500">Existing reusable checklists are being reused instead of creating a new tender-only document layer.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-sm font-semibold text-gray-900">Upcoming reminders</div>
                <div className="mt-3 space-y-3">
                  {workspace.reminders.slice(0, 3).map((reminder) => (
                    <div key={reminder.name} className="rounded-2xl bg-gray-50 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-gray-900">{reminder.remind_user || reminder.name}</div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusTone[reminder.status || ''] || 'bg-slate-100 text-slate-700'}`}>
                          {formatStatusLabel(reminder.status)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {formatDate(reminder.reminder_date)} {reminder.reminder_time || ''}
                      </div>
                    </div>
                  ))}
                  {!workspace.reminders.length ? <EmptyBlock message="No reminders linked to this tender yet." /> : null}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Finance Snapshot"
            icon={CreditCard}
            subtitle="EMD/PBG and finance request visibility for pre-sales head."
            action={<Link href="/pre-sales/finance/new-request" className="text-sm font-medium text-[#1e6b87]">Open finance</Link>}
          >
            <div className="space-y-3">
              {workspace.financeRequests.slice(0, 4).map((request) => (
                <div key={request.name} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {request.instrument_type || 'Finance Request'} • {request.instrument_number || request.name}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">{request.bank_name || 'Bank not mapped'}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[request.status || ''] || 'bg-slate-100 text-slate-700'}`}>
                      {formatStatusLabel(request.status)}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">{formatCurrency(request.amount)}</div>
                </div>
              ))}
              {!workspace.financeRequests.length ? <EmptyBlock message="No finance request is linked yet. Any EMD or PBG requirement will appear here once it is raised." /> : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Quick Links"
            icon={Clock3}
            subtitle="Direct links to the main pre-sales work areas using the same workspace structure."
          >
            <div className="space-y-2">
              {[
                ['Tender list', '/pre-sales/tender'],
                ['Tender result', '/pre-sales/tender-result'],
                ['Tender tasks', '/pre-sales/tender-task/my-tender'],
                ['Finance management', '/pre-sales/finance/new-request'],
                ['Approvals', '/pre-sales/approvals'],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-[#1e6b87] hover:text-[#1e6b87]"
                >
                  <span>{label}</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Submission Signal"
            icon={FileText}
            subtitle="A simple summary of the current bid position."
          >
            <div className="rounded-2xl bg-[#f5fbfd] p-4 text-sm leading-6 text-gray-700">
              {tender.status === 'DRAFT' && 'The tender has been identified and is currently in the bid preparation stage. Complete the survey, BOQ, costing, and finance readiness steps before seeking approval.'}
              {tender.status === 'SUBMITTED' && 'The bid has been submitted. The team should now focus on reminders, clarifications, and result tracking.'}
              {tender.status === 'UNDER_EVALUATION' && 'The bid is under evaluation. Clarifications, pricing responses, and result monitoring are the top priorities at this stage.'}
              {tender.status === 'WON' && 'The tender has been won. The next step is to convert it into a project and hand it over for execution.'}
              {tender.status === 'LOST' && 'The tender is closed with a lost result. Capture competitor outcomes and pricing lessons for future bids.'}
              {tender.status !== 'DRAFT' &&
                tender.status !== 'SUBMITTED' &&
                tender.status !== 'UNDER_EVALUATION' &&
                tender.status !== 'WON' &&
                tender.status !== 'LOST' &&
                `The current status is ${formatStatusLabel(tender.status)}. The next operational step should be planned accordingly.`}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
