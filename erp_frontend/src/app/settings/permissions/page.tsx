'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Edit3,
  Eye,
  Info,
  Loader2,
  Lock,
  Package,
  Search,
  Shield,
  Users,
  X,
} from 'lucide-react';

interface PackItem {
  capability: string;
  capability_label: string;
  module_key: string;
  action_type: string;
  is_sensitive: number;
  default_scope: string;
  default_mode: string;
  required_for_pack: number;
}

interface PermissionPack {
  name: string;
  pack_key: string;
  pack_label: string;
  description: string;
  module_family: string;
  is_system_pack: number;
  capability_count: number;
  items: PackItem[];
}

interface FrontendPermissionsPayload {
  user: string;
  is_superuser: boolean;
  accessible_modules: string[];
  accessible_routes: string[];
  gated_route_prefixes?: string[];
  visible_tabs: string[];
  capabilities: Record<string, { scope: string; mode: string }>;
  can_access_settings: boolean;
  user_context?: {
    department?: string;
    assigned_projects?: string[];
    assigned_sites?: string[];
  };
}

interface PackMapping {
  mapping_name?: string;
  pack_key: string;
  scope: string;
  mode: string;
  is_system_default?: number;
}

interface RoleEntry {
  role: string;
  packs: PackMapping[];
}

interface RolePackInfo {
  name?: string;
  pack_key: string;
  pack_label: string;
  ui_color?: string;
  module_family?: string;
}

interface RoleMatrixPayload {
  roles: RoleEntry[];
  packs: RolePackInfo[];
}

interface RbacUserRow {
  user: string;
  full_name?: string;
  department?: string;
  designation?: string;
  primary_role?: string;
  is_active?: number;
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
  exists?: boolean;
}

interface EffectivePermissionPayload {
  user: string;
  roles: string[];
  is_superuser: boolean;
  capability_count: number;
  accessible_modules: string[];
  visible_tabs: string[];
  pack_breakdown?: Array<{
    pack_key: string;
    pack_label: string;
    module_family?: string;
    effective_scope: string;
    effective_mode: string;
    granted_by_roles: Array<{ role: string; scope: string; mode: string }>;
  }>;
  overrides?: Array<{
    name: string;
    pack_label: string;
    grant_or_revoke: string;
    scope: string;
    mode: string;
    is_currently_active: boolean;
    remarks?: string;
  }>;
  capabilities?: Record<string, { scope: string; mode: string }>;
  user_context?: {
    department?: string;
    assigned_projects?: string[];
    assigned_sites?: string[];
  };
}

type PageTab = 'session' | 'roles' | 'users' | 'packs';

const SCOPE_LABELS: Record<string, string> = {
  own: 'Own',
  assigned_project: 'Assigned Project',
  assigned_site: 'Assigned Site',
  department: 'Department',
  project_family: 'Project Family',
  cross_stage_read: 'Cross-Stage Read',
  cross_stage_write: 'Cross-Stage Write',
  all: 'All',
};

const MODE_LABELS: Record<string, string> = {
  read: 'Read',
  action: 'Action',
  approve: 'Approve',
  override: 'Override',
};

const MODE_ICONS: Record<string, typeof Eye> = {
  read: Eye,
  action: Edit3,
  approve: CheckSquare,
  override: AlertTriangle,
};

const PACK_HEADER_COLORS: Record<string, string> = {
  projects: 'bg-blue-600',
  engineering: 'bg-emerald-600',
  procurement: 'bg-amber-600',
  inventory: 'bg-purple-600',
  execution: 'bg-orange-600',
  finance: 'bg-red-600',
  hr: 'bg-teal-600',
  om: 'bg-cyan-600',
  dms: 'bg-gray-600',
  approval: 'bg-yellow-600',
  settings: 'bg-indigo-600',
};

const PACK_BORDER_COLORS: Record<string, string> = {
  projects: 'border-blue-200 bg-blue-50/50',
  engineering: 'border-emerald-200 bg-emerald-50/50',
  procurement: 'border-amber-200 bg-amber-50/50',
  inventory: 'border-purple-200 bg-purple-50/50',
  execution: 'border-orange-200 bg-orange-50/50',
  finance: 'border-red-200 bg-red-50/50',
  hr: 'border-teal-200 bg-teal-50/50',
  om: 'border-cyan-200 bg-cyan-50/50',
  dms: 'border-gray-200 bg-gray-50/50',
  approval: 'border-yellow-200 bg-yellow-50/50',
  settings: 'border-indigo-200 bg-indigo-50/50',
};

function getFamily(pack: { module_family?: string; pack_key: string }): string {
  return (pack.module_family || pack.pack_key.split('_')[0] || '').toLowerCase();
}

function ScopeBadge({ scope }: { scope: string }) {
  const label = SCOPE_LABELS[scope] || scope;
  const isWide = ['all', 'cross_stage_write', 'cross_stage_read'].includes(scope);
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium ${
        isWide ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {label}
    </span>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const label = MODE_LABELS[mode] || mode;
  const Icon = MODE_ICONS[mode] || Eye;
  const colorMap: Record<string, string> = {
    read: 'bg-green-100 text-green-700',
    action: 'bg-blue-100 text-blue-700',
    approve: 'bg-amber-100 text-amber-700',
    override: 'bg-red-100 text-red-700',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium ${
        colorMap[mode] || 'bg-gray-100 text-gray-600'
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Shield;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-[#1e6b87] text-white shadow-sm'
          : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {helper ? <p className="mt-1 text-[11px] text-gray-400">{helper}</p> : null}
    </div>
  );
}

function PackCard({
  pack,
  isExpanded,
  onToggle,
}: {
  pack: PermissionPack;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const family = getFamily(pack);
  const borderClass = PACK_BORDER_COLORS[family] || 'border-gray-200 bg-gray-50/50';
  const headerClass = PACK_HEADER_COLORS[family] || 'bg-gray-600';
  const sensitiveCount = pack.items?.filter((item) => item.is_sensitive).length || 0;
  const requiredCount = pack.items?.filter((item) => item.required_for_pack).length || 0;
  const groupedItems: Record<string, PackItem[]> = {};

  (pack.items || []).forEach((item) => {
    const key = item.action_type || 'other';
    if (!groupedItems[key]) groupedItems[key] = [];
    groupedItems[key].push(item);
  });

  const actionOrder = ['access', 'view', 'create', 'update', 'manage', 'submit', 'approve', 'reject', 'override', 'delete', 'other'];
  const sortedGroups = actionOrder.filter((group) => groupedItems[group]);

  return (
    <div className={`overflow-hidden rounded-xl border-2 transition-shadow hover:shadow-md ${borderClass}`}>
      <div className={`${headerClass} flex cursor-pointer items-center justify-between px-4 py-3 text-white`} onClick={onToggle}>
        <div className="flex min-w-0 items-center gap-3">
          <Package className="h-5 w-5 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{pack.pack_label}</h3>
            <p className="truncate text-xs opacity-80">{pack.description || 'No pack description'}</p>
          </div>
        </div>
        <div className="ml-3 flex flex-shrink-0 items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded bg-white/20 px-2 py-0.5">{pack.capability_count} capabilities</span>
            {sensitiveCount > 0 ? (
              <span className="flex items-center gap-1 rounded bg-red-400/30 px-2 py-0.5">
                <Lock className="h-3 w-3" />
                {sensitiveCount}
              </span>
            ) : null}
            {pack.is_system_pack ? <span className="rounded bg-white/20 px-2 py-0.5">System</span> : null}
          </div>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </div>

      {isExpanded ? (
        <div className="px-4 py-3">
          <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-600">
            <span>
              Module: <strong className="text-gray-800">{pack.module_family || '—'}</strong>
            </span>
            <span>
              Required: <strong className="text-gray-800">{requiredCount}</strong>
            </span>
            <span>
              Optional: <strong className="text-gray-800">{(pack.capability_count || 0) - requiredCount}</strong>
            </span>
          </div>

          <div className="space-y-3">
            {sortedGroups.map((group) => (
              <div key={group}>
                <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{group}</h4>
                <div className="space-y-1">
                  {groupedItems[group].map((item) => (
                    <div
                      key={item.capability}
                      className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${
                        item.is_sensitive ? 'border border-red-100 bg-red-50' : 'border border-gray-100 bg-white'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {item.is_sensitive ? (
                          <Lock className="h-3.5 w-3.5 flex-shrink-0 text-red-400" />
                        ) : item.required_for_pack ? (
                          <CheckSquare className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                        ) : (
                          <div className="h-3.5 w-3.5 flex-shrink-0 rounded border border-gray-300" />
                        )}
                        <span className="truncate text-gray-700">{item.capability_label || item.capability}</span>
                      </div>
                      <div className="ml-2 flex flex-shrink-0 items-center gap-1.5">
                        <ScopeBadge scope={item.default_scope} />
                        <ModeBadge mode={item.default_mode} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState<PageTab>('session');

  const [packs, setPacks] = useState<PermissionPack[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [packsError, setPacksError] = useState('');
  const [expandedPacks, setExpandedPacks] = useState<Record<string, boolean>>({});
  const [packSearch, setPackSearch] = useState('');
  const [packModuleFilter, setPackModuleFilter] = useState('');

  const [frontendPermissions, setFrontendPermissions] = useState<FrontendPermissionsPayload | null>(null);
  const [frontendLoading, setFrontendLoading] = useState(true);
  const [frontendError, setFrontendError] = useState('');

  const [roleMatrix, setRoleMatrix] = useState<RoleMatrixPayload | null>(null);
  const [roleMatrixLoading, setRoleMatrixLoading] = useState(true);
  const [roleMatrixError, setRoleMatrixError] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  const [editingRole, setEditingRole] = useState<RoleEntry | null>(null);
  const [editPacks, setEditPacks] = useState<Record<string, { enabled: boolean; scope: string; mode: string; isSystem: boolean }>>({});
  const [savingRole, setSavingRole] = useState(false);

  const [users, setUsers] = useState<RbacUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [effectivePermissions, setEffectivePermissions] = useState<EffectivePermissionPayload | null>(null);
  const [effectiveLoading, setEffectiveLoading] = useState(false);
  const [effectiveError, setEffectiveError] = useState('');
  const [userContext, setUserContext] = useState<UserContextPayload | null>(null);
  const [userContextLoading, setUserContextLoading] = useState(false);
  const [userContextError, setUserContextError] = useState('');
  const [editingUserContext, setEditingUserContext] = useState(false);
  const [savingUserContext, setSavingUserContext] = useState(false);

  const fetchPacks = useCallback(async () => {
    try {
      setPacksLoading(true);
      setPacksError('');
      const res = await fetch('/api/rbac/packs?include_items=1');
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load permission packs');
      setPacks(json.data || []);
    } catch (error) {
      setPacksError(error instanceof Error ? error.message : 'Failed to load permission packs');
    } finally {
      setPacksLoading(false);
    }
  }, []);

  const fetchFrontendPermissions = useCallback(async () => {
    try {
      setFrontendLoading(true);
      setFrontendError('');
      const res = await fetch('/api/rbac/frontend-permissions');
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load current frontend permissions');
      setFrontendPermissions(json.data || null);
    } catch (error) {
      setFrontendError(error instanceof Error ? error.message : 'Failed to load current frontend permissions');
    } finally {
      setFrontendLoading(false);
    }
  }, []);

  const fetchRoleMatrix = useCallback(async () => {
    try {
      setRoleMatrixLoading(true);
      setRoleMatrixError('');
      const res = await fetch('/api/rbac/role-matrix');
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load role matrix');
      setRoleMatrix(json.data || null);
    } catch (error) {
      setRoleMatrixError(error instanceof Error ? error.message : 'Failed to load role matrix');
    } finally {
      setRoleMatrixLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      setUsersError('');
      const res = await fetch('/api/rbac/users?is_active=1');
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load RBAC users');
      const rows = json.data || [];
      setUsers(rows);
      setSelectedUser((prev) => prev || rows[0]?.user || '');
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : 'Failed to load RBAC users');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchEffectivePermissions = useCallback(async (user: string) => {
    if (!user) return;
    try {
      setEffectiveLoading(true);
      setEffectiveError('');
      const res = await fetch(`/api/rbac/user-permissions?user=${encodeURIComponent(user)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load user-effective permissions');
      setEffectivePermissions(json.data || null);
    } catch (error) {
      setEffectiveError(error instanceof Error ? error.message : 'Failed to load user-effective permissions');
      setEffectivePermissions(null);
    } finally {
      setEffectiveLoading(false);
    }
  }, []);

  const fetchUserContext = useCallback(async (user: string) => {
    if (!user) return;
    try {
      setUserContextLoading(true);
      setUserContextError('');
      const res = await fetch(`/api/rbac/user-context?user=${encodeURIComponent(user)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load user context');
      setUserContext(json.data || null);
    } catch (error) {
      setUserContextError(error instanceof Error ? error.message : 'Failed to load user context');
      setUserContext(null);
    } finally {
      setUserContextLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPacks();
    void fetchFrontendPermissions();
    void fetchRoleMatrix();
    void fetchUsers();
  }, [fetchFrontendPermissions, fetchPacks, fetchRoleMatrix, fetchUsers]);

  useEffect(() => {
    if (!selectedUser) return;
    void fetchEffectivePermissions(selectedUser);
    void fetchUserContext(selectedUser);
  }, [fetchEffectivePermissions, fetchUserContext, selectedUser]);

  const moduleOptions = useMemo(
    () => Array.from(new Set(packs.map((pack) => pack.module_family).filter(Boolean))).sort(),
    [packs],
  );

  const filteredPacks = useMemo(() => {
    return packs.filter((pack) => {
      if (packModuleFilter && pack.module_family !== packModuleFilter) return false;
      if (!packSearch) return true;
      const q = packSearch.toLowerCase();
      return (
        (pack.pack_label || '').toLowerCase().includes(q) ||
        (pack.description || '').toLowerCase().includes(q) ||
        (pack.pack_key || '').toLowerCase().includes(q) ||
        (pack.items || []).some((item) =>
          (item.capability_label || '').toLowerCase().includes(q) || item.capability.toLowerCase().includes(q),
        )
      );
    });
  }, [packModuleFilter, packSearch, packs]);

  const filteredRoles = useMemo(() => {
    const rows = roleMatrix?.roles || [];
    if (!roleSearch) return rows;
    const q = roleSearch.toLowerCase();
    return rows.filter((roleEntry) => {
      if (roleEntry.role.toLowerCase().includes(q)) return true;
      return roleEntry.packs.some((pack) => pack.pack_key.toLowerCase().includes(q));
    });
  }, [roleMatrix, roleSearch]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter((user) => {
      return (
        (user.user || '').toLowerCase().includes(q) ||
        (user.full_name || '').toLowerCase().includes(q) ||
        (user.department || '').toLowerCase().includes(q) ||
        (user.primary_role || '').toLowerCase().includes(q)
      );
    });
  }, [userSearch, users]);

  const totalCapabilities = useMemo(
    () => packs.reduce((sum, pack) => sum + (pack.capability_count || 0), 0),
    [packs],
  );

  const sessionCapabilityCount = useMemo(
    () => Object.keys(frontendPermissions?.capabilities || {}).length,
    [frontendPermissions],
  );

  const effectiveCapabilityEntries = useMemo(
    () => Object.entries(effectivePermissions?.capabilities || {}),
    [effectivePermissions],
  );

  const openRoleEditor = useCallback((role: RoleEntry) => {
    const state: Record<string, { enabled: boolean; scope: string; mode: string; isSystem: boolean }> = {};
    const packMap = new Map(role.packs.map((pack) => [pack.pack_key, pack]));
    (roleMatrix?.packs || []).forEach((pack) => {
      const mapping = packMap.get(pack.pack_key);
      state[pack.pack_key] = {
        enabled: !!mapping,
        scope: mapping?.scope || 'own',
        mode: mapping?.mode || 'read',
        isSystem: !!mapping?.is_system_default,
      };
    });
    setEditPacks(state);
    setEditingRole(role);
  }, [roleMatrix]);

  const updateEditPack = useCallback((packKey: string, next: Partial<{ enabled: boolean; scope: string; mode: string }>) => {
    setEditPacks((prev) => ({
      ...prev,
      [packKey]: { ...prev[packKey], ...next },
    }));
  }, []);

  const handleSaveRole = useCallback(async () => {
    if (!editingRole) return;
    try {
      setSavingRole(true);
      const packsPayload = Object.entries(editPacks)
        .filter(([, value]) => value.enabled)
        .map(([pack_key, value]) => ({
          pack_key,
          scope: value.scope,
          mode: value.mode,
        }));
      const res = await fetch('/api/rbac/role-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editingRole.role, packs: packsPayload }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to save role packs');
      setEditingRole(null);
      await fetchRoleMatrix();
    } catch (error) {
      setRoleMatrixError(error instanceof Error ? error.message : 'Failed to save role packs');
    } finally {
      setSavingRole(false);
    }
  }, [editPacks, editingRole, fetchRoleMatrix]);

  const handleSaveUserContext = useCallback(async () => {
    if (!userContext?.user) return;
    try {
      setSavingUserContext(true);
      setUserContextError('');
      const res = await fetch('/api/rbac/user-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userContext),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to save user context');
      setEditingUserContext(false);
      await fetchUserContext(userContext.user);
      await fetchEffectivePermissions(userContext.user);
      await fetchUsers();
    } catch (error) {
      setUserContextError(error instanceof Error ? error.message : 'Failed to save user context');
    } finally {
      setSavingUserContext(false);
    }
  }, [fetchEffectivePermissions, fetchUserContext, fetchUsers, userContext]);

  const setContextField = useCallback((field: keyof UserContextPayload, value: string | number) => {
    setUserContext((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  const expandAllPacks = () => {
    const next: Record<string, boolean> = {};
    filteredPacks.forEach((pack) => {
      next[pack.pack_key] = true;
    });
    setExpandedPacks(next);
  };

  const expandAllRoles = () => {
    const next: Record<string, boolean> = {};
    filteredRoles.forEach((role) => {
      next[role.role] = true;
    });
    setExpandedRoles(next);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800 sm:text-2xl">
          <Shield className="h-6 w-6 text-[#1e6b87]" />
          Permissions
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Live RBAC console for session truth, role-pack composition, user-effective access, and pack definitions.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Simplified and live by design</p>
            <p className="mt-1 text-blue-700">
              This page now reads and edits the actual RBAC layer instead of pretending to be a static permissions brochure.
              For deeper administration, you can still use Roles and User Management.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="/settings/roles" className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                Open Full Role Composer
              </a>
              <a href="/settings/user-management" className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                Open Full User Management
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <TabButton active={activeTab === 'session'} icon={Shield} label="Current Session" onClick={() => setActiveTab('session')} />
        <TabButton active={activeTab === 'roles'} icon={CheckSquare} label="Role Packs" onClick={() => setActiveTab('roles')} />
        <TabButton active={activeTab === 'users'} icon={Users} label="User Effective" onClick={() => setActiveTab('users')} />
        <TabButton active={activeTab === 'packs'} icon={Package} label="Pack Reference" onClick={() => setActiveTab('packs')} />
      </div>

      {activeTab === 'session' ? (
        <>
          {frontendLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="mr-2 h-6 w-6 animate-spin text-[#1e6b87]" />
              <span className="text-gray-500">Loading current permission shell...</span>
            </div>
          ) : frontendError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
              <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-500" />
              <p className="text-sm text-red-700">{frontendError}</p>
              <button onClick={fetchFrontendPermissions} className="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700">
                Retry
              </button>
            </div>
          ) : frontendPermissions ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Accessible Modules" value={frontendPermissions.accessible_modules.length} />
                <StatCard label="Capabilities" value={sessionCapabilityCount} />
                <StatCard label="Visible Tabs" value={frontendPermissions.visible_tabs.length} />
                <StatCard label="Routes" value={frontendPermissions.accessible_routes.length} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-800">Current User</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div>User: <strong>{frontendPermissions.user}</strong></div>
                    <div>Settings Access: <strong>{frontendPermissions.can_access_settings ? 'Yes' : 'No'}</strong></div>
                    <div>Superuser: <strong>{frontendPermissions.is_superuser ? 'Yes' : 'No'}</strong></div>
                    <div>Department: <strong>{frontendPermissions.user_context?.department || '—'}</strong></div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-800">Scoped Context</h3>
                  <div className="space-y-3 text-sm text-gray-700">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">Assigned Projects</p>
                      <div className="flex flex-wrap gap-1">
                        {(frontendPermissions.user_context?.assigned_projects || []).length ? (
                          (frontendPermissions.user_context?.assigned_projects || []).map((project) => (
                            <span key={project} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                              {project}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">Assigned Sites</p>
                      <div className="flex flex-wrap gap-1">
                        {(frontendPermissions.user_context?.assigned_sites || []).length ? (
                          (frontendPermissions.user_context?.assigned_sites || []).map((site) => (
                            <span key={site} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                              {site}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-800">Accessible Modules</h3>
                  <div className="flex flex-wrap gap-2">
                    {frontendPermissions.accessible_modules.length ? (
                      frontendPermissions.accessible_modules.map((module) => (
                        <span key={module} className="rounded-lg bg-[#1e6b87]/10 px-2.5 py-1 text-xs font-medium text-[#1e6b87]">
                          {module}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">No modules exposed</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-800">Visible Workspace Tabs</h3>
                  <div className="flex flex-wrap gap-2">
                    {frontendPermissions.visible_tabs.length ? (
                      frontendPermissions.visible_tabs.map((tab) => (
                        <span key={tab} className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                          {tab}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">No gated tabs returned</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-800">Effective Capabilities</h3>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(frontendPermissions.capabilities || {}).map(([capability, grant]) => (
                    <div key={capability} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <p className="truncate text-xs font-medium text-gray-800">{capability}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <ScopeBadge scope={grant.scope} />
                        <ModeBadge mode={grant.mode} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {activeTab === 'roles' ? (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button onClick={expandAllRoles} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-100">
                Expand All
              </button>
              <button onClick={() => setExpandedRoles({})} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-100">
                Collapse All
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={roleSearch}
                onChange={(event) => setRoleSearch(event.target.value)}
                placeholder="Search roles or packs..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-64"
              />
            </div>
          </div>

          {roleMatrixLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="mr-2 h-6 w-6 animate-spin text-[#1e6b87]" />
              <span className="text-gray-500">Loading role matrix...</span>
            </div>
          ) : roleMatrixError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
              <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-500" />
              <p className="text-sm text-red-700">{roleMatrixError}</p>
              <button onClick={fetchRoleMatrix} className="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700">
                Retry
              </button>
            </div>
          ) : roleMatrix ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Roles" value={roleMatrix.roles.length} />
                <StatCard label="Available Packs" value={roleMatrix.packs.length} />
                <StatCard label="Assigned Mappings" value={roleMatrix.roles.reduce((sum, role) => sum + role.packs.length, 0)} />
                <StatCard label="Filtered Roles" value={filteredRoles.length} />
              </div>

              <div className="space-y-4">
                {filteredRoles.map((roleEntry) => {
                  const packMap = new Map(roleEntry.packs.map((pack) => [pack.pack_key, pack]));
                  return (
                    <div key={roleEntry.role} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                      <div
                        className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-gray-50"
                        onClick={() => setExpandedRoles((prev) => ({ ...prev, [roleEntry.role]: !prev[roleEntry.role] }))}
                      >
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800">{roleEntry.role}</h3>
                          <p className="text-xs text-gray-500">{roleEntry.packs.length} assigned packs</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              openRoleEditor(roleEntry);
                            }}
                            className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            Edit Packs
                          </button>
                          {expandedRoles[roleEntry.role] ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                        </div>
                      </div>

                      {expandedRoles[roleEntry.role] ? (
                        <div className="border-t border-gray-100 px-4 py-3">
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {roleMatrix.packs.map((pack) => {
                              const mapping = packMap.get(pack.pack_key);
                              return (
                                <div
                                  key={`${roleEntry.role}-${pack.pack_key}`}
                                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                                    mapping ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50 opacity-60'
                                  }`}
                                >
                                  <span className={`truncate ${mapping ? 'font-medium text-gray-800' : 'text-gray-500'}`}>
                                    {pack.pack_label}
                                  </span>
                                  {mapping ? (
                                    <div className="ml-2 flex items-center gap-1">
                                      <ScopeBadge scope={mapping.scope} />
                                      <ModeBadge mode={mapping.mode} />
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {activeTab === 'users' ? (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800">RBAC Users</h3>
              <p className="mt-1 text-xs text-gray-500">Inspect why a user has access, then adjust the live user context if needed.</p>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search users..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {usersLoading ? (
              <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#1e6b87]" />
                Loading users...
              </div>
            ) : usersError ? (
              <div className="text-sm text-red-700">
                {usersError}
                <button onClick={fetchUsers} className="mt-3 block rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">
                  Retry
                </button>
              </div>
            ) : (
              <div className="max-h-[640px] space-y-2 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <button
                    key={user.user}
                    onClick={() => {
                      setSelectedUser(user.user);
                      setEditingUserContext(false);
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      selectedUser === user.user
                        ? 'border-[#1e6b87] bg-[#1e6b87]/10 text-[#1e6b87]'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{user.full_name || user.user}</div>
                    <div className="text-xs opacity-80">{user.primary_role || 'No primary role'} · {user.department || 'No department'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Effective Permissions</h3>
                  <p className="text-xs text-gray-500">{selectedUser || 'No user selected'}</p>
                </div>
                {selectedUser ? (
                  <button onClick={() => void fetchEffectivePermissions(selectedUser)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-100">
                    Refresh
                  </button>
                ) : null}
              </div>

              {effectiveLoading ? (
                <div className="flex items-center justify-center py-16 text-sm text-gray-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#1e6b87]" />
                  Loading effective permissions...
                </div>
              ) : effectiveError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{effectiveError}</div>
              ) : effectivePermissions ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard label="Roles" value={effectivePermissions.roles.length} />
                    <StatCard label="Capabilities" value={effectivePermissions.capability_count} />
                    <StatCard label="Modules" value={effectivePermissions.accessible_modules.length} />
                    <StatCard label="Visible Tabs" value={effectivePermissions.visible_tabs.length} />
                  </div>

                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Granted Roles</h4>
                    <div className="flex flex-wrap gap-2">
                      {effectivePermissions.roles.map((role) => (
                        <span key={role} className="rounded bg-[#1e6b87]/10 px-2.5 py-1 text-xs font-medium text-[#1e6b87]">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Pack Breakdown</h4>
                      <div className="space-y-2">
                        {(effectivePermissions.pack_breakdown || []).map((pack) => (
                          <div key={pack.pack_key} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-gray-800">{pack.pack_label}</p>
                                <p className="text-xs text-gray-500">{pack.module_family || pack.pack_key}</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <ScopeBadge scope={pack.effective_scope} />
                                <ModeBadge mode={pack.effective_mode} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Overrides</h4>
                      {(effectivePermissions.overrides || []).length ? (
                        <div className="space-y-2">
                          {(effectivePermissions.overrides || []).map((override) => (
                            <div key={override.name} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-gray-800">{override.pack_label}</p>
                                <span
                                  className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                                    override.grant_or_revoke === 'GRANT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {override.grant_or_revoke}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center gap-1.5">
                                <ScopeBadge scope={override.scope} />
                                <ModeBadge mode={override.mode} />
                                <span
                                  className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                                    override.is_currently_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  {override.is_currently_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-400">
                          No user-specific overrides.
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Effective Capabilities</h4>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {effectiveCapabilityEntries.map(([capability, grant]) => (
                        <div key={capability} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                          <p className="truncate text-xs font-medium text-gray-800">{capability}</p>
                          <div className="mt-2 flex items-center gap-1.5">
                            <ScopeBadge scope={grant.scope} />
                            <ModeBadge mode={grant.mode} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">
                  Select a user to load effective permissions.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Live User Context</h3>
                  <p className="text-xs text-gray-500">This writes to the actual RBAC user-context backend route.</p>
                </div>
                {userContext ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingUserContext((prev) => !prev);
                        if (editingUserContext && selectedUser) void fetchUserContext(selectedUser);
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-100"
                    >
                      {editingUserContext ? 'Cancel Edit' : 'Edit Context'}
                    </button>
                    {editingUserContext ? (
                      <button
                        onClick={() => void handleSaveUserContext()}
                        disabled={savingUserContext}
                        className="rounded-lg bg-[#1e6b87] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#185a72] disabled:opacity-60"
                      >
                        {savingUserContext ? 'Saving...' : 'Save Context'}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {userContextLoading ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#1e6b87]" />
                  Loading user context...
                </div>
              ) : userContextError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{userContextError}</div>
              ) : userContext ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs text-gray-600">
                    Department
                    <input
                      value={userContext.department || ''}
                      disabled={!editingUserContext}
                      onChange={(event) => setContextField('department', event.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 disabled:bg-gray-50"
                    />
                  </label>
                  <label className="text-xs text-gray-600">
                    Designation
                    <input
                      value={userContext.designation || ''}
                      disabled={!editingUserContext}
                      onChange={(event) => setContextField('designation', event.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 disabled:bg-gray-50"
                    />
                  </label>
                  <label className="text-xs text-gray-600">
                    Primary Role
                    <input
                      value={userContext.primary_role || ''}
                      disabled={!editingUserContext}
                      onChange={(event) => setContextField('primary_role', event.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 disabled:bg-gray-50"
                    />
                  </label>
                  <label className="text-xs text-gray-600">
                    Secondary Roles
                    <input
                      value={userContext.secondary_roles || ''}
                      disabled={!editingUserContext}
                      onChange={(event) => setContextField('secondary_roles', event.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 disabled:bg-gray-50"
                    />
                  </label>
                  <label className="text-xs text-gray-600 md:col-span-2">
                    Assigned Projects
                    <input
                      value={userContext.assigned_projects || ''}
                      disabled={!editingUserContext}
                      onChange={(event) => setContextField('assigned_projects', event.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 disabled:bg-gray-50"
                    />
                  </label>
                  <label className="text-xs text-gray-600 md:col-span-2">
                    Assigned Sites
                    <input
                      value={userContext.assigned_sites || ''}
                      disabled={!editingUserContext}
                      onChange={(event) => setContextField('assigned_sites', event.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 disabled:bg-gray-50"
                    />
                  </label>
                  <label className="text-xs text-gray-600">
                    Region
                    <input
                      value={userContext.region || ''}
                      disabled={!editingUserContext}
                      onChange={(event) => setContextField('region', event.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 disabled:bg-gray-50"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={!!userContext.is_active}
                      disabled={!editingUserContext}
                      onChange={(event) => setContextField('is_active', event.target.checked ? 1 : 0)}
                    />
                    Active
                  </label>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">
                  Select a user to inspect or edit RBAC context.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'packs' ? (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button onClick={expandAllPacks} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-100">
                Expand All
              </button>
              <button onClick={() => setExpandedPacks({})} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-100">
                Collapse All
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={packModuleFilter}
                onChange={(event) => setPackModuleFilter(event.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Modules</option>
                {moduleOptions.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={packSearch}
                  onChange={(event) => setPackSearch(event.target.value)}
                  placeholder="Search packs or capabilities..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-72"
                />
              </div>
            </div>
          </div>

          {packsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="mr-2 h-6 w-6 animate-spin text-[#1e6b87]" />
              <span className="text-gray-500">Loading permission packs...</span>
            </div>
          ) : packsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
              <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-500" />
              <p className="text-sm text-red-700">{packsError}</p>
              <button onClick={fetchPacks} className="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700">
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Permission Packs" value={packs.length} />
                <StatCard label="Capabilities in Packs" value={totalCapabilities} />
                <StatCard label="Module Families" value={moduleOptions.length} />
                <StatCard label="Filtered Packs" value={filteredPacks.length} />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {filteredPacks.map((pack) => (
                  <PackCard
                    key={pack.pack_key}
                    pack={pack}
                    isExpanded={!!expandedPacks[pack.pack_key]}
                    onToggle={() => setExpandedPacks((prev) => ({ ...prev, [pack.pack_key]: !prev[pack.pack_key] }))}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}

      {editingRole && roleMatrix ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingRole(null)} />
          <div className="relative flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Edit Role Packs</h3>
                <p className="text-sm text-gray-500">{editingRole.role}</p>
              </div>
              <button onClick={() => setEditingRole(null)} className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {roleMatrix.packs.map((pack) => {
                const state = editPacks[pack.pack_key];
                if (!state) return null;
                return (
                  <div
                    key={pack.pack_key}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                      state.enabled ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={state.enabled}
                      disabled={state.isSystem}
                      onChange={(event) => updateEditPack(pack.pack_key, { enabled: event.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-[#1e6b87] focus:ring-[#1e6b87]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${state.enabled ? 'text-gray-800' : 'text-gray-500'}`}>
                        {pack.pack_label}
                        {state.isSystem ? <span className="ml-1 text-[10px] text-gray-400">(system)</span> : null}
                      </p>
                      <p className="text-[11px] text-gray-400">{pack.module_family || pack.pack_key}</p>
                    </div>
                    {state.enabled ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={state.scope}
                          disabled={state.isSystem}
                          onChange={(event) => updateEditPack(pack.pack_key, { scope: event.target.value })}
                          className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1e6b87]"
                        >
                          {Object.entries(SCOPE_LABELS).map(([key, value]) => (
                            <option key={key} value={key}>
                              {value}
                            </option>
                          ))}
                        </select>
                        <select
                          value={state.mode}
                          disabled={state.isSystem}
                          onChange={(event) => updateEditPack(pack.pack_key, { mode: event.target.value })}
                          className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1e6b87]"
                        >
                          {Object.keys(MODE_LABELS).map((key) => (
                            <option key={key} value={key}>
                              {MODE_LABELS[key]}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <p className="flex items-center gap-1 text-[11px] text-gray-400">
                <Info className="h-3 w-3" />
                System-default mappings cannot be removed here.
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingRole(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={() => void handleSaveRole()}
                  disabled={savingRole}
                  className="rounded-lg bg-[#1e6b87] px-3 py-2 text-sm font-medium text-white hover:bg-[#185a72] disabled:opacity-60"
                >
                  {savingRole ? 'Saving...' : 'Save Role Packs'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
