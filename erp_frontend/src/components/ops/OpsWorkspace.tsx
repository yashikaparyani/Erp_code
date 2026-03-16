'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw, X } from 'lucide-react';
import { DashboardShell, SectionCard, StatCard } from '../dashboards/shared';

type Tone = 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'amber' | 'cyan' | 'slate' | 'teal';

type FieldOption = { label: string; value: string };

export type WorkspaceField = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
  defaultValue?: string | number;
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
  hint: string;
  icon: any;
  tone: Tone;
};

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
  const [actionLoadingKey, setActionLoadingKey] = useState('');

  const canCreate = Boolean(createMethod && createFields.length);

  const refresh = async () => {
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
  };

  useEffect(() => {
    void refresh();
  }, [listMethod, statsMethod]);

  useEffect(() => {
    setFormValues(buildInitialForm(createFields));
  }, [createFields]);

  const renderedStats = useMemo(() => statsCards.map((card) => ({
    ...card,
    value: getByPath(stats, card.path) ?? 0,
  })), [stats, statsCards]);

  const submitCreate = async () => {
    if (!createMethod) return;
    setCreating(true);
    setError('');
    try {
      const payload = mapCreatePayload ? mapCreatePayload(formValues) : formValues;
      await callOps(createMethod, { data: JSON.stringify(payload) });
      setShowCreateModal(false);
      setFormValues(buildInitialForm(createFields));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create record');
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (row: T, action: WorkspaceAction<T>) => {
    let request = action.buildRequest(row);
    if (action.confirmMessage && !window.confirm(action.confirmMessage)) {
      return;
    }
    if (action.prompt) {
      const value = window.prompt(action.prompt.message, '') || '';
      request = {
        ...request,
        args: {
          ...request.args,
          [action.prompt.field]: value,
        },
      };
    }
    const actionKey = `${request.method}:${String(row.name || row.id || '')}`;
    setActionLoadingKey(actionKey);
    setError('');
    try {
      await callOps(request.method, request.args);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoadingKey('');
    }
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

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">{createLabel}</h2>
              <button className="rounded-lg p-2 hover:bg-gray-100" onClick={() => setShowCreateModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              {createFields.map((field) => (
                <div key={field.name} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
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
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={creating} onClick={() => void submitCreate()}>
                {creating ? 'Saving...' : createLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
