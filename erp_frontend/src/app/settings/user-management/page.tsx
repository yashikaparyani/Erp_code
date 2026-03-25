'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Loader2, Info,
  Package, Eye, Edit3, CheckSquare, AlertTriangle,
  X, Plus, Minus,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────── */

interface UserContextRow {
  user: string;
  full_name: string;
  department: string;
  designation: string;
  primary_role: string;
  secondary_roles: string;
  assigned_projects: string;
  assigned_sites: string;
  region: string;
  is_active: number;
}

interface PackBreakdown {
  pack_key: string;
  pack_label: string;
  ui_color: string;
  ui_icon: string;
  module_family: string;
  granted_by_roles: { role: string; scope: string; mode: string }[];
  effective_scope: string;
  effective_mode: string;
}

interface OverrideEntry {
  name: string;
  pack_key: string;
  pack_label: string;
  scope: string;
  mode: string;
  grant_or_revoke: string;
  valid_from: string | null;
  valid_to: string | null;
  granted_by: string;
  remarks: string;
  is_currently_active: boolean;
}

interface UserEffective {
  user: string;
  roles: string[];
  is_superuser: boolean;
  capability_count: number;
  capabilities?: Record<string, { scope: string; mode: string }>;
  modules?: Record<string, { capability: string; scope: string; mode: string }[]>;
  pack_breakdown: PackBreakdown[];
  overrides: OverrideEntry[];
  accessible_modules: string[];
  visible_tabs: string[];
  department?: string;
  assigned_projects?: string[];
  assigned_sites?: string[];
}

interface UserContextPayload {
  user: string;
  department: string;
  designation: string;
  primary_role: string;
  secondary_roles: string;
  assigned_projects: string;
  assigned_sites: string;
  region: string;
  is_active: number;
  exists: boolean;
}

/* ── Constants ─────────────────────────────────────────────── */

const SCOPE_LABELS: Record<string, string> = {
  own: 'Own', assigned_project: 'Assigned Project', assigned_site: 'Assigned Site',
  department: 'Department', project_family: 'Project Family',
  cross_stage_read: 'Cross-Stage Read', cross_stage_write: 'Cross-Stage Write', all: 'All',
};

const MODE_LABELS: Record<string, string> = {
  read: 'Read', action: 'Action', approve: 'Approve', override: 'Override',
};

const MODE_ICONS: Record<string, typeof Eye> = {
  read: Eye, action: Edit3, approve: CheckSquare, override: AlertTriangle,
};

/* ── Badge Components ──────────────────────────────────────── */

function ScopeBadge({ scope }: { scope: string }) {
  const label = SCOPE_LABELS[scope] || scope;
  const isWide = ['all', 'cross_stage_write', 'cross_stage_read'].includes(scope);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
      isWide ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
    }`}>{label}</span>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const label = MODE_LABELS[mode] || mode;
  const Icon = MODE_ICONS[mode] || Eye;
  const colors: Record<string, string> = {
    read: 'bg-green-100 text-green-700', action: 'bg-blue-100 text-blue-700',
    approve: 'bg-amber-100 text-amber-700', override: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
      colors[mode] || 'bg-gray-100 text-gray-600'
    }`}>
      <Icon className="w-3 h-3" />{label}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#1e6b87]/10 text-[#1e6b87] text-[11px] font-medium">
      {role}
    </span>
  );
}

/* ── User Detail Panel ─────────────────────────────────────── */

function UserDetailPanel({ user, onClose }: { user: string; onClose: () => void }) {
  const [effective, setEffective] = useState<UserEffective | null>(null);
  const [contextData, setContextData] = useState<UserContextPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingContext, setEditingContext] = useState(false);
  const [activeTab, setActiveTab] = useState<'packs' | 'capabilities' | 'overrides'>('packs');

  const fetchEffective = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [permissionsRes, contextRes] = await Promise.all([
        fetch(`/api/rbac/user-permissions?user=${encodeURIComponent(user)}`),
        fetch(`/api/rbac/user-context?user=${encodeURIComponent(user)}`),
      ]);
      const [permissionsJson, contextJson] = await Promise.all([
        permissionsRes.json(),
        contextRes.json(),
      ]);
      if (permissionsJson.success && permissionsJson.data) {
        setEffective(permissionsJson.data);
      } else {
        setError(permissionsJson.message || 'Failed to load');
      }
      if (contextJson.success && contextJson.data) {
        setContextData(contextJson.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchEffective(); }, [fetchEffective]);

  const saveContext = useCallback(async () => {
    if (!contextData) return;
    try {
      setSaving(true);
      const res = await fetch('/api/rbac/user-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextData),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to update user context');
      }
      setEditingContext(false);
      await fetchEffective();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update user context');
    } finally {
      setSaving(false);
    }
  }, [contextData, fetchEffective]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-[#1e6b87] mr-2" />
          <span className="text-gray-500 text-sm">Loading permissions for {user}...</span>
        </div>
      </div>
    );
  }

  if (error || !effective) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">{user}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-red-600 text-sm">{error || 'No data available'}</p>
      </div>
    );
  }

  const capEntries = effective.capabilities
    ? Object.entries(effective.capabilities)
    : Object.entries(
        Object.fromEntries(
          Object.values(effective.modules || {}).flat().map((grant) => [
            grant.capability,
            { scope: grant.scope, mode: grant.mode },
          ]),
        ),
      );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-[#1e6b87] px-4 py-3 text-white flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">{user}</h3>
          <p className="text-xs opacity-80">
            {effective.is_superuser ? 'Superuser' : `${effective.roles.length} roles`}
            {' · '}{effective.capability_count} capabilities
            {' · '}{effective.accessible_modules.length} modules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingContext((prev) => !prev)}
            className="rounded px-2 py-1 text-xs font-medium hover:bg-white/20"
          >
            {editingContext ? 'Cancel Edit' : 'Edit Context'}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="px-4 py-3 border-b border-gray-100">
        {contextData && (
          <div className="mb-3 grid grid-cols-1 gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-2">
            {editingContext ? (
              <>
                <label className="text-xs text-gray-600">
                  Department
                  <input
                    value={contextData.department || ''}
                    onChange={(e) => setContextData({ ...contextData, department: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800"
                  />
                </label>
                <label className="text-xs text-gray-600">
                  Designation
                  <input
                    value={contextData.designation || ''}
                    onChange={(e) => setContextData({ ...contextData, designation: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800"
                  />
                </label>
                <label className="text-xs text-gray-600">
                  Primary Role
                  <input
                    value={contextData.primary_role || ''}
                    onChange={(e) => setContextData({ ...contextData, primary_role: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800"
                  />
                </label>
                <label className="text-xs text-gray-600">
                  Secondary Roles
                  <input
                    value={contextData.secondary_roles || ''}
                    onChange={(e) => setContextData({ ...contextData, secondary_roles: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800"
                  />
                </label>
                <label className="text-xs text-gray-600">
                  Assigned Projects
                  <input
                    value={contextData.assigned_projects || ''}
                    onChange={(e) => setContextData({ ...contextData, assigned_projects: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800"
                  />
                </label>
                <label className="text-xs text-gray-600">
                  Assigned Sites
                  <input
                    value={contextData.assigned_sites || ''}
                    onChange={(e) => setContextData({ ...contextData, assigned_sites: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800"
                  />
                </label>
                <label className="text-xs text-gray-600">
                  Region
                  <input
                    value={contextData.region || ''}
                    onChange={(e) => setContextData({ ...contextData, region: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={!!contextData.is_active}
                    onChange={(e) => setContextData({ ...contextData, is_active: e.target.checked ? 1 : 0 })}
                  />
                  Active
                </label>
                <div className="md:col-span-2">
                  <button
                    onClick={saveContext}
                    disabled={saving}
                    className="rounded-lg bg-[#1e6b87] px-3 py-2 text-sm font-medium text-white hover:bg-[#185a72] disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save Context'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-gray-500">Department <div className="mt-1 text-sm font-medium text-gray-800">{contextData.department || '—'}</div></div>
                <div className="text-xs text-gray-500">Designation <div className="mt-1 text-sm font-medium text-gray-800">{contextData.designation || '—'}</div></div>
                <div className="text-xs text-gray-500">Primary Role <div className="mt-1 text-sm font-medium text-gray-800">{contextData.primary_role || '—'}</div></div>
                <div className="text-xs text-gray-500">Region <div className="mt-1 text-sm font-medium text-gray-800">{contextData.region || '—'}</div></div>
                <div className="text-xs text-gray-500 md:col-span-2">Assigned Projects <div className="mt-1 text-sm font-medium text-gray-800">{contextData.assigned_projects || '—'}</div></div>
                <div className="text-xs text-gray-500 md:col-span-2">Assigned Sites <div className="mt-1 text-sm font-medium text-gray-800">{contextData.assigned_sites || '—'}</div></div>
              </>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="text-xs text-gray-500 mr-1">Roles:</span>
          {effective.roles.map(r => <RoleBadge key={r} role={r} />)}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="text-xs text-gray-500 mr-1">Modules:</span>
          {effective.accessible_modules.map(m => (
            <span key={m} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-medium">{m}</span>
          ))}
        </div>
        {effective.visible_tabs && effective.visible_tabs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-gray-500 mr-1">Tabs:</span>
            {effective.visible_tabs.map(t => (
              <span key={t} className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[11px] font-medium">{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex">
        {(['packs', 'capabilities', 'overrides'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-[#1e6b87] text-[#1e6b87]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'packs' ? `Packs (${effective.pack_breakdown.length})` :
             tab === 'capabilities' ? `Capabilities (${effective.capability_count})` :
             `Overrides (${effective.overrides.length})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 py-3 max-h-[500px] overflow-y-auto">
        {activeTab === 'packs' && (
          <div className="space-y-2">
            {effective.pack_breakdown.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No packs assigned</p>
            ) : (
              effective.pack_breakdown.map(pack => (
                <div key={pack.pack_key} className="border border-gray-100 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-[#1e6b87]" />
                      <span className="font-medium text-sm text-gray-800">{pack.pack_label}</span>
                      <span className="text-[10px] text-gray-400">{pack.module_family}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ScopeBadge scope={pack.effective_scope} />
                      <ModeBadge mode={pack.effective_mode} />
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="text-[10px] text-gray-400">via:</span>
                    {pack.granted_by_roles.map((g, i) => (
                      <span key={i} className="text-[10px] text-gray-500">
                        {g.role} ({SCOPE_LABELS[g.scope] || g.scope})
                        {i < pack.granted_by_roles.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'capabilities' && (
          <div className="space-y-1">
            {capEntries.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No capabilities</p>
            ) : (
              capEntries.map(([key, val]) => (
                <div key={key} className="flex items-center justify-between px-3 py-1.5 rounded bg-gray-50 text-sm">
                  <span className="text-gray-700 font-mono text-xs">{key}</span>
                  <div className="flex items-center gap-1.5">
                    <ScopeBadge scope={val.scope} />
                    <ModeBadge mode={val.mode} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'overrides' && (
          <div className="space-y-2">
            {effective.overrides.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No overrides for this user</p>
            ) : (
              effective.overrides.map(ovr => (
                <div
                  key={ovr.name}
                  className={`border rounded-lg px-3 py-2 ${
                    ovr.grant_or_revoke === 'Grant'
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  } ${!ovr.is_currently_active ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {ovr.grant_or_revoke === 'Grant' ? (
                        <Plus className="w-4 h-4 text-green-600" />
                      ) : (
                        <Minus className="w-4 h-4 text-red-600" />
                      )}
                      <span className="font-medium text-sm">{ovr.pack_label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        ovr.grant_or_revoke === 'Grant' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                      }`}>{ovr.grant_or_revoke}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {ovr.scope && <ScopeBadge scope={ovr.scope} />}
                      {ovr.mode && <ModeBadge mode={ovr.mode} />}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    {ovr.valid_from || ovr.valid_to ? (
                      <span>
                        {ovr.valid_from ? `From ${ovr.valid_from}` : ''} {ovr.valid_to ? `Until ${ovr.valid_to}` : ''}
                        {!ovr.is_currently_active ? ' (expired)' : ''}
                      </span>
                    ) : (
                      <span>Permanent</span>
                    )}
                    {ovr.granted_by && <span> · by {ovr.granted_by}</span>}
                    {ovr.remarks && <span> · {ovr.remarks}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserContextRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (filterDept) params.set('department', filterDept);
      if (filterRole) params.set('role', filterRole);
      const res = await fetch(`/api/rbac/users?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.data || []);
      } else {
        setError(json.message || 'Failed to load users');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [filterDept, filterRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const departments = Array.from(new Set(users.map(u => u.department).filter(Boolean))).sort();
  const roles = Array.from(new Set(users.map(u => u.primary_role).filter(Boolean))).sort();

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.user.toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q) ||
      (u.primary_role || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="w-6 h-6 text-[#1e6b87]" />
          User Permission Management
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          View user context, assigned packs, effective permissions, and overrides
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex gap-3 items-start">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Why does this user have access?</p>
          <p className="mt-1 text-blue-700">
            Click any user to see their effective permissions — which packs they inherit,
            which capabilities are active, and any overrides applied. This shows
            <strong> why</strong> a user has access, not just <strong>that</strong> they have it.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{filteredUsers.length}</span> users
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-52"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* User list */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[#1e6b87] mr-2" />
              <span className="text-gray-500">Loading users...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-8 text-center">
              <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-red-700 text-sm">{error}</p>
              <button onClick={fetchUsers} className="mt-3 px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
                Retry
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-8 text-center text-gray-500 text-sm">
              {users.length === 0
                ? 'No user contexts have been created yet. User contexts are assigned via the RBAC API.'
                : 'No users match your search.'}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#1e6b87] text-white">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">Projects</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider w-20">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map(u => (
                    <tr
                      key={u.user}
                      onClick={() => setSelectedUser(u.user === selectedUser ? null : u.user)}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        u.user === selectedUser ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                            {(u.full_name || u.user).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{u.full_name || u.user}</p>
                            <p className="text-xs text-gray-400">{u.user}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{u.department || '—'}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {u.primary_role ? <RoleBadge role={u.primary_role} /> : <span className="text-gray-400 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                        {u.assigned_projects ? (
                          <span className="truncate block max-w-[200px]" title={u.assigned_projects}>
                            {u.assigned_projects}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                          u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedUser && (
          <div className="lg:w-[480px] flex-shrink-0">
            <UserDetailPanel
              user={selectedUser}
              onClose={() => setSelectedUser(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
