'use client';
import { usePathname } from 'next/navigation';
import { useRole, PROJECT_SIDE_ROLES } from '../context/RoleContext';
import { usePermissions } from '../context/PermissionContext';
import { ShieldAlert } from 'lucide-react';

const PUBLIC_PATHS = ['/', '/login', '/profile'];

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentRole, hasAccess, isPermissionLoaded } = useRole();
  const { permissions } = usePermissions();

  // Always allow public paths
  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  // /projects is further restricted to PROJECT_SIDE_ROLES (hardcoded gate)
  // When backend permissions are loaded, hasAccess already handles this via
  // the "project" module capability. The fallback gate covers the case where
  // backend permissions haven't loaded yet.
  if (!isPermissionLoaded || !permissions) {
    if (pathname === '/projects' || pathname.startsWith('/projects/')) {
      if (!PROJECT_SIDE_ROLES.includes(currentRole)) {
        return <AccessDenied role={currentRole} path={pathname} />;
      }
    }
  }

  // Check role-based route access (delegates to backend RBAC when loaded)
  if (!hasAccess(pathname)) {
    return <AccessDenied role={currentRole} path={pathname} />;
  }

  return <>{children}</>;
}

function AccessDenied({ role, path }: { role: string; path: string }) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-20">
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm px-8 py-10 max-w-md w-full text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Access Denied</h2>
        <p className="text-sm text-gray-500 mb-4">
          Your role <span className="font-medium text-gray-700">{role}</span> does not have access to this page.
        </p>
        <p className="text-xs text-gray-400 font-mono">{path}</p>
        <a
          href="/"
          className="mt-6 inline-block px-5 py-2 bg-[#1e6b87] text-white text-sm font-medium rounded-lg hover:bg-[#185a72] transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
