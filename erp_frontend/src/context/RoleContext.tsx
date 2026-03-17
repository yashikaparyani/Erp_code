'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';

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
  'Project Manager',
];

// Settings-capable roles
export const SETTINGS_ROLES: Role[] = [
  'Director',
  'Department Head',
  'Project Head',
  'Project Manager',
];

// Role-based access configuration for sidebar navigation
// NOTE: /projects is NOT listed here for department roles — it is gated
// separately via PROJECT_SIDE_ROLES in shouldShowNavLinkForRole.
export const roleAccess: Record<Role, string[]> = {
  'Director': [
    '/',
    '/projects',
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
    '/inventory',
    '/execution',
    '/om-helpdesk',
    '/rma',
    '/finance',
    '/reports',
    '/documents',
    '/master-data',
    '/comm-logs',
    '/payment-receipts',
    '/retention',
    '/penalties',
    '/drawings',
    '/change-requests',
    '/technician-visits',
    '/sla-profiles',
    '/device-uptime',
  ],
  'Department Head': [
    '/',
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
    '/inventory',
    '/execution',
    '/om-helpdesk',
    '/rma',
    '/finance',
    '/reports',
    '/documents',
    '/comm-logs',
    '/payment-receipts',
    '/retention',
    '/penalties',
    '/drawings',
    '/change-requests',
    '/technician-visits',
    '/sla-profiles',
    '/device-uptime',
  ],
  'Project Head': [
    '/',
    '/projects',
    '/settings',
    '/hr',
    '/milestones',
    '/manpower',
    '/survey',
    '/engineering',
    '/procurement',
    '/inventory',
    '/execution',
    '/om-helpdesk',
    '/rma',
    '/finance',
    '/reports',
    '/documents',
    '/purchase-orders',
    '/grns',
    '/indents',
    '/stock-position',
    '/stock-aging',
    '/comm-logs',
    '/petty-cash',
    '/payment-receipts',
    '/retention',
    '/penalties',
    '/drawings',
    '/change-requests',
    '/technician-visits',
    '/sla-profiles',
    '/device-uptime',
  ],
  'HR Manager': [
    '/',
    '/hr',
    '/reports',
    '/documents',
  ],
  'Presales Tendering Head': [
    '/',
    '/pre-sales',
    '/survey',
    '/finance',
    '/reports',
    '/documents',
  ],
  'Presales Executive': [
    '/',
    '/pre-sales',
    '/survey',
    '/documents',
  ],
  'Engineering Head': [
    '/',
    '/milestones',
    '/manpower',
    '/survey',
    '/engineering',
    '/procurement',
    '/inventory',
    '/execution',
    '/reports',
    '/documents',
    '/purchase-orders',
    '/grns',
    '/indents',
    '/stock-position',
    '/stock-aging',
    '/comm-logs',
    '/drawings',
    '/change-requests',
  ],
  'Engineer': [
    '/',
    '/survey',
    '/engineering',
    '/execution',
    '/documents',
    '/milestones',
    '/manpower',
    '/comm-logs',
    '/drawings',
    '/change-requests',
  ],
  'Procurement Manager': [
    '/',
    '/purchase-orders',
    '/indents',
    '/petty-cash',
    '/procurement',
    '/inventory',
    '/finance',
    '/reports',
    '/documents',
    '/grns',
    '/stock-position',
    '/stock-aging',
    '/payment-receipts',
    '/retention',
    '/penalties',
  ],
  'Purchase': [
    '/',
    '/purchase-orders',
    '/indents',
    '/petty-cash',
    '/procurement',
    '/inventory',
    '/finance',
    '/reports',
    '/documents',
    '/grns',
    '/stock-position',
    '/stock-aging',
  ],
  'Store Manager': [
    '/',
    '/grns',
    '/stock-position',
    '/stock-aging',
    '/procurement',
    '/inventory',
    '/execution',
    '/documents',
    '/indents',
  ],
  'Stores Logistics Head': [
    '/',
    '/grns',
    '/stock-position',
    '/stock-aging',
    '/procurement',
    '/inventory',
    '/execution',
    '/reports',
    '/documents',
    '/indents',
  ],
  'Project Manager': [
    '/',
    '/projects',
    '/settings',
    '/milestones',
    '/manpower',
    '/survey',
    '/engineering',
    '/procurement',
    '/inventory',
    '/execution',
    '/om-helpdesk',
    '/finance',
    '/reports',
    '/documents',
    '/purchase-orders',
    '/grns',
    '/indents',
    '/stock-position',
    '/stock-aging',
    '/comm-logs',
    '/petty-cash',
    '/payment-receipts',
    '/retention',
    '/penalties',
    '/drawings',
    '/change-requests',
    '/technician-visits',
    '/sla-profiles',
    '/device-uptime',
  ],
  'Accounts': [
    '/',
    '/procurement',
    '/finance',
    '/reports',
    '/documents',
    '/purchase-orders',
    '/grns',
    '/petty-cash',
    '/payment-receipts',
    '/retention',
    '/penalties',
  ],
  'Field Technician': [
    '/',
    '/survey',
    '/inventory',
    '/execution',
    '/om-helpdesk',
    '/documents',
    '/rma',
    '/stock-position',
    '/milestones',
    '/technician-visits',
    '/device-uptime',
  ],
  'RMA Manager': [
    '/',
    '/sla',
    '/rma',
    '/om-helpdesk',
    '/documents',
    '/reports',
    '/technician-visits',
    '/sla-profiles',
    '/device-uptime',
  ],
  'OM Operator': [
    '/',
    '/sla',
    '/inventory',
    '/om-helpdesk',
    '/rma',
    '/reports',
    '/documents',
    '/technician-visits',
    '/sla-profiles',
    '/device-uptime',
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
  currentRole: Role;
  hasAccess: (path: string) => boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const currentRole = (currentUser?.role as Role | undefined) ?? 'Project Manager';

  const hasAccess = (path: string): boolean => {
    // ERP-level settings: restricted to SETTINGS_ROLES
    if (path === '/settings' || path.startsWith('/settings/')) {
      return SETTINGS_ROLES.includes(currentRole);
    }

    // Legacy pre-sales settings: same gate
    if (path === '/pre-sales/settings' || path.startsWith('/pre-sales/settings/')) {
      return SETTINGS_ROLES.includes(currentRole);
    }

    const allowedPaths = roleAccess[currentRole] ?? roleAccess['Project Manager'];

    return allowedPaths.some(allowedPath => {
      return path === allowedPath || path.startsWith(allowedPath + '/');
    });
  };

  return (
    <RoleContext.Provider value={{ currentRole, hasAccess }}>
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
