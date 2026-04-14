import Link from 'next/link';
import {
  Blocks,
  Building2,
  ClipboardList,
  Database,
  FileSearch,
  GitBranch,
  Shield,
  Users,
  UserSquare2,
  Wrench,
} from 'lucide-react';

const SETTINGS_SECTIONS = [
  {
    title: 'Access Control',
    description: 'Backend-backed RBAC composition, user context, and permission visibility.',
    items: [
      { href: '/settings/roles', label: 'Roles', icon: Shield, hint: 'Role pack composition and scope mapping' },
      { href: '/settings/user-management', label: 'User Management', icon: Users, hint: 'Effective permissions and user context' },
      { href: '/settings/permissions', label: 'Permission Packs', icon: Blocks, hint: 'Capability packs exposed from RBAC' },
      { href: '/settings/audit-log', label: 'Audit Log', icon: FileSearch, hint: 'Permission snapshots and change history' },
    ],
  },
  {
    title: 'Org Masters',
    description: 'Administrative master data used across the product.',
    items: [
      { href: '/settings/department', label: 'Departments', icon: Building2, hint: 'Department register and status control' },
      { href: '/settings/designation', label: 'Designations', icon: UserSquare2, hint: 'Designation master data' },
      { href: '/settings/checklist', label: 'Checklist Templates', icon: ClipboardList, hint: 'Tender and readiness checklist templates' },
      { href: '/settings/stage-visibility', label: 'Stage Visibility Preview', icon: GitBranch, hint: 'RBAC-derived lifecycle visibility preview' },
    ],
  },
  {
    title: 'System Ops',
    description: 'Restricted backend-connected tools for system jobs and import operations.',
    items: [
      { href: '/settings/operations', label: 'Operations Console', icon: Wrench, hint: 'Reminder generation and processing jobs' },
      { href: '/settings/anda-import', label: 'ANDA Import', icon: Database, hint: 'Master integrity and import orchestration' },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-6">
        <div className="max-w-3xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600">Settings Workspace</div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Govern access, masters, and admin operations from one place</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This settings hub is wired to the same backend control surfaces the app now uses for roles, departments, designations,
            permission packs, audit history, reminder jobs, and ANDA imports.
          </p>
        </div>
      </div>

      {SETTINGS_SECTIONS.map((section) => (
        <section key={section.title} className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{section.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{section.description}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 transition group-hover:bg-indigo-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{item.hint}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
