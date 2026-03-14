'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type Role = 
  | 'Director'
  | 'Department Head'
  | 'HR Head'
  | 'Presales Tendering Head'
  | 'Engineering Head'
  | 'Engineer'
  | 'Purchase'
  | 'Stores Logistics Head'
  | 'Project Manager'
  | 'Accounts'
  | 'Field Technician'
  | 'OM Operator';

export const roles: Role[] = [
  'Director',
  'Department Head',
  'HR Head',
  'Presales Tendering Head',
  'Engineering Head',
  'Engineer',
  'Purchase',
  'Stores Logistics Head',
  'Project Manager',
  'Accounts',
  'Field Technician',
  'OM Operator',
];

// Role-based access configuration for sidebar navigation
export const roleAccess: Record<Role, string[]> = {
  'Director': [
    '/',
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
    '/master-data',
  ],
  'Department Head': [
    '/',
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
  'HR Head': [
    '/',
    '/reports',
    '/documents',
    '/master-data',
  ],
  'Presales Tendering Head': [
    '/',
    '/pre-sales',
    '/survey',
    '/finance',
    '/reports',
    '/documents',
  ],
  'Engineering Head': [
    '/',
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
  'Purchase': [
    '/',
    '/procurement',
    '/inventory',
    '/finance',
    '/reports',
    '/documents',
  ],
  'Stores Logistics Head': [
    '/',
    '/procurement',
    '/inventory',
    '/execution',
    '/reports',
    '/documents',
  ],
  'Project Manager': [
    '/',
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
  ],
  'OM Operator': [
    '/',
    '/inventory',
    '/om-helpdesk',
    '/reports',
    '/documents',
  ],
};

// Get role initials for avatar
export const getRoleInitials = (role: Role): string => {
  const initialsMap: Record<Role, string> = {
    'Director': 'DI',
    'Department Head': 'DH',
    'HR Head': 'HR',
    'Presales Tendering Head': 'PT',
    'Engineering Head': 'EH',
    'Engineer': 'EN',
    'Purchase': 'PU',
    'Stores Logistics Head': 'SL',
    'Project Manager': 'PM',
    'Accounts': 'AC',
    'Field Technician': 'FT',
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
  const currentRole: Role = currentUser?.role ?? 'Project Manager';
  const settingsAllowedRoles: Role[] = ['Director', 'Department Head', 'Project Manager'];

  const hasAccess = (path: string): boolean => {
    if (path === '/pre-sales/settings' || path.startsWith('/pre-sales/settings/')) {
      return settingsAllowedRoles.includes(currentRole);
    }

    return roleAccess[currentRole].some(allowedPath => {
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
