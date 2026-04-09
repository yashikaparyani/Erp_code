'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ExternalLink, ArrowRight, Clock, CheckCircle2, XCircle, Info,
  User, Calendar, Tag, Building2, IndianRupee, FileText, Pause,
} from 'lucide-react';
import DetailPage from '@/components/shells/DetailPage';
import ActionModal from '@/components/ui/ActionModal';
import AccountabilityTimeline from '@/components/accountability/AccountabilityTimeline';
import { formatCurrency, formatDate, statusVariant, useAuth, hasAnyRole } from '@/components/finance/fin-helpers';
import { costingApi } from '@/lib/typedApi';

/* ── Types ──────────────────────────────────────────────────────── */

interface CostingEntry {
  name: string;
  approval_item?: string;
  source_type?: string;
  source_name?: string;
  source_id?: string;
  entry_label?: string;
  project?: string;
  linked_site?: string;
  amount?: number;
  vendor_beneficiary?: string;
  linked_record?: string;
  ph_approver?: string;
  ph_approval_date?: string;
  ph_remarks?: string;
  disbursement_status?: string;
  costing_remarks?: string;
  disbursed_by?: string;
  disbursed_on?: string;
}

/* ── What Happens Next ──────────────────────────────────────── */

const NEXT_STEP: Record<string, { icon: React.ReactNode; heading: string; text: string }> = {
  Pending: {
    icon: <Clock className="h-4 w-4 text-amber-600" />,
    heading: 'Awaiting costing decision',
    text: 'This PH-approved item is ready for Finance review. Release to disburse funds, hold to defer, or reject if the request should not proceed.',
  },
  Released: {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    heading: 'Released / Disbursed',
    text: 'Funds have been released. This entry is fully processed. The requester and PH have been notified.',
  },
  Held: {
    icon: <Pause className="h-4 w-4 text-amber-600" />,
    heading: 'On hold',
    text: 'This entry is on hold. It can be released or rejected when ready. The requester has been informed.',
  },
  Rejected: {
    icon: <XCircle className="h-4 w-4 text-rose-600" />,
    heading: 'Rejected by Finance',
    text: 'This entry was rejected at the costing stage. No funds will be disbursed. The requester has been notified.',
  },
};

/* ── Page ───────────────────────────────────────────────────── */

export default function CostingQueueDetailPage() {
  const { id } = useParams() as { id: string };
  const { currentUser } = useAuth();
  const [data, setData] = useState<CostingEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await costingApi.getItem<CostingEntry>(id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const d = data || ({} as CostingEntry);
  const status = d.disbursement_status || 'Pending';
  const canAct = hasAnyRole(currentUser?.roles, 'Accounts', 'Director', 'System Manager');
  const isPending = status === 'Pending' || status === 'Held' || status === '';

  return (
    <>
      <DetailPage
        title={d.entry_label || d.name || id}
        kicker={d.source_type ? `${d.source_type} · Costing Queue` : 'Costing Queue Entry'}
        backHref="/finance/costing-queue" backLabel="Back to Queue"
        loading={loading} error={error} onRetry={load}
        status={status} statusVariant={statusVariant(status)}
        headerActions={canAct && isPending ? (
          <div className="flex gap-2">
            {(status === 'Pending' || status === '' || status === 'Held') && (
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                onClick={() => { setAction('release'); setSuccessMsg(''); }}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Release
              </button>
            )}
            {(status === 'Pending' || status === '') && (
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                onClick={() => { setAction('hold'); setSuccessMsg(''); }}>
                <Pause className="h-3.5 w-3.5" /> Hold
              </button>
            )}
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
              onClick={() => { setAction('reject'); setSuccessMsg(''); }}>
              <XCircle className="h-3.5 w-3.5" /> Reject
            </button>
          </div>
        ) : undefined}
        identityBlock={
          <div className="space-y-3">
            {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMsg}</div>}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><IndianRupee className="w-5 h-5" /></div><div><div className="stat-value text-sm">{formatCurrency(d.amount)}</div><div className="stat-label">Amount</div></div></div></div>
              <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600"><Tag className="w-5 h-5" /></div><div><div className="stat-value text-sm">{d.source_type || '-'}</div><div className="stat-label">Source Type</div></div></div></div>
              <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><Building2 className="w-5 h-5" /></div><div><div className="stat-value text-sm truncate">{d.project || '-'}</div><div className="stat-label">Project</div></div></div></div>
              <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><User className="w-5 h-5" /></div><div><div className="stat-value text-sm truncate">{d.vendor_beneficiary || '-'}</div><div className="stat-label">Vendor / Beneficiary</div></div></div></div>
            </div>
          </div>
        }
        sidePanels={
          <>
            {/* Source Details */}
            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-gray-900">Source Details</h3></div>
              <div className="card-body">
                <dl className="space-y-3 text-sm">
                  <SideRow label="Source Type" value={d.source_type || '-'} />
                  <SideRow label="Source ID" value={d.source_id || d.source_name || '-'} />
                  <SideRow label="Project" value={d.project || '-'} />
                  {d.linked_site && <SideRow label="Site" value={d.linked_site} />}
                  <SideRow label="Amount" value={formatCurrency(d.amount)} />
                  <SideRow label="Vendor / Beneficiary" value={d.vendor_beneficiary || '-'} />
                  {d.linked_record && (
                    <div className="pt-2 border-t border-gray-100">
                      <Link href={d.linked_record} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" /> View Source Record
                      </Link>
                    </div>
                  )}
                  {d.approval_item && (
                    <div className="pt-2 border-t border-gray-100">
                      <Link href={`/project-head/approval/${encodeURIComponent(d.approval_item)}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                        <ArrowRight className="h-3.5 w-3.5" /> PH Approval Item
                      </Link>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Accountability */}
            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-gray-900">Accountability Trail</h3></div>
              <div className="card-body">
                <AccountabilityTimeline subjectDoctype="GE Costing Queue" subjectName={id} />
              </div>
            </div>
          </>
        }
      >
        {d.name && (
          <div className="space-y-4">
            {/* What happens next */}
            {NEXT_STEP[status] && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3 flex items-start gap-3">
                <div className="mt-0.5">{NEXT_STEP[status].icon}</div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-blue-500" /> {NEXT_STEP[status].heading}
                  </h3>
                  <p className="text-sm text-gray-600 mt-0.5">{NEXT_STEP[status].text}</p>
                </div>
              </div>
            )}

            {/* PH Approval Info */}
            {d.ph_approver && (
              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Project Head Approval</h3></div>
                <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500 block text-xs mb-0.5">Approved By</span><p className="font-medium text-gray-900">{d.ph_approver}</p></div>
                  <div><span className="text-gray-500 block text-xs mb-0.5">Approval Date</span><p className="font-medium text-gray-900">{formatDate(d.ph_approval_date)}</p></div>
                  {d.ph_remarks && <div className="col-span-full"><span className="text-gray-500 block text-xs mb-0.5">PH Remarks</span><p className="font-medium text-gray-900 whitespace-pre-wrap">{d.ph_remarks}</p></div>}
                </div>
              </div>
            )}

            {/* Costing Decision (if decided) */}
            {d.disbursed_by && (
              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-purple-500" /> Costing Decision</h3></div>
                <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500 block text-xs mb-0.5">Decision</span><p className="font-semibold text-gray-900">{status}</p></div>
                  <div><span className="text-gray-500 block text-xs mb-0.5">Decided By</span><p className="font-medium text-gray-900">{d.disbursed_by}</p></div>
                  <div><span className="text-gray-500 block text-xs mb-0.5">Decided On</span><p className="font-medium text-gray-900">{formatDate(d.disbursed_on)}</p></div>
                  {d.costing_remarks && <div className="col-span-full"><span className="text-gray-500 block text-xs mb-0.5">Costing Remarks</span><p className="font-medium text-gray-900 whitespace-pre-wrap">{d.costing_remarks}</p></div>}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailPage>

      {/* Action modal */}
      {action && (
        <ActionModal
          open={!!action}
          title={action === 'release' ? 'Release / Disburse' : action === 'hold' ? 'Hold Entry' : 'Reject Entry'}
          description={`${action === 'release' ? 'Mark as disbursed' : action === 'hold' ? 'Put on hold' : 'Reject'}: ${d.entry_label || d.name} (${formatCurrency(d.amount)})?`}
          confirmLabel={action === 'release' ? 'Release' : action === 'hold' ? 'Hold' : 'Reject'}
          variant={action === 'release' ? 'success' : action === 'reject' ? 'danger' : 'default'}
          fields={[{ name: 'remarks', label: 'Remarks', type: 'textarea', required: action === 'reject' }]}
          onConfirm={async (v) => {
            const actionFn = action === 'release' ? costingApi.release : action === 'hold' ? costingApi.hold : action === 'reject' ? costingApi.reject : null;
            if (!actionFn) return;
            await actionFn(id, v.remarks || '');
            setAction(null);
            setSuccessMsg(`Entry ${action === 'release' ? 'released' : action === 'hold' ? 'put on hold' : 'rejected'} successfully.`);
            load();
          }}
          onCancel={() => setAction(null)}
        />
      )}
    </>
  );
}

/* ── Sub-component ──────────────────────────────────────────── */

function SideRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="text-gray-500 w-32 shrink-0 text-xs">{label}</dt>
      <dd className="font-medium text-gray-900 text-sm truncate">{value}</dd>
    </div>
  );
}
