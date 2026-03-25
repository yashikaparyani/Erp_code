'use client';
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────

interface DepartmentAccess {
  can_view: boolean;
  can_act: boolean;
}

export interface WorkspacePermissions {
  // Project Command Pack
  can_access_workspace: boolean;
  can_view_summary: boolean;
  can_view_sites: boolean;
  can_update_site: boolean;
  can_view_board: boolean;
  can_view_milestones: boolean;
  can_manage_milestones: boolean;
  can_manage_members: boolean;
  can_view_activity: boolean;

  // Stage lifecycle
  can_submit_stage: boolean;
  can_approve_stage: boolean;
  can_reject_stage: boolean;
  can_override_stage: boolean;
  can_override_dependency: boolean;

  // Approval Pack
  can_approve: boolean;
  can_reject: boolean;
  can_override_approval: boolean;
  can_revise: boolean;

  // DMS Pack
  can_view_files: boolean;
  can_upload_files: boolean;
  can_replace_files: boolean;
  can_delete_files: boolean;

  // Inventory Pack
  can_view_inventory: boolean;
  can_view_stock: boolean;
  can_create_grn: boolean;
  can_view_dispatch: boolean;

  // Department lenses
  department_access: Record<string, DepartmentAccess>;

  // Visible tabs
  visible_tabs: string[];
}

interface WorkspacePermissionContextType {
  /** Current project name this context is loaded for. */
  projectName: string | null;
  /** Resolved workspace permissions (null while loading). */
  wp: WorkspacePermissions | null;
  /** Whether permissions have finished loading. */
  isLoaded: boolean;
  /** Load workspace permissions for a project. */
  loadForProject: (projectName: string) => Promise<void>;
  /** Check if a department lens is viewable. */
  canViewDepartment: (deptKey: string) => boolean;
  /** Check if user can act (write) within a department lens. */
  canActInDepartment: (deptKey: string) => boolean;
}

// ── Context ────────────────────────────────────────────────────────────────

const WorkspacePermissionContext = createContext<WorkspacePermissionContextType | undefined>(undefined);

export function WorkspacePermissionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [wp, setWp] = useState<WorkspacePermissions | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadForProject = useCallback(async (project: string) => {
    if (!isAuthenticated) return;
    setProjectName(project);
    setIsLoaded(false);
    try {
      const response = await fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'get_workspace_permissions',
          args: { project },
        }),
      });
      if (!response.ok) { setWp(null); return; }
      const payload = await response.json();
      const data = payload.data ?? payload.message ?? payload;
      if (data && typeof data === 'object' && 'can_access_workspace' in data) {
        setWp(data as WorkspacePermissions);
      } else {
        setWp(null);
      }
    } catch {
      setWp(null);
    } finally {
      setIsLoaded(true);
    }
  }, [isAuthenticated]);

  // Clear when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setWp(null);
      setProjectName(null);
      setIsLoaded(false);
    }
  }, [isAuthenticated]);

  const canViewDepartment = useCallback(
    (deptKey: string): boolean => {
      if (!wp) return false;
      const da = wp.department_access[deptKey];
      return da?.can_view ?? false;
    },
    [wp],
  );

  const canActInDepartment = useCallback(
    (deptKey: string): boolean => {
      if (!wp) return false;
      const da = wp.department_access[deptKey];
      return da?.can_act ?? false;
    },
    [wp],
  );

  return (
    <WorkspacePermissionContext.Provider
      value={{ projectName, wp, isLoaded, loadForProject, canViewDepartment, canActInDepartment }}
    >
      {children}
    </WorkspacePermissionContext.Provider>
  );
}

export function useWorkspacePermissions() {
  const context = useContext(WorkspacePermissionContext);
  if (context === undefined) {
    throw new Error('useWorkspacePermissions must be used within a WorkspacePermissionProvider');
  }
  return context;
}
