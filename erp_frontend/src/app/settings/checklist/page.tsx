'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Edit2, Plus, Search, Trash2, X, GripVertical } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import ActionModal from '@/components/ui/ActionModal';

type ChecklistItem = {
  /** Populated when loaded from backend */
  name?: string;
  item_name: string;
  description?: string;
  is_mandatory: boolean;
};

type ChecklistRow = {
  name: string;
  checklist_name: string;
  checklist_type?: string;
  description?: string;
  status?: string;
  owner?: string;
  creation?: string;
  modified?: string;
  items?: ChecklistItem[];
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

  // ── form state ─────────────────────────────────────────────────────
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Compliance');
  const [formStatus, setFormStatus] = useState('Active');
  const [formDesc, setFormDesc] = useState('');
  const [formItems, setFormItems] = useState<ChecklistItem[]>([]);
  const formNameRef = useRef<HTMLInputElement>(null);

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

  // ── open modal ─────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormType('Compliance');
    setFormStatus('Active');
    setFormDesc('');
    setFormItems([]);
    setModalMode('create');
    setTimeout(() => formNameRef.current?.focus(), 50);
  };

  const openEdit = async (row: ChecklistRow) => {
    setEditing(row);
    setFormName(row.checklist_name || '');
    setFormType(row.checklist_type || 'Compliance');
    setFormStatus(row.status || 'Active');
    setFormDesc(row.description || '');
    setFormItems([]);
    setModalMode('edit');
    // Fetch full record with items
    try {
      const res = await fetch(`/api/tender-checklists/${encodeURIComponent(row.name)}`);
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.success !== false && payload.data?.items) {
        setFormItems(
          (payload.data.items as ChecklistItem[]).map((it) => ({
            name: it.name,
            item_name: it.item_name,
            description: it.description || '',
            is_mandatory: !!it.is_mandatory,
          })),
        );
      }
    } catch {
      // non-fatal — items just stay empty
    }
    setTimeout(() => formNameRef.current?.focus(), 50);
  };

  // ── item helpers ───────────────────────────────────────────────────

  const addItem = () =>
    setFormItems((prev) => [...prev, { item_name: '', description: '', is_mandatory: false }]);

  const removeItem = (idx: number) =>
    setFormItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, patch: Partial<ChecklistItem>) =>
    setFormItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  // ── save ───────────────────────────────────────────────────────────

  const saveChecklist = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        checklist_name: formName.trim(),
        checklist_type: formType,
        description: formDesc.trim(),
        status: formStatus,
        items: formItems
          .filter((it) => it.item_name.trim())
          .map((it) => ({
            item_name: it.item_name.trim(),
            description: (it.description || '').trim(),
            is_mandatory: it.is_mandatory ? 1 : 0,
          })),
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

  const closeModal = () => {
    setModalMode(null);
    setEditing(null);
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
                      onClick={() => void openEdit(row)}
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

      {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
      <FormModal
        open={modalMode !== null}
        title={modalMode === 'edit' ? 'Edit Checklist Template' : 'Create Checklist Template'}
        description="Define the checklist metadata and add the items that must be ticked off."
        size="lg"
        busy={saving}
        confirmLabel={modalMode === 'edit' ? 'Save Changes' : 'Create Template'}
        onConfirm={() => void saveChecklist()}
        onCancel={closeModal}
      >
        <div className="space-y-5">
          {/* ── Metadata ──────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Checklist Name */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1">
                Checklist Name <span className="text-rose-500">*</span>
              </label>
              <input
                ref={formNameRef}
                type="text"
                className="input w-full"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. CPWD Compliance Checklist"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1">Checklist Type</label>
              <select
                className="input w-full"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
              >
                <option value="Compliance">Compliance</option>
                <option value="Technical">Technical</option>
                <option value="Commercial">Commercial</option>
                <option value="Documentation">Documentation</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1">Status</label>
              <select
                className="input w-full"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1">Description</label>
              <textarea
                className="input w-full resize-none"
                rows={2}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Describe when this checklist should be used and what it governs."
              />
            </div>
          </div>

          {/* ── Checklist Items ────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[var(--text-main)]">
                Checklist Items
                {formItems.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                    {formItems.length} item{formItems.length !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>

            {formItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-[var(--text-muted)]">
                No items yet — click <strong>Add Item</strong> to define what needs to be checked.
              </div>
            ) : (
              <div className="space-y-2">
                {formItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="group flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                  >
                    {/* drag handle (visual only) */}
                    <GripVertical className="mt-2.5 h-4 w-4 shrink-0 text-slate-300" />

                    <div className="flex-1 space-y-2">
                      {/* Item name */}
                      <input
                        type="text"
                        className="input w-full text-sm"
                        value={item.item_name}
                        onChange={(e) => updateItem(idx, { item_name: e.target.value })}
                        placeholder="Item name (required)"
                      />
                      {/* Description */}
                      <input
                        type="text"
                        className="input w-full text-sm"
                        value={item.description ?? ''}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        placeholder="Short description (optional)"
                      />
                      {/* Mandatory toggle */}
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--text-muted)]">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded accent-[var(--accent)]"
                          checked={item.is_mandatory}
                          onChange={(e) => updateItem(idx, { is_mandatory: e.target.checked })}
                        />
                        <span className={item.is_mandatory ? 'font-semibold text-[var(--accent)]' : ''}>
                          Mandatory item
                        </span>
                      </label>
                    </div>

                    {/* remove */}
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="mt-0.5 shrink-0 rounded p-1 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                      title="Remove item"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </FormModal>

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
