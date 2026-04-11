'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';

type CompetitorRow = {
  name: string;
  company_name: string;
  organization?: string;
  win_count?: number;
  loss_count?: number;
  win_rate?: number;
  typical_bid_range_min?: number;
  typical_bid_range_max?: number;
  creation?: string;
  modified?: string;
};

type CompetitorStats = { total?: number; avg_win_rate?: number };
type ModalMode = 'create' | 'edit' | null;

const fmt = (v?: number) => (v != null ? v.toLocaleString() : '-');

export default function CompetitorsPage() {
  const [rows, setRows] = useState<CompetitorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<CompetitorRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompetitorRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/competitors');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to load');
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load competitors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.company_name, r.organization].filter(Boolean).some(v => String(v).toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const stats = useMemo(() => {
    const total = rows.length;
    const avgWin = total ? (rows.reduce((s, r) => s + (r.win_rate || 0), 0) / total) : 0;
    return [
      { label: 'Total Competitors', value: String(total) },
      { label: 'Avg Win Rate', value: avgWin ? `${avgWin.toFixed(1)}%` : '-' },
    ];
  }, [rows]);

  const openCreate = () => { setEditing(null); setModalMode('create'); };
  const openEdit = (row: CompetitorRow) => { setEditing(row); setModalMode('edit'); };

  const saveCompetitor = async (values: Record<string, string>) => {
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        company_name: values.company_name,
        organization: values.organization || undefined,
        win_count: Number(values.win_count) || 0,
        loss_count: Number(values.loss_count) || 0,
        typical_bid_range_min: Number(values.typical_bid_range_min) || undefined,
        typical_bid_range_max: Number(values.typical_bid_range_max) || undefined,
      };
      if (modalMode === 'edit' && editing) {
        const res = await fetch(`/api/competitors/${encodeURIComponent(editing.name)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || json.success === false) throw new Error(json.message || 'Failed');
      } else {
        const res = await fetch('/api/competitors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || json.success === false) throw new Error(json.message || 'Failed');
      }
      setModalMode(null);
      setEditing(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteCompetitor = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/competitors/${encodeURIComponent(deleteTarget.name)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed');
      setDeleteTarget(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <RegisterPage
        title="Competitors"
        description="Track competing organizations across tenders — win/loss record, typical bid ranges, and linked organizations."
        loading={loading}
        error={error}
        empty={!loading && filtered.length === 0}
        emptyTitle="No competitors"
        emptyDescription={query ? 'No competitors match this search.' : 'Add your first competitor to start tracking the competitive landscape.'}
        onRetry={load}
        stats={stats}
        headerActions={(
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            New Competitor
          </button>
        )}
        filterBar={(
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search company, org…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input pl-9"
            />
          </div>
        )}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map(row => (
            <div key={row.name} className="card">
              <div className="card-body space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-main)]">{row.company_name}</div>
                    {row.organization && (
                      <div className="mt-0.5 text-xs text-[var(--text-muted)]">{row.organization}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(row)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-700" title="Edit">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(row)} className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-[var(--text-muted)] sm:grid-cols-4">
                  <div>
                    <div className="font-semibold uppercase tracking-[0.18em]">Wins</div>
                    <div className="mt-1 text-[var(--text-main)]">{fmt(row.win_count)}</div>
                  </div>
                  <div>
                    <div className="font-semibold uppercase tracking-[0.18em]">Losses</div>
                    <div className="mt-1 text-[var(--text-main)]">{fmt(row.loss_count)}</div>
                  </div>
                  <div>
                    <div className="font-semibold uppercase tracking-[0.18em]">Win Rate</div>
                    <div className="mt-1 text-[var(--text-main)]">{row.win_rate != null ? `${row.win_rate}%` : '-'}</div>
                  </div>
                  <div>
                    <div className="font-semibold uppercase tracking-[0.18em]">Bid Range</div>
                    <div className="mt-1 text-[var(--text-main)]">
                      {row.typical_bid_range_min || row.typical_bid_range_max
                        ? `${fmt(row.typical_bid_range_min)} – ${fmt(row.typical_bid_range_max)}`
                        : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </RegisterPage>

      <FormModal
        open={modalMode !== null}
        title={modalMode === 'edit' ? 'Edit Competitor' : 'Add Competitor'}
        description="Track competitive landscape for tenders."
        size="lg"
        busy={saving}
        confirmLabel={modalMode === 'edit' ? 'Save Changes' : 'Create'}
        fields={[
          { name: 'company_name', label: 'Company Name', type: 'text', required: true, defaultValue: editing?.company_name || '' },
          { name: 'organization', label: 'Organization', type: 'text', defaultValue: editing?.organization || '' },
          { name: 'win_count', label: 'Win Count', type: 'text', defaultValue: String(editing?.win_count ?? '') },
          { name: 'loss_count', label: 'Loss Count', type: 'text', defaultValue: String(editing?.loss_count ?? '') },
          { name: 'typical_bid_range_min', label: 'Typical Bid Range (Min)', type: 'text', defaultValue: String(editing?.typical_bid_range_min ?? '') },
          { name: 'typical_bid_range_max', label: 'Typical Bid Range (Max)', type: 'text', defaultValue: String(editing?.typical_bid_range_max ?? '') },
        ]}
        onConfirm={saveCompetitor}
        onCancel={() => { setModalMode(null); setEditing(null); }}
      />

      <ActionModal
        open={!!deleteTarget}
        title="Delete Competitor"
        description={`Delete competitor "${deleteTarget?.company_name || ''}"? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        busy={deleteBusy}
        onConfirm={deleteCompetitor}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
