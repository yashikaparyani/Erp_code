'use client';
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────

interface CapabilityGrant {
  scope: string;
  mode: string;
}

export interface FrontendPermissions {
  user: string;
  is_superuser: boolean;
  accessible_modules: string[];
  accessible_routes: string[];
  gated_route_prefixes: string[];
  visible_tabs: string[];
  capabilities: Record<string, CapabilityGrant>;
  can_access_settings: boolean;
  user_context: {
    department: string;
    assigned_projects: string[];
    assigned_sites: string[];
  };
}

interface PermissionContextType {
  permissions: FrontendPermissions | null;
  isLoaded: boolean;
  /** Check if the user has a specific capability key. */
  hasCapability: (capabilityKey: string) => boolean;
  /** Check if the user has a capability at a required mode level or above. */
  hasCapabilityWithMode: (capabilityKey: string, requiredMode: string) => boolean;
  /** Check if the user can access a frontend route path. */
  canAccessRoute: (path: string) => boolean;
  /** Force-refresh permissions from the backend. */
  refreshPermissions: () => Promise<void>;
}

const MODE_HIERARCHY: Record<string, number> = {
  override: 3,
  approve: 2,
  action: 1,
  read: 0,
};

// ── Context ────────────────────────────────────────────────────────────────

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, currentUser } = useAuth();
  const [permissions, setPermissions] = useState<FrontendPermissions | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchPermissions = useCallback(async () => {
    try {
      const response = await fetch('/api/rbac/frontend-permissions', {
        method: 'GET',
        cache: 'no-store',
      });
      if (!response.ok) {
        setPermissions(null);
        return;
      }
      const payload = await response.json();
      if (payload.success && payload.data) {
        setPermissions(payload.data);
      } else {
        setPermissions(null);
      }
    } catch {
      setPermissions(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Fetch when user authenticates, clear when they log out
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      void fetchPermissions();
    } else {
      setPermissions(null);
      setIsLoaded(false);
    }
  }, [isAuthenticated, currentUser, currentUser?.username, fetchPermissions]);

  const hasCapability = useCallback(
    (capabilityKey: string): boolean => {
      if (!permissions) return false;
      if (permissions.is_superuser) return true;
      return capabilityKey in permissions.capabilities;
    },
    [permissions],
  );

  const hasCapabilityWithMode = useCallback(
    (capabilityKey: string, requiredMode: string): boolean => {
      if (!permissions) return false;
      if (permissions.is_superuser) return true;
      const grant = permissions.capabilities[capabilityKey];
      if (!grant) return false;
      return (MODE_HIERARCHY[grant.mode] ?? 0) >= (MODE_HIERARCHY[requiredMode] ?? 0);
    },
    [permissions],
  );

  const canAccessRoute = useCallback(
    (path: string): boolean => {
      // Fail-closed: if permissions haven't loaded yet, deny access.
      // The UI should show a loading state; never grant access by default.
      if (!permissions) return false;

      // Superusers can access everything
      if (permissions.is_superuser) return true;

      // Public routes are always accessible
      const PUBLIC_ROUTES = ['/login', '/profile', '/notifications'];
      if (PUBLIC_ROUTES.some((r) => path === r || path.startsWith(r + '/'))) return true;

      // Check if this path is governed by any module-gated prefix
      const isGated = permissions.gated_route_prefixes.some(
        (prefix) => path === prefix || path.startsWith(prefix + '/'),
      );

      if (!isGated) {
        // Ungated route — allowed for all authenticated users
        return true;
      }

      // Gated route — check if user has access
      return permissions.accessible_routes.some(
        (prefix) => path === prefix || path.startsWith(prefix + '/'),
      );
    },
    [permissions],
  );

  const refreshPermissions = useCallback(async () => {
    setIsLoaded(false);
    await fetchPermissions();
  }, [fetchPermissions]);

  return (
    <PermissionContext.Provider
      value={{ permissions, isLoaded, hasCapability, hasCapabilityWithMode, canAccessRoute, refreshPermissions }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}
