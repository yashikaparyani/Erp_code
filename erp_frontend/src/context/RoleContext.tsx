'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { usePermissions } from './PermissionContext';

export type Role = 
  | 'Director'
  | 'Department Head'
  | 'Project Head'
  | 'HR Manager'
  | 'Presales Tendering Head'
  | 'Presales Executive'
  | 'Engineering Head'
  | 'Engineer'
  | 'Procurement Manager'
  | 'Purchase'
  | 'Store Manager'
  | 'Stores Logistics Head'
  | 'Project Manager'
  | 'Accounts'
  | 'Field Technician'
  | 'RMA Manager'
  | 'OM Operator';

export const roles: Role[] = [
  'Director',
  'Department Head',
  'Project Head',
  'HR Manager',
  'Presales Tendering Head',
  'Presales Executive',
  'Engineering Head',
  'Engineer',
  'Procurement Manager',
  'Purchase',
  'Store Manager',
  'Stores Logistics Head',
  'Project Manager',
  'Accounts',
  'Field Technician',
  'RMA Manager',
  'OM Operator',
];

// Project-side roles: only these see the top-level Projects tab
export const PROJECT_SIDE_ROLES: Role[] = [
  'Director',
  'Project Head',
];

// Settings-capable roles
export const SETTINGS_ROLES: Role[] = [
  'Director',
  'Department Head',
];

// Role-based access configuration for sidebar navigation
// NOTE: /projects is NOT listed here for department roles — it is gated
// separately via PROJECT_SIDE_ROLES in shouldShowNavLinkForRole.
export const roleAccess: Record<Role, string[]> = {
  'Director': [
    '/',
    '/notifications',
    '/projects',
    '/project-head',
    '/settings',
    '/hr',
    '/purchase-orders',
    '/grns',
    '/indents',
    '/stock-position',
    '/stock-aging',
    '/milestones',
    '/manpower',
    '/petty-cash',
    '/sla',
    '/pre-sales',
    '/survey',
    '/engineering',
    '/procurement',
    '/vendor-comparisons',
    '/inventory',
    '/execution',
    '/om-helpdesk',
    '/rma',
    '/finance',
    '/reports',
    '/accountability',
    '/documents',
    '/master-data',
    '/comm-logs',
    '/finance/payment-receipts',
    '/finance/retention',
    '/finance/penalties',
    '/engineering/drawings',
    '/engineering/change-requests',
    '/hr/technician-visits',
    '/sla-profiles',
    '/device-uptime',
    '/dispatch-challans',
    '/sla-penalties',
    '/letter-of-submission',
  ],
  'Department Head': [
    '/',
    '/notifications',
    '/settings',
    '/hr',
    '/purchase-orders',
    '/grns',
    '/indents',
    '/stock-position',
    '/stock-aging',
    '/manpower',
    '/petty-cash',
    '/sla',
    '/pre-sales',
    '/survey',
    '/engineering',
    '/procurement',
    '/vendor-comparisons',
    '/inventory',
    '/execution',
    '/om-helpdesk',
    '/rma',
    '/finance',
    '/reports',
    '/accountability',
    '/documents',
    '/master-data',
    '/comm-logs',
    '/finance/payment-receipts',
    '/finance/retention',
    '/finance/penalties',
    '/engineering/drawings',
    '/engineering/change-requests',
    '/hr/technician-visits',
    '/sla-profiles',
    '/device-uptime',
    '/dispatch-challans',
    '/sla-penalties',
    '/letter-of-submission',
  ],
  'Project Head': [
    '/',
    '/notifications',
    '/projects',
    '/project-head',
    '/milestones',
    '/manpower',
    '/survey',
    '/engineering',
    '/procurement',
    '/vendor-comparisons',
    '/execution',
    '/finance',
    '/reports',
    '/accountability',
    '/documents',
    '/master-data',
    '/purchase-orders',
    '/indents',
    '/comm-logs',
    '/petty-cash',
    '/finance/payment-receipts',
    '/finance/retention',
    '/finance/penalties',
    '/engineering/drawings',
    '/engineering/change-requests',
    '/letter-of-submission',
  ],
  'HR Manager': [
    '/',
    '/notifications',
    '/hr',
    '/reports',
    '/documents',
    '/letter-of-submission',
  ],
  'Presales Tendering Head': [
    '/',
    '/notifications',
    '/pre-sales',
    '/survey',
    '/reports',
    '/documents',
  ],
  'Presales Executive': [
    '/',
    '/notifications',
    '/pre-sales',
    '/survey',
    '/documents',
  ],
  'Engineering Head': [
    '/',
    '/notifications',
    '/manpower',
    '/survey',
    '/engineering',
    '/execution',
    '/reports',
    '/documents',
    '/comm-logs',
    '/hr/technician-visits',
    '/engineering/drawings',
    '/engineering/change-requests',
    '/letter-of-submission',
  ],
  'Engineer': [
    '/',
    '/notifications',
    '/survey',
    '/engineering',
    '/execution',
    '/documents',
    '/manpower',
    '/comm-logs',
    '/hr/technician-visits',
    '/engineering/drawings',
    '/engineering/change-requests',
    '/letter-of-submission',
  ],
  'Procurement Manager': [
    '/',
    '/notifications',
    '/purchase-orders',
    '/indents',
    '/petty-cash',
    '/procurement',
    '/vendor-comparisons',
    '/inventory',
    '/reports',
    '/documents',
    '/grns',
    '/stock-position',
    '/stock-aging',
    '/dispatch-challans',
    '/letter-of-submission',
  ],
  'Purchase': [
    '/',
    '/notifications',
    '/purchase-orders',
    '/indents',
    '/procurement',
    '/vendor-comparisons',
    '/inventory',
    '/documents',
    '/grns',
    '/stock-position',
    '/stock-aging',
    '/dispatch-challans',
    '/letter-of-submission',
  ],
  'Store Manager': [
    '/',
    '/notifications',
    '/grns',
    '/stock-position',
    '/stock-aging',
    '/procurement',
    '/vendor-comparisons',
    '/inventory',
    '/documents',
    '/indents',
    '/purchase-orders',
    '/dispatch-challans',
    '/letter-of-submission',
  ],
  'Stores Logistics Head': [
    '/',
    '/notifications',
    '/grns',
    '/stock-position',
    '/stock-aging',
    '/procurement',
    '/vendor-comparisons',
    '/inventory',
    '/documents',
    '/indents',
    '/purchase-orders',
    '/dispatch-challans',
    '/letter-of-submission',
  ],
  'Project Manager': [
    '/',
    '/notifications',
    '/survey',
    '/project-manager/dpr',
    '/project-manager/inventory',
    '/project-manager/petty-cash',
    '/project-manager/requests',
    '/comm-logs',
    '/letter-of-submission',
  ],
  'Accounts': [
    '/',
    '/notifications',
    '/finance',
    '/reports',
    '/documents',
    '/finance/payment-receipts',
    '/finance/retention',
    '/finance/penalties',
    '/letter-of-submission',
  ],
  'Field Technician': [
    '/',
    '/notifications',
    '/execution',
    '/manpower',
    '/om-helpdesk',
    '/documents',
    '/rma',
    '/hr/technician-visits',
    '/comm-logs',
    '/sla',
    '/sla-profiles',
    '/device-uptime',
    '/sla-penalties',
  ],
  'RMA Manager': [
    '/',
    '/notifications',
    '/sla',
    '/rma',
    '/om-helpdesk',
    '/documents',
    '/reports',
    '/hr/technician-visits',
    '/sla-profiles',
    '/device-uptime',
    '/letter-of-submission',
  ],
  'OM Operator': [
    '/',
    '/notifications',
    '/sla',
    '/om-helpdesk',
    '/rma',
    '/reports',
    '/documents',
    '/hr/technician-visits',
    '/sla-profiles',
    '/device-uptime',
    '/sla-penalties',
    '/letter-of-submission',
  ],
};

// Get role initials for avatar
export const getRoleInitials = (role: Role): string => {
  const initialsMap: Record<Role, string> = {
    'Director': 'DI',
    'Department Head': 'DH',
    'Project Head': 'PH',
    'HR Manager': 'HR',
    'Presales Tendering Head': 'PT',
    'Presales Executive': 'PE',
    'Engineering Head': 'EH',
    'Engineer': 'EN',
    'Procurement Manager': 'PR',
    'Purchase': 'PU',
    'Store Manager': 'SM',
    'Stores Logistics Head': 'SL',
    'Project Manager': 'PM',
    'Accounts': 'AC',
    'Field Technician': 'FT',
    'RMA Manager': 'RM',
    'OM Operator': 'OM',
  };
  return initialsMap[role];
};

interface RoleContextType {
  currentRole: Role | null;
  hasAccess: (path: string) => boolean;
  /** True when backend RBAC permissions have been loaded. */
  isPermissionLoaded: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const { canAccessRoute, isLoaded: isPermissionLoaded, permissions } = usePermissions();
  const currentRole = (currentUser?.role as Role | undefined) ?? null;

  const hasAccess = (path: string): boolean => {
    if (!currentUser || !currentRole) {
      return false;
    }
    const isSystemManager = new Set(currentUser.roles || []).has('System Manager');

    if (path.startsWith('/sites/') && path.endsWith('/dossier')) {
      const allowedPaths = roleAccess[currentRole] ?? [];
      return allowedPaths.includes('/documents') || currentRole === 'Project Manager' || PROJECT_SIDE_ROLES.includes(currentRole);
    }

    if (path === '/settings/operations' || path.startsWith('/settings/operations/')) {
      return currentRole === 'Director' || isSystemManager;
    }

    if (path === '/settings/anda-import' || path.startsWith('/settings/anda-import/')) {
      return currentRole === 'Director' || isSystemManager;
    }

    if (path === '/finance/costing-queue' || path.startsWith('/finance/costing-queue/')) {
      return currentRole === 'Director' || currentRole === 'Accounts' || isSystemManager;
    }

    if (path === '/letter-of-submission' || path.startsWith('/letter-of-submission/')) {
      return [
        'Director',
        'Department Head',
        'Project Head',
        'Project Manager',
        'HR Manager',
        'Engineering Head',
        'Engineer',
        'Procurement Manager',
        'Purchase',
        'Store Manager',
        'Stores Logistics Head',
        'Accounts',
        'RMA Manager',
        'OM Operator',
      ].includes(currentRole);
    }

    // ── Backend RBAC truth (Phase 5) ──
    // When the permission context is loaded and has valid data, delegate to it.
    if (isPermissionLoaded && permissions) {
      return canAccessRoute(path);
    }

    // ── Fallback: hardcoded role-based map ──
    // Used when backend permissions haven't loaded yet or failed to load.

    // ERP-level settings: restricted to SETTINGS_ROLES
    if (path === '/settings' || path.startsWith('/settings/')) {
      return SETTINGS_ROLES.includes(currentRole);
    }

    // Pre-sales settings: restricted to SETTINGS_ROLES (prevent Presales Exec access)
    if (path.startsWith('/pre-sales/settings')) {
      return SETTINGS_ROLES.includes(currentRole);
    }

    const allowedPaths = roleAccess[currentRole] ?? [];

    return allowedPaths.some(allowedPath => {
      return path === allowedPath || path.startsWith(allowedPath + '/');
    });
  };

  return (
    <RoleContext.Provider value={{ currentRole, hasAccess, isPermissionLoaded }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
