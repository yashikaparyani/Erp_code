'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle, Plus, RefreshCcw, Loader2, X,
  Clock, CheckCircle2, XCircle, ArrowUpRight, Send,
} from 'lucide-react';
import { callOps } from './pm-helpers';
import { useAccessibleOverlay } from '@/lib/useAccessibleOverlay';
import { sanitizeRichText } from '@/lib/sanitizeRichText';
import { useRole } from '../../context/RoleContext';

/* ── Types ── */

type PMRequest = {
  name: string;
  linked_project: string;
  linked_site?: string;
  request_type: string;
  subject: string;
  status: string;
  priority: string;
  description?: string;
  justification?: string;
  current_deadline?: string;
  proposed_deadline?: string;
  delay_days?: number;
  positions_needed?: number;
  position_type?: string;
  duration_needed?: string;
  amount_requested?: number;
  requested_by?: string;
  requested_date?: string;
  reviewed_by?: string;
  reviewed_date?: string;
  reviewer_remarks?: string;
  creation: string;
  modified: string;
};

type RequestType = 'Timeline Extension' | 'Staffing Request' | 'Petty Cash Exception' | 'Hold Recommendation' | 'Escalation Memo';
type StatusFilter = 'all' | 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn';

const REQUEST_TYPES: RequestType[] = [
  'Timeline Extension', 'Staffing Request', 'Petty Cash Exception',
  'Hold Recommendation', 'Escalation Memo',
];

const STATUS_TONES: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  Pending: 'bg-amber-50 text-amber-600',
  Approved: 'bg-emerald-50 text-emerald-600',
  Rejected: 'bg-rose-50 text-rose-600',
  Withdrawn: 'bg-gray-100 text-gray-400',
};

const PRIORITY_TONES: Record<string, string> = {
  Normal: 'bg-blue-50 text-blue-600',
  Urgent: 'bg-amber-100 text-amber-700',
  Critical: 'bg-rose-100 text-rose-700',
};

const TYPE_SHORT: Record<string, string> = {
  'Timeline Extension': 'Timeline',
  'Staffing Request': 'Staffing',
  'Petty Cash Exception': 'Petty Cash',
  'Hold Recommendation': 'Hold',
  'Escalation Memo': 'Escalation',
};

/* ── Component ── */

export default function RequestsTab({ projectId }: { projectId: string }) {
  const { currentRole } = useRole();
  const [requests, setRequests] = useState<PMRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<PMRequest | null>(null);
  const [actionLoading, setActionLoading] = useState('');

  const emptyForm = {
    request_type: 'Timeline Extension' as RequestType,
    subject: '',
    priority: 'Normal',
    description: '',
    justification: '',
    current_deadline: '',
    proposed_deadline: '',
    delay_days: '',
    positions_needed: '',
    position_type: '',
    duration_needed: '',
    amount_requested: '',
  };
  const [form, setForm] = useState(emptyForm);

  const canSubmit =
    !!form.subject.trim() &&
    (
      (form.request_type === 'Timeline Extension' && !!form.current_deadline && !!form.proposed_deadline) ||
      (form.request_type === 'Staffing Request' && !!form.positions_needed && !!form.position_type.trim() && !!form.duration_needed.trim()) ||
      (form.request_type === 'Petty Cash Exception' && !!form.amount_requested && Number(form.amount_requested) > 0) ||
      ((form.request_type === 'Hold Recommendation' || form.request_type === 'Escalation Memo') &&
        !!form.description.trim() && !!form.justification.trim())
    );
  const canReviewRequests = currentRole === 'Project Head' || currentRole === 'Department Head' || currentRole === 'Director';
  const canCreateRequests = currentRole === 'Project Manager' || currentRole === 'Project Head';

  /* ── Load ── */

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callOps<PMRequest[]>('get_pm_requests', { project: projectId });
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  /* ── Derived ── */

  const filtered = statusFilter === 'all' ? requests : requests.filter((r) => r.status === statusFilter);
  const counts: Record<StatusFilter, number> = {
    all: requests.length,
    Draft: requests.filter((r) => r.status === 'Draft').length,
    Pending: requests.filter((r) => r.status === 'Pending').length,
    Approved: requests.filter((r) => r.status === 'Approved').length,
    Rejected: requests.filter((r) => r.status === 'Rejected').length,
    Withdrawn: requests.filter((r) => r.status === 'Withdrawn').length,
  };

  /* ── Create ── */

  const submitCreate = async (andSubmit: boolean) => {
    if (!form.subject.trim()) return;
    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        linked_project: projectId,
        request_type: form.request_type,
        subject: form.subject.trim(),
        priority: form.priority,
        description: form.description.trim() || undefined,
        justification: form.justification.trim() || undefined,
      };
      if (form.request_type === 'Timeline Extension') {
        if (form.current_deadline) payload.current_deadline = form.current_deadline;
        if (form.proposed_deadline) payload.proposed_deadline = form.proposed_deadline;
        const days = parseInt(form.delay_days);
        if (!isNaN(days) && days > 0) payload.delay_days = days;
      } else if (form.request_type === 'Staffing Request') {
        const pos = parseInt(form.positions_needed);
        if (!isNaN(pos) && pos > 0) payload.positions_needed = pos;
        if (form.position_type.trim()) payload.position_type = form.position_type.trim();
        if (form.duration_needed.trim()) payload.duration_needed = form.duration_needed.trim();
      } else if (form.request_type === 'Petty Cash Exception') {
        const amt = parseFloat(form.amount_requested);
        if (!isNaN(amt) && amt > 0) payload.amount_requested = amt;
      }

      if (andSubmit) payload.status = 'Pending';

      await callOps('create_pm_request', { data: JSON.stringify(payload) });
      setShowCreate(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request');
    } finally {
      setCreating(false);
    }
  };

  /* ── Actions ── */

  const doAction = async (action: string, name: string, remarks?: string) => {
    setActionLoading(name);
    try {
      await callOps(action, { name, ...(remarks ? { remarks } : {}) });
      setDetail(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading('');
    }
  };

  /* ── Render ── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['all', 'Draft', 'Pending', 'Approved', 'Rejected', 'Withdrawn'] as StatusFilter[]).map((key) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === key
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:bg-gray-200'
              }`}
            >
              {key === 'all' ? 'All' : key} ({counts[key]})
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="btn btn-secondary text-xs">
            <RefreshCcw className="h-3.5 w-3.5" /> Refresh
          </button>
          {canCreateRequests ? (
            <button onClick={() => setShowCreate(true)} className="btn btn-primary text-xs">
              <Plus className="h-3.5 w-3.5" /> New Request
            </button>
          ) : null}
        </div>
      </div>

      {/* Request cards */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--text-muted)]">
          {statusFilter === 'all' ? 'No requests for this project yet.' : `No ${statusFilter.toLowerCase()} requests.`}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <button
              key={req.name}
              onClick={() => setDetail(req)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-main)] p-4 text-left transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                      {TYPE_SHORT[req.request_type] || req.request_type}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONES[req.status] || 'bg-gray-100 text-gray-600'}`}>
                      {req.status}
                    </span>
                    {req.priority !== 'Normal' && (
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_TONES[req.priority] || ''}`}>
                        {req.priority}
                      </span>
                    )}
                  </div>
                  <h4 className="mt-1.5 text-sm font-medium text-[var(--text-main)]">{req.subject}</h4>
                  <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[var(--text-muted)]">
                    {req.requested_by && <span>By: {req.requested_by}</span>}
                    <span>{new Date(req.creation).toLocaleDateString('en-IN')}</span>
                    {req.request_type === 'Timeline Extension' && req.proposed_deadline && (
                      <span>Proposed: {req.proposed_deadline}</span>
                    )}
                    {req.request_type === 'Staffing Request' && req.positions_needed && (
                      <span>{req.positions_needed} position(s)</span>
                    )}
                    {req.request_type === 'Petty Cash Exception' && req.amount_requested && (
                      <span>₹{Number(req.amount_requested).toLocaleString('en-IN')}</span>
                    )}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {detail && (
        <DetailDrawer
          req={detail}
          onClose={() => setDetail(null)}
          onAction={doAction}
          actionLoading={actionLoading}
          canReviewRequests={canReviewRequests}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateModal
          form={form}
          setForm={setForm}
          creating={creating}
          onSaveDraft={() => void submitCreate(false)}
          onSubmit={() => void submitCreate(true)}
          canSubmit={canSubmit}
          onClose={() => { setShowCreate(false); setForm(emptyForm); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Detail Drawer
   ═══════════════════════════════════════════════════════════ */

function DetailDrawer({
  req, onClose, onAction, actionLoading, canReviewRequests,
}: {
  req: PMRequest;
  onClose: () => void;
  onAction: (action: string, name: string, remarks?: string) => void;
  actionLoading: string;
  canReviewRequests: boolean;
}) {
  const [remarks, setRemarks] = useState('');
  const busy = actionLoading === req.name;
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { containerRef } = useAccessibleOverlay({
    isOpen: true,
    onClose,
    initialFocusRef: closeButtonRef,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40" onMouseDown={onClose}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                {req.request_type}
              </span>
              <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONES[req.status] || ''}`}>
                {req.status}
              </span>
              {req.priority !== 'Normal' && (
                <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_TONES[req.priority] || ''}`}>
                  {req.priority}
                </span>
              )}
            </div>
            <h3 id={titleId} className="mt-1 text-base font-semibold text-gray-900">{req.subject}</h3>
          </div>
          <button ref={closeButtonRef} type="button" aria-label="Close request details" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
          {/* Metadata */}
          <div className="grid grid-cols-1 gap-3 text-xs text-[var(--text-muted)] sm:grid-cols-2">
            <div><span className="font-medium text-gray-600">Requested By:</span> {req.requested_by || '—'}</div>
            <div><span className="font-medium text-gray-600">Date:</span> {req.requested_date || '—'}</div>
            {req.reviewed_by && <div><span className="font-medium text-gray-600">Reviewed By:</span> {req.reviewed_by}</div>}
            {req.reviewed_date && <div><span className="font-medium text-gray-600">Review Date:</span> {req.reviewed_date}</div>}
            {req.linked_site && <div><span className="font-medium text-gray-600">Site:</span> {req.linked_site}</div>}
          </div>

          {/* Type-specific fields */}
          {req.request_type === 'Timeline Extension' && (
            <div className="rounded-lg bg-gray-50 p-3 space-y-1 text-xs">
              <h5 className="font-semibold text-gray-700">Timeline Details</h5>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div><span className="text-gray-500">Current:</span> {req.current_deadline || '—'}</div>
                <div><span className="text-gray-500">Proposed:</span> {req.proposed_deadline || '—'}</div>
                <div><span className="text-gray-500">Delay:</span> {req.delay_days ? `${req.delay_days} days` : '—'}</div>
              </div>
            </div>
          )}
          {req.request_type === 'Staffing Request' && (
            <div className="rounded-lg bg-gray-50 p-3 space-y-1 text-xs">
              <h5 className="font-semibold text-gray-700">Staffing Details</h5>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div><span className="text-gray-500">Positions:</span> {req.positions_needed || '—'}</div>
                <div><span className="text-gray-500">Type:</span> {req.position_type || '—'}</div>
                <div><span className="text-gray-500">Duration:</span> {req.duration_needed || '—'}</div>
              </div>
            </div>
          )}
          {req.request_type === 'Petty Cash Exception' && req.amount_requested && (
            <div className="rounded-lg bg-gray-50 p-3 text-xs">
              <h5 className="font-semibold text-gray-700">Amount Requested</h5>
              <p className="mt-1 text-lg font-bold text-gray-900">₹{Number(req.amount_requested).toLocaleString('en-IN')}</p>
            </div>
          )}

          {/* Description */}
          {req.description && (
            <div>
              <h5 className="text-xs font-semibold text-gray-600 mb-1">Description</h5>
              <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeRichText(req.description) }} />
            </div>
          )}

          {/* Justification */}
          {req.justification && (
            <div>
              <h5 className="text-xs font-semibold text-gray-600 mb-1">Justification</h5>
              <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeRichText(req.justification) }} />
            </div>
          )}

          {/* Reviewer remarks */}
          {req.reviewer_remarks && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <h5 className="text-xs font-semibold text-amber-700 mb-1">Reviewer Remarks</h5>
              <p className="text-xs text-amber-800">{req.reviewer_remarks}</p>
            </div>
          )}

          {/* Action section – only for Pending or Draft */}
          {(req.status === 'Pending' || req.status === 'Draft') && (
            <div className="border-t pt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Remarks (optional)</label>
                <textarea
                  className="input min-h-16 text-sm"
                  placeholder="Add remarks before action..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {req.status === 'Draft' && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onAction('submit_pm_request', req.name)}
                      className="btn btn-primary text-xs"
                    >
                      <Send className="h-3.5 w-3.5" /> Submit for Review
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onAction('withdraw_pm_request', req.name)}
                      className="btn btn-secondary text-xs"
                    >
                      Withdraw
                    </button>
                  </>
                )}
                {req.status === 'Pending' && canReviewRequests && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onAction('approve_pm_request', req.name, remarks || undefined)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onAction('reject_pm_request', req.name, remarks || undefined)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onAction('withdraw_pm_request', req.name)}
                      className="btn btn-secondary text-xs"
                    >
                      Withdraw
                    </button>
                  </>
                )}
                {req.status === 'Pending' && !canReviewRequests && (
                  <button
                    disabled={busy}
                    onClick={() => onAction('withdraw_pm_request', req.name)}
                    className="btn btn-secondary text-xs"
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Create Modal
   ═══════════════════════════════════════════════════════════ */

type FormState = {
  request_type: RequestType;
  subject: string;
  priority: string;
  description: string;
  justification: string;
  current_deadline: string;
  proposed_deadline: string;
  delay_days: string;
  positions_needed: string;
  position_type: string;
  duration_needed: string;
  amount_requested: string;
};

function CreateModal({
  form, setForm, creating, onSaveDraft, onSubmit, onClose, canSubmit,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  creating: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  onClose: () => void;
}) {
  const set = (key: keyof FormState, val: string) => setForm((p) => ({ ...p, [key]: val }));
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { containerRef } = useAccessibleOverlay({
    isOpen: true,
    onClose,
    initialFocusRef: closeButtonRef,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-4 shadow-xl focus:outline-none sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id={titleId} className="text-lg font-semibold text-gray-900">New PM Request</h3>
          <button ref={closeButtonRef} type="button" aria-label="Close new request form" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Type + Priority */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Request Type *</label>
              <select className="input" value={form.request_type} onChange={(e) => set('request_type', e.target.value)}>
                {REQUEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                <option>Normal</option>
                <option>Urgent</option>
                <option>Critical</option>
              </select>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Subject *</label>
            <input className="input" placeholder="Brief summary of the request" value={form.subject} onChange={(e) => set('subject', e.target.value)} />
          </div>

          {/* Type-specific fields */}
          {form.request_type === 'Timeline Extension' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Current Deadline *</label>
                <input className="input" type="date" value={form.current_deadline} onChange={(e) => set('current_deadline', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Proposed Deadline *</label>
                <input className="input" type="date" value={form.proposed_deadline} onChange={(e) => set('proposed_deadline', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Delay (Days)</label>
                <input className="input" type="number" min="0" value={form.delay_days} onChange={(e) => set('delay_days', e.target.value)} />
              </div>
            </div>
          )}

          {form.request_type === 'Staffing Request' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Positions Needed *</label>
                <input className="input" type="number" min="1" value={form.positions_needed} onChange={(e) => set('positions_needed', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Position Type *</label>
                <input className="input" placeholder="e.g. Engineer, Technician" value={form.position_type} onChange={(e) => set('position_type', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Duration *</label>
                <input className="input" placeholder="e.g. 2 weeks, 1 month" value={form.duration_needed} onChange={(e) => set('duration_needed', e.target.value)} />
              </div>
            </div>
          )}

          {form.request_type === 'Petty Cash Exception' && (
            <div className="max-w-xs">
              <label className="mb-1 block text-sm font-medium text-gray-700">Amount (₹) *</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.amount_requested} onChange={(e) => set('amount_requested', e.target.value)} />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description{form.request_type === 'Hold Recommendation' || form.request_type === 'Escalation Memo' ? ' *' : ''}</label>
            <textarea className="input min-h-20" placeholder="Describe the request in detail" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          {/* Justification */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Justification{form.request_type === 'Hold Recommendation' || form.request_type === 'Escalation Memo' ? ' *' : ''}</label>
            <textarea className="input min-h-16" placeholder="Why is this request needed?" value={form.justification} onChange={(e) => set('justification', e.target.value)} />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={creating || !form.subject.trim()}
            className="btn btn-secondary"
          >
            <Clock className="h-3.5 w-3.5" /> {creating ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={creating || !canSubmit}
            className="btn btn-primary"
          >
            <Send className="h-3.5 w-3.5" /> {creating ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
