'use client';

import { useEffect, useState } from 'react';
import { Boxes, ClipboardList, FileText, MapPin, Receipt, RefreshCw, ShieldAlert, Target } from 'lucide-react';

type StatCard = {
  title: string;
  value: string;
  hint: string;
  icon: any;
  color: string;
  bg: string;
};

function formatCurrency(value?: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function ReportsPage() {
  const [cards, setCards] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/boqs/stats').then((response) => response.json()).catch(() => ({ data: {} })),
      fetch('/api/cost-sheets/stats').then((response) => response.json()).catch(() => ({ data: {} })),
      fetch('/api/invoices/stats').then((response) => response.json()).catch(() => ({ data: {} })),
      fetch('/api/dispatch-challans/stats').then((response) => response.json()).catch(() => ({ data: {} })),
      fetch('/api/dprs/stats').then((response) => response.json()).catch(() => ({ data: {} })),
      fetch('/api/rma-trackers/stats').then((response) => response.json()).catch(() => ({ data: {} })),
      fetch('/api/sites').then((response) => response.json()).catch(() => ({ data: [] })),
      fetch('/api/vendor-comparisons/stats').then((response) => response.json()).catch(() => ({ data: {} })),
    ])
      .then(([boqRes, costRes, invoiceRes, dispatchRes, dprRes, rmaRes, sitesRes, procurementRes]) => {
        const nextCards: StatCard[] = [
          {
            title: 'BOQ Value',
            value: formatCurrency(boqRes.data?.total_value),
            hint: `${boqRes.data?.approved || 0} approved BOQs`,
            icon: ClipboardList,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
          },
          {
            title: 'Sell Value',
            value: formatCurrency(costRes.data?.total_sell_value),
            hint: `${costRes.data?.pending_approval || 0} cost sheets pending`,
            icon: Target,
            color: 'text-violet-600',
            bg: 'bg-violet-100',
          },
          {
            title: 'Net Receivable',
            value: formatCurrency(invoiceRes.data?.total_net_receivable),
            hint: `${invoiceRes.data?.payment_received || 0} invoices paid`,
            icon: Receipt,
            color: 'text-emerald-600',
            bg: 'bg-emerald-100',
          },
          {
            title: 'Dispatch Volume',
            value: `${dispatchRes.data?.total || 0}`,
            hint: `${dispatchRes.data?.dispatched || 0} dispatched challans`,
            icon: Boxes,
            color: 'text-amber-600',
            bg: 'bg-amber-100',
          },
          {
            title: 'Execution Sites',
            value: `${(sitesRes.data || []).length}`,
            hint: `${dprRes.data?.total_reports || 0} DPRs logged`,
            icon: MapPin,
            color: 'text-cyan-600',
            bg: 'bg-cyan-100',
          },
          {
            title: 'RMA Cases',
            value: `${rmaRes.data?.total || 0}`,
            hint: `${rmaRes.data?.awaiting_approval || 0} awaiting approval`,
            icon: ShieldAlert,
            color: 'text-red-600',
            bg: 'bg-red-100',
          },
          {
            title: 'Vendor Comparisons',
            value: `${procurementRes.data?.total || 0}`,
            hint: `${procurementRes.data?.approved || 0} approved comparisons`,
            icon: FileText,
            color: 'text-indigo-600',
            bg: 'bg-indigo-100',
          },
        ];
        setCards(nextCards);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Live operations snapshot compiled from the implemented backend modules.</p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Downloadable PDF/Excel reporting is not wired yet. This page now shows live cross-module metrics only, so the POC stays honest.
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading report metrics...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="card">
                <div className="card-body">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg}`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{card.value}</div>
                      <div className="text-sm text-gray-600">{card.title}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">{card.hint}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
