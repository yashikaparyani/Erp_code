'use client';
import { useState } from 'react';
import { Shield, ChevronDown, ChevronRight, Info, Lock, Eye, Edit3, CheckSquare, XCircle, AlertTriangle } from 'lucide-react';

// Permission model aligned with project-spine: module/stage × action × scope
interface PermissionRule {
  action: string;
  scope: string;
  crossStage: boolean;
  enforcement: 'backend' | 'frontend' | 'planned';
}

interface PermissionGroup {
  label: string;
  description: string;
  rules: PermissionRule[];
}

interface RolePermissionProfile {
  role: string;
  category: 'project-side' | 'department-head' | 'operational';
  groups: PermissionGroup[];
}

// Structured permission profiles per role
const PERMISSION_PROFILES: RolePermissionProfile[] = [
  {
    role: 'Director',
    category: 'project-side',
    groups: [
      {
        label: 'Project Visibility',
        description: 'Access to project portfolio and summary',
        rules: [
          { action: 'View all projects', scope: 'All', crossStage: true, enforcement: 'backend' },
          { action: 'View project summary dashboard', scope: 'All', crossStage: true, enforcement: 'frontend' },
          { action: 'View blocked projects', scope: 'All', crossStage: true, enforcement: 'frontend' },
        ],
      },
      {
        label: 'Site Visibility',
        description: 'Access to site-level execution data',
        rules: [
          { action: 'View all sites', scope: 'All', crossStage: true, enforcement: 'backend' },
          { action: 'View site progress', scope: 'All', crossStage: true, enforcement: 'frontend' },
        ],
      },
      {
        label: 'Stage Visibility',
        description: 'Lifecycle stage access',
        rules: [
          { action: 'View all stages', scope: 'All', crossStage: true, enforcement: 'frontend' },
          { action: 'Override stage blocks', scope: 'All', crossStage: true, enforcement: 'backend' },
        ],
      },
      {
        label: 'Create / Edit / Approve',
        description: 'Write and approval authority',
        rules: [
          { action: 'Approve tender conversion', scope: 'All', crossStage: true, enforcement: 'backend' },
          { action: 'Approve BOQ / Cost Sheet', scope: 'All', crossStage: true, enforcement: 'backend' },
          { action: 'Approve dependency overrides', scope: 'All', crossStage: true, enforcement: 'backend' },
          { action: 'Approve procurement', scope: 'All', crossStage: true, enforcement: 'backend' },
        ],
      },
      {
        label: 'Reports & Dashboards',
        description: 'Analytics and reporting access',
        rules: [
          { action: 'View all reports', scope: 'All', crossStage: true, enforcement: 'frontend' },
          { action: 'View executive dashboard', scope: 'All', crossStage: true, enforcement: 'frontend' },
        ],
      },
      {
        label: 'Settings & Masters',
        description: 'System configuration access',
        rules: [
          { action: 'Manage roles', scope: 'All', crossStage: true, enforcement: 'frontend' },
          { action: 'Manage users', scope: 'All', crossStage: true, enforcement: 'frontend' },
          { action: 'Manage departments', scope: 'All', crossStage: true, enforcement: 'frontend' },
        ],
      },
    ],
  },
  {
    role: 'Project Head',
    category: 'project-side',
    groups: [
      {
        label: 'Project Visibility',
        description: 'Portfolio-level project view',
        rules: [
          { action: 'View all projects', scope: 'All', crossStage: true, enforcement: 'backend' },
          { action: 'View project summary dashboard', scope: 'All', crossStage: true, enforcement: 'frontend' },
        ],
      },
      {
        label: 'Site Visibility',
        description: 'Cross-project site view',
        rules: [
          { action: 'View all sites', scope: 'All', crossStage: true, enforcement: 'backend' },
          { action: 'Assign project teams', scope: 'Owned projects', crossStage: false, enforcement: 'backend' },
        ],
      },
      {
        label: 'Stage Visibility',
        description: 'Full stage drill-down',
        rules: [
          { action: 'View all stages', scope: 'All', crossStage: true, enforcement: 'frontend' },
          { action: 'View cross-department status', scope: 'All', crossStage: true, enforcement: 'frontend' },
        ],
      },
      {
        label: 'Create / Edit / Approve',
        description: 'Approval authority for project spine',
        rules: [
          { action: 'Approve tender conversion', scope: 'All', crossStage: true, enforcement: 'backend' },
          { action: 'Create/Edit project structure', scope: 'Owned projects', crossStage: false, enforcement: 'backend' },
          { action: 'Approve procurement requests', scope: 'Owned projects', crossStage: true, enforcement: 'backend' },
        ],
      },
      {
        label: 'Cross-Lifecycle Collaboration',
        description: 'Access to department-lane data for oversight',
        rules: [
          { action: 'View engineering status', scope: 'All', crossStage: true, enforcement: 'frontend' },
          { action: 'View procurement status', scope: 'All', crossStage: true, enforcement: 'frontend' },
          { action: 'View stores/dispatch status', scope: 'All', crossStage: true, enforcement: 'frontend' },
          { action: 'View billing status', scope: 'All', crossStage: true, enforcement: 'frontend' },
        ],
      },
      {
        label: 'Settings & Masters',
        description: 'Configuration access',
        rules: [
          { action: 'Manage roles', scope: 'All', crossStage: true, enforcement: 'frontend' },
          { action: 'Manage users', scope: 'All', crossStage: true, enforcement: 'frontend' },
        ],
      },
    ],
  },
  {
    role: 'Project Manager',
    category: 'project-side',
    groups: [
      {
        label: 'Project Visibility',
        description: 'Assigned project view',
        rules: [
          { action: 'View assigned projects', scope: 'Assigned', crossStage: false, enforcement: 'backend' },
          { action: 'View project dashboard', scope: 'Assigned', crossStage: false, enforcement: 'frontend' },
        ],
      },
      {
        label: 'Site Visibility',
        description: 'Site-level execution view',
        rules: [
          { action: 'View/Edit assigned sites', scope: 'Assigned', crossStage: false, enforcement: 'backend' },
          { action: 'Create milestones', scope: 'Assigned', crossStage: false, enforcement: 'backend' },
          { action: 'Log DPR', scope: 'Assigned', crossStage: false, enforcement: 'backend' },
        ],
      },
      {
        label: 'Stage Visibility',
        description: 'Multi-stage operational view',
        rules: [
          { action: 'View stages: Survey → Billing', scope: 'Assigned', crossStage: true, enforcement: 'frontend' },
          { action: 'Advance site stage', scope: 'Assigned', crossStage: false, enforcement: 'planned' },
        ],
      },
      {
        label: 'Create / Edit / Approve',
        description: 'Operational write authority',
        rules: [
          { action: 'Create/Edit team members', scope: 'Assigned', crossStage: false, enforcement: 'backend' },
          { action: 'Create/Edit project assets', scope: 'Assigned', crossStage: false, enforcement: 'backend' },
          { action: 'Request procurement', scope: 'Assigned', crossStage: false, enforcement: 'backend' },
          { action: 'Create communication logs', scope: 'Assigned', crossStage: false, enforcement: 'backend' },
        ],
      },
    ],
  },
  {
    role: 'Engineering Head',
    category: 'department-head',
    groups: [
      {
        label: 'Project Visibility',
        description: 'Engineering lane across all projects',
        rules: [
          { action: 'View projects in engineering stages', scope: 'Engineering lane', crossStage: false, enforcement: 'frontend' },
        ],
      },
      {
        label: 'Site Visibility',
        description: 'Survey and BOQ site coverage',
        rules: [
          { action: 'View all sites (survey/BOQ/design)', scope: 'Engineering lane', crossStage: false, enforcement: 'backend' },
        ],
      },
      {
        label: 'Stage Visibility',
        description: 'Engineering-owned stages',
        rules: [
          { action: 'Full view: SURVEY, BOQ_DESIGN', scope: 'Engineering lane', crossStage: false, enforcement: 'frontend' },
          { action: 'Read view: EXECUTION', scope: 'Engineering lane', crossStage: true, enforcement: 'frontend' },
        ],
      },
      {
        label: 'Create / Edit / Approve',
        description: 'Survey and design authority',
        rules: [
          { action: 'Create/Approve surveys', scope: 'All', crossStage: false, enforcement: 'backend' },
          { action: 'Create/Edit BOQ', scope: 'All', crossStage: false, enforcement: 'backend' },
          { action: 'Approve drawings', scope: 'All', crossStage: false, enforcement: 'backend' },
          { action: 'Approve change requests', scope: 'All', crossStage: false, enforcement: 'backend' },
        ],
      },
    ],
  },
  {
    role: 'Procurement Manager',
    category: 'department-head',
    groups: [
      {
        label: 'Project Visibility',
        description: 'Procurement lane across projects',
        rules: [
          { action: 'View projects in procurement stages', scope: 'Procurement lane', crossStage: false, enforcement: 'frontend' },
        ],
      },
      {
        label: 'Stage Visibility',
        description: 'Procurement-owned stages',
        rules: [
          { action: 'Full view: PROCUREMENT, STORES_DISPATCH', scope: 'Procurement lane', crossStage: false, enforcement: 'frontend' },
          { action: 'Read view: COSTING', scope: 'Procurement lane', crossStage: true, enforcement: 'frontend' },
        ],
      },
      {
        label: 'Create / Edit / Approve',
        description: 'Procurement write authority',
        rules: [
          { action: 'Create vendor comparisons', scope: 'All', crossStage: false, enforcement: 'backend' },
          { action: 'Create purchase orders', scope: 'All', crossStage: false, enforcement: 'backend' },
          { action: 'Manage indent requests', scope: 'All', crossStage: false, enforcement: 'backend' },
        ],
      },
    ],
  },
  {
    role: 'HR Manager',
    category: 'department-head',
    groups: [
      {
        label: 'Project Visibility',
        description: 'Manpower allocation across projects',
        rules: [
          { action: 'View project manpower allocation', scope: 'All (HR context)', crossStage: true, enforcement: 'frontend' },
        ],
      },
      {
        label: 'Create / Edit / Approve',
        description: 'HR operational authority',
        rules: [
          { action: 'Manage employee onboarding', scope: 'All', crossStage: true, enforcement: 'backend' },
          { action: 'Manage attendance/travel/overtime', scope: 'All', crossStage: true, enforcement: 'backend' },
          { action: 'Manage statutory compliance', scope: 'All', crossStage: true, enforcement: 'backend' },
        ],
      },
    ],
  },
  {
    role: 'Accounts',
    category: 'operational',
    groups: [
      {
        label: 'Stage Visibility',
        description: 'Finance-relevant stages',
        rules: [
          { action: 'Full view: COSTING, BILLING_PAYMENT', scope: 'Accounts lane', crossStage: false, enforcement: 'frontend' },
        ],
      },
      {
        label: 'Create / Edit',
        description: 'Finance write scope',
        rules: [
          { action: 'View invoices and payments', scope: 'All', crossStage: false, enforcement: 'backend' },
          { action: 'Manage retention ledger', scope: 'All', crossStage: false, enforcement: 'backend' },
          { action: 'Manage penalty deductions', scope: 'All', crossStage: false, enforcement: 'backend' },
        ],
      },
    ],
  },
  {
    role: 'Store Manager',
    category: 'operational',
    groups: [
      {
        label: 'Stage Visibility',
        description: 'Stores-owned stages',
        rules: [
          { action: 'Full view: STORES_DISPATCH', scope: 'Stores lane', crossStage: false, enforcement: 'frontend' },
        ],
      },
      {
        label: 'Create / Edit',
        description: 'Stores write scope',
        rules: [
          { action: 'Manage dispatch challans', scope: 'All', crossStage: false, enforcement: 'backend' },
          { action: 'Manage GRN / stock entries', scope: 'All', crossStage: false, enforcement: 'backend' },
        ],
      },
    ],
  },
  {
    role: 'Field Technician',
    category: 'operational',
    groups: [
      {
        label: 'Stage Visibility',
        description: 'Execution and O&M stages',
        rules: [
          { action: 'View: EXECUTION, OM_RMA', scope: 'Assigned sites', crossStage: false, enforcement: 'frontend' },
        ],
      },
      {
        label: 'Create / Edit',
        description: 'Field execution write scope',
        rules: [
          { action: 'Log technician visits', scope: 'Assigned', crossStage: false, enforcement: 'backend' },
          { action: 'Create RMA entries', scope: 'Assigned', crossStage: false, enforcement: 'backend' },
          { action: 'Submit O&M tickets', scope: 'Assigned', crossStage: false, enforcement: 'backend' },
        ],
      },
    ],
  },
  {
    role: 'RMA Manager',
    category: 'department-head',
    groups: [
      {
        label: 'Stage Visibility',
        description: 'O&M and RMA stages',
        rules: [
          { action: 'Full view: OM_RMA', scope: 'RMA lane', crossStage: false, enforcement: 'frontend' },
        ],
      },
      {
        label: 'Create / Edit / Approve',
        description: 'RMA authority',
        rules: [
          { action: 'Manage RMA trackers', scope: 'All', crossStage: false, enforcement: 'backend' },
          { action: 'Approve RMA dispatch', scope: 'All', crossStage: false, enforcement: 'backend' },
          { action: 'Manage SLA profiles', scope: 'All', crossStage: false, enforcement: 'backend' },
        ],
      },
    ],
  },
];

const ENFORCEMENT_LABELS: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  backend: { label: 'Live Enforced', color: 'bg-green-100 text-green-700', icon: Shield },
  frontend: { label: 'UI Policy', color: 'bg-blue-100 text-blue-700', icon: Eye },
  planned: { label: 'Planned', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
};

export default function PermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<string>('Director');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const profile = PERMISSION_PROFILES.find(p => p.role === selectedRole);

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => ({ ...prev, [label]: prev[label] === undefined ? false : !prev[label] }));
  };

  const isGroupExpanded = (label: string) => expandedGroups[label] !== false;

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Permission Management</h1>
        <p className="text-gray-500 text-sm mt-1">View structured access rules per role, grouped by module and lifecycle stage</p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 items-start">
        <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Enforcement Transparency</p>
          <p className="mt-1 text-amber-700">
            Each permission is tagged with its enforcement type:
            <span className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[11px] font-medium">Live Enforced</span>
            = backed by Frappe role permissions,
            <span className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[11px] font-medium">UI Policy</span>
            = frontend navigation/visibility rule,
            <span className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[11px] font-medium">Planned</span>
            = not yet implemented.
          </p>
        </div>
      </div>

      {/* Role Selector */}
      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Select Role to Inspect</div>
        <div className="flex flex-wrap gap-2">
          {PERMISSION_PROFILES.map(p => (
            <button
              key={p.role}
              onClick={() => {
                setSelectedRole(p.role);
                setExpandedGroups({});
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                selectedRole === p.role
                  ? 'bg-[#1e6b87] text-white border-[#1e6b87]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p.role}
            </button>
          ))}
        </div>
      </div>

      {/* Permission Groups for Selected Role */}
      {profile && (
        <div className="space-y-3">
          {/* Role Summary Card */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                profile.category === 'project-side' ? 'bg-orange-500' :
                profile.category === 'department-head' ? 'bg-blue-500' : 'bg-green-500'
              }`} />
              <div>
                <div className="text-base font-semibold text-gray-800">{profile.role}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {profile.category === 'project-side' ? 'Project-side role — sees Projects tab' :
                   profile.category === 'department-head' ? 'Department head — sees project data via department tab' :
                   'Operational role — sees assigned work only'}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {profile.groups.reduce((count, g) => count + g.rules.length, 0)} rules
            </div>
          </div>

          {/* Permission Group Cards */}
          {profile.groups.map((group) => (
            <div key={group.label} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {group.label.includes('Visibility') ? <Eye className="w-4 h-4 text-gray-400" /> :
                   group.label.includes('Create') || group.label.includes('Edit') ? <Edit3 className="w-4 h-4 text-gray-400" /> :
                   group.label.includes('Report') || group.label.includes('Dashboard') ? <CheckSquare className="w-4 h-4 text-gray-400" /> :
                   group.label.includes('Setting') ? <Lock className="w-4 h-4 text-gray-400" /> :
                   <Shield className="w-4 h-4 text-gray-400" />
                  }
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-800">{group.label}</div>
                    <div className="text-xs text-gray-500">{group.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{group.rules.length} rules</span>
                  {isGroupExpanded(group.label)
                    ? <ChevronDown className="w-4 h-4 text-gray-400" />
                    : <ChevronRight className="w-4 h-4 text-gray-400" />
                  }
                </div>
              </button>

              {isGroupExpanded(group.label) && (
                <div className="border-t border-gray-100">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/50 text-[11px] text-gray-500 uppercase tracking-wider">
                        <th className="px-5 py-2 text-left font-medium">Action</th>
                        <th className="px-5 py-2 text-left font-medium">Scope</th>
                        <th className="px-5 py-2 text-center font-medium">Cross-Stage</th>
                        <th className="px-5 py-2 text-center font-medium">Enforcement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {group.rules.map((rule, idx) => {
                        const enforcement = ENFORCEMENT_LABELS[rule.enforcement];
                        return (
                          <tr key={idx} className="hover:bg-gray-50/30">
                            <td className="px-5 py-2.5 text-sm text-gray-800">{rule.action}</td>
                            <td className="px-5 py-2.5">
                              <span className="text-sm text-gray-600">{rule.scope}</span>
                            </td>
                            <td className="px-5 py-2.5 text-center">
                              {rule.crossStage ? (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <CheckSquare className="w-3.5 h-3.5" />
                                  <span className="text-xs">Yes</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-gray-400">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span className="text-xs">No</span>
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-2.5 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${enforcement.color}`}>
                                {enforcement.label}
                              </span>
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
    </div>
  );
}
