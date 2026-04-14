'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
import { DashboardShell, SectionCard, StatCard } from '../dashboards/shared';
import ModalFrame from '../ui/ModalFrame';
import LinkPicker, { type LookupEntity } from '../ui/LinkPicker';

type Tone = 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'amber' | 'cyan' | 'slate' | 'teal';

type FieldOption = { label: string; value: string };

export type WorkspaceField = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'file' | 'link';
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
  defaultValue?: string | number;
  /** Comma-separated list of accepted file extensions, e.g. '.pdf,.dwg' */
  accept?: string;
  /** For type='link': which entity to search. */
  linkEntity?: LookupEntity;
  /** For type='link': extra filters. */
  linkFilters?: Record<string, string>;
};

export type WorkspaceColumn<T extends Record<string, any>> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
};

export type WorkspaceAction<T extends Record<string, any>> = {
  label: string;
  tone?: 'default' | 'primary' | 'success' | 'danger' | 'warning';
  visible?: (row: T) => boolean;
  buildRequest: (row: T) => { method: string; args: Record<string, any> };
  prompt?: {
    message: string;
    field: string;
  };
  confirmMessage?: string;
};

type WorkspaceStatsCard = {
  label: string;
  path: string;
  hint?: string;
  icon: any;
  tone: Tone;
};

type PendingActionState<T extends Record<string, any>> = {
  row: T;
  action: WorkspaceAction<T>;
  value: string;
} | null;

function getByPath(source: Record<string, any>, path: string) {
  return path.split('.').reduce<any>((value, part) => value?.[part], source);
}

async function callOps(method: string, args: Record<string, any> = {}) {
  const response = await fetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `Failed to execute ${method}`);
  }
  return payload.data;
}

function buildInitialForm(fields: WorkspaceField[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.name] = String(field.defaultValue ?? '');
    return acc;
  }, {});
}

function actionToneClasses(tone: WorkspaceAction<any>['tone']) {
  switch (tone) {
    case 'primary':
      return 'text-blue-600 hover:text-blue-800';
    case 'success':
      return 'text-green-600 hover:text-green-800';
    case 'danger':
      return 'text-red-600 hover:text-red-800';
    case 'warning':
      return 'text-amber-600 hover:text-amber-800';
    default:
      return 'text-gray-700 hover:text-gray-900';
  }
}

export default function OpsWorkspace<T extends Record<string, any>>({
  title,
  subtitle,
  listMethod,
  listArgs,
  statsMethod,
  statsArgs,
  statsCards = [],
  columns,
  createMethod,
  createFields = [],
  mapCreatePayload,
  actions = [],
  emptyMessage,
  createLabel = 'New Record',
}: {
  title: string;
  subtitle: string;
  listMethod: string;
  listArgs?: Record<string, any>;
  statsMethod?: string;
  statsArgs?: Record<string, any>;
  statsCards?: WorkspaceStatsCard[];
  columns: WorkspaceColumn<T>[];
  createMethod?: string;
  createFields?: WorkspaceField[];
  mapCreatePayload?: (values: Record<string, string>) => Record<string, any>;
  actions?: WorkspaceAction<T>[];
  emptyMessage?: string;
  createLabel?: string;
}) {
  const [rows, setRows] = useState<T[]>([]);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>(() => buildInitialForm(createFields));
  const [fileValues, setFileValues] = useState<Record<string, File | null>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [actionLoadingKey, setActionLoadingKey] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingActionState<T>>(null);

  const hasFileFields = createFields.some((f) => f.type === 'file');
  const canCreate = Boolean(createMethod && createFields.length);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listData, statsData] = await Promise.all([
        callOps(listMethod, listArgs || {}),
        statsMethod ? callOps(statsMethod, statsArgs || {}) : Promise.resolve({}),
      ]);
      setRows(Array.isArray(listData) ? listData : (listData?.data || []));
      setStats(statsData || {});
      setLastUpdated(
        new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [listArgs, listMethod, statsArgs, statsMethod]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setFormValues(buildInitialForm(createFields));
  }, [createFields]);

  const renderedStats = useMemo(() => statsCards.map((card) => ({
    ...card,
    hint: card.hint || '',
    value: getByPath(stats, card.path) ?? 0,
  })), [stats, statsCards]);

  const submitCreate = async () => {
    if (!createMethod) return;
    setCreating(true);
    setError('');
    try {
      const payload = mapCreatePayload ? mapCreatePayload(formValues) : formValues;
      const activeFile = hasFileFields
        ? Object.values(fileValues).find((f): f is File => f instanceof File && f.size > 0)
        : null;

      let createdData: Record<string, any> | undefined;

      if (activeFile) {
        const body = new FormData();
        body.append('method', createMethod);
        body.append('data', JSON.stringify(payload));
        body.append('file', activeFile);
        const response = await fetch('/api/ops/upload', { method: 'POST', body });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) {
          throw new Error(result.message || 'Failed to create record with file');
        }
        createdData = result.data;
      } else {
        createdData = await callOps(createMethod, { data: JSON.stringify(payload) });
      }

      // Upload generic attachments if any
      if (attachments.length > 0 && createdData?.doctype && createdData?.name) {
        for (const file of attachments) {
          const body = new FormData();
          body.append('file', file);
          body.append('doctype', createdData.doctype);
          body.append('docname', createdData.name);
          await fetch('/api/ops/attach', { method: 'POST', body });
        }
      }

      setShowCreateModal(false);
      setFormValues(buildInitialForm(createFields));
      setFileValues({});
      setAttachments([]);
      Object.values(fileInputRefs.current).forEach((input) => { if (input) input.value = ''; });
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create record');
    } finally {
      setCreating(false);
    }
  };

  const executeAction = async (row: T, action: WorkspaceAction<T>, promptValue = '') => {
    let request = action.buildRequest(row);
    if (action.prompt) {
      request = {
        ...request,
        args: {
          ...request.args,
          [action.prompt.field]: promptValue,
        },
      };
    }
    const actionKey = `${request.method}:${String(row.name || row.id || '')}`;
    setActionLoadingKey(actionKey);
    setError('');
    try {
      await callOps(request.method, request.args);
      setPendingAction(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoadingKey('');
    }
  };

  const runAction = async (row: T, action: WorkspaceAction<T>) => {
    if (action.confirmMessage || action.prompt) {
      setPendingAction({ row, action, value: '' });
      return;
    }
    await executeAction(row, action);
  };

  return (
    <DashboardShell
      title={title}
      subtitle={subtitle}
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      onRetry={() => void refresh()}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button className="btn btn-secondary" onClick={() => void refresh()}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
        {canCreate ? (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            {createLabel}
          </button>
        ) : null}
      </div>

      {renderedStats.length ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {renderedStats.map((card) => (
            <StatCard key={card.label} title={card.label} value={card.value} hint={card.hint} icon={card.icon} tone={card.tone} />
          ))}
        </div>
      ) : null}

      <SectionCard title={title} subtitle={subtitle}>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                {actions.length ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (actions.length ? 1 : 0)} className="py-8 text-center text-gray-500">
                    {emptyMessage || 'No records found'}
                  </td>
                </tr>
              ) : rows.map((row, index) => (
                <tr key={String(row.name || row.id || index)}>
                  {columns.map((column) => (
                    <td key={column.key}>{column.render(row)}</td>
                  ))}
                  {actions.length ? (
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {actions.filter((action) => action.visible?.(row) ?? true).map((action) => {
                          const request = action.buildRequest(row);
                          const actionKey = `${request.method}:${String(row.name || row.id || '')}`;
                          return (
                            <button
                              key={`${action.label}:${actionKey}`}
                              className={`text-sm font-medium ${actionToneClasses(action.tone)}`}
                              disabled={actionLoadingKey === actionKey}
                              onClick={() => void runAction(row, action)}
                            >
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <ModalFrame
        open={showCreateModal}
        title={createLabel}
        onClose={() => setShowCreateModal(false)}
        widthClassName="max-w-3xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={creating} onClick={() => void submitCreate()}>
              {creating ? 'Saving...' : createLabel}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {createFields.map((field) => (
            <div key={field.name} className={field.type === 'textarea' || field.type === 'file' ? 'sm:col-span-2' : ''}>
              <label className="mb-1 block text-sm font-medium text-gray-700">{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  className="input min-h-24"
                  placeholder={field.placeholder}
                  value={formValues[field.name] || ''}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                />
              ) : field.type === 'select' ? (
                <select
                  className="input"
                  value={formValues[field.name] || ''}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                >
                  <option value="">Select</option>
                  {(field.options || []).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : field.type === 'file' ? (
                <div>
                  <input
                    ref={(el) => { fileInputRefs.current[field.name] = el; }}
                    type="file"
                    accept={field.accept || '.pdf,.jpg,.jpeg,.png,.doc,.docx'}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setFileValues((prev) => ({ ...prev, [field.name]: file }));
                    }}
                  />
                  {fileValues[field.name] ? (
                    <p className="mt-1 text-xs text-gray-500">Selected: {fileValues[field.name]!.name}</p>
                  ) : null}
                </div>
              ) : field.type === 'link' && field.linkEntity ? (
                <LinkPicker
                  entity={field.linkEntity}
                  value={formValues[field.name] || ''}
                  onChange={(v) => setFormValues((prev) => ({ ...prev, [field.name]: v }))}
                  placeholder={field.placeholder}
                  filters={field.linkFilters}
                />
              ) : (
                <input
                  className="input"
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={formValues[field.name] || ''}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                />
              )}
            </div>
          ))}
        </div>

        {/* Generic attachments – available on every create form */}
        <div className="mt-4 border-t pt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Attachments (optional)</label>
          <input
            ref={attachmentInputRef}
            type="file"
            multiple
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-gray-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-100"
            onChange={(event) => {
              const files = event.target.files;
              if (files) setAttachments(Array.from(files));
            }}
          />
          {attachments.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {attachments.map((file, i) => (
                <li key={i} className="flex items-center justify-between text-xs text-gray-600">
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    className="ml-2 text-red-500 hover:text-red-700"
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </ModalFrame>

      <ModalFrame
        open={Boolean(pendingAction)}
        title={pendingAction?.action.label || 'Confirm Action'}
        onClose={() => setPendingAction(null)}
        widthClassName="max-w-lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPendingAction(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={!pendingAction} onClick={() => pendingAction ? void executeAction(pendingAction.row, pendingAction.action, pendingAction.value) : undefined}>
              Continue
            </button>
          </>
        }
      >
        {pendingAction ? (
          <div className="space-y-3">
            {pendingAction.action.confirmMessage ? <p className="text-sm text-gray-600">{pendingAction.action.confirmMessage}</p> : null}
            {pendingAction.action.prompt ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">{pendingAction.action.prompt.message}</label>
                <textarea
                  className="input min-h-24"
                  value={pendingAction.value}
                  onChange={(event) => setPendingAction((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </ModalFrame>
    </DashboardShell>
  );
}
