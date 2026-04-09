'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Loader2, Columns3, ListFilter, Plus, CheckCircle2, Edit3, Trash2, Save, Users,
} from 'lucide-react';
import { projectWorkspaceApi } from '@/lib/typedApi';

type ProjectTask = {
  name: string;
  linked_project: string;
  linked_site?: string;
  title: string;
  status: string;
  priority: string;
  assigned_to?: string;
  collaborators?: string;
  start_date?: string;
  deadline?: string;
  description?: string;
  parent_task?: string;
  milestone_id?: string;
  points?: number;
  labels?: string;
  sort_order?: number;
  owner?: string;
  creation?: string;
  modified?: string;
};

type TaskSummary = {
  'To Do': { count: number; points: number };
  'In Progress': { count: number; points: number };
  'Review': { count: number; points: number };
  'Done': { count: number; points: number };
  total: number;
  total_points: number;
};

const TASK_STATUSES = ['To Do', 'In Progress', 'Review', 'Done'] as const;
const TASK_STATUS_COLORS: Record<string, string> = {
  'To Do': 'bg-gray-100 text-gray-700 border-gray-200',
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  'Review': 'bg-amber-50 text-amber-700 border-amber-200',
  'Done': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const TASK_PRIORITY_COLORS: Record<string, string> = {
  Low: 'text-gray-400',
  Normal: 'text-blue-500',
  High: 'text-amber-500',
  Urgent: 'text-rose-500',
};

function TasksTab({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formTitle, setFormTitle] = useState('');
  const [formStatus, setFormStatus] = useState('To Do');
  const [formPriority, setFormPriority] = useState('Normal');
  const [formAssigned, setFormAssigned] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPoints, setFormPoints] = useState('0');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        projectWorkspaceApi.getTasks<ProjectTask[]>(projectId),
        projectWorkspaceApi.getTaskSummary<TaskSummary>(projectId),
      ]);
      setTasks(Array.isArray(t) ? t : []);
      setSummary(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const resetForm = () => {
    setFormTitle(''); setFormStatus('To Do'); setFormPriority('Normal');
    setFormAssigned(''); setFormDeadline(''); setFormDescription(''); setFormPoints('0');
    setShowCreate(false); setEditingTask(null);
  };

  const openEdit = (t: ProjectTask) => {
    setEditingTask(t); setFormTitle(t.title); setFormStatus(t.status);
    setFormPriority(t.priority); setFormAssigned(t.assigned_to || '');
    setFormDeadline(t.deadline || ''); setFormDescription(t.description || '');
    setFormPoints(String(t.points || 0)); setShowCreate(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: formTitle, status: formStatus, priority: formPriority,
        assigned_to: formAssigned || undefined, deadline: formDeadline || undefined,
        description: formDescription || undefined, points: parseInt(formPoints) || 0,
      };
      if (editingTask) {
        await projectWorkspaceApi.updateTask(editingTask.name, payload);
      } else {
        payload.linked_project = projectId;
        await projectWorkspaceApi.createTask(payload);
      }
      resetForm(); void load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save task'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (name: string) => {
    try { await projectWorkspaceApi.deleteTask(name); void load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete task'); }
  };

  const handleStatusChange = async (name: string, status: string) => {
    try { await projectWorkspaceApi.updateTaskStatus(name, status); void load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to update status'); }
  };

  const filtered = statusFilter === 'all' ? tasks : tasks.filter((t) => t.status === statusFilter);

  if (loading) return <div className="flex items-center justify-center py-16 text-[var(--text-muted)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading tasks...</div>;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-white px-4 py-3 text-center">
            <div className="text-lg font-bold text-[var(--text-main)]">{summary.total}</div>
            <div className="text-[11px] text-[var(--text-muted)]">Total</div>
          </div>
          {TASK_STATUSES.map((s) => (
            <div key={s} className="rounded-xl border border-[var(--border-subtle)] bg-white px-4 py-3 text-center">
              <div className="text-lg font-bold text-[var(--text-main)]">{summary[s].count}</div>
              <div className="text-[11px] text-[var(--text-muted)]">{s}</div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {['all', ...TASK_STATUSES].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:bg-gray-200'}`}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView(view === 'list' ? 'kanban' : 'list')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--surface-raised)]">
            {view === 'list' ? <><Columns3 className="h-3.5 w-3.5" /> Kanban</> : <><ListFilter className="h-3.5 w-3.5" /> List</>}
          </button>
          <button onClick={() => { resetForm(); setShowCreate(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-orange)] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New Task
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}

      {/* Create / Edit form */}
      {showCreate && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold text-[var(--text-main)]">{editingTask ? 'Edit Task' : 'New Task'}</h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Title *</label>
              <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Task title..." className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Status</label>
              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm">
                {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Priority</label>
              <select value={formPriority} onChange={(e) => setFormPriority(e.target.value)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm">
                {['Low', 'Normal', 'High', 'Urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Assigned To</label>
              <input type="text" value={formAssigned} onChange={(e) => setFormAssigned(e.target.value)} placeholder="user@example.com" className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Deadline</label>
              <input type="date" value={formDeadline} onChange={(e) => setFormDeadline(e.target.value)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Points</label>
              <input type="number" min="0" value={formPoints} onChange={(e) => setFormPoints(e.target.value)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Description</label>
              <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} placeholder="Details..." className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 md:col-span-2">
              <button onClick={handleSave} disabled={!formTitle.trim() || saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-orange)] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {editingTask ? 'Update' : 'Save'}
              </button>
              <button onClick={resetForm} className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-raised)]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="space-y-2">
          {filtered.length === 0 && !showCreate && (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--text-muted)] opacity-40" />
              <p className="mt-3 text-sm text-[var(--text-muted)]">No tasks yet. Create your first task to get started.</p>
            </div>
          )}
          {filtered.map((task) => (
            <div key={task.name} className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-white px-4 py-3 shadow-sm">
              <button onClick={() => handleStatusChange(task.name, task.status === 'Done' ? 'To Do' : 'Done')}
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${task.status === 'Done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 hover:border-emerald-400'}`}>
                {task.status === 'Done' && <CheckCircle2 className="h-3 w-3" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${task.status === 'Done' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-main)]'}`}>{task.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TASK_STATUS_COLORS[task.status] || ''}`}>{task.status}</span>
                  {task.priority !== 'Normal' && <span className={`text-[10px] font-semibold ${TASK_PRIORITY_COLORS[task.priority] || ''}`}>{task.priority}</span>}
                  {(task.points ?? 0) > 0 && <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">{task.points}pt</span>}
                </div>
                <div className="mt-1 flex gap-3 text-[10px] text-[var(--text-muted)]">
                  {task.assigned_to && <span>{task.assigned_to}</span>}
                  {task.deadline && <span>Due: {task.deadline}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(task)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-main)]"><Edit3 className="h-3.5 w-3.5" /></button>
                <button onClick={() => handleDelete(task.name)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kanban view */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {TASK_STATUSES.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col);
            return (
              <div key={col} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[var(--text-main)]">{col}</h4>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <div key={task.name} className="rounded-lg border border-[var(--border-subtle)] bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-[var(--text-main)]">{task.title}</span>
                        <div className="flex gap-0.5">
                          <button onClick={() => openEdit(task)} className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)]"><Edit3 className="h-3 w-3" /></button>
                        </div>
                      </div>
                      {task.priority !== 'Normal' && <span className={`mt-1 inline-block text-[10px] font-semibold ${TASK_PRIORITY_COLORS[task.priority] || ''}`}>{task.priority}</span>}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {TASK_STATUSES.filter((s) => s !== col).map((s) => (
                          <button key={s} onClick={() => handleStatusChange(task.name, s)}
                            className="rounded px-1.5 py-0.5 text-[9px] font-medium text-[var(--text-muted)] hover:bg-[var(--surface-raised)]">{s}</button>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2 text-[10px] text-[var(--text-muted)]">
                        {task.assigned_to && <span><Users className="mr-0.5 inline h-2.5 w-2.5" />{task.assigned_to.split('@')[0]}</span>}
                        {task.deadline && <span>{task.deadline}</span>}
                        {(task.points ?? 0) > 0 && <span className="text-violet-500">{task.points}pt</span>}
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && <p className="py-4 text-center text-[10px] text-[var(--text-muted)]">No tasks</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TasksTab;
