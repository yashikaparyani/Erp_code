/**
 * Smoke Tests: Route-Role Access Matrix
 *
 * Validates that every role has access to its critical pages,
 * and no role is accidentally locked out of universal pages.
 *
 * Run: npx vitest run src/__tests__/smoke-routes.test.ts
 */

import { describe, test, expect } from 'vitest';
import { roles, roleAccess, PROJECT_SIDE_ROLES, SETTINGS_ROLES } from '../context/RoleContext';

// Universal pages every authenticated role should access
const UNIVERSAL_ROUTES = ['/', '/notifications'];

// Role → pages that MUST be accessible
const ROLE_CRITICAL_ROUTES: Record<string, string[]> = {
  'Director': ['/projects', '/settings', '/hr', '/pre-sales', '/engineering', '/procurement', '/execution', '/finance', '/reports', '/accountability', '/om-helpdesk', '/rma', '/documents', '/master-data'],
  'Department Head': ['/settings', '/hr', '/pre-sales', '/engineering', '/procurement', '/inventory', '/execution', '/finance', '/reports', '/accountability', '/documents', '/master-data'],
  'Project Head': ['/projects', '/engineering', '/procurement', '/execution', '/finance', '/reports', '/accountability', '/documents', '/master-data'],
  'HR Manager': ['/hr', '/reports', '/documents'],
  'Presales Tendering Head': ['/pre-sales', '/survey', '/reports', '/documents'],
  'Presales Executive': ['/pre-sales', '/survey', '/documents'],
  'Engineering Head': ['/engineering', '/execution', '/documents', '/reports'],
  'Engineer': ['/engineering', '/execution', '/documents'],
  'Procurement Manager': ['/procurement', '/purchase-orders', '/indents', '/grns', '/inventory', '/reports', '/documents'],
  'Purchase': ['/procurement', '/purchase-orders', '/indents', '/grns', '/inventory', '/documents'],
  'Store Manager': ['/grns', '/stock-position', '/stock-aging', '/procurement', '/inventory', '/documents', '/purchase-orders'],
  'Stores Logistics Head': ['/grns', '/stock-position', '/stock-aging', '/procurement', '/inventory', '/documents', '/purchase-orders'],
  'Project Manager': ['/survey', '/project-manager/dpr', '/project-manager/inventory', '/project-manager/petty-cash'],
  'Accounts': ['/finance', '/finance/payment-receipts', '/finance/retention', '/finance/penalties', '/reports', '/documents'],
  'Field Technician': ['/execution', '/manpower', '/om-helpdesk', '/rma', '/documents', '/sla'],
  'RMA Manager': ['/rma', '/om-helpdesk', '/sla', '/documents', '/reports'],
  'OM Operator': ['/om-helpdesk', '/rma', '/sla', '/documents', '/reports'],
};

// Routes that should be denied for specific roles
const ROLE_DENIED_ROUTES: Record<string, string[]> = {
  'HR Manager': ['/projects', '/settings', '/procurement', '/execution', '/engineering', '/master-data'],
  'Presales Executive': ['/projects', '/procurement', '/hr', '/execution', '/finance', '/reports', '/master-data'],
  'Field Technician': ['/projects', '/settings', '/hr', '/finance', '/procurement', '/survey', '/reports', '/master-data'],
  'Store Manager': ['/projects', '/settings', '/hr', '/finance', '/pre-sales', '/reports', '/master-data'],
  'Purchase': ['/reports', '/master-data'],
  'Stores Logistics Head': ['/reports', '/master-data'],
  'Engineer': ['/reports', '/master-data'],
  'Project Manager': ['/projects', '/procurement', '/inventory', '/grns', '/petty-cash', '/documents', '/reports', '/execution', '/engineering', '/milestones', '/manpower', '/purchase-orders', '/indents', '/stock-position', '/stock-aging', '/drawings', '/change-requests', '/technician-visits'],
};

describe('Role Access Matrix', () => {
  test('all roles are defined in roleAccess', () => {
    for (const role of roles) {
      expect(roleAccess[role]).toBeDefined();
      expect(Array.isArray(roleAccess[role])).toBe(true);
      expect(roleAccess[role].length).toBeGreaterThan(0);
    }
  });

  test('every role has access to universal routes', () => {
    for (const role of roles) {
      for (const route of UNIVERSAL_ROUTES) {
        expect(roleAccess[role]).toContain(route);
      }
    }
  });

  test('each role has access to its critical routes', () => {
    for (const [role, criticalRoutes] of Object.entries(ROLE_CRITICAL_ROUTES)) {
      for (const route of criticalRoutes) {
        const hasAccess = roleAccess[role as keyof typeof roleAccess]?.includes(route) ||
          roleAccess[role as keyof typeof roleAccess]?.some(r => route.startsWith(r + '/'));
        expect(hasAccess).toBe(true);
      }
    }
  });

  test('restricted roles are denied access to protected routes', () => {
    for (const [role, deniedRoutes] of Object.entries(ROLE_DENIED_ROUTES)) {
      for (const route of deniedRoutes) {
        expect(roleAccess[role as keyof typeof roleAccess]).not.toContain(route);
      }
    }
  });

  test('only PROJECT_SIDE_ROLES have /projects access', () => {
    for (const role of roles) {
      const hasProjectsAccess = roleAccess[role]?.includes('/projects');
      if (PROJECT_SIDE_ROLES.includes(role)) {
        expect(hasProjectsAccess).toBe(true);
      } else {
        expect(hasProjectsAccess).toBeFalsy();
      }
    }
  });

  test('only SETTINGS_ROLES have /settings access', () => {
    for (const role of roles) {
      const hasSettingsAccess = roleAccess[role]?.includes('/settings');
      if (SETTINGS_ROLES.includes(role)) {
        expect(hasSettingsAccess).toBe(true);
      } else {
        expect(hasSettingsAccess).toBeFalsy();
      }
    }
  });

  test('only intended roles have /master-data access', () => {
    const masterDataRoles = new Set(['Director', 'Department Head', 'Project Head']);

    for (const role of roles) {
      const hasMasterDataAccess = roleAccess[role]?.includes('/master-data');
      if (masterDataRoles.has(role)) {
        expect(hasMasterDataAccess).toBe(true);
      } else {
        expect(hasMasterDataAccess).toBeFalsy();
      }
    }
  });

  test('no route appears as empty string', () => {
    for (const role of roles) {
      for (const route of roleAccess[role]) {
        expect(route.length).toBeGreaterThan(0);
        expect(route.startsWith('/')).toBe(true);
      }
    }
  });

  test('no duplicate routes in any role', () => {
    for (const role of roles) {
      const routes = roleAccess[role];
      const unique = new Set(routes);
      expect(unique.size).toBe(routes.length);
    }
  });
});

describe('Dashboard Coverage', () => {
  // Map roles to their expected dashboard switch cases
  const DASHBOARD_ROLES = [
    'Project Head', 'Project Manager', 'Presales Tendering Head',
    'Engineering Head', 'Engineer', 'Procurement Manager', 'Purchase',
    'Store Manager', 'Stores Logistics Head', 'Field Technician', 'Accounts',
    'HR Manager', 'OM Operator', 'RMA Manager',
  ];

  test('every role falls into a dashboard case', () => {
    // Roles NOT in DASHBOARD_ROLES get the default ExecutiveDashboard
    // This is acceptable for: Director, Department Head, Presales Executive
    const defaultRoles = roles.filter(r => !DASHBOARD_ROLES.includes(r));
    expect(defaultRoles.length).toBeGreaterThan(0); // at least one falls to default
    expect(defaultRoles.length).toBeLessThanOrEqual(5); // not too many
  });
});

describe('Page File Coverage', () => {
  test('all top-level roleAccess routes correspond to known page paths', () => {
    // Collect all unique routes from all roles
    const allRoutes = new Set<string>();
    for (const role of roles) {
      for (const route of roleAccess[role]) {
        allRoutes.add(route);
      }
    }

    // These are the known page directories (from workspace structure)
    const KNOWN_PAGES = new Set([
      '/', '/notifications', '/projects', '/settings', '/hr', '/pre-sales',
      '/survey', '/engineering', '/procurement', '/execution', '/finance',
      '/reports', '/documents', '/master-data', '/om-helpdesk', '/rma',
      '/sla', '/inventory', '/purchase-orders', '/grns', '/indents',
      '/stock-position', '/stock-aging', '/milestones', '/manpower',
      '/petty-cash', '/comm-logs', '/payment-receipts', '/retention',
      '/penalties', '/drawings', '/change-requests', '/technician-visits',
      '/finance/payment-receipts', '/finance/retention', '/finance/penalties',
      '/engineering/drawings', '/engineering/change-requests', '/hr/technician-visits',
      '/project-manager/dpr', '/project-manager/inventory', '/project-manager/petty-cash',
      '/project-manager/requests',
      '/sla-profiles', '/device-uptime', '/accountability', '/login', '/profile',
      '/project-head', '/vendor-comparisons', '/dispatch-challans', '/sla-penalties',
      '/settings/operations', '/settings/anda-import', '/letter-of-submission',
    ]);

    for (const route of allRoutes) {
      expect(KNOWN_PAGES.has(route)).toBe(true);
    }
  });
});
