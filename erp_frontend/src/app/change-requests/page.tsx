'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import type { StatItem } from '@/components/shells/RegisterPage';
import FormModal from '@/components/shells/FormModal';
import type { FormField } from '@/components/shells/FormModal';

interface ChangeRequest {
  name: string;
  cr_number?: string;
  linked_project?: string;
  status?: string;
  cost_impact?: number;
  schedule_impact_days?: number;
  raised_by?: string;
  approved_by?: string;
}

function formatCurrency(v?: number) {
  if (!v) return '₹ 0';
  return `₹ ${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function statusBadge(s?: string) {
  const m: Record<string, string> = { Draft: 'badge-yellow', Submitted: 'badge-blue', Approved: 'badge-green', Rejected: 'badge-red', Implemented: 'badge-purple' };
  return m[s || ''] || 'badge-gray';
}

const CREATE_FIELDS: FormField[] = [
  { name: 'cr_number', label: 'CR Number', type: 'text', placeholder: 'e.g. CR-001' },
  { name: 'linked_project', label: 'Project', type: 'link', linkEntity: 'project', required: true, placeholder: 'Search project…' },
  { name: 'cost_impact', label: 'Cost Impact (₹)', type: 'number', placeholder: '0' },
  { name: 'schedule_impact_days', label: 'Schedule Impact (days)', type: 'number', placeholder: '0' },
];

export default function ChangeRequestsPage() {
  const [items, setItems] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/change-requests').then(r => r.json()).catch(() => ({ data: [] }));
      setItems(res.data || []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (values: Record<string, string>) => {
    setCreating(true);
    try {
      const res = await fetch('/api/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          cost_impact: parseFloat(values.cost_impact) || 0,
          schedule_impact_days: parseInt(values.schedule_impact_days) || 0,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) throw new Error(payload.message || 'Failed');
      setShowCreate(false);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setCreating(false);
    }
  };

  const stats = useMemo<StatItem[]>(() => {
    const totalCostImpact = items.reduce((s, i) => s + (i.cost_impact || 0), 0);
    const approved = items.filter(i => i.status === 'Approved' || i.status === 'Implemented').length;
    return [
      { label: 'Total CRs', value: items.length, variant: 'info' },
      { label: 'Approved', value: approved, variant: 'success' },
      { label: 'Total Cost Impact', value: formatCurrency(totalCostImpact), variant: 'warning' },
    ];
  }, [items]);

  return (
    <>
      <RegisterPage
        title="Change Requests"
        description="Track scope changes, cost impacts, and schedule impacts."
        loading={loading}
        error={error}
        empty={items.length === 0}
        onRetry={loadData}
        emptyTitle="No change requests"
        emptyDescription="Raise a change request to track scope, cost, or schedule changes."
        stats={stats}
        headerActions={
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-strong)]"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            Raise CR
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th><th>CR #</th><th>Project</th><th>Cost Impact</th>
                <th>Schedule Impact</th><th>Raised By</th><th>Approved By</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.name}>
                  <td><div className="font-medium text-gray-900">{item.name}</div></td>
                  <td><div className="text-sm text-gray-900 font-medium">{item.cr_number || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.linked_project || '-'}</div></td>
                  <td><div className="text-sm font-medium text-gray-900">{formatCurrency(item.cost_impact)}</div></td>
                  <td><div className="text-sm text-gray-700">{item.schedule_impact_days ?? 0} days</div></td>
                  <td><div className="text-sm text-gray-700">{item.raised_by || '-'}</div></td>
                  <td><div className="text-sm text-gray-700">{item.approved_by || '-'}</div></td>
                  <td><span className={`badge ${statusBadge(item.status)}`}>{item.status || 'Draft'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RegisterPage>

      <FormModal
        open={showCreate}
        title="Raise Change Request"
        fields={CREATE_FIELDS}
        confirmLabel="Create"
        busy={creating}
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
      />
    </>
  );
}
