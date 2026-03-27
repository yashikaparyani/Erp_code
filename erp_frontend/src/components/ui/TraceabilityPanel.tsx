'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, ShieldCheck, MapPinned } from 'lucide-react';

type Props = {
  projectId?: string | null;
  siteId?: string | null;
  projectLabel?: string | null;
  siteLabel?: string | null;
};

type Shortcut = {
  href: string;
  title: string;
  detail: string;
  tone: string;
  icon: 'project_dossier' | 'site_dossier' | 'accountability';
};

function ShortcutIcon({ icon }: { icon: Shortcut['icon'] }) {
  if (icon === 'accountability') {
    return <ShieldCheck className="h-4 w-4" />;
  }
  if (icon === 'site_dossier') {
    return <MapPinned className="h-4 w-4" />;
  }
  return <BookOpen className="h-4 w-4" />;
}

export default function TraceabilityPanel({
  projectId,
  siteId,
  projectLabel,
  siteLabel,
}: Props) {
  const shortcuts: Shortcut[] = [];

  if (projectId) {
    shortcuts.push({
      href: `/projects/${encodeURIComponent(projectId)}/dossier`,
      title: 'Project Dossier',
      detail: projectLabel || projectId,
      tone: 'border-blue-200 bg-blue-50/70 text-blue-700',
      icon: 'project_dossier',
    });
    shortcuts.push({
      href: `/projects/${encodeURIComponent(projectId)}/accountability`,
      title: 'Project Accountability',
      detail: `RCA and ownership drilldown for ${projectLabel || projectId}`,
      tone: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
      icon: 'accountability',
    });
  }

  if (siteId) {
    shortcuts.push({
      href: `/sites/${encodeURIComponent(siteId)}/dossier`,
      title: 'Site Dossier',
      detail: siteLabel || siteId,
      tone: 'border-amber-200 bg-amber-50/70 text-amber-700',
      icon: 'site_dossier',
    });
  }

  if (shortcuts.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-800">Traceability Shortcuts</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Open the dossier and accountability surfaces tied to this record&apos;s lifecycle parent.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map((shortcut) => (
          <Link
            key={`${shortcut.title}-${shortcut.href}`}
            href={shortcut.href}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 transition hover:shadow-sm ${shortcut.tone}`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShortcutIcon icon={shortcut.icon} />
                <span>{shortcut.title}</span>
              </div>
              <p className="mt-1 truncate text-xs opacity-90">{shortcut.detail}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 opacity-70" />
          </Link>
        ))}
      </div>
    </div>
  );
}
