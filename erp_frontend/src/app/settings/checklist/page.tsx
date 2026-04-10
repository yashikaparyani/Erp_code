'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';

type ChecklistRow = {
  name: string;
  checklist_name: string;
  checklist_type?: string;
  description?: string;
  status?: string;
  owner?: string;
  creation?: string;
  modified?: string;
};

type ModalMode = 'create' | 'edit' | null;

export default function CheckListPage() {
  const [rows, setRows] = useState<ChecklistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<ChecklistRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChecklistRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/tender-checklists');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Failed to load checklists');
      }
      setRows(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load checklists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      [row.checklist_name, row.checklist_type, row.owner, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, rows]);

  const stats = useMemo(() => ([
    { label: 'Total Templates', value: rows.length },
    { label: 'Active', value: rows.filter((row) => (row.status || '').toLowerCase() === 'active').length, variant: 'success' as const },
    { label: 'Compliance', value: rows.filter((row) => (row.checklist_type || '').toLowerCase() === 'compliance').length, variant: 'info' as const },
    { label: 'Filtered', value: filteredRows.length, variant: query ? 'warning' as const : undefined },
  ]), [filteredRows.length, query, rows]);

  const openCreate = () => {
    setEditing(null);
    setModalMode('create');
  };

  const openEdit = (row: ChecklistRow) => {
    setEditing(row);
    setModalMode('edit');
  };

  const saveChecklist = async (values: Record<string, string>) => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        checklist_name: (values.checklist_name || '').trim(),
        checklist_type: values.checklist_type || 'Compliance',
        description: (values.description || '').trim(),
        status: values.status || 'Active',
        items: editing?.name ? undefined : [],
      };
      const response = await fetch(
        editing?.name ? `/api/tender-checklists/${encodeURIComponent(editing.name)}` : '/api/tender-checklists',
        {
          method: editing?.name ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Failed to save checklist');
      }
      setModalMode(null);
      setEditing(null);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save checklist');
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  const deleteChecklist = async () => {
    if (!deleteTarget?.name) return;
    setDeleteBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/tender-checklists/${encodeURIComponent(deleteTarget.name)}`, {
        method: 'DELETE',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Failed to delete checklist');
      }
      setDeleteTarget(null);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete checklist');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <RegisterPage
        title="Checklist Templates"
        description="Govern tender and presales checklist templates with the same design language as the rest of the app."
        loading={loading}
        error={error}
        empty={!loading && filteredRows.length === 0}
        emptyTitle="No checklist templates"
        emptyDescription={query ? 'No templates match this search.' : 'Create the first checklist template to start governing presales readiness.'}
        onRetry={load}
        stats={stats}
        headerActions={(
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            New Checklist
          </button>
        )}
        filterBar={(
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search template, owner, type…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input pl-9"
            />
          </div>
        )}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredRows.map((row) => (
            <div key={row.name} className="card">
              <div className="card-body space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-main)]">{row.checklist_name}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="badge badge-info">{row.checklist_type || 'General'}</span>
                      <span className={`badge ${(row.status || '').toLowerCase() === 'active' ? 'badge-green' : 'badge-gray'}`}>
                        {row.status || 'Draft'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(row)}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-700"
                      title="Edit checklist"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(row)}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
                      title="Delete checklist"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm leading-6 text-[var(--text-muted)]">
                  {row.description || 'No description has been added yet. Use this template to structure tender readiness and submission checks.'}
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs text-[var(--text-muted)] sm:grid-cols-4">
                  <div>
                    <div className="font-semibold uppercase tracking-[0.18em]">Template</div>
                    <div className="mt-1 text-[var(--text-main)]">{row.name}</div>
                  </div>
                  <div>
                    <div className="font-semibold uppercase tracking-[0.18em]">Owner</div>
                    <div className="mt-1 text-[var(--text-main)]">{row.owner || 'System'}</div>
                  </div>
                  <div>
                    <div className="font-semibold uppercase tracking-[0.18em]">Created</div>
                    <div className="mt-1 text-[var(--text-main)]">{row.creation ? new Date(row.creation).toLocaleDateString('en-GB') : '-'}</div>
                  </div>
                  <div>
                    <div className="font-semibold uppercase tracking-[0.18em]">Updated</div>
                    <div className="mt-1 text-[var(--text-main)]">{row.modified ? new Date(row.modified).toLocaleDateString('en-GB') : '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </RegisterPage>

      <FormModal
        open={modalMode !== null}
        title={modalMode === 'edit' ? 'Edit Checklist Template' : 'Create Checklist Template'}
        description="Keep checklist metadata structured and professional so the settings module feels like the rest of the product."
        size="lg"
        busy={saving}
        confirmLabel={modalMode === 'edit' ? 'Save Changes' : 'Create Template'}
        fields={[
          { name: 'checklist_name', label: 'Checklist Name', type: 'text', required: true, defaultValue: editing?.checklist_name || '' },
          {
            name: 'checklist_type',
            label: 'Checklist Type',
            type: 'select',
            defaultValue: editing?.checklist_type || 'Compliance',
            options: [
              { value: 'Compliance', label: 'Compliance' },
              { value: 'Technical', label: 'Technical' },
              { value: 'Commercial', label: 'Commercial' },
              { value: 'Documentation', label: 'Documentation' },
            ],
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            defaultValue: editing?.status || 'Active',
            options: [
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
            ],
          },
          { name: 'description', label: 'Description', type: 'textarea', defaultValue: editing?.description || '', placeholder: 'Describe when this checklist should be used and what it governs.' },
        ]}
        onConfirm={saveChecklist}
        onCancel={() => {
          setModalMode(null);
          setEditing(null);
        }}
      />

      <ActionModal
        open={!!deleteTarget}
        title="Delete Checklist Template"
        description={`Delete checklist template ${deleteTarget?.checklist_name || ''}?`}
        variant="danger"
        confirmLabel="Delete"
        busy={deleteBusy}
        onConfirm={deleteChecklist}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
