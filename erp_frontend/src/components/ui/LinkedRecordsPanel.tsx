'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Link2, Loader2 } from 'lucide-react';

type LinkedRecord = {
  name: string;
  doctype: string;
  label?: string;
  status?: string;
  date?: string;
  amount?: number;
};

type LinkDef = {
  label: string;
  doctype: string;
  method: string;
  args: Record<string, string>;
  href: (name: string) => string;
};

type Props = {
  links: LinkDef[];
};

function statusTone(s?: string) {
  const l = (s || '').toLowerCase();
  if (['approved', 'completed', 'ordered', 'accepted'].some(k => l.includes(k))) return 'bg-emerald-100 text-emerald-700';
  if (['rejected', 'cancelled', 'blocked'].some(k => l.includes(k))) return 'bg-rose-100 text-rose-700';
  if (['pending', 'draft', 'submitted'].some(k => l.includes(k))) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

function formatCurrency(val?: number) {
  if (!val) return null;
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

export default function LinkedRecordsPanel({ links }: Props) {
  const [data, setData] = useState<Record<string, LinkedRecord[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    links.forEach((link) => {
      const key = `${link.doctype}-${link.label}`;
      setLoading((p) => ({ ...p, [key]: true }));
      fetch('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: link.method, args: link.args }),
      })
        .then((r) => r.json())
        .then((res) => {
          const records = res.data?.data || res.data || [];
          const mapped: LinkedRecord[] = (Array.isArray(records) ? records : []).map((r: Record<string, unknown>) => ({
            name: (r.name as string) || '',
            doctype: link.doctype,
            label: (r.document_name as string) || (r.supplier as string) || (r.title as string) || (r.name as string) || '',
            status: (r.status as string) || (r.workflow_state as string) || '',
            date: (r.posting_date as string) || (r.transaction_date as string) || (r.creation as string) || '',
            amount: (r.grand_total as number) || (r.total as number) || (r.amount as number) || undefined,
          }));
          setData((p) => ({ ...p, [key]: mapped }));
        })
        .catch(() => setData((p) => ({ ...p, [key]: [] })))
        .finally(() => setLoading((p) => ({ ...p, [key]: false })));
    });
  }, [links]);

  const hasAny = links.some((link) => {
    const key = `${link.doctype}-${link.label}`;
    return (data[key]?.length || 0) > 0;
  });

  const allDone = links.every((link) => {
    const key = `${link.doctype}-${link.label}`;
    return !loading[key];
  });

  if (allDone && !hasAny) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
        <Link2 className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-800">Linked Records</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {links.map((link) => {
          const key = `${link.doctype}-${link.label}`;
          const records = data[key] || [];
          const isLoading = loading[key];

          return (
            <div key={key} className="px-5 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                {link.label}
                {!isLoading && <span className="ml-1.5 text-slate-300">({records.length})</span>}
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                </div>
              ) : records.length === 0 ? (
                <p className="text-xs text-slate-400 italic">None</p>
              ) : (
                <div className="space-y-1.5">
                  {records.slice(0, 10).map((rec) => (
                    <Link
                      key={rec.name}
                      href={link.href(rec.name)}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-slate-700 group-hover:text-blue-700 truncate block">
                          {rec.label || rec.name}
                        </span>
                        <span className="text-[10px] text-slate-400">{rec.name}{rec.date ? ` • ${rec.date}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {rec.amount ? <span className="text-[10px] font-medium text-slate-600">{formatCurrency(rec.amount)}</span> : null}
                        {rec.status ? <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${statusTone(rec.status)}`}>{rec.status}</span> : null}
                        <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-blue-500" />
                      </div>
                    </Link>
                  ))}
                  {records.length > 10 && <p className="text-[10px] text-slate-400">+{records.length - 10} more</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
