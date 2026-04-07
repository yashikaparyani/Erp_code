'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePermissions } from '@/context/PermissionContext';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SiteRow {
  name: string;
  site_name?: string;
}

// ── Hook: usePmContext ─────────────────────────────────────────────────────
// Every PM page needs: assignedProjects, selectedProject, sites.
// This hook centralises the project + site loading pattern.

export function usePmContext() {
  const { permissions } = usePermissions();
  const assignedProjects = useMemo(
    () => permissions?.user_context?.assigned_projects ?? [],
    [permissions?.user_context?.assigned_projects],
  );

  const [selectedProject, setSelectedProject] = useState('');
  const [sites, setSites] = useState<SiteRow[]>([]);

  // Auto-select first project
  useEffect(() => {
    if (!selectedProject && assignedProjects.length) {
      setSelectedProject(assignedProjects[0]);
    }
  }, [assignedProjects, selectedProject]);

  // Load sites when project changes
  useEffect(() => {
    let cancelled = false;
    if (!selectedProject) { setSites([]); return; }
    fetch(`/api/sites?project=${encodeURIComponent(selectedProject)}`)
      .then((r) => r.json())
      .then((p) => { if (!cancelled) setSites(Array.isArray(p.data) ? p.data : []); })
      .catch(() => { if (!cancelled) setSites([]); });
    return () => { cancelled = true; };
  }, [selectedProject]);

  return { assignedProjects, selectedProject, setSelectedProject, sites };
}

// ── callOps helper ─────────────────────────────────────────────────────────

export async function callOps<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Operation failed');
  }
  return (payload.data ?? payload) as T;
}

// ── Utilities ──────────────────────────────────────────────────────────────

export function formatCurrency(value?: number) {
  if (!value) return '₹ 0';
  return `₹ ${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatDate(v?: string) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function siteLabel(site: SiteRow) {
  return site.site_name ? `${site.site_name} (${site.name})` : site.name;
}
