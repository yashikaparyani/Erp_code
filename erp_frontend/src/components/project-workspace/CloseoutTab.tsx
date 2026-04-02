'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Award, Loader2, FileWarning } from 'lucide-react';
import { callOps } from './workspace-types';

type CloseoutEligibility = {
  contract_scope: string | null;
  sequence: string[];
  issued: string[];
  next_eligible: string | null;
  all_complete: boolean;
  message?: string;
};

type CloseoutItem = {
  name: string;
  closeout_type: string;
  project: string;
  linked_tender?: string;
  contract_scope?: string;
  status: string;
  issued_by?: string;
  issued_on?: string;
  certificate_date?: string;
  remarks?: string;
  kt_handover_plan?: string;
  kt_completed_on?: string;
  kt_completed_by?: string;
  revoked_by?: string;
  revoked_on?: string;
  revocation_reason?: string;
};

const STEP_STYLES: Record<string, { bg: string; border: string; badge: string }> = {
  issued:  { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  pending: { bg: 'bg-amber-50/50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  revoked: { bg: 'bg-rose-50/30', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700 border-rose-200' },
  locked:  { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function CloseoutTab({ projectId }: { projectId: string }) {
  const [eligibility, setEligibility] = useState<CloseoutEligibility | null>(null);
  const [items, setItems] = useState<CloseoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [issueRemarks, setIssueRemarks] = useState('');
  const [ktPlan, setKtPlan] = useState('');
  const [showRevokeFor, setShowRevokeFor] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [eligRes, itemsRes] = await Promise.all([
        callOps<CloseoutEligibility>('get_project_closeout_eligibility', { project: projectId }),
        callOps<CloseoutItem[]>('get_project_closeout_items', { project: projectId }),
      ]);
      setEligibility(eligRes);
      setItems(itemsRes);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load closeout data'); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleIssue = async () => {
    if (!eligibility?.next_eligible) return;
    setActionBusy(true);
    try {
      await callOps('issue_closeout_certificate', {
        project: projectId,
        closeout_type: eligibility.next_eligible,
        remarks: issueRemarks.trim() || undefined,
        kt_handover_plan: eligibility.next_eligible === 'Exit Management KT' ? ktPlan.trim() || undefined : undefined,
      });
      setIssueRemarks('');
      setKtPlan('');
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to issue certificate'); }
    setActionBusy(false);
  };

  const handleRevoke = async (name: string) => {
    if (!revokeReason.trim()) return;
    setActionBusy(true);
    try {
      await callOps('revoke_closeout_certificate', { name, reason: revokeReason.trim() });
      setShowRevokeFor(null);
      setRevokeReason('');
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to revoke certificate'); }
    setActionBusy(false);
  };

  const handleCompleteKt = async (name: string) => {
    setActionBusy(true);
    try {
      await callOps('complete_exit_management_kt', { name });
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to mark KT as complete'); }
    setActionBusy(false);
  };

  const stepStatusMap = useMemo(() => {
    const map: Record<string, 'issued' | 'revoked' | 'pending' | 'locked'> = {};
    if (!eligibility) return map;
    const issuedTypes = new Set(items.filter(i => i.status === 'Issued').map(i => i.closeout_type));
    const revokedTypes = new Set(items.filter(i => i.status === 'Revoked').map(i => i.closeout_type));
    for (const step of eligibility.sequence) {
      if (issuedTypes.has(step)) map[step] = 'issued';
      else if (step === eligibility.next_eligible) map[step] = 'pending';
      else if (revokedTypes.has(step)) map[step] = 'revoked';
      else map[step] = 'locked';
    }
    return map;
  }, [eligibility, items]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Award className="h-5 w-5 text-blue-600" />
          Project Closeout
        </h2>
        <p className="mt-1 text-xs text-gray-500">Issue closeout certificates in strict sequence based on contract scope</p>
      </div>

      {loading && <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      {!loading && !error && eligibility && !eligibility.contract_scope && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <FileWarning className="mx-auto h-10 w-10 text-amber-400" />
          <p className="mt-3 text-sm font-medium text-amber-800">Contract scope not set</p>
          <p className="mt-1 text-xs text-amber-600">
            {eligibility.message || 'Set the Contract Scope on the linked tender (I&C Only or I&C + O&M) before issuing closeout certificates.'}
          </p>
        </div>
      )}

      {!loading && !error && eligibility && eligibility.contract_scope && (
        <>
          {/* Contract scope badge */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {eligibility.contract_scope}
            </span>
            {eligibility.all_complete && (
              <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                All certificates issued
              </span>
            )}
          </div>

          {/* Sequence pipeline */}
          <div className="space-y-3">
            {eligibility.sequence.map((step, idx) => {
              const status = stepStatusMap[step] || 'locked';
              const styles = STEP_STYLES[status];
              const issuedItem = items.find(i => i.closeout_type === step && i.status === 'Issued');
              const revokedItem = items.find(i => i.closeout_type === step && i.status === 'Revoked');

              return (
                <div key={step} className={`rounded-lg border ${styles.border} ${styles.bg} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-500">Step {idx + 1}</span>
                        <span className="text-sm font-semibold text-gray-900">{step}</span>
                        <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-medium ${styles.badge}`}>
                          {status === 'issued' ? 'Issued' : status === 'pending' ? 'Next' : status === 'revoked' ? 'Revoked' : 'Locked'}
                        </span>
                      </div>

                      {issuedItem && (
                        <div className="mt-2 flex gap-4 text-[11px] text-gray-500">
                          <span>Issued by: {issuedItem.issued_by}</span>
                          {issuedItem.certificate_date && <span>Date: {issuedItem.certificate_date}</span>}
                          {issuedItem.remarks && <span>{issuedItem.remarks}</span>}
                        </div>
                      )}

                      {issuedItem && issuedItem.closeout_type === 'Exit Management KT' && (
                        <div className="mt-2">
                          {issuedItem.kt_completed_on ? (
                            <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              KT completed on {issuedItem.kt_completed_on}
                            </span>
                          ) : (
                            <button onClick={() => handleCompleteKt(issuedItem.name)} disabled={actionBusy}
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                              Mark KT Complete
                            </button>
                          )}
                        </div>
                      )}

                      {revokedItem && (
                        <div className="mt-2 text-[11px] text-rose-600">
                          Revoked by {revokedItem.revoked_by} — {revokedItem.revocation_reason}
                        </div>
                      )}
                    </div>

                    {/* Revoke action */}
                    {status === 'issued' && issuedItem && (
                      <div className="flex gap-2 shrink-0">
                        {showRevokeFor === issuedItem.name ? (
                          <div className="flex items-center gap-2">
                            <input value={revokeReason} onChange={e => setRevokeReason(e.target.value)}
                              placeholder="Reason for revocation" className="input text-xs w-48" />
                            <button onClick={() => handleRevoke(issuedItem.name)} disabled={actionBusy || !revokeReason.trim()}
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50">
                              Confirm
                            </button>
                            <button onClick={() => { setShowRevokeFor(null); setRevokeReason(''); }}
                              className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setShowRevokeFor(issuedItem.name)}
                            className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50">
                            Revoke
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Issue next certificate form */}
          {eligibility.next_eligible && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-gray-900">Issue: {eligibility.next_eligible}</h3>
              </div>
              <div className="card-body space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Remarks (optional)</label>
                  <textarea value={issueRemarks} onChange={e => setIssueRemarks(e.target.value)}
                    rows={2} className="input w-full text-sm" placeholder="Add any notes..." />
                </div>
                {eligibility.next_eligible === 'Exit Management KT' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">KT / Handover Plan</label>
                    <textarea value={ktPlan} onChange={e => setKtPlan(e.target.value)}
                      rows={3} className="input w-full text-sm" placeholder="Describe knowledge transfer plan and handover activities..." />
                  </div>
                )}
                <button onClick={handleIssue} disabled={actionBusy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  {actionBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Issue {eligibility.next_eligible}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CloseoutTab;