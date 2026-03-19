'use client';

import ModalFrame from '@/components/ui/ModalFrame';
import { useEffect, useState } from 'react';
import { BellRing, Pencil, Plus, Trash2, Trophy, TrendingUp, Users } from 'lucide-react';

interface Competitor {
  name: string;
  company_name?: string;
  organization?: string;
  specialization?: string;
  strength_areas?: string;
  weakness_areas?: string;
  win_count?: number;
  loss_count?: number;
  win_rate?: number;
  typical_bid_range_min?: number;
  typical_bid_range_max?: number;
  remarks?: string;
}

interface CompetitorStats {
  total?: number;
  total_wins?: number;
  total_losses?: number;
  average_win_rate?: number;
}

interface TenderResultStats {
  total?: number;
  fresh?: number;
  aoc?: number;
  loi_issued?: number;
  work_order?: number;
  total_winning_amount?: number;
}

interface TenderReminderStats {
  total?: number;
  pending?: number;
  sent?: number;
  dismissed?: number;
}

type CompetitorForm = {
  company_name: string;
  organization: string;
  specialization: string;
  strength_areas: string;
  weakness_areas: string;
  typical_bid_range_min: string;
  typical_bid_range_max: string;
  win_count: string;
  loss_count: string;
  remarks: string;
};

const initialForm: CompetitorForm = {
  company_name: '',
  organization: '',
  specialization: '',
  strength_areas: '',
  weakness_areas: '',
  typical_bid_range_min: '',
  typical_bid_range_max: '',
  win_count: '0',
  loss_count: '0',
  remarks: '',
};

function formatCurrency(v?: number) {
  if (!v) return 'Rs 0';
  return `Rs ${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function toForm(item?: Competitor): CompetitorForm {
  if (!item) return initialForm;
  return {
    company_name: item.company_name || '',
    organization: item.organization || '',
    specialization: item.specialization || '',
    strength_areas: item.strength_areas || '',
    weakness_areas: item.weakness_areas || '',
    typical_bid_range_min: item.typical_bid_range_min ? String(item.typical_bid_range_min) : '',
    typical_bid_range_max: item.typical_bid_range_max ? String(item.typical_bid_range_max) : '',
    win_count: String(item.win_count ?? 0),
    loss_count: String(item.loss_count ?? 0),
    remarks: item.remarks || '',
  };
}

function toPayload(form: CompetitorForm) {
  return {
    company_name: form.company_name.trim(),
    organization: form.organization.trim() || undefined,
    specialization: form.specialization.trim() || undefined,
    strength_areas: form.strength_areas.trim() || undefined,
    weakness_areas: form.weakness_areas.trim() || undefined,
    typical_bid_range_min: form.typical_bid_range_min ? Number(form.typical_bid_range_min) : 0,
    typical_bid_range_max: form.typical_bid_range_max ? Number(form.typical_bid_range_max) : 0,
    win_count: form.win_count ? Number(form.win_count) : 0,
    loss_count: form.loss_count ? Number(form.loss_count) : 0,
    remarks: form.remarks.trim() || undefined,
  };
}

export default function CompetitorsPage() {
  const [items, setItems] = useState<Competitor[]>([]);
  const [stats, setStats] = useState<CompetitorStats>({});
  const [resultStats, setResultStats] = useState<TenderResultStats>({});
  const [reminderStats, setReminderStats] = useState<TenderReminderStats>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Competitor | null>(null);
  const [form, setForm] = useState<CompetitorForm>(initialForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [actionError, setActionError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes, resultStatsRes, reminderStatsRes] = await Promise.all([
        fetch('/api/competitors').then((r) => r.json()),
        fetch('/api/competitors/stats').then((r) => r.json()),
        fetch('/api/tender-results/stats').then((r) => r.json()),
        fetch('/api/tender-reminders/stats').then((r) => r.json()),
      ]);
      setItems(listRes.data || []);
      setStats(statsRes.data || {});
      setResultStats(resultStatsRes.data || {});
      setReminderStats(reminderStatsRes.data || {});
      setActionError('');
    } catch {
      setItems([]);
      setStats({});
      setResultStats({});
      setReminderStats({});
      setActionError('Competitor data load nahi ho paya.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setSubmitError('');
    setIsModalOpen(true);
  };

  const openEdit = (item: Competitor) => {
    setEditing(item);
    setForm(toForm(item));
    setSubmitError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setForm(initialForm);
    setSubmitLoading(false);
    setSubmitError('');
  };

  const handleSubmit = async () => {
    if (!form.company_name.trim()) {
      setSubmitError('Company name is required.');
      return;
    }

    setSubmitLoading(true);
    setSubmitError('');

    try {
      const response = await fetch(editing ? `/api/competitors/${editing.name}` : '/api/competitors', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toPayload(form)),
      });
      const result = await response.json();
      if (!response.ok || result.success === false) {
        throw new Error(result.message || `Failed to ${editing ? 'update' : 'create'} competitor`);
      }

      closeModal();
      await loadData();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Save failed');
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (item: Competitor) => {
    const confirmed = window.confirm(`Delete competitor "${item.company_name || item.name}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/competitors/${item.name}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Failed to delete competitor');
      }
      await loadData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Delete failed');
    }
  };

  const averageWinRate = (stats.average_win_rate ?? (items.length ? (items.reduce((s, i) => s + (i.win_rate || 0), 0) / items.length) : 0)).toFixed(1);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Competitor Analysis</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Win/loss rates, result tracker stats, and follow-up signals of known competitors.</p>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Add Competitor
        </button>
      </div>

      {actionError ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div> : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600"><Users className="w-5 h-5" /></div><div><div className="stat-value">{stats.total ?? items.length}</div><div className="stat-label">Competitors Tracked</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600"><TrendingUp className="w-5 h-5" /></div><div><div className="stat-value">{averageWinRate}%</div><div className="stat-label">Avg Win Rate</div></div></div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600"><Trophy className="w-5 h-5" /></div><div><div className="stat-value">{resultStats.total ?? 0}</div><div className="stat-label">Result Records</div></div></div><div className="text-xs text-gray-500 mt-2">{resultStats.work_order ?? 0} work orders, {resultStats.aoc ?? 0} AOC</div></div>
        <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600"><BellRing className="w-5 h-5" /></div><div><div className="stat-value">{reminderStats.pending ?? 0}</div><div className="stat-label">Pending Reminders</div></div></div><div className="text-xs text-gray-500 mt-2">{reminderStats.sent ?? 0} sent, {reminderStats.dismissed ?? 0} dismissed</div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">All Competitors</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Company</th><th>Organization</th><th>Wins</th><th>Losses</th><th>Win Rate</th><th>Bid Range</th><th>Actions</th></tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-500">No competitor data found</td></tr> : items.map(item => (
                  <tr key={item.name}>
                    <td>
                      <div className="font-medium text-gray-900">{item.company_name || '-'}</div>
                      <div className="text-xs text-gray-500">{item.specialization || 'No specialization added'}</div>
                    </td>
                    <td><div className="text-sm text-gray-700">{item.organization || '-'}</div></td>
                    <td><div className="text-sm text-green-700 font-medium">{item.win_count ?? 0}</div></td>
                    <td><div className="text-sm text-red-700">{item.loss_count ?? 0}</div></td>
                    <td><div className="text-sm font-medium text-gray-900">{(item.win_rate ?? 0).toFixed(1)}%</div></td>
                    <td><div className="text-sm text-gray-700">{formatCurrency(item.typical_bid_range_min)} - {formatCurrency(item.typical_bid_range_max)}</div></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button className="btn btn-xs btn-secondary" onClick={() => openEdit(item)}><Pencil className="w-3 h-3" />Edit</button>
                        <button className="btn btn-xs btn-error" onClick={() => handleDelete(item)}><Trash2 className="w-3 h-3" />Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Competitive Signals</h3></div>
          <div className="p-5 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-600">Competitor win / loss tally</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{stats.total_wins ?? 0} / {stats.total_losses ?? 0}</div>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm text-blue-700">Fresh result records</div>
              <div className="mt-1 text-2xl font-semibold text-blue-900">{resultStats.fresh ?? 0}</div>
            </div>
            <div className="rounded-xl border border-green-100 bg-green-50 p-4">
              <div className="text-sm text-green-700">Winning amount tracked</div>
              <div className="mt-1 text-2xl font-semibold text-green-900">{formatCurrency(resultStats.total_winning_amount)}</div>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <div className="text-sm text-amber-700">Reminder register</div>
              <div className="mt-1 text-2xl font-semibold text-amber-900">{reminderStats.total ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Bid Tracking Summary</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Metric</th><th>Value</th><th>Notes</th></tr></thead>
            <tbody>
              <tr><td className="font-medium text-gray-900">LoI Issued</td><td className="text-sm text-gray-700">{resultStats.loi_issued ?? 0}</td><td className="text-sm text-gray-500">Published intent-to-award signals</td></tr>
              <tr><td className="font-medium text-gray-900">Work Orders</td><td className="text-sm text-gray-700">{resultStats.work_order ?? 0}</td><td className="text-sm text-gray-500">Firm awards tracked in tender results</td></tr>
              <tr><td className="font-medium text-gray-900">AOC</td><td className="text-sm text-gray-700">{resultStats.aoc ?? 0}</td><td className="text-sm text-gray-500">Commercially finalized outcomes</td></tr>
              <tr><td className="font-medium text-gray-900">Pending Reminders</td><td className="text-sm text-gray-700">{reminderStats.pending ?? 0}</td><td className="text-sm text-gray-500">Follow-ups still due on tender tracker</td></tr>
              <tr><td className="font-medium text-gray-900">Sent Reminders</td><td className="text-sm text-gray-700">{reminderStats.sent ?? 0}</td><td className="text-sm text-gray-500">Reminder actions already pushed out</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <ModalFrame
        open={isModalOpen}
        title={editing ? 'Edit Competitor' : 'Create Competitor'}
        onClose={closeModal}
        widthClassName="max-w-3xl"
        footer={(
          <>
            <button className="btn btn-secondary" onClick={closeModal} disabled={submitLoading}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitLoading}>
              {submitLoading ? 'Saving...' : editing ? 'Update Competitor' : 'Create Competitor'}
            </button>
          </>
        )}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" value={form.company_name} onChange={(e) => setForm((prev) => ({ ...prev, company_name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
            <input className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" value={form.organization} onChange={(e) => setForm((prev) => ({ ...prev, organization: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
            <textarea className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm min-h-[84px]" value={form.specialization} onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Strength Areas</label>
            <textarea className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm min-h-[84px]" value={form.strength_areas} onChange={(e) => setForm((prev) => ({ ...prev, strength_areas: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weakness Areas</label>
            <textarea className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm min-h-[84px]" value={form.weakness_areas} onChange={(e) => setForm((prev) => ({ ...prev, weakness_areas: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typical Bid Range Min</label>
            <input type="number" min="0" className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" value={form.typical_bid_range_min} onChange={(e) => setForm((prev) => ({ ...prev, typical_bid_range_min: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typical Bid Range Max</label>
            <input type="number" min="0" className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" value={form.typical_bid_range_max} onChange={(e) => setForm((prev) => ({ ...prev, typical_bid_range_max: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Win Count</label>
            <input type="number" min="0" className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" value={form.win_count} onChange={(e) => setForm((prev) => ({ ...prev, win_count: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loss Count</label>
            <input type="number" min="0" className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" value={form.loss_count} onChange={(e) => setForm((prev) => ({ ...prev, loss_count: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm min-h-[84px]" value={form.remarks} onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))} />
          </div>
        </div>
        {submitError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</div> : null}
      </ModalFrame>
    </div>
  );
}
