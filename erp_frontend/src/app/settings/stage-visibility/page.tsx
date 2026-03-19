'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Eye, Info, Loader2 } from 'lucide-react';

const LIFECYCLE_STAGES = [
  { key: 'SURVEY', label: 'Survey' },
  { key: 'BOQ_DESIGN', label: 'BOQ & Design' },
  { key: 'COSTING', label: 'Costing' },
  { key: 'PROCUREMENT', label: 'Procurement' },
  { key: 'STORES_DISPATCH', label: 'Stores & Dispatch' },
  { key: 'EXECUTION', label: 'Execution' },
  { key: 'BILLING_PAYMENT', label: 'Billing & Payment' },
  { key: 'OM_RMA', label: 'O&M / RMA' },
  { key: 'CLOSED', label: 'Closed' },
] as const;

type StageKey = typeof LIFECYCLE_STAGES[number]['key'];
type AccessLevel = 'full' | 'read' | 'none';

type PackMapping = {
  pack_key: string;
  scope: string;
  mode: string;
};

type RoleEntry = {
  role: string;
  packs: PackMapping[];
};

type RolePackMatrix = {
  roles: RoleEntry[];
};

const PACK_STAGE_MAP: Record<string, StageKey[]> = {
  project_command: ['SURVEY', 'BOQ_DESIGN', 'COSTING', 'PROCUREMENT', 'STORES_DISPATCH', 'EXECUTION', 'BILLING_PAYMENT', 'OM_RMA', 'CLOSED'],
  engineering: ['SURVEY', 'BOQ_DESIGN', 'EXECUTION'],
  procurement: ['COSTING', 'PROCUREMENT', 'STORES_DISPATCH', 'BILLING_PAYMENT'],
  inventory: ['PROCUREMENT', 'STORES_DISPATCH', 'EXECUTION'],
  execution_ic: ['EXECUTION', 'OM_RMA'],
  finance: ['COSTING', 'BILLING_PAYMENT', 'CLOSED'],
  hr_manpower: ['SURVEY', 'BOQ_DESIGN', 'COSTING', 'PROCUREMENT', 'STORES_DISPATCH', 'EXECUTION', 'BILLING_PAYMENT', 'OM_RMA'],
  om_rma: ['OM_RMA', 'CLOSED'],
};

const MODE_TO_ACCESS: Record<string, AccessLevel> = {
  read: 'read',
  action: 'full',
  approve: 'full',
  override: 'full',
};

const ACCESS_RANK: Record<AccessLevel, number> = {
  none: 0,
  read: 1,
  full: 2,
};

function getCellColor(access: AccessLevel) {
  switch (access) {
    case 'full': return 'bg-green-100 text-green-800';
    case 'read': return 'bg-blue-50 text-blue-700';
    default: return 'bg-gray-50 text-gray-300';
  }
}

function getCellLabel(access: AccessLevel) {
  switch (access) {
    case 'full': return 'Full';
    case 'read': return 'Read';
    default: return '—';
  }
}

function deriveStageVisibility(roles: RoleEntry[]) {
  return roles.map((role) => {
    const stages = Object.fromEntries(
      LIFECYCLE_STAGES.map((stage) => [stage.key, 'none']),
    ) as Record<StageKey, AccessLevel>;

    role.packs.forEach((pack) => {
      const stageKeys = PACK_STAGE_MAP[pack.pack_key] || [];
      const access = MODE_TO_ACCESS[pack.mode] || 'none';
      stageKeys.forEach((stageKey) => {
        if (ACCESS_RANK[access] > ACCESS_RANK[stages[stageKey]]) {
          stages[stageKey] = access;
        }
      });
    });

    return {
      role: role.role,
      packs: role.packs,
      stages,
    };
  });
}

export default function StageVisibilityPage() {
  const [matrix, setMatrix] = useState<RolePackMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMatrix = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/rbac/role-matrix', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data) {
        setMatrix(json.data);
      } else {
        setError(json.message || 'Failed to load role pack matrix');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load role pack matrix');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMatrix();
  }, [fetchMatrix]);

  const derivedRows = useMemo(
    () => deriveStageVisibility(matrix?.roles || []),
    [matrix?.roles],
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Stage Visibility</h1>
        <p className="mt-1 text-sm text-gray-500">
          Derived from the live role-pack matrix instead of a static frontend note
        </p>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Pack-driven stage visibility</p>
          <p className="mt-1 text-blue-700">
            This screen is now derived from the current role-to-pack mappings. Stage access shown here is a live projection of
            pack ownership plus mode. DMS, Approval, and Settings packs are intentionally excluded because they do not define
            lifecycle-stage visibility by themselves.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-[#1e6b87]" />
          <span className="text-gray-500">Loading live stage visibility...</span>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
          <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={fetchMatrix} className="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700">
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-2xl font-bold text-gray-800">{derivedRows.length}</p>
              <p className="text-xs text-gray-500">Roles Derived</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-2xl font-bold text-gray-800">{LIFECYCLE_STAGES.length}</p>
              <p className="text-xs text-gray-500">Lifecycle Stages</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-2xl font-bold text-gray-800">{derivedRows.reduce((sum, row) => sum + row.packs.length, 0)}</p>
              <p className="text-xs text-gray-500">Pack Grants Considered</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="sticky left-0 z-10 min-w-[200px] bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Role
                    </th>
                    {LIFECYCLE_STAGES.map((stage) => (
                      <th key={stage.key} className="min-w-[90px] px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                        {stage.label}
                      </th>
                    ))}
                    <th className="min-w-[240px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Granted By Packs
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {derivedRows.map((row) => (
                    <tr key={row.role} className="hover:bg-gray-50/50">
                      <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-800">
                        {row.role}
                      </td>
                      {LIFECYCLE_STAGES.map((stage) => (
                        <td key={stage.key} className="px-2 py-3 text-center">
                          <span className={`inline-block min-w-[42px] rounded px-2 py-1 text-[11px] font-medium ${getCellColor(row.stages[stage.key])}`}>
                            {getCellLabel(row.stages[stage.key])}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {row.packs.length ? row.packs.map((pack) => (
                            <span
                              key={`${row.role}-${pack.pack_key}`}
                              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                            >
                              <Eye className="h-3 w-3" />
                              {pack.pack_key} ({pack.scope}/{pack.mode})
                            </span>
                          )) : <span className="text-xs text-gray-400">No mapped packs</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
