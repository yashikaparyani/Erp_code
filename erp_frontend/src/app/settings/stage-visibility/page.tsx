'use client';
import { useState } from 'react';
import { Eye, EyeOff, Info, Shield, ChevronDown, ChevronRight } from 'lucide-react';

const LIFECYCLE_STAGES = [
  { key: 'SURVEY', label: 'Survey', description: 'Site survey and feasibility assessment' },
  { key: 'BOQ_DESIGN', label: 'BOQ & Design', description: 'Bill of quantities and engineering design' },
  { key: 'COSTING', label: 'Costing', description: 'Cost sheet preparation and approval' },
  { key: 'PROCUREMENT', label: 'Procurement', description: 'Vendor comparison, PO, indent management' },
  { key: 'STORES_DISPATCH', label: 'Stores & Dispatch', description: 'Material receipt, stocking, and dispatch' },
  { key: 'EXECUTION', label: 'Execution', description: 'Site installation, commissioning, milestones' },
  { key: 'BILLING_PAYMENT', label: 'Billing & Payment', description: 'Invoice, payment receipt, retention, penalties' },
  { key: 'OM_RMA', label: 'O&M / RMA', description: 'Operations, maintenance, RMA, SLA tracking' },
  { key: 'CLOSED', label: 'Closed', description: 'Project/site closure and archival' },
] as const;

type StageKey = typeof LIFECYCLE_STAGES[number]['key'];

interface RoleStageAccess {
  role: string;
  category: 'project-side' | 'department-head' | 'operational';
  stages: Record<StageKey, 'full' | 'read' | 'none'>;
  enforcement: 'frontend';
}

// Stage visibility per role, aligned with spine model and backend DEPARTMENT_STAGE_MAP
const ROLE_STAGE_MAP: RoleStageAccess[] = [
  {
    role: 'Director',
    category: 'project-side',
    stages: { SURVEY: 'full', BOQ_DESIGN: 'full', COSTING: 'full', PROCUREMENT: 'full', STORES_DISPATCH: 'full', EXECUTION: 'full', BILLING_PAYMENT: 'full', OM_RMA: 'full', CLOSED: 'full' },
    enforcement: 'frontend',
  },
  {
    role: 'Project Head',
    category: 'project-side',
    stages: { SURVEY: 'full', BOQ_DESIGN: 'full', COSTING: 'full', PROCUREMENT: 'full', STORES_DISPATCH: 'full', EXECUTION: 'full', BILLING_PAYMENT: 'full', OM_RMA: 'full', CLOSED: 'full' },
    enforcement: 'frontend',
  },
  {
    role: 'Project Manager',
    category: 'project-side',
    stages: { SURVEY: 'full', BOQ_DESIGN: 'full', COSTING: 'read', PROCUREMENT: 'full', STORES_DISPATCH: 'read', EXECUTION: 'full', BILLING_PAYMENT: 'full', OM_RMA: 'read', CLOSED: 'read' },
    enforcement: 'frontend',
  },
  {
    role: 'Department Head',
    category: 'department-head',
    stages: { SURVEY: 'read', BOQ_DESIGN: 'read', COSTING: 'read', PROCUREMENT: 'read', STORES_DISPATCH: 'read', EXECUTION: 'read', BILLING_PAYMENT: 'read', OM_RMA: 'read', CLOSED: 'read' },
    enforcement: 'frontend',
  },
  {
    role: 'Engineering Head',
    category: 'department-head',
    stages: { SURVEY: 'full', BOQ_DESIGN: 'full', COSTING: 'read', PROCUREMENT: 'read', STORES_DISPATCH: 'none', EXECUTION: 'full', BILLING_PAYMENT: 'none', OM_RMA: 'none', CLOSED: 'none' },
    enforcement: 'frontend',
  },
  {
    role: 'Procurement Manager',
    category: 'department-head',
    stages: { SURVEY: 'none', BOQ_DESIGN: 'none', COSTING: 'read', PROCUREMENT: 'full', STORES_DISPATCH: 'full', EXECUTION: 'none', BILLING_PAYMENT: 'read', OM_RMA: 'none', CLOSED: 'none' },
    enforcement: 'frontend',
  },
  {
    role: 'Purchase',
    category: 'operational',
    stages: { SURVEY: 'none', BOQ_DESIGN: 'none', COSTING: 'read', PROCUREMENT: 'full', STORES_DISPATCH: 'read', EXECUTION: 'none', BILLING_PAYMENT: 'none', OM_RMA: 'none', CLOSED: 'none' },
    enforcement: 'frontend',
  },
  {
    role: 'Store Manager',
    category: 'operational',
    stages: { SURVEY: 'none', BOQ_DESIGN: 'none', COSTING: 'none', PROCUREMENT: 'read', STORES_DISPATCH: 'full', EXECUTION: 'read', BILLING_PAYMENT: 'none', OM_RMA: 'none', CLOSED: 'none' },
    enforcement: 'frontend',
  },
  {
    role: 'Stores Logistics Head',
    category: 'department-head',
    stages: { SURVEY: 'none', BOQ_DESIGN: 'none', COSTING: 'none', PROCUREMENT: 'read', STORES_DISPATCH: 'full', EXECUTION: 'read', BILLING_PAYMENT: 'none', OM_RMA: 'none', CLOSED: 'none' },
    enforcement: 'frontend',
  },
  {
    role: 'Accounts',
    category: 'operational',
    stages: { SURVEY: 'none', BOQ_DESIGN: 'none', COSTING: 'full', PROCUREMENT: 'read', STORES_DISPATCH: 'none', EXECUTION: 'none', BILLING_PAYMENT: 'full', OM_RMA: 'none', CLOSED: 'read' },
    enforcement: 'frontend',
  },
  {
    role: 'HR Manager',
    category: 'department-head',
    stages: { SURVEY: 'read', BOQ_DESIGN: 'read', COSTING: 'read', PROCUREMENT: 'read', STORES_DISPATCH: 'read', EXECUTION: 'read', BILLING_PAYMENT: 'read', OM_RMA: 'read', CLOSED: 'read' },
    enforcement: 'frontend',
  },
  {
    role: 'Presales Tendering Head',
    category: 'department-head',
    stages: { SURVEY: 'read', BOQ_DESIGN: 'full', COSTING: 'full', PROCUREMENT: 'none', STORES_DISPATCH: 'none', EXECUTION: 'none', BILLING_PAYMENT: 'none', OM_RMA: 'none', CLOSED: 'none' },
    enforcement: 'frontend',
  },
  {
    role: 'Presales Executive',
    category: 'operational',
    stages: { SURVEY: 'read', BOQ_DESIGN: 'read', COSTING: 'read', PROCUREMENT: 'none', STORES_DISPATCH: 'none', EXECUTION: 'none', BILLING_PAYMENT: 'none', OM_RMA: 'none', CLOSED: 'none' },
    enforcement: 'frontend',
  },
  {
    role: 'Engineer',
    category: 'operational',
    stages: { SURVEY: 'full', BOQ_DESIGN: 'full', COSTING: 'none', PROCUREMENT: 'none', STORES_DISPATCH: 'none', EXECUTION: 'full', BILLING_PAYMENT: 'none', OM_RMA: 'none', CLOSED: 'none' },
    enforcement: 'frontend',
  },
  {
    role: 'Field Technician',
    category: 'operational',
    stages: { SURVEY: 'read', BOQ_DESIGN: 'none', COSTING: 'none', PROCUREMENT: 'none', STORES_DISPATCH: 'none', EXECUTION: 'full', BILLING_PAYMENT: 'none', OM_RMA: 'full', CLOSED: 'none' },
    enforcement: 'frontend',
  },
  {
    role: 'RMA Manager',
    category: 'department-head',
    stages: { SURVEY: 'none', BOQ_DESIGN: 'none', COSTING: 'none', PROCUREMENT: 'none', STORES_DISPATCH: 'none', EXECUTION: 'none', BILLING_PAYMENT: 'none', OM_RMA: 'full', CLOSED: 'read' },
    enforcement: 'frontend',
  },
  {
    role: 'OM Operator',
    category: 'operational',
    stages: { SURVEY: 'none', BOQ_DESIGN: 'none', COSTING: 'none', PROCUREMENT: 'none', STORES_DISPATCH: 'none', EXECUTION: 'none', BILLING_PAYMENT: 'none', OM_RMA: 'full', CLOSED: 'none' },
    enforcement: 'frontend',
  },
];

type ViewMode = 'matrix' | 'by-role';

export default function StageVisibilityPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});

  const getCellColor = (access: 'full' | 'read' | 'none') => {
    switch (access) {
      case 'full': return 'bg-green-100 text-green-800';
      case 'read': return 'bg-blue-50 text-blue-700';
      case 'none': return 'bg-gray-50 text-gray-300';
    }
  };

  const getCellLabel = (access: 'full' | 'read' | 'none') => {
    switch (access) {
      case 'full': return 'Full';
      case 'read': return 'Read';
      case 'none': return '—';
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Stage Visibility</h1>
        <p className="text-gray-500 text-sm mt-1">Which roles can see which lifecycle stages of the Project → Site → Stage spine</p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex gap-3 items-start">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Configured Role Policy (Lane-Aligned)</p>
          <p className="mt-1 text-blue-700">
            This matrix represents the role-by-stage policy. It is enforced in the frontend via route guards and sidebar filtering.
            Backend stage lanes are aligned through <code>DEPARTMENT_STAGE_MAP</code> in <code>api.py</code>, while DocType permissions are enforced separately via Frappe role rules.
            <span className="font-semibold"> Full</span> = write + read access to that stage&#39;s data.
            <span className="font-semibold"> Read</span> = read-only cross-stage visibility.
            <span className="font-semibold"> — </span> = no default access.
          </p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setViewMode('matrix')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            viewMode === 'matrix' ? 'bg-[#1e6b87] text-white border-[#1e6b87]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Matrix View
        </button>
        <button
          onClick={() => setViewMode('by-role')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            viewMode === 'by-role' ? 'bg-[#1e6b87] text-white border-[#1e6b87]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          By Role
        </button>
      </div>

      {/* Matrix View */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[160px]">
                    Role
                  </th>
                  {LIFECYCLE_STAGES.map(stage => (
                    <th key={stage.key} className="px-2 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider min-w-[80px]">
                      <div>{stage.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ROLE_STAGE_MAP.map((row) => (
                  <tr key={row.role} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          row.category === 'project-side' ? 'bg-orange-500' :
                          row.category === 'department-head' ? 'bg-blue-500' : 'bg-green-500'
                        }`} />
                        <span className="text-sm font-medium text-gray-800 whitespace-nowrap">{row.role}</span>
                      </div>
                    </td>
                    {LIFECYCLE_STAGES.map(stage => {
                      const access = row.stages[stage.key];
                      return (
                        <td key={stage.key} className="px-2 py-2.5 text-center">
                          <span className={`inline-block px-2 py-1 rounded text-[11px] font-medium min-w-[40px] ${getCellColor(access)}`}>
                            {getCellLabel(access)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="border-t border-gray-100 px-4 py-3 flex flex-wrap gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="inline-block w-6 h-4 rounded bg-green-100" />
              <span>Full — write + read</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-6 h-4 rounded bg-blue-50 border border-blue-100" />
              <span>Read — read-only</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-6 h-4 rounded bg-gray-50 border border-gray-200" />
              <span>— — no default access</span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
              <span>Project-side</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
              <span>Dept head</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
              <span>Operational</span>
            </div>
          </div>
        </div>
      )}

      {/* By Role View */}
      {viewMode === 'by-role' && (
        <div className="space-y-3">
          {ROLE_STAGE_MAP.map((row) => {
            const isExpanded = expandedRoles[row.role] ?? false;
            const accessibleStages = LIFECYCLE_STAGES.filter(s => row.stages[s.key] !== 'none');
            return (
              <div key={row.role} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedRoles(prev => ({ ...prev, [row.role]: !prev[row.role] }))}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      row.category === 'project-side' ? 'bg-orange-500' :
                      row.category === 'department-head' ? 'bg-blue-500' : 'bg-green-500'
                    }`} />
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-800">{row.role}</span>
                    <span className="text-xs text-gray-400 ml-1">{accessibleStages.length} of {LIFECYCLE_STAGES.length} stages</span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </button>
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {LIFECYCLE_STAGES.map(stage => {
                        const access = row.stages[stage.key];
                        return (
                          <div key={stage.key} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                            access === 'full' ? 'border-green-200 bg-green-50' :
                            access === 'read' ? 'border-blue-200 bg-blue-50' :
                            'border-gray-100 bg-gray-50'
                          }`}>
                            {access === 'full' ? <Eye className="w-4 h-4 text-green-600" /> :
                             access === 'read' ? <Eye className="w-4 h-4 text-blue-500" /> :
                             <EyeOff className="w-4 h-4 text-gray-300" />
                            }
                            <div>
                              <div className={`text-sm font-medium ${access === 'none' ? 'text-gray-400' : 'text-gray-800'}`}>
                                {stage.label}
                              </div>
                              <div className={`text-[11px] ${
                                access === 'full' ? 'text-green-600' : access === 'read' ? 'text-blue-600' : 'text-gray-400'
                              }`}>
                                {access === 'full' ? 'Full Access' : access === 'read' ? 'Read Only' : 'No Access'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
