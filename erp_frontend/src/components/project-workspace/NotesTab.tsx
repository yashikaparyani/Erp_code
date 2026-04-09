'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, Plus, Edit3, Trash2, Save, Eye, EyeOff, StickyNote } from 'lucide-react';
import { projectWorkspaceApi } from '@/lib/typedApi';

type ProjectNote = {
  name: string;
  linked_project: string;
  title: string;
  content?: string;
  is_private?: number;
  owner?: string;
  creation?: string;
  modified?: string;
};

function NotesTab({ projectId }: { projectId: string }) {
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPrivate, setFormPrivate] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectWorkspaceApi.getNotes<ProjectNote[]>(projectId);
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void loadNotes(); }, [loadNotes]);

  const resetForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormPrivate(true);
    setShowCreate(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await projectWorkspaceApi.updateNote(editingId, { title: formTitle, content: formContent, is_private: formPrivate ? 1 : 0 });
      } else {
        await projectWorkspaceApi.createNote({ linked_project: projectId, title: formTitle, content: formContent, is_private: formPrivate ? 1 : 0 });
      }
      resetForm();
      void loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (note: ProjectNote) => {
    setEditingId(note.name);
    setFormTitle(note.title);
    setFormContent(note.content || '');
    setFormPrivate(!!note.is_private);
    setShowCreate(true);
  };

  const handleDelete = async (name: string) => {
    try {
      await projectWorkspaceApi.deleteNote(name);
      void loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-[var(--text-muted)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading notes...</div>;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-main)]">Project Notes</h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Private notes are only visible to their creator</p>
        </div>
        {!showCreate && (
          <button
            onClick={() => { resetForm(); setShowCreate(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-orange)] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> New Note
          </button>
        )}
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}

      {/* Create / Edit form */}
      {showCreate && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold text-[var(--text-main)]">{editingId ? 'Edit Note' : 'New Note'}</h4>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Title *</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Content</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Write your note here..."
                rows={5}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <input type="checkbox" checked={formPrivate} onChange={(e) => setFormPrivate(e.target.checked)} className="rounded" />
              {formPrivate ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              Private (only visible to you)
            </label>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={!formTitle.trim() || saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-orange)] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {editingId ? 'Update' : 'Save'}
              </button>
              <button onClick={resetForm} className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-raised)]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 && !showCreate && (
        <div className="py-12 text-center">
          <StickyNote className="mx-auto h-10 w-10 text-[var(--text-muted)] opacity-40" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">No notes yet. Create your first note to get started.</p>
        </div>
      )}

      <div className="space-y-3">
        {notes.map((note) => (
          <div key={note.name} className="rounded-xl border border-[var(--border-subtle)] bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[var(--text-main)]">{note.title}</h4>
                  {note.is_private ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600">
                      <EyeOff className="h-2.5 w-2.5" /> Private
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                      <Eye className="h-2.5 w-2.5" /> Shared
                    </span>
                  )}
                </div>
                {note.content && (
                  <div className="mt-2 text-sm text-[var(--text-main)] whitespace-pre-wrap leading-relaxed">{note.content}</div>
                )}
                <div className="mt-2 flex gap-4 text-[11px] text-[var(--text-muted)]">
                  <span>{note.owner}</span>
                  <span>{note.modified ? new Date(note.modified).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(note)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-main)]" title="Edit">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(note.name)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-rose-50 hover:text-rose-600" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotesTab;
