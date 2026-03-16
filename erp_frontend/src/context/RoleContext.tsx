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

// Role-based access configuration for sidebar navigation
export const roleAccess: Record<Role, string[]> = {
  'Director': [
    '/',
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
  ],
  'Department Head': [
    '/',
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
    '/rma',
  ],
  'Project Head': [
    '/',
    '/hr',
    '/milestones',
    '/manpower',
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
  ],
  'Engineer': [
    '/',
    '/survey',
    '/engineering',
    '/execution',
    '/documents',
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
  ],
  'Project Manager': [
    '/',
    '/milestones',
    '/manpower',
    '/pre-sales',
    '/survey',
    '/engineering',
    '/procurement',
    '/inventory',
    '/execution',
    '/om-helpdesk',
    '/finance',
    '/reports',
    '/documents',
  ],
  'Accounts': [
    '/',
    '/pre-sales',
    '/procurement',
    '/finance',
    '/reports',
    '/documents',
  ],
  'Field Technician': [
    '/',
    '/survey',
    '/inventory',
    '/execution',
    '/om-helpdesk',
    '/documents',
    '/rma',
  ],
  'RMA Manager': [
    '/',
    '/sla',
    '/rma',
    '/om-helpdesk',
    '/documents',
    '/reports',
  ],
  'OM Operator': [
    '/',
    '/sla',
    '/inventory',
    '/om-helpdesk',
    '/rma',
    '/reports',
    '/documents',
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
  const settingsAllowedRoles: Role[] = ['Director', 'Department Head', 'Project Head', 'Project Manager'];

  const hasAccess = (path: string): boolean => {
    if (path === '/pre-sales/settings' || path.startsWith('/pre-sales/settings/')) {
      return settingsAllowedRoles.includes(currentRole);
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
