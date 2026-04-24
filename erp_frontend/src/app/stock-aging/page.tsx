'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import RegisterPage from '@/components/shells/RegisterPage';
import LinkPicker from '@/components/ui/LinkPicker';

interface AgingRow {
  warehouse?: string;
  item_code?: string;
  actual_qty?: number;
  last_receipt_date?: string;
  age_days?: number;
  age_bucket?: string;
}

type RowState = {
  label: string;
  badgeClass: 'badge-error' | 'badge-warning' | 'badge-info' | 'badge-success' | 'badge-gray';
  statVariant: 'default' | 'success' | 'warning' | 'error' | 'info';
  note: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string) {
  if (!value || value === '-') return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function getRowState(row: AgingRow): RowState {
  const qty = row.actual_qty ?? 0;
  const age = row.age_days ?? 0;

  if (qty < 0) {
    return {
      label: 'Control Breach',
      badgeClass: 'badge-error',
      statVariant: 'error',
      note: 'Negative stock is not allowed. Reconcile the missing GRN or movement posting immediately.',
    };
  }

  if (age > 180) {
    return {
      label: 'Dead Stock',
      badgeClass: 'badge-error',
      statVariant: 'error',
      note: 'No movement for more than 180 days.',
    };
  }

  if (age > 90) {
    return {
      label: 'Slow Moving',
      badgeClass: 'badge-warning',
      statVariant: 'warning',
      note: 'Movement risk. Review consumption or transfer plan.',
    };
  }

  if (age > 30) {
    return {
      label: 'Aging',
      badgeClass: 'badge-info',
      statVariant: 'info',
      note: 'Healthy but should be reviewed before it becomes stale.',
    };
  }

  return {
    label: 'Fresh',
    badgeClass: 'badge-success',
    statVariant: 'success',
    note: 'Recent receipt or active-moving stock.',
  };
}

export default function StockAgingPage() {
  const [rows, setRows] = useState<AgingRow[]>([]);
  const [buckets, setBuckets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (warehouseFilter) params.set('warehouse', warehouseFilter);
    if (itemFilter) params.set('item_code', itemFilter);

    const qs = params.toString() ? `?${params.toString()}` : '';

    fetch(`/api/stock-aging${qs}`)
      .then((response) => response.json())
      .then((result) => {
        const payload = result?.data;
        setRows(Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : []);
        setBuckets(payload?.buckets || {});
      })
      .catch(() => setError('Failed to load stock aging register'))
      .finally(() => setLoading(false));
  }, [warehouseFilter, itemFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const derived = useMemo(() => {
    const enriched = rows.map((row) => ({
      ...row,
      state: getRowState(row),
    }));

    const sortedRows = [...enriched].sort((left, right) => {
      const severityRank = (state: RowState) => {
        switch (state.label) {
          case 'Control Breach':
            return 4;
          case 'Dead Stock':
            return 3;
          case 'Slow Moving':
            return 2;
          case 'Aging':
            return 1;
          default:
            return 0;
        }
      };

      const severityDiff = severityRank(right.state) - severityRank(left.state);
      if (severityDiff !== 0) return severityDiff;

      return (right.age_days ?? 0) - (left.age_days ?? 0);
    });

    const netQty = enriched.reduce((sum, row) => sum + (row.actual_qty ?? 0), 0);
    const controlBreaches = enriched.filter((row) => (row.actual_qty ?? 0) < 0);
    const staleLines = enriched.filter((row) => (row.age_days ?? 0) > 90);
    const deadStock = enriched.filter((row) => (row.age_days ?? 0) > 180);
    const oldestStockAge = enriched.reduce((max, row) => Math.max(max, row.age_days ?? 0), 0);

    return {
      rows: sortedRows,
      netQty,
      controlBreaches,
      staleLines,
      deadStock,
      oldestStockAge,
    };
  }, [rows]);

  const hasFilters = warehouseFilter.length > 0 || itemFilter.length > 0;

  return (
    <RegisterPage
      title="Stock Aging"
      description="Review stale inventory, stock-control breaches, and receipt freshness without digging through multiple reports."
      loading={loading}
      error={error}
      empty={!loading && derived.rows.length === 0}
      emptyTitle="No stock aging rows found"
      emptyDescription={hasFilters ? 'Try clearing one or both filters to widen the result set.' : 'The backend did not return any aging rows for the current site.'}
      onRetry={load}
      stats={[
        { label: 'SKU Lines', value: formatNumber(derived.rows.length), variant: 'info' },
        { label: 'Net Qty', value: formatNumber(derived.netQty), variant: derived.netQty < 0 ? 'error' : 'default' },
        { label: 'Control Breach', value: formatNumber(derived.controlBreaches.length), variant: derived.controlBreaches.length > 0 ? 'error' : 'success' },
        { label: 'Slow / Dead Lines', value: formatNumber(derived.staleLines.length), variant: derived.staleLines.length > 0 ? 'warning' : 'success' },
        { label: 'Oldest Stock Age', value: `${formatNumber(derived.oldestStockAge)} d`, variant: derived.oldestStockAge > 180 ? 'error' : derived.oldestStockAge > 90 ? 'warning' : 'success' },
      ]}
      filterBar={(
        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap gap-2">
            <LinkPicker
              entity="warehouse"
              value={warehouseFilter}
              onChange={setWarehouseFilter}
              placeholder="Filter by warehouse..."
              className="w-full sm:w-64"
            />
            <LinkPicker
              entity="item"
              value={itemFilter}
              onChange={setItemFilter}
              placeholder="Filter by item..."
              className="w-full sm:w-64"
            />
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setWarehouseFilter('');
                  setItemFilter('');
                }}
                className="btn btn-secondary"
              >
                Clear filters
              </button>
            ) : null}
          </div>
          <p className="text-xs text-[var(--text-muted)] sm:text-sm">
            Any below-zero quantity is treated as a stock-control breach and surfaced first for correction.
          </p>
        </div>
      )}
      headerActions={(
        <div className="flex flex-wrap gap-2">
          <Link href="/stock-position" className="btn btn-secondary">Stock Position</Link>
          <Link href="/inventory" className="btn btn-primary">Open Inventory</Link>
        </div>
      )}
    >
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Warehouse</th>
              <th className="text-right">Qty</th>
              <th>Last Receipt</th>
              <th className="text-right">Age</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {derived.rows.map((row, index) => (
              <tr key={`${row.item_code || 'item'}-${row.warehouse || 'warehouse'}-${index}`}>
                <td className="min-w-[180px]">
                  <div className="font-semibold text-gray-900">{row.item_code || '-'}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    {row.age_bucket || 'Unbucketed stock line'}
                  </div>
                </td>
                <td className="min-w-[280px] text-gray-700">{row.warehouse || '-'}</td>
                <td className={`text-right font-semibold ${(row.actual_qty ?? 0) < 0 ? 'text-[var(--error-text)]' : 'text-gray-900'}`}>
                  {formatNumber(row.actual_qty ?? 0)}
                </td>
                <td className="text-gray-700">{formatDate(row.last_receipt_date)}</td>
                <td className="text-right font-medium text-gray-900">{formatNumber(row.age_days ?? 0)} d</td>
                <td className="min-w-[240px]">
                  <div className="flex flex-col gap-1">
                    <span className={`badge ${row.state.badgeClass}`}>{row.state.label}</span>
                    <span className="text-xs leading-5 text-[var(--text-muted)]">{row.state.note}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </RegisterPage>
  );
}
