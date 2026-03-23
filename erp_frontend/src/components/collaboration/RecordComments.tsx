'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, UserPlus } from 'lucide-react';

/* ── Types ── */
type Comment = {
  name: string;
  comment_type?: string;
  comment_email?: string;
  content: string;
  creation: string;
  owner: string;
};

type Assignment = {
  name: string;
  allocated_to: string;
  description?: string;
  status: string;
  priority?: string;
  date?: string;
};

type RecordCommentsProps = {
  referenceDoctype: string;
  referenceName: string;
  /** Compact mode hides assignments section */
  compact?: boolean;
};

/* ── Helpers ── */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function userInitials(email: string): string {
  const local = email.split('@')[0] || '';
  const parts = local.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

/** Render @mentions as highlighted spans */
function renderContent(content: string): JSX.Element {
  const parts = content.split(/(@[\w.+-]+@[\w.-]+\.\w+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className="rounded bg-[var(--accent-soft)] px-1 py-0.5 text-[var(--accent-strong)] font-medium">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/* ── Component ── */
export default function RecordComments({ referenceDoctype, referenceName, compact }: RecordCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assignUser, setAssignUser] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const qs = `reference_doctype=${encodeURIComponent(referenceDoctype)}&reference_name=${encodeURIComponent(referenceName)}`;

  /* Fetch comments */
  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/collaboration?${qs}&limit=100`);
      const json = await res.json();
      const list: Comment[] = json?.data ?? json ?? [];
      setComments(Array.isArray(list) ? list : []);
    } catch { /* silent */ }
    setLoading(false);
  }, [qs]);

  /* Fetch assignments */
  const fetchAssignments = useCallback(async () => {
    if (compact) return;
    try {
      const res = await fetch(`/api/collaboration/assignments?${qs}`);
      const json = await res.json();
      const list: Assignment[] = json?.data ?? json ?? [];
      setAssignments(Array.isArray(list) ? list : []);
    } catch { /* silent */ }
  }, [qs, compact]);

  useEffect(() => {
    fetchComments();
    fetchAssignments();
  }, [fetchComments, fetchAssignments]);

  /* Auto-scroll on new comments */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  /* Post comment */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newComment.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      await fetch('/api/collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          reference_doctype: referenceDoctype,
          reference_name: referenceName,
          content,
        }),
      });
      setNewComment('');
      fetchComments();
    } catch { /* silent */ }
    setSubmitting(false);
  };

  /* Assign */
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUser.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          reference_doctype: referenceDoctype,
          reference_name: referenceName,
          user: assignUser.trim(),
          description: assignDesc.trim() || undefined,
        }),
      });
      setAssignUser('');
      setAssignDesc('');
      setShowAssign(false);
      fetchAssignments();
    } catch { /* silent */ }
    setSubmitting(false);
  };

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
          <h4 className="text-sm font-semibold text-[var(--text-main)]">Discussion</h4>
          {comments.length > 0 && (
            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent-strong)]">
              {comments.length}
            </span>
          )}
        </div>
        {!compact && (
          <button
            onClick={() => setShowAssign((v) => !v)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Assign
          </button>
        )}
      </div>

      {/* Assignment bar */}
      {!compact && assignments.length > 0 && (
        <div className="border-b border-[var(--border-subtle)] px-4 py-2 bg-amber-50/40">
          <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">Assigned</div>
          <div className="flex flex-wrap gap-1.5">
            {assignments.map((a) => (
              <span
                key={a.name}
                className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800"
              >
                {a.allocated_to}
                {a.status !== 'Open' && ` · ${a.status}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Assign form */}
      {showAssign && (
        <form onSubmit={handleAssign} className="border-b border-[var(--border-subtle)] px-4 py-3 space-y-2 bg-gray-50/50">
          <input
            type="email"
            placeholder="User email to assign"
            value={assignUser}
            onChange={(e) => setAssignUser(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={assignDesc}
            onChange={(e) => setAssignDesc(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAssign(false)} className="text-xs text-[var(--text-muted)] hover:underline">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[var(--accent)] px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Assign
            </button>
          </div>
        </form>
      )}

      {/* Comment thread */}
      <div className="max-h-[20rem] overflow-y-auto px-4 py-3 space-y-3">
        {loading && comments.length === 0 && (
          <div className="py-6 text-center text-xs text-[var(--text-muted)]">Loading…</div>
        )}

        {!loading && comments.length === 0 && (
          <div className="py-6 text-center text-xs text-[var(--text-muted)]">No comments yet</div>
        )}

        {comments.map((c) => (
          <div key={c.name} className="flex items-start gap-2.5">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#aeb0ff] to-[var(--brand-orange)] flex items-center justify-center text-[10px] font-semibold text-white mt-0.5">
              {userInitials(c.owner)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--text-main)]">{c.owner}</span>
                <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(c.creation)}</span>
              </div>
              <div className="mt-0.5 text-sm text-[var(--text-main)] whitespace-pre-wrap break-words">
                {renderContent(c.content)}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <form onSubmit={handleSubmit} className="border-t border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment… (use @email to mention)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="rounded-xl bg-[var(--accent)] p-2.5 text-white hover:opacity-90 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
