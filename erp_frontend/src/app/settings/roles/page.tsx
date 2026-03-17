'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Shield, ChevronDown, ChevronRight, CheckCircle, X, Loader2, Info } from 'lucide-react';

interface RoleData {
  name: string;
  role_name: string;
  disabled: number;
  is_custom: number;
  creation: string;
  owner: string;
}

// Structured role categories aligned with org model
const ROLE_CATEGORIES = [
  {
    label: 'Leadership & Project Spine',
    description: 'Full portfolio visibility, cross-stage access, approval authority',
    roles: ['Director', 'Project Head', 'Project Manager'],
    tag: 'project-side',
  },
  {
    label: 'Department Heads',
    description: 'Lane-specific full view, approval within their function',
    roles: ['Engineering Head', 'Presales Tendering Head', 'Procurement Manager', 'HR Manager', 'RMA Manager', 'Department Head'],
    tag: 'department-head',
  },
  {
    label: 'Operational / Execution',
    description: 'Assigned work view, stage-specific actions',
    roles: ['Engineer', 'Presales Executive', 'Purchase', 'Store Manager', 'Stores Logistics Head', 'Accounts', 'Field Technician', 'OM Operator'],
    tag: 'operational',
  },
] as const;

// Module/stage mapping for each role category
const ROLE_MODULE_MAP: Record<string, { modules: string[]; stages: string[] }> = {
  'Director': {
    modules: ['All Modules'],
    stages: ['All Stages'],
  },
  'Project Head': {
    modules: ['Projects', 'Engineering', 'Procurement', 'Stores', 'Execution', 'Finance', 'HR', 'RMA', 'O&M'],
    stages: ['All Stages'],
  },
  'Project Manager': {
    modules: ['Projects', 'Engineering', 'Procurement', 'Stores', 'Execution', 'Finance', 'O&M'],
    stages: ['SURVEY', 'BOQ_DESIGN', 'COSTING', 'PROCUREMENT', 'STORES_DISPATCH', 'EXECUTION', 'BILLING_PAYMENT', 'OM_RMA'],
  },
  'Engineering Head': {
    modules: ['Engineering', 'Execution'],
    stages: ['SURVEY', 'BOQ_DESIGN', 'EXECUTION'],
  },
  'Presales Tendering Head': {
    modules: ['Pre-Sales', 'Finance'],
    stages: ['Pre-tender only'],
  },
  'Procurement Manager': {
    modules: ['Procurement', 'Inventory', 'Finance'],
    stages: ['COSTING', 'PROCUREMENT', 'STORES_DISPATCH'],
  },
  'HR Manager': {
    modules: ['HR'],
    stages: ['Cross-stage (manpower)'],
  },
  'RMA Manager': {
    modules: ['RMA', 'O&M', 'SLA'],
    stages: ['OM_RMA'],
  },
  'Department Head': {
    modules: ['Cross-functional approval'],
    stages: ['All Stages (approval)'],
  },
  'Engineer': {
    modules: ['Engineering', 'Execution'],
    stages: ['SURVEY', 'BOQ_DESIGN', 'EXECUTION'],
  },
  'Presales Executive': {
    modules: ['Pre-Sales'],
    stages: ['Pre-tender only'],
  },
  'Purchase': {
    modules: ['Procurement', 'Inventory'],
    stages: ['PROCUREMENT', 'STORES_DISPATCH'],
  },
  'Store Manager': {
    modules: ['Inventory', 'Stores'],
    stages: ['STORES_DISPATCH'],
  },
  'Stores Logistics Head': {
    modules: ['Inventory', 'Stores', 'Execution'],
    stages: ['STORES_DISPATCH'],
  },
  'Accounts': {
    modules: ['Finance', 'Procurement'],
    stages: ['COSTING', 'BILLING_PAYMENT'],
  },
  'Field Technician': {
    modules: ['Execution', 'O&M', 'RMA'],
    stages: ['EXECUTION', 'OM_RMA'],
  },
  'OM Operator': {
    modules: ['O&M', 'RMA', 'SLA'],
    stages: ['OM_RMA'],
  },
};

export default function RolesPage() {
  const [data, setData] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Leadership & Project Spine': true,
    'Department Heads': true,
    'Operational / Execution': true,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRole, setNewRole] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/roles-list');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { console.error('Failed to fetch roles:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggleStatus = async (name: string) => {
    try {
      const res = await fetch('/api/roles-list/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (json.success) fetchData();
    } catch (e) { console.error('Failed to toggle role:', e); }
  };

  const handleCreate = async () => {
    if (newRole.trim()) {
      try {
        const res = await fetch('/api/roles-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role_name: newRole }),
        });
        const json = await res.json();
        if (json.success) {
          setNewRole('');
          setShowCreateModal(false);
          fetchData();
        }
      } catch (e) { console.error('Failed to create role:', e); }
    }
  };

  const getRoleStatus = (roleName: string): 'active' | 'inactive' | 'not-found' => {
    const found = data.find(r => r.role_name === roleName);
    if (!found) return 'not-found';
    return found.disabled ? 'inactive' : 'active';
  };

  const toggleCategory = (label: string) => {
    setExpandedCategories(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const filteredCategories = ROLE_CATEGORIES.map(cat => ({
    ...cat,
    roles: cat.roles.filter(r =>
      r.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(cat => cat.roles.length > 0);

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Role Management</h1>
        <p className="text-gray-500 text-sm mt-1">Manage business permission roles aligned with the project-spine operating model</p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex gap-3 items-start">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Role Policy: Configured in Frontend</p>
          <p className="mt-1 text-blue-700">
            Role-to-module and role-to-stage mappings shown below reflect the <strong>configured role policy</strong> defined in the frontend access model.
            Backend DocType permissions are enforced separately via Frappe role rules. Changes here affect navigation visibility, not backend API access.
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {data.filter(r => !r.disabled).length} active roles
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">
            {data.length} total in backend
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1e6b87] text-white rounded-lg hover:bg-[#185a73] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Role
          </button>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-52"
            />
          </div>
        </div>
      </div>

      {/* Role Categories */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map((cat) => (
            <div key={cat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat.label)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    cat.tag === 'project-side' ? 'bg-orange-500' :
                    cat.tag === 'department-head' ? 'bg-blue-500' : 'bg-green-500'
                  }`} />
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-800">{cat.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{cat.description}</div>
                  </div>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${
                    cat.tag === 'project-side' ? 'bg-orange-100 text-orange-700' :
                    cat.tag === 'department-head' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  }`}>{cat.tag}</span>
                </div>
                {expandedCategories[cat.label]
                  ? <ChevronDown className="w-4 h-4 text-gray-400" />
                  : <ChevronRight className="w-4 h-4 text-gray-400" />
                }
              </button>

              {/* Category Content */}
              {expandedCategories[cat.label] && (
                <div className="border-t border-gray-100">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-5 py-2.5 text-left font-medium">Role</th>
                        <th className="px-5 py-2.5 text-left font-medium">Modules</th>
                        <th className="px-5 py-2.5 text-left font-medium">Stage Access</th>
                        <th className="px-5 py-2.5 text-center font-medium">Backend Status</th>
                        <th className="px-5 py-2.5 text-center font-medium w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cat.roles.map((roleName) => {
                        const status = getRoleStatus(roleName);
                        const mapping = ROLE_MODULE_MAP[roleName];
                        return (
                          <tr key={roleName} className="hover:bg-gray-50/50">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-800">{roleName}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex flex-wrap gap-1">
                                {mapping?.modules.map(m => (
                                  <span key={m} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] rounded-md font-medium">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex flex-wrap gap-1">
                                {mapping?.stages.map(s => (
                                  <span key={s} className="px-2 py-0.5 bg-orange-50 text-orange-700 text-[11px] rounded-md font-medium">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                                status === 'active' ? 'bg-green-100 text-green-700' :
                                status === 'inactive' ? 'bg-red-100 text-red-600' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {status === 'active' ? 'Active' : status === 'inactive' ? 'Disabled' : 'Not Seeded'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center">
                              {status !== 'not-found' && (
                                <button
                                  onClick={() => {
                                    const found = data.find(r => r.role_name === roleName);
                                    if (found) handleToggleStatus(found.name);
                                  }}
                                  className={`p-1.5 rounded-full transition-colors ${
                                    status === 'active' ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                  }`}
                                  title={status === 'active' ? 'Disable role' : 'Enable role'}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Projects Tab Visibility Note */}
      <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-orange-600" />
          <span className="text-sm font-semibold text-orange-800">Projects Tab Visibility Rule</span>
        </div>
        <p className="text-sm text-orange-700">
          The top-level <strong>Projects</strong> tab is visible only to project-side roles: <strong>Director</strong>, <strong>Project Head</strong>, and <strong>Project Manager</strong>.
          Department roles (Engineering, Procurement, Stores, Accounts, HR, O&M/RMA) access project data through their own department tabs
          and see project/site/stage context within those views.
        </p>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Add New Role</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Role name"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm bg-[#1e6b87] text-white rounded-lg hover:bg-[#185a73]">
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
