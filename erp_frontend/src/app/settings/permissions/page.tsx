'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Shield, ChevronDown, ChevronRight, Search, Loader2, Info,
  Package, Lock, Eye, Edit3, CheckSquare, AlertTriangle,
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
  display_order: number;
  notes: string;
}

interface PermissionPack {
  name: string;
  pack_key: string;
  pack_label: string;
  description: string;
  module_family: string;
  is_system_pack: number;
  sort_order: number;
  ui_color: string;
  ui_icon: string;
  capability_count: number;
  items: PackItem[];
}

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

function getFamily(pack: PermissionPack): string {
  return (pack.module_family || pack.pack_key.split('_')[0] || '').toLowerCase();
}

function ScopeBadge({ scope }: { scope: string }) {
  const label = SCOPE_LABELS[scope] || scope;
  const isWide = ['all', 'cross_stage_write', 'cross_stage_read'].includes(scope);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
      isWide ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
    }`}>
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
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
      colorMap[mode] || 'bg-gray-100 text-gray-600'
    }`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function PackCard({ pack, isExpanded, onToggle }: {
  pack: PermissionPack;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const family = getFamily(pack);
  const borderClass = PACK_BORDER_COLORS[family] || 'border-gray-200 bg-gray-50/50';
  const headerClass = PACK_HEADER_COLORS[family] || 'bg-gray-600';
  const sensitiveCount = pack.items?.filter(i => i.is_sensitive).length || 0;
  const requiredCount = pack.items?.filter(i => i.required_for_pack).length || 0;

  // Group items by action_type
  const groupedItems: Record<string, PackItem[]> = {};
  (pack.items || []).forEach(item => {
    const group = item.action_type || 'other';
    if (!groupedItems[group]) groupedItems[group] = [];
    groupedItems[group].push(item);
  });

  const actionOrder = ['access', 'view', 'create', 'update', 'manage', 'submit', 'approve', 'reject', 'override', 'delete', 'other'];
  const sortedGroups = actionOrder.filter(g => groupedItems[g]);

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-shadow hover:shadow-md ${borderClass}`}>
      <div
        className={`${headerClass} px-4 py-3 cursor-pointer flex items-center justify-between text-white`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Package className="w-5 h-5 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{pack.pack_label}</h3>
            <p className="text-xs opacity-80 truncate">{pack.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-white/20 rounded px-2 py-0.5">
              {pack.capability_count} capabilities
            </span>
            {sensitiveCount > 0 && (
              <span className="bg-red-400/30 rounded px-2 py-0.5 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {sensitiveCount}
              </span>
            )}
            {pack.is_system_pack ? (
              <span className="bg-white/20 rounded px-2 py-0.5">System</span>
            ) : null}
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 py-3">
          <div className="flex flex-wrap gap-3 mb-3 text-xs text-gray-600">
            <span>Module: <strong className="text-gray-800">{pack.module_family || '—'}</strong></span>
            <span>Required: <strong className="text-gray-800">{requiredCount}</strong></span>
            <span>Optional: <strong className="text-gray-800">{(pack.capability_count || 0) - requiredCount}</strong></span>
          </div>

          <div className="space-y-3">
            {sortedGroups.map(actionType => (
              <div key={actionType}>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  {actionType}
                </h4>
                <div className="space-y-1">
                  {groupedItems[actionType].map(item => (
                    <div
                      key={item.capability}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm ${
                        item.is_sensitive
                          ? 'bg-red-50 border border-red-100'
                          : 'bg-white border border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {item.is_sensitive ? (
                          <Lock className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        ) : item.required_for_pack ? (
                          <CheckSquare className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded border border-gray-300 flex-shrink-0" />
                        )}
                        <span className="truncate text-gray-700">
                          {item.capability_label || item.capability}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
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
      )}
    </div>
  );
}

export default function PermissionPacksPage() {
  const [packs, setPacks] = useState<PermissionPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedPacks, setExpandedPacks] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState('');

  const fetchPacks = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/rbac/packs?include_items=1');
      const json = await res.json();
      if (json.success) {
        setPacks(json.data || []);
      } else {
        setError(json.message || 'Failed to load packs');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load packs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPacks(); }, [fetchPacks]);

  const togglePack = (packKey: string) => {
    setExpandedPacks(prev => ({ ...prev, [packKey]: !prev[packKey] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    packs.forEach(p => { all[p.pack_key] = true; });
    setExpandedPacks(all);
  };

  const collapseAll = () => setExpandedPacks({});

  const moduleOptions = Array.from(new Set(packs.map(p => p.module_family).filter(Boolean))).sort();

  const filteredPacks = packs.filter(p => {
    if (filterModule && p.module_family !== filterModule) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.pack_label.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.pack_key.toLowerCase().includes(q) ||
        (p.items || []).some(it =>
          (it.capability_label || '').toLowerCase().includes(q) ||
          it.capability.toLowerCase().includes(q)
        )
      );
    }
    return true;
  });

  const totalCapabilities = packs.reduce((sum, p) => sum + (p.capability_count || 0), 0);

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="w-6 h-6 text-[#1e6b87]" />
          Permission Packs
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Browse and inspect permission packs — the building blocks of role-based access
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex gap-3 items-start">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Pack-Driven Permission Model</p>
          <p className="mt-1 text-blue-700">
            Each pack bundles related capabilities with scope and mode defaults. Roles are composed
            from packs — never from raw capability toggles. Each capability shown here maps
            directly to a backend permission check.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-2xl font-bold text-gray-800">{packs.length}</p>
          <p className="text-xs text-gray-500">Permission Packs</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-2xl font-bold text-gray-800">{totalCapabilities}</p>
          <p className="text-xs text-gray-500">Total Capabilities</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-2xl font-bold text-gray-800">{packs.filter(p => p.is_system_pack).length}</p>
          <p className="text-xs text-gray-500">System Packs</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-2xl font-bold text-gray-800">{moduleOptions.length}</p>
          <p className="text-xs text-gray-500">Module Families</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button onClick={expandAll} className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
            Expand All
          </button>
          <button onClick={collapseAll} className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
            Collapse All
          </button>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={filterModule}
            onChange={e => setFilterModule(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Modules</option>
            {moduleOptions.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search packs or capabilities..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#1e6b87] mr-2" />
          <span className="text-gray-500">Loading permission packs...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-8 text-center">
          <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={fetchPacks} className="mt-3 px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
            Retry
          </button>
        </div>
      ) : filteredPacks.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-8 text-center text-gray-500 text-sm">
          No packs match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPacks.map(pack => (
            <PackCard
              key={pack.pack_key}
              pack={pack}
              isExpanded={!!expandedPacks[pack.pack_key]}
              onToggle={() => togglePack(pack.pack_key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
