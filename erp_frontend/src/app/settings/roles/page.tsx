'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Shield, ChevronDown, ChevronRight, Search, Loader2, Info,
  Check, X, AlertTriangle, Eye, Edit3, CheckSquare,
} from 'lucide-react';

interface PackMapping {
  mapping_name: string;
  pack_key: string;
  scope: string;
  mode: string;
  is_system_default: number;
}

interface RoleEntry {
  role: string;
  packs: PackMapping[];
}

interface PackInfo {
  name: string;
  pack_key: string;
  pack_label: string;
  ui_color: string;
  ui_icon: string;
  sort_order: number;
}

interface RolePackMatrix {
  roles: RoleEntry[];
  packs: PackInfo[];
}

const SCOPE_LABELS: Record<string, string> = {
  own: 'Own',
  assigned_project: 'Assigned',
  assigned_site: 'Site',
  department: 'Dept',
  project_family: 'Family',
  cross_stage_read: 'X-Read',
  cross_stage_write: 'X-Write',
  all: 'All',
};

const MODE_ICONS_MAP: Record<string, typeof Eye> = {
  read: Eye,
  action: Edit3,
  approve: CheckSquare,
  override: AlertTriangle,
};

const SCOPE_RANK: Record<string, number> = {
  own: 0, assigned_site: 1, assigned_project: 2, department: 3,
  project_family: 4, cross_stage_read: 5, cross_stage_write: 6, all: 7,
};

const MODE_RANK: Record<string, number> = {
  read: 0, action: 1, approve: 2, override: 3,
};

function ScopeModePill({ scope, mode }: { scope: string; mode: string }) {
  const scopeLabel = SCOPE_LABELS[scope] || scope;
  const ModeIcon = MODE_ICONS_MAP[mode] || Eye;
  const modeColors: Record<string, string> = {
    read: 'bg-green-50 text-green-700 border-green-200',
    action: 'bg-blue-50 text-blue-700 border-blue-200',
    approve: 'bg-amber-50 text-amber-700 border-amber-200',
    override: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-medium ${modeColors[mode] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      <ModeIcon className="w-2.5 h-2.5" />
      <span>{scopeLabel}</span>
    </div>
  );
}

function RoleRow({ role, packs, allPacks, isExpanded, onToggle, onEdit }: {
  role: RoleEntry;
  packs: PackMapping[];
  allPacks: PackInfo[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const packMap = new Map(packs.map(p => [p.pack_key, p]));
  const assignedCount = packs.length;
  const totalPacks = allPacks.length;

  // Compute "broadest" scope and mode across all packs
  let broadestScope = '';
  let broadestMode = '';
  packs.forEach(p => {
    if (!broadestScope || (SCOPE_RANK[p.scope] ?? -1) > (SCOPE_RANK[broadestScope] ?? -1)) {
      broadestScope = p.scope;
    }
    if (!broadestMode || (MODE_RANK[p.mode] ?? -1) > (MODE_RANK[broadestMode] ?? -1)) {
      broadestMode = p.mode;
    }
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
      {/* Role header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1e6b87] text-white flex items-center justify-center text-xs font-bold">
            {role.role.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-800">{role.role}</h3>
            <p className="text-xs text-gray-500">
              {assignedCount} of {totalPacks} packs
              {broadestScope && (
                <> &middot; scope: <span className="font-medium text-gray-700">{SCOPE_LABELS[broadestScope] || broadestScope}</span></>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Edit button */}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit pack assignments"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          {/* Pack dots preview */}
          <div className="hidden sm:flex items-center gap-1">
            {allPacks.map(pack => {
              const assigned = packMap.has(pack.pack_key);
              return (
                <div
                  key={pack.pack_key}
                  title={`${pack.pack_label}: ${assigned ? 'Assigned' : 'Not assigned'}`}
                  className={`w-3 h-3 rounded-full border ${
                    assigned ? 'bg-[#1e6b87] border-[#1e6b87]' : 'bg-gray-100 border-gray-300'
                  }`}
                />
              );
            })}
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded pack details */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allPacks.map(pack => {
              const mapping = packMap.get(pack.pack_key);
              const assigned = !!mapping;
              return (
                <div
                  key={pack.pack_key}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
                    assigned
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-100 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {assigned ? (
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={`truncate ${assigned ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                      {pack.pack_label}
                    </span>
                  </div>
                  {mapping && (
                    <ScopeModePill scope={mapping.scope} mode={mapping.mode} />
                  )}
                </div>
              );
            })}
          </div>
          {packs.some(p => p.is_system_default) && (
            <p className="mt-2 text-[11px] text-gray-400 flex items-center gap-1">
              <Info className="w-3 h-3" />
              System-default mappings cannot be removed
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function RolesPage() {
  const [matrix, setMatrix] = useState<RolePackMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRole, setEditingRole] = useState<RoleEntry | null>(null);
  const [editPacks, setEditPacks] = useState<Record<string, { enabled: boolean; scope: string; mode: string; isSystem: boolean }>>({});
  const [saving, setSaving] = useState(false);

  const fetchMatrix = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/rbac/role-matrix');
      const json = await res.json();
      if (json.success && json.data) {
        setMatrix(json.data);
      } else {
        setError(json.message || 'Failed to load role matrix');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load role matrix');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMatrix(); }, [fetchMatrix]);

  const toggleRole = (role: string) => {
    setExpandedRoles(prev => ({ ...prev, [role]: !prev[role] }));
  };

  const expandAll = () => {
    if (!matrix) return;
    const all: Record<string, boolean> = {};
    matrix.roles.forEach(r => { all[r.role] = true; });
    setExpandedRoles(all);
  };

  const collapseAll = () => setExpandedRoles({});

  const openEdit = (role: RoleEntry) => {
    const packState: Record<string, { enabled: boolean; scope: string; mode: string; isSystem: boolean }> = {};
    const packMap = new Map(role.packs.map(p => [p.pack_key, p]));
    (matrix?.packs || []).forEach(pack => {
      const mapping = packMap.get(pack.pack_key);
      packState[pack.pack_key] = {
        enabled: !!mapping,
        scope: mapping?.scope || 'own',
        mode: mapping?.mode || 'read',
        isSystem: mapping ? !!mapping.is_system_default : false,
      };
    });
    setEditPacks(packState);
    setEditingRole(role);
  };

  const handleSaveEdit = async () => {
    if (!editingRole) return;
    setSaving(true);
    try {
      const packs = Object.entries(editPacks)
        .filter(([, v]) => v.enabled)
        .map(([pack_key, v]) => ({ pack_key, scope: v.scope, mode: v.mode }));
      const res = await fetch('/api/rbac/role-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editingRole.role, packs }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingRole(null);
        fetchMatrix();
      }
    } catch (e) { console.error('Failed to save role packs:', e); }
    finally { setSaving(false); }
  };

  const filteredRoles = (matrix?.roles || []).filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.role.toLowerCase().includes(q) ||
      r.packs.some(p => p.pack_key.toLowerCase().includes(q))
    );
  });

  // Category grouping
  const categoryOrder = ['Leadership', 'Department', 'Operational'];
  const leadershipRoles = ['Director', 'Project Head', 'Project Manager'];
  const departmentRoles = ['Engineering Head', 'Procurement Manager', 'HR Manager', 'RMA Manager', 'Presales Tendering Head'];

  function getCategory(role: string): string {
    if (leadershipRoles.includes(role)) return 'Leadership';
    if (departmentRoles.includes(role)) return 'Department';
    return 'Operational';
  }

  const groupedRoles: Record<string, RoleEntry[]> = {};
  filteredRoles.forEach(r => {
    const cat = getCategory(r.role);
    if (!groupedRoles[cat]) groupedRoles[cat] = [];
    groupedRoles[cat].push(r);
  });

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="w-6 h-6 text-[#1e6b87]" />
          Role — Pack Composition
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Each role is composed from permission packs with scope and mode — not from raw capabilities
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex gap-3 items-start">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Roles = Packs + Scope</p>
          <p className="mt-1 text-blue-700">
            Each role inherits capabilities from its assigned packs. Scope defines how far
            the permission reaches (e.g., own project vs all projects). Mode defines the action level
            (read, action, approve, override).
          </p>
        </div>
      </div>

      {/* Stats */}
      {matrix && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <p className="text-2xl font-bold text-gray-800">{matrix.roles.length}</p>
            <p className="text-xs text-gray-500">Roles Configured</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <p className="text-2xl font-bold text-gray-800">{matrix.packs.length}</p>
            <p className="text-xs text-gray-500">Available Packs</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <p className="text-2xl font-bold text-gray-800">
              {matrix.roles.reduce((sum, r) => sum + r.packs.length, 0)}
            </p>
            <p className="text-xs text-gray-500">Total Mappings</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button onClick={expandAll} className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
            Expand All
          </button>
          <button onClick={collapseAll} className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
            Collapse All
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search roles or packs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#1e6b87] mr-2" />
          <span className="text-gray-500">Loading role matrix...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-8 text-center">
          <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={fetchMatrix} className="mt-3 px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
            Retry
          </button>
        </div>
      ) : !matrix || filteredRoles.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-8 text-center text-gray-500 text-sm">
          No roles match your search.
        </div>
      ) : (
        <div className="space-y-6">
          {categoryOrder.map(cat => {
            const roles = groupedRoles[cat];
            if (!roles || roles.length === 0) return null;
            return (
              <div key={cat}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 px-1">
                  {cat === 'Leadership' ? 'Leadership & Project Spine' : cat === 'Department' ? 'Department Heads' : 'Operational / Execution'}
                </h2>
                <div className="space-y-2">
                  {roles.map(role => (
                    <RoleRow
                      key={role.role}
                      role={role}
                      packs={role.packs}
                      allPacks={matrix.packs}
                      isExpanded={!!expandedRoles[role.role]}
                      onToggle={() => toggleRole(role.role)}
                      onEdit={() => openEdit(role)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Role Packs Modal */}
      {editingRole && matrix && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingRole(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Edit Packs — {editingRole.role}
              </h3>
              <button onClick={() => setEditingRole(null)} className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {matrix.packs.map(pack => {
                const state = editPacks[pack.pack_key];
                if (!state) return null;
                return (
                  <div key={pack.pack_key} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${state.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                    <input
                      type="checkbox"
                      checked={state.enabled}
                      disabled={state.isSystem}
                      onChange={(e) => setEditPacks(prev => ({
                        ...prev,
                        [pack.pack_key]: { ...prev[pack.pack_key], enabled: e.target.checked },
                      }))}
                      className="w-4 h-4 text-[#1e6b87] rounded border-gray-300 focus:ring-[#1e6b87]"
                    />
                    <span className={`flex-1 text-sm font-medium ${state.enabled ? 'text-gray-800' : 'text-gray-400'}`}>
                      {pack.pack_label}
                      {state.isSystem && <span className="ml-1 text-[10px] text-gray-400">(system)</span>}
                    </span>
                    {state.enabled && (
                      <>
                        <select
                          value={state.scope}
                          disabled={state.isSystem}
                          onChange={(e) => setEditPacks(prev => ({
                            ...prev,
                            [pack.pack_key]: { ...prev[pack.pack_key], scope: e.target.value },
                          }))}
                          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#1e6b87]"
                        >
                          {Object.entries(SCOPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <select
                          value={state.mode}
                          disabled={state.isSystem}
                          onChange={(e) => setEditPacks(prev => ({
                            ...prev,
                            [pack.pack_key]: { ...prev[pack.pack_key], mode: e.target.value },
                          }))}
                          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#1e6b87]"
                        >
                          {Object.keys(MODE_ICONS_MAP).map(m => (
                            <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                System-default packs cannot be removed
              </p>
              <div className="flex items-center gap-3">
                <button onClick={() => setEditingRole(null)} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm font-medium">
                  Cancel
                </button>
                <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 bg-[#1e6b87] text-white rounded-lg hover:bg-[#185a73] text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
